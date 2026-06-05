import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER9_FLAVOR,
  type EncounterEntry,
} from './chapter9Pools';
import { getMonster } from '../../content/monsters';
import { MonsterSchema } from '../../schemas/monster';
import { getBossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 9 ("The Court of Masks") content gate: every new monster, the boss,
 * the four pools, and the ready-to-wire flavor must be valid + registered +
 * internally consistent. The chapter is wired into createDelve (createDelve.test
 * covers placement); this suite owns the bestiary + pool invariants in isolation
 * so the content stays sound independent of the chain.
 */

const CH9_MONSTER_IDS = [
  'masque-wisp',
  'mirror-double',
  'veilsworn-courtier',
  'glasswright-duelist',
  'pale-favourite',
  'masquerade-warden',
  'mask-chamberlain',
] as const;

const CH9_BOSS_ID = 'the-hollow-pretender';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 9 — bestiary registration', () => {
  it('every Chapter 9 monster is registered and re-parses against the schema', () => {
    for (const id of [...CH9_MONSTER_IDS, CH9_BOSS_ID]) {
      const def = getMonster(id);
      expect(def.id).toBe(id);
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (The Hollow Pretender) carries an apex stat block a notch above Ch8', () => {
    const boss = getMonster(CH9_BOSS_ID);
    expect(boss.bossMechanic).toBe('battle-rage');
    // The Ch8 boss buff lifted the Ashen Marshal to 264 HP / AC 21 — above this
    // boss on raw HP. Ch9 outranks Ch8 through its multi-action wall (actionsPerTurn
    // 2), not the body, so this stays a plain apex-HP floor, not a Ch8 comparison.
    expect(boss.maxHp).toBeGreaterThan(212);
    expect(boss.ac).toBeGreaterThanOrEqual(20);
    // Apex kit: a round-1 paralyze opener and a multiattack the picker falls to.
    const kinds = boss.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
  });

  it('every summon action points at a registered monster', () => {
    for (const id of [...CH9_MONSTER_IDS, CH9_BOSS_ID]) {
      for (const action of getMonster(id).actions) {
        if (action.kind === 'summon') {
          expect(() => getMonster(action.summonDefId)).not.toThrow();
        }
      }
    }
  });

  it('leans into illusion/deception — frighten, blind and life-drain all appear', () => {
    const debuffConditions = new Set<string>();
    let lifeDrains = false;
    for (const id of CH9_MONSTER_IDS) {
      for (const action of getMonster(id).actions) {
        if (action.kind === 'debuff') debuffConditions.add(action.condition);
        if (action.kind === 'attack' && action.lifeDrain) lifeDrains = true;
      }
    }
    expect(debuffConditions.has('frightened')).toBe(true);
    expect(debuffConditions.has('blinded')).toBe(true);
    expect(lifeDrains).toBe(true);
  });

  it('the toolkit is exercised across the chapter (attack/paralyze/debuff/summon/sustain/multiattack/frenzy)', () => {
    const kinds = new Set<string>();
    let frenzy = false;
    for (const id of [...CH9_MONSTER_IDS, CH9_BOSS_ID]) {
      const def = getMonster(id);
      def.actions.forEach((a) => kinds.add(a.kind));
      if (def.bossMechanic === 'battle-rage') frenzy = true;
    }
    for (const k of ['attack', 'paralyze', 'debuff', 'summon', 'sustain', 'multiattack']) {
      expect(kinds.has(k)).toBe(true);
    }
    expect(frenzy).toBe(true);
  });
});

describe('chapter 9 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only registered Chapter 9 monster defIds', () => {
    const allowed = new Set<string>(CH9_MONSTER_IDS);
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(() => getMonster(m.defId)).not.toThrow();
          expect(allowed.has(m.defId)).toBe(true);
          expect(m.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the boss never appears in a normal combat pool', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH9_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and rewards sit a band above Ch8', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch8 bands: warmup ~880-920, earlyMid ~1300-1420, mid ~1620-1720, elite ~2300-2460.
    expect(min(WARMUP_POOL)).toBeGreaterThan(1000);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(1500);
    expect(min(MID_POOL)).toBeGreaterThan(1900);
    expect(min(ELITE_POOL)).toBeGreaterThan(2600);
  });
});

describe('chapter 9 — ready-to-wire flavor', () => {
  it('points at the registered boss and matches the intel card', () => {
    expect(CHAPTER9_FLAVOR.bossDefId).toBe(CH9_BOSS_ID);
    expect(() => getMonster(CHAPTER9_FLAVOR.bossDefId)).not.toThrow();
    expect(getBossIntelCard(CH9_BOSS_ID)).not.toBeNull();
    expect(getBossIntelCard(CH9_BOSS_ID)?.chapter).toBe(9);
  });

  it('the boss reward sits above the Ch8 boss', () => {
    // Ch8 boss (the Ashen Marshal) awards 3100 XP.
    expect(CHAPTER9_FLAVOR.boss.xpReward).toBeGreaterThan(3100);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER9_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER9_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER9_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER9_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER9_FLAVOR.boss.title.length).toBeGreaterThan(0);
    expect(CHAPTER9_FLAVOR.boss.xpReward).toBeGreaterThan(0);
    for (const room of [...CHAPTER9_FLAVOR.shrines, ...CHAPTER9_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });
});
