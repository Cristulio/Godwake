import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER12_FLAVOR,
  CHAPTER12_BOSS_INTEL,
  type EncounterEntry,
} from './chapter12Pools';
import { MonsterSchema } from '../../schemas/monster';
import { getMonster } from '../../content/monsters';
import { SARADUSH_MARAUDER } from '../../content/monsters/saradush-marauder';
import { BURNING_DEAD } from '../../content/monsters/burning-dead';
import { HALF_GIANT_SIEGEBREAKER } from '../../content/monsters/half-giant-siegebreaker';
import { FIRE_GIANT_SHAMAN } from '../../content/monsters/fire-giant-shaman';
import { GROMNIR_DEFENDER } from '../../content/monsters/gromnir-defender';
import { FIRE_GIANT } from '../../content/monsters/fire-giant';
import { FIRE_GIANT_WARLORD } from '../../content/monsters/fire-giant-warlord';
import { YAGA_SHURA } from '../../content/monsters/yaga-shura';

/**
 * Chapter 12 ("The Siege of Karthen") content gate: every new monster, the
 * boss, the four pools, and the ready-to-wire flavor + intel must be valid and
 * internally consistent. Integration wires the bestiary into the monster
 * registry and the chapter into createDelve; this suite owns the bestiary +
 * pool invariants in isolation, validating against the directly-imported
 * monster constants so the content stays sound BEFORE it is registered.
 */

const CH12_MONSTERS = [
  SARADUSH_MARAUDER,
  BURNING_DEAD,
  HALF_GIANT_SIEGEBREAKER,
  FIRE_GIANT_SHAMAN,
  GROMNIR_DEFENDER,
  FIRE_GIANT,
  FIRE_GIANT_WARLORD,
];

const CH12_BOSS = YAGA_SHURA;

/**
 * Every monster def id this chapter is allowed to reference, boss included.
 * Hargan-Vor's heart-rite gate surfaces the bespoke `heart-ember` weak-point as
 * the destructible objective, so it is a legitimate cross-chapter summon target.
 */
const KNOWN_IDS = new Set<string>([
  ...[...CH12_MONSTERS, CH12_BOSS].map((m) => m.id),
  'heart-ember',
]);

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 12 — bestiary', () => {
  it('every monster (boss included) re-parses against the schema', () => {
    for (const def of [...CH12_MONSTERS, CH12_BOSS]) {
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (Hargan-Vor) carries an apex CR15 stat block a notch above Ch9', () => {
    // A clear notch above the Ch9 boss (The Hollow Pretender: 240 HP / AC 21).
    expect(CH12_BOSS.id).toBe('yaga-shura');
    expect(CH12_BOSS.maxHp).toBeGreaterThan(240);
    expect(CH12_BOSS.ac).toBeGreaterThanOrEqual(21);
    // The heart-rite read as battle-rage: wounds stoke him rather than fell him.
    expect(CH12_BOSS.bossMechanic).toBe('battle-rage');
    // Boss-framework kit: a multi-action turn, a condition gate (the cut-out heart
    // surfaced as a summoned weak-point), a telegraphed ranged hurl-rock, a melee
    // fire action, and a half-HP phase.
    const kinds = CH12_BOSS.actions.map((a) => a.kind);
    expect(CH12_BOSS.actionsPerTurn).toBe(2);
    expect(kinds).toContain('summon');
    expect(CH12_BOSS.gate?.whileAddAlive).toBe('heart-ember');
    // The heart-ember is a deliberate 1-2 turn objective at its chapter, not the
    // trivial early-game elemental that stood in before — tanky enough to read.
    const heartEmber = getMonster(CH12_BOSS.gate!.whileAddAlive);
    expect(heartEmber.maxHp).toBeGreaterThan(80);
    expect(CH12_BOSS.phases?.length ?? 0).toBeGreaterThan(0);
    const telegraphed = CH12_BOSS.actions.some((a) => a.kind === 'attack' && !!a.telegraph);
    expect(telegraphed).toBe(true);
    expect(kinds.filter((k) => k === 'attack').length).toBeGreaterThanOrEqual(2);
    const hasFire = CH12_BOSS.actions.some(
      (a) => a.kind === 'attack' && a.damageType === 'fire',
    );
    const hasRanged = CH12_BOSS.actions.some((a) => a.kind === 'attack' && a.range);
    expect(hasFire).toBe(true);
    expect(hasRanged).toBe(true);
  });

  it('every summon action points at a registered Chapter 12 monster', () => {
    for (const def of [...CH12_MONSTERS, CH12_BOSS]) {
      for (const action of def.actions) {
        if (action.kind === 'summon') {
          expect(KNOWN_IDS.has(action.summonDefId)).toBe(true);
        }
      }
    }
  });

  it('leans into fire, reach and attrition — fire damage, frighten/blind, and a sustain all appear', () => {
    let fireDamage = false;
    const debuffConditions = new Set<string>();
    let sustains = false;
    for (const def of [...CH12_MONSTERS, CH12_BOSS]) {
      for (const action of def.actions) {
        if (action.kind === 'attack' && action.damageType === 'fire') fireDamage = true;
        if (action.kind === 'debuff') debuffConditions.add(action.condition);
        if (action.kind === 'sustain') sustains = true;
      }
    }
    expect(fireDamage).toBe(true);
    expect(debuffConditions.has('frightened')).toBe(true);
    expect(debuffConditions.has('blinded')).toBe(true);
    expect(sustains).toBe(true);
  });

  it('the toolkit is exercised across the chapter (attack/debuff/summon/sustain/multiattack/frenzy)', () => {
    const kinds = new Set<string>();
    let frenzy = false;
    for (const def of [...CH12_MONSTERS, CH12_BOSS]) {
      def.actions.forEach((a) => kinds.add(a.kind));
      if (def.bossMechanic === 'battle-rage') frenzy = true;
    }
    for (const k of ['attack', 'debuff', 'summon', 'sustain', 'multiattack']) {
      expect(kinds.has(k)).toBe(true);
    }
    expect(frenzy).toBe(true);
  });
});

