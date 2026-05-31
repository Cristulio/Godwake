import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER7_FLAVOR,
  type EncounterEntry,
} from './chapter7Pools';
import { getMonster } from '../../content/monsters';
import { MonsterSchema } from '../../schemas/monster';
import { getBossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 7 · "The Drowned Archive" readiness gate. Every new monster, the boss,
 * the four pools, and the ready-to-wire flavor must be valid + registered +
 * internally consistent, and the whole band must sit a clear notch above
 * Chapter 6 (the first chapter of the L20 expansion continues the curve, it
 * does not restart it).
 */

const CH7_MONSTER_IDS = [
  'drowned-acolyte',
  'page-wraith',
  'ink-drowned-scholar',
  'brine-archivist',
  'drowned-mnemonic',
  'the-unindexed',
  'tidebound-codex',
] as const;

const CH7_BOSS_ID = 'drowned-custodian';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 7 — bestiary registration', () => {
  it('every Chapter 7 monster is registered and re-parses against the schema', () => {
    for (const id of [...CH7_MONSTER_IDS, CH7_BOSS_ID]) {
      const def = getMonster(id);
      expect(def.id).toBe(id);
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (The Drowned Custodian) carries the apex stat block + boss mechanic', () => {
    const boss = getMonster(CH7_BOSS_ID);
    expect(boss.bossMechanic).toBe('battle-rage');
    // A clear notch above the Ch6 boss (The Unmade: 184 HP / AC 19).
    expect(boss.maxHp).toBeGreaterThan(184);
    expect(boss.ac).toBeGreaterThanOrEqual(19);
    const kinds = boss.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
  });

  it('every summon action points at a registered monster', () => {
    for (const id of [...CH7_MONSTER_IDS, CH7_BOSS_ID]) {
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
    for (const id of [...CH7_MONSTER_IDS, CH7_BOSS_ID]) {
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

describe('chapter 7 — encounter pools', () => {
  it('all four pools are non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThan(0);
    }
  });

  it('every pool entry references only registered monster defIds', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(() => getMonster(m.defId)).not.toThrow();
          expect(m.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the boss never appears in a normal combat pool', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH7_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and the band sits a clear notch above Ch6', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch6 maxima: warmup 720, earlyMid 1100, mid 1340, elite 1880. Ch7 mins clear them.
    expect(min(WARMUP_POOL)).toBeGreaterThan(720);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(1100);
    expect(min(MID_POOL)).toBeGreaterThan(1340);
    expect(min(ELITE_POOL)).toBeGreaterThan(1880);
  });
});

describe('chapter 7 — wired flavor', () => {
  it('points at the registered boss and matches the intel card', () => {
    expect(CHAPTER7_FLAVOR.bossDefId).toBe(CH7_BOSS_ID);
    expect(() => getMonster(CHAPTER7_FLAVOR.bossDefId)).not.toThrow();
    expect(getBossIntelCard(CH7_BOSS_ID)).not.toBeNull();
    expect(getBossIntelCard(CH7_BOSS_ID)?.chapter).toBe(7);
  });

  it('carries the non-combat room flavor the chapter needs', () => {
    expect(CHAPTER7_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER7_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER7_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER7_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER7_FLAVOR.boss.title.length).toBeGreaterThan(0);
    expect(CHAPTER7_FLAVOR.boss.xpReward).toBeGreaterThan(0);
    for (const room of [...CHAPTER7_FLAVOR.shrines, ...CHAPTER7_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });
});
