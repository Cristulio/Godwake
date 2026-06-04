import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER11_FLAVOR,
  CHAPTER11_BOSS_INTEL,
  type EncounterEntry,
} from './chapter11Pools';
import { MonsterSchema, type Monster } from '../../schemas/monster';
import { SPINED_ABISHAI } from '../../content/monsters/spined-abishai';
import { SLAYER_SHADE } from '../../content/monsters/slayer-shade';
import { WRAITH_OF_FEAR } from '../../content/monsters/wraith-of-fear';
import { AVATAR_OF_WRATH } from '../../content/monsters/avatar-of-wrath';
import { MIRROR_OF_PRIDE } from '../../content/monsters/mirror-of-pride';
import { HOARDING_FIEND_OF_GREED } from '../../content/monsters/hoarding-fiend-of-greed';
import { DEVOURER_OF_SELFISHNESS } from '../../content/monsters/devourer-of-selfishness';
import { IRENICUS } from '../../content/monsters/irenicus';

/**
 * Chapter 11 ("The Trials of the Pit") content gate. The chapter is unreachable
 * until integration wires every L20 chapter into createDelve / the monster
 * registry at once, so this suite owns the bestiary + pool invariants in isolation:
 * it imports the monster constants directly (triggering their schema parse) and
 * asserts every pool defId and the boss defId resolve to a monster authored here.
 */

const CH11_MONSTERS: Monster[] = [
  SPINED_ABISHAI,
  SLAYER_SHADE,
  WRAITH_OF_FEAR,
  AVATAR_OF_WRATH,
  MIRROR_OF_PRIDE,
  HOARDING_FIEND_OF_GREED,
  DEVOURER_OF_SELFISHNESS,
];

const CH11_BOSS = IRENICUS;

const BY_ID = new Map<string, Monster>(
  [...CH11_MONSTERS, CH11_BOSS].map((m) => [m.id, m]),
);

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 11 — bestiary registration', () => {
  it('every Chapter 11 monster re-parses against the schema', () => {
    for (const def of [...CH11_MONSTERS, CH11_BOSS]) {
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (Jon Irenicus) carries an apex stat block a notch above Ch9', () => {
    expect(CH11_BOSS.id).toBe('irenicus');
    expect(CH11_BOSS.name).toBe('Jon Irenicus');
    expect(CH11_BOSS.cr).toBe('16');
    // boss-framework: the captor now escalates via the framework — he acts twice
    // a turn and at half HP cracks into the Slayer (a transform phase that gains a
    // third action), replacing the legacy `battle-rage`.
    expect(CH11_BOSS.bossMechanic).toBeUndefined();
    expect(CH11_BOSS.actionsPerTurn).toBe(2);
    expect(
      CH11_BOSS.phases?.some((p) => p.atHpPctBelow === 50 && p.transform),
    ).toBe(true);
    // A clear notch above the Ch9 boss (the Hollow Pretender: 240 HP / AC 21).
    expect(CH11_BOSS.maxHp).toBeGreaterThan(240);
    expect(CH11_BOSS.ac).toBeGreaterThanOrEqual(21);
    // Apex kit: a round-1 paralyze opener + a multiattack the picker falls to + a heavy attack.
    const kinds = CH11_BOSS.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
    // The Binding Word is now a telegraphed wind-up.
    expect(CH11_BOSS.actions.some((a) => a.telegraph)).toBe(true);
  });

  it('every summon action points at a monster authored in this chapter', () => {
    for (const def of [...CH11_MONSTERS, CH11_BOSS]) {
      for (const action of def.actions) {
        if (action.kind === 'summon') {
          expect(BY_ID.has(action.summonDefId)).toBe(true);
        }
      }
    }
  });

  it('the Hell-trial kit is exercised — paralyze, fear, blind/weaken, life-drain and a hoard-ward all appear', () => {
    const debuffConditions = new Set<string>();
    const kinds = new Set<string>();
    let lifeDrains = false;
    let selfWard = false;
    for (const def of [...CH11_MONSTERS, CH11_BOSS]) {
      for (const action of def.actions) {
        kinds.add(action.kind);
        if (action.kind === 'debuff') debuffConditions.add(action.condition);
        if (action.kind === 'attack' && action.lifeDrain) lifeDrains = true;
        if (action.kind === 'sustain' && action.target === 'self' && action.wardTempHp) {
          selfWard = true;
        }
      }
    }
    for (const k of ['attack', 'paralyze', 'debuff', 'summon', 'sustain', 'multiattack']) {
      expect(kinds.has(k)).toBe(true);
    }
    expect(debuffConditions.has('frightened')).toBe(true);
    expect(lifeDrains).toBe(true);
    expect(selfWard).toBe(true);
  });
});

describe('chapter 11 — encounter pools', () => {
  it('all four pools carry an escalating 6-7 entries', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThanOrEqual(6);
    }
  });

  it('every pool entry references only monsters authored in this chapter', () => {
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
        expect(entry.monsters.some((m) => m.defId === CH11_BOSS.id)).toBe(false);
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
    expect(min(WARMUP_POOL)).toBeGreaterThan(1300);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(1850);
    expect(min(MID_POOL)).toBeGreaterThan(2400);
    expect(min(ELITE_POOL)).toBeGreaterThan(3200);
  });
});

describe('chapter 11 — ready-to-wire flavor + intel', () => {
  it('points at the registered boss', () => {
    expect(CHAPTER11_FLAVOR.bossDefId).toBe(CH11_BOSS.id);
    expect(BY_ID.has(CHAPTER11_FLAVOR.bossDefId)).toBe(true);
    expect(CHAPTER11_FLAVOR.chapter).toBe(11);
    expect(CHAPTER11_FLAVOR.prefix).toBe('c11');
  });

  it('the boss reward sits above the Ch9 boss', () => {
    // Ch9 boss (the Hollow Pretender) awards 3800 XP / 540 gold.
    expect(CHAPTER11_FLAVOR.boss.xpReward).toBe(5400);
    expect(CHAPTER11_FLAVOR.boss.goldReward).toBe(750);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER11_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER11_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER11_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER11_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER11_FLAVOR.boss.title.length).toBeGreaterThan(0);
    for (const room of [...CHAPTER11_FLAVOR.shrines, ...CHAPTER11_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });

  it('the boss intel card matches the boss and prices at the chapter-11 sink', () => {
    expect(CHAPTER11_BOSS_INTEL.bossDefId).toBe(CH11_BOSS.id);
    expect(CHAPTER11_BOSS_INTEL.chapter).toBe(11);
    // bossIntelCoinCost(11) = 5·121 + 20·11 = 825.
    expect(CHAPTER11_BOSS_INTEL.coinCost).toBe(825);
    expect(CHAPTER11_BOSS_INTEL.roomTitle.length).toBeGreaterThan(0);
    expect(CHAPTER11_BOSS_INTEL.roomFlavor.length).toBeGreaterThan(0);
    expect(CHAPTER11_BOSS_INTEL.weakSpotResolution.length).toBeGreaterThan(0);
    expect(CHAPTER11_BOSS_INTEL.battlePlanResolution.length).toBeGreaterThan(0);
    expect(CHAPTER11_BOSS_INTEL.walkPastResolution.length).toBeGreaterThan(0);
  });
});
