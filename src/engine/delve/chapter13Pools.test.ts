import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER13_FLAVOR,
  CHAPTER13_BOSS_INTEL,
  type EncounterEntry,
} from './chapter13Pools';
import { MonsterSchema } from '../../schemas/monster';
import { PETRIFIED_AMBUSHER } from '../../content/monsters/petrified-ambusher';
import { KUO_TOA_DEEPGUARD } from '../../content/monsters/kuo-toa-deepguard';
import { BLUE_WYRMLING } from '../../content/monsters/blue-wyrmling';
import { SENDAI_HANDMAIDEN } from '../../content/monsters/sendai-handmaiden';
import { STORMSCALE_DRAKE } from '../../content/monsters/stormscale-drake';
import { HALF_DRAGON_REAVER } from '../../content/monsters/half-dragon-reaver';
import { SENDAI } from '../../content/monsters/sendai';
import { ABAZIGAL } from '../../content/monsters/abazigal';

/**
 * Chapter 13 ("The Last of the Five") content gate: every new monster, the boss,
 * the four pools, and the ready-to-wire flavor + boss intel must be valid and
 * internally consistent. Integration wires the chapter into the registry and the
 * delve chain at once (monsters/index, MonsterPortrait, createDelve, bossIntel);
 * this suite owns the bestiary + pool invariants in isolation, importing the
 * monster constants directly so it stays sound independent of that wiring.
 */

const CH13_REGULARS = [
  PETRIFIED_AMBUSHER,
  KUO_TOA_DEEPGUARD,
  BLUE_WYRMLING,
  SENDAI_HANDMAIDEN,
  STORMSCALE_DRAKE,
  HALF_DRAGON_REAVER,
  SENDAI,
] as const;

const CH13_BOSS_ID = 'abazigal';

const REGISTERED_IDS = new Set<string>([
  ...CH13_REGULARS.map((m) => m.id),
  ABAZIGAL.id,
]);

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 13 — bestiary', () => {
  it('every Chapter 13 monster re-parses against the schema', () => {
    for (const def of [...CH13_REGULARS, ABAZIGAL]) {
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (Korvazel) carries an apex CR 17 stat block ramping toward Maevra', () => {
    expect(ABAZIGAL.id).toBe(CH13_BOSS_ID);
    expect(ABAZIGAL.cr).toBe('17');
    expect(ABAZIGAL.bossMechanic).toBe('battle-rage');
    // A clear band above the Ch9 boss (the Hollow Pretender: 240 HP / AC 21).
    expect(ABAZIGAL.maxHp).toBeGreaterThan(240);
    expect(ABAZIGAL.ac).toBeGreaterThanOrEqual(21);
    // Boss-framework kit: a multi-action turn, a telegraphed lightning-breath
    // action, a frighten debuff, reach, and a half-HP phase.
    const kinds = ABAZIGAL.actions.map((a) => a.kind);
    expect(ABAZIGAL.actionsPerTurn).toBe(2);
    expect(kinds).toContain('debuff');
    expect(ABAZIGAL.phases?.length ?? 0).toBeGreaterThan(0);
    const lightningBreath = ABAZIGAL.actions.find(
      (a) => a.kind === 'attack' && a.damageType === 'lightning',
    );
    expect(lightningBreath).toBeDefined();
    // The breath is the telegraphed wind-up the player races / cancels.
    expect(lightningBreath?.kind === 'attack' && !!lightningBreath.telegraph).toBe(true);
    const hasReach = ABAZIGAL.actions.some((a) => a.kind === 'attack' && (a.reach ?? 0) >= 10);
    expect(hasReach).toBe(true);
    expect(ABAZIGAL.immunities).toContain('lightning');
  });

  it('Szendra is a named CR 15 elite in the ELITE_POOL, not the chapter boss', () => {
    expect(SENDAI.id).toBe('sendai');
    expect(SENDAI.cr).toBe('15');
    const appearsInElite = ELITE_POOL.some((e) =>
      e.monsters.some((m) => m.defId === 'sendai'),
    );
    expect(appearsInElite).toBe(true);
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH13_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every summon action points at a registered Chapter 13 monster', () => {
    for (const def of [...CH13_REGULARS, ABAZIGAL]) {
      for (const action of def.actions) {
        if (action.kind === 'summon') {
          expect(REGISTERED_IDS.has(action.summonDefId)).toBe(true);
        }
      }
    }
  });
});

describe('chapter 13 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only registered Chapter 13 monster defIds', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(REGISTERED_IDS.has(m.defId)).toBe(true);
          expect(m.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every entry awards positive XP, climbing a band above Ch9', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch9 bands: warmup >1000, earlyMid >1500, mid >1900, elite >2600.
    expect(min(WARMUP_POOL)).toBeGreaterThan(1600);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(2100);
    expect(min(MID_POOL)).toBeGreaterThan(2700);
    expect(min(ELITE_POOL)).toBeGreaterThan(3600);
  });
});

describe('chapter 13 — ready-to-wire flavor + boss intel', () => {
  it('points at the registered boss', () => {
    expect(CHAPTER13_FLAVOR.chapter).toBe(13);
    expect(CHAPTER13_FLAVOR.prefix).toBe('c13');
    expect(CHAPTER13_FLAVOR.bossDefId).toBe(CH13_BOSS_ID);
    expect(REGISTERED_IDS.has(CHAPTER13_FLAVOR.bossDefId)).toBe(true);
  });

  it('the boss reward sits above the Ch9 boss', () => {
    // Ch9 boss (the Hollow Pretender) awards 3800 XP.
    expect(CHAPTER13_FLAVOR.boss.xpReward).toBe(5400);
    expect(CHAPTER13_FLAVOR.boss.goldReward).toBe(720);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER13_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER13_FLAVOR.shrines.length).toBe(2);
    expect(CHAPTER13_FLAVOR.rests.length).toBe(2);
    expect(CHAPTER13_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER13_FLAVOR.boss.title.length).toBeGreaterThan(0);
    for (const room of [...CHAPTER13_FLAVOR.shrines, ...CHAPTER13_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });

  it('the boss intel card matches the boss and prices the Ch13 paid edge', () => {
    expect(CHAPTER13_BOSS_INTEL.bossDefId).toBe(CH13_BOSS_ID);
    expect(CHAPTER13_BOSS_INTEL.chapter).toBe(13);
    expect(CHAPTER13_BOSS_INTEL.coinCost).toBe(5 * 169 + 20 * 13);
    expect(CHAPTER13_BOSS_INTEL.coinCost).toBe(1105);
    for (const field of [
      CHAPTER13_BOSS_INTEL.roomTitle,
      CHAPTER13_BOSS_INTEL.roomFlavor,
      CHAPTER13_BOSS_INTEL.weakSpotResolution,
      CHAPTER13_BOSS_INTEL.battlePlanResolution,
      CHAPTER13_BOSS_INTEL.walkPastResolution,
    ]) {
      expect(field.length).toBeGreaterThan(0);
    }
  });
});