describe('chapter 12 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only known Chapter 12 monster defIds', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(KNOWN_IDS.has(m.defId)).toBe(true);
          expect(m.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the boss never appears in a normal combat pool', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH12_BOSS.id)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and rewards sit a band above Ch9', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch9 bands: warmup ~1090-1130, earlyMid ~1570-1680, mid ~1990-2060, elite ~2780-2920.
    expect(min(WARMUP_POOL)).toBeGreaterThan(1400);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(2000);
    expect(min(MID_POOL)).toBeGreaterThan(2500);
    expect(min(ELITE_POOL)).toBeGreaterThan(3400);
  });
});

describe('chapter 12 — ready-to-wire flavor + intel', () => {
  it('points at the registered boss', () => {
    expect(CHAPTER12_FLAVOR.bossDefId).toBe(CH12_BOSS.id);
    expect(CHAPTER12_FLAVOR.chapter).toBe(12);
    expect(CHAPTER12_FLAVOR.prefix).toBe('c12');
  });

  it('the boss reward sits above the Ch9 boss', () => {
    // Ch9 boss (The Hollow Pretender) awards 3800 XP.
    expect(CHAPTER12_FLAVOR.boss.xpReward).toBeGreaterThan(3800);
    expect(CHAPTER12_FLAVOR.boss.goldReward).toBeGreaterThan(0);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER12_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER12_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER12_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER12_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER12_FLAVOR.boss.title.length).toBeGreaterThan(0);
    for (const room of [...CHAPTER12_FLAVOR.shrines, ...CHAPTER12_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });

  it('the boss intel card matches the boss and prices at the standard curve', () => {
    expect(CHAPTER12_BOSS_INTEL.bossDefId).toBe(CH12_BOSS.id);
    expect(CHAPTER12_BOSS_INTEL.chapter).toBe(12);
    // 5·ch² + 20·ch for ch=12.
    expect(CHAPTER12_BOSS_INTEL.coinCost).toBe(960);
    expect(CHAPTER12_BOSS_INTEL.roomTitle.length).toBeGreaterThan(0);
    expect(CHAPTER12_BOSS_INTEL.roomFlavor.length).toBeGreaterThan(0);
    expect(CHAPTER12_BOSS_INTEL.weakSpotResolution.length).toBeGreaterThan(0);
    expect(CHAPTER12_BOSS_INTEL.battlePlanResolution.length).toBeGreaterThan(0);
    expect(CHAPTER12_BOSS_INTEL.walkPastResolution.length).toBeGreaterThan(0);
  });
});
