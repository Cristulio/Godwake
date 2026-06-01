import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER14_FLAVOR,
  CHAPTER14_BOSS_INTEL,
  type EncounterEntry,
} from './chapter14Pools';
import { MonsterSchema, type Monster } from '../../schemas/monster';
import { BHAAL_ESSENCE_MOTE } from '../../content/monsters/bhaal-essence-mote';
import { THRONE_ABISHAI } from '../../content/monsters/throne-abishai';
import { BLOOD_FIEND } from '../../content/monsters/blood-fiend';
import { MURDER_HERALD } from '../../content/monsters/murder-herald';
import { SLAYER_ECHO } from '../../content/monsters/slayer-echo';
import { ESSENCE_WARDEN } from '../../content/monsters/essence-warden';
import { MARILITH_WARDEN } from '../../content/monsters/marilith-warden';
import { MELISSAN } from '../../content/monsters/melissan';

/**
 * Chapter 14 ("The Throne of Bhaal") content gate: the L20 finale bestiary, the
 * Melissan boss, the four pools, and the ready-to-wire flavor + intel must be
 * valid + internally consistent. Integration wires the chapter into the registry,
 * createDelve, and bossIntel all at once; this suite owns the bestiary + pool
 * invariants in isolation, importing the monster constants directly so it stays
 * disjoint from monsters/index.ts.
 */

const CH14_MONSTERS: Monster[] = [
  BHAAL_ESSENCE_MOTE,
  THRONE_ABISHAI,
  BLOOD_FIEND,
  MURDER_HERALD,
  SLAYER_ECHO,
  ESSENCE_WARDEN,
  MARILITH_WARDEN,
];

const CH14_BOSS = MELISSAN;
const CH14_BOSS_ID = 'melissan';

/** Local id→monster registry; the integration lane folds these into the global one. */
const BY_ID = new Map<string, Monster>(
  [...CH14_MONSTERS, CH14_BOSS].map((m) => [m.id, m]),
);

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 14 — bestiary', () => {
  it('every monster re-parses against the schema and has a unique id', () => {
    const ids = new Set<string>();
    for (const def of [...CH14_MONSTERS, CH14_BOSS]) {
      expect(() => MonsterSchema.parse(def)).not.toThrow();
      expect(ids.has(def.id)).toBe(false);
      ids.add(def.id);
    }
    expect(ids.size).toBe(8);
  });

  it('Melissan carries the biggest statblock in the game (CR 18, clearly above Irenicus CR16)', () => {
    expect(CH14_BOSS.id).toBe(CH14_BOSS_ID);
    expect(CH14_BOSS.cr).toBe('18');
    expect(CH14_BOSS.bossMechanic).toBe('battle-rage');
    // Apex by a clear margin: every prior boss tops out at 240 HP / AC 21.
    expect(CH14_BOSS.maxHp).toBeGreaterThan(300);
    expect(CH14_BOSS.ac).toBeGreaterThanOrEqual(22);
    // Multi-phase control/summon kit: paralyze opener, summon, multiattack, attack.
    const kinds = CH14_BOSS.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('summon');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
  });

  it('every summon action points at a monster registered in this chapter', () => {
    for (const def of [...CH14_MONSTERS, CH14_BOSS]) {
      for (const action of def.actions) {
        if (action.kind === 'summon') {
          expect(BY_ID.has(action.summonDefId)).toBe(true);
        }
      }
    }
  });

  it('exercises the full toolkit across the chapter (attack/paralyze/debuff/summon/sustain/multiattack/life-drain/frenzy)', () => {
    const kinds = new Set<string>();
    let lifeDrain = false;
    let frenzy = false;
    for (const def of [...CH14_MONSTERS, CH14_BOSS]) {
      def.actions.forEach((a) => {
        kinds.add(a.kind);
        if (a.kind === 'attack' && a.lifeDrain) lifeDrain = true;
      });
      if (def.bossMechanic === 'battle-rage') frenzy = true;
    }
    for (const k of ['attack', 'paralyze', 'debuff', 'summon', 'sustain', 'multiattack']) {
      expect(kinds.has(k)).toBe(true);
    }
    expect(lifeDrain).toBe(true);
    expect(frenzy).toBe(true);
  });
});

describe('chapter 14 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only registered Chapter 14 monster defIds', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(BY_ID.has(m.defId)).toBe(true);
          expect(m.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the boss never appears in a normal combat pool', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH14_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and bands escalate a tier past Ch9', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch9 bands: warmup ~1090, earlyMid ~1570, mid ~1990, elite ~2780.
    expect(min(WARMUP_POOL)).toBeGreaterThan(1900);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(2400);
    expect(min(MID_POOL)).toBeGreaterThan(3000);
    expect(min(ELITE_POOL)).toBeGreaterThan(4100);
  });
});

describe('chapter 14 — ready-to-wire flavor + intel', () => {
  it('points at the registered boss', () => {
    expect(CHAPTER14_FLAVOR.bossDefId).toBe(CH14_BOSS_ID);
    expect(BY_ID.has(CHAPTER14_FLAVOR.bossDefId)).toBe(true);
    expect(CHAPTER14_FLAVOR.chapter).toBe(14);
    expect(CHAPTER14_FLAVOR.prefix).toBe('c14');
  });

  it('the boss reward is the apex of the game', () => {
    expect(CHAPTER14_FLAVOR.boss.xpReward).toBe(6800);
    expect(CHAPTER14_FLAVOR.boss.goldReward).toBe(950);
  });

  it('the intel card matches the boss and prices on the super-linear curve', () => {
    expect(CHAPTER14_BOSS_INTEL.bossDefId).toBe(CH14_BOSS_ID);
    expect(CHAPTER14_BOSS_INTEL.chapter).toBe(14);
    expect(CHAPTER14_BOSS_INTEL.coinCost).toBe(1260);
    for (const k of [
      'roomTitle',
      'roomFlavor',
      'weakSpotResolution',
      'battlePlanResolution',
      'walkPastResolution',
    ] as const) {
      expect(CHAPTER14_BOSS_INTEL[k].length).toBeGreaterThan(0);
    }
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER14_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER14_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER14_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER14_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER14_FLAVOR.boss.title.length).toBeGreaterThan(0);
    for (const room of [...CHAPTER14_FLAVOR.shrines, ...CHAPTER14_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });
});
