import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER8_FLAVOR,
  type EncounterEntry,
} from './chapter8Pools';
import { getMonster } from '../../content/monsters';
import { MonsterSchema } from '../../schemas/monster';
import { getBossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 8 ("The Ashfall March") content gate: every new monster, the boss,
 * the four pools, and the ready-to-wire flavor must be valid + registered +
 * internally consistent. The chapter is wired into createDelve (createDelve.test
 * covers placement); this suite owns the bestiary + pool invariants in isolation
 * so the content stays sound independent of the chain.
 */

const CH8_MONSTER_IDS = [
  'ember-conscript',
  'cinderwake-hound',
  'slagbound-legionary',
  'ashchoke-herald',
  'gravesmoke-revenant',
  'pyre-chaplain',
  'slag-colossus',
] as const;

const CH8_BOSS_ID = 'ashen-marshal';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 8 — bestiary registration', () => {
  it('every Chapter 8 monster is registered and re-parses against the schema', () => {
    for (const id of [...CH8_MONSTER_IDS, CH8_BOSS_ID]) {
      const def = getMonster(id);
      expect(def.id).toBe(id);
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (the Ashen Marshal) carries an apex stat block a notch above Ch6, clearing Ch7', () => {
    const boss = getMonster(CH8_BOSS_ID);
    expect(boss.bossMechanic).toBe('battle-rage');
    // A clear notch above the Ch6 boss (The Unmade: 184 HP / AC 19), and post-buff
    // it also clears the Ch7 boss on the body: the pre-buff clone (212 HP, a hair
    // over the Drowned Custodian's 210) was the pushover, so lock the curve loud —
    // a future flat-clone of the Ch7 boss regresses right here.
    expect(boss.maxHp).toBeGreaterThan(184);
    expect(boss.maxHp).toBeGreaterThan(getMonster('drowned-custodian').maxHp);
    expect(boss.ac).toBeGreaterThanOrEqual(19);
    // Apex kit: a round-1 paralyze opener and a multiattack the picker falls to.
    const kinds = boss.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
  });

  it('every summon action points at a registered monster', () => {
    for (const id of [...CH8_MONSTER_IDS, CH8_BOSS_ID]) {
      for (const action of getMonster(id).actions) {
        if (action.kind === 'summon') {
          expect(() => getMonster(action.summonDefId)).not.toThrow();
        }
      }
    }
  });

  it('the toolkit is exercised across the chapter (attack/paralyze/debuff/summon/sustain/multiattack/frenzy)', () => {
    const kinds = new Set<string>();
    let frenzy = false;
    for (const id of [...CH8_MONSTER_IDS, CH8_BOSS_ID]) {
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

describe('chapter 8 — Slag-Colossus elite sits below its boss', () => {
  const avgDamage = (d: string): number => {
    const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(d);
    if (!m) throw new Error(`unparseable damage: ${d}`);
    const [, n, faces, bonus] = m;
    return (Number(n) * (Number(faces) + 1)) / 2 + Number(bonus ?? 0);
  };

  it('is trimmed below the chapter boss on the BODY (HP + per-hit), summon stays capped', () => {
    const elite = getMonster('slag-colossus');
    const boss = getMonster(CH8_BOSS_ID);
    const legionary = getMonster('slagbound-legionary'); // toughest normal Ch8 mob

    // Below the boss body, but still clearly an elite — well above a normal mob,
    // and trimmed from the pre-#434 wall (178) so it no longer out-difficulties
    // its own (easy) chapter boss.
    expect(elite.maxHp).toBeLessThan(boss.maxHp);
    expect(elite.maxHp).toBeLessThanOrEqual(160);
    expect(elite.maxHp).toBeGreaterThan(legionary.maxHp);

    // Softer single fist than the marshal's blade — the body, not the adds, was
    // the residual wall, so the colossus's lone Siege-Fist hits below the boss.
    const eliteSlam = elite.actions.find((a) => a.kind === 'attack');
    const bossSlam = boss.actions.find((a) => a.kind === 'attack');
    expect(eliteSlam && 'damage' in eliteSlam ? avgDamage(eliteSlam.damage) : Infinity).toBeLessThan(
      bossSlam && 'damage' in bossSlam ? avgDamage(bossSlam.damage) : 0,
    );

    // The summon lever stays exhausted (#432): one add at a time, delayed.
    const summon = elite.actions.find((a) => a.kind === 'summon');
    expect(summon && 'maxActive' in summon ? summon.maxActive : 99).toBeLessThanOrEqual(1);
  });
});

describe('chapter 8 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only registered Chapter 8 monster defIds', () => {
    const allowed = new Set<string>(CH8_MONSTER_IDS);
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
        expect(entry.monsters.some((m) => m.defId === CH8_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and rewards sit a band above Ch6', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch6 bands: warmup ~680-720, earlyMid ~980-1100, mid ~1240-1340, elite ~1760-1880.
    expect(min(WARMUP_POOL)).toBeGreaterThan(800);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(1240);
    expect(min(MID_POOL)).toBeGreaterThan(1500);
    expect(min(ELITE_POOL)).toBeGreaterThan(2000);
  });
});

describe('chapter 8 — ready-to-wire flavor', () => {
  it('points at the registered boss and matches the intel card', () => {
    expect(CHAPTER8_FLAVOR.bossDefId).toBe(CH8_BOSS_ID);
    expect(() => getMonster(CHAPTER8_FLAVOR.bossDefId)).not.toThrow();
    expect(getBossIntelCard(CH8_BOSS_ID)).not.toBeNull();
    expect(getBossIntelCard(CH8_BOSS_ID)?.chapter).toBe(8);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER8_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER8_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER8_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER8_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER8_FLAVOR.boss.title.length).toBeGreaterThan(0);
    expect(CHAPTER8_FLAVOR.boss.xpReward).toBeGreaterThan(0);
    for (const room of [...CHAPTER8_FLAVOR.shrines, ...CHAPTER8_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });
});
