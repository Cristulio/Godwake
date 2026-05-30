import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER6_FLAVOR,
  type EncounterEntry,
} from './chapter6Pools';
import { getMonster } from '../../content/monsters';
import { MonsterSchema } from '../../schemas/monster';
import { getBossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 6 content is built but NOT yet wired into createDelve (the
 * procedural-map lane owns that file; chain-wiring is a separate follow-up).
 * This suite is the readiness gate: every new monster, the boss, the four
 * pools, and the ready-to-wire flavor must be valid + registered + internally
 * consistent so the wiring step is a pure plumbing change.
 */

const CH6_MONSTER_IDS = [
  'threadbare-penitent',
  'cycle-revenant',
  'fate-spinner',
  'loom-apostle',
  'karmic-echo',
  'the-unwound',
  'axle-warden',
] as const;

const CH6_BOSS_ID = 'the-unmade';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 6 — bestiary registration', () => {
  it('every Chapter 6 monster is registered and re-parses against the schema', () => {
    for (const id of [...CH6_MONSTER_IDS, CH6_BOSS_ID]) {
      const def = getMonster(id);
      expect(def.id).toBe(id);
      expect(() => MonsterSchema.parse(def)).not.toThrow();
    }
  });

  it('the boss (The Unmade) carries a strong stat block and a boss mechanic', () => {
    const boss = getMonster(CH6_BOSS_ID);
    expect(boss.bossMechanic).toBe('battle-rage');
    // True endgame — a clear notch above the Ch4 boss (Matron Mother: 96 HP / AC 17).
    expect(boss.maxHp).toBeGreaterThan(96);
    expect(boss.ac).toBeGreaterThanOrEqual(17);
    // Apex kit: a round-1 paralyze opener and a multiattack the picker falls to.
    const kinds = boss.actions.map((a) => a.kind);
    expect(kinds).toContain('paralyze');
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
  });

  it('every summon action points at a registered monster', () => {
    for (const id of [...CH6_MONSTER_IDS, CH6_BOSS_ID]) {
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
    for (const id of [...CH6_MONSTER_IDS, CH6_BOSS_ID]) {
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

describe('chapter 6 — encounter pools', () => {
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
        expect(entry.monsters.some((m) => m.defId === CH6_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive XP, and rewards sit at the top band (above Ch4)', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    // Ch4 bands: warmup ~290-340, earlyMid ~460-620, mid ~600-760, elite ~920-1000.
    expect(min(WARMUP_POOL)).toBeGreaterThan(340);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(620);
    expect(min(MID_POOL)).toBeGreaterThan(760);
    expect(min(ELITE_POOL)).toBeGreaterThan(1000);
  });
});

describe('chapter 6 — ready-to-wire flavor', () => {
  it('points at the registered boss and matches the intel card', () => {
    expect(CHAPTER6_FLAVOR.bossDefId).toBe(CH6_BOSS_ID);
    expect(() => getMonster(CHAPTER6_FLAVOR.bossDefId)).not.toThrow();
    expect(getBossIntelCard(CH6_BOSS_ID)).not.toBeNull();
    expect(getBossIntelCard(CH6_BOSS_ID)?.chapter).toBe(6);
  });

  it('carries the non-combat room flavor the wiring step needs', () => {
    expect(CHAPTER6_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER6_FLAVOR.shrines.length).toBeGreaterThan(0);
    expect(CHAPTER6_FLAVOR.rests.length).toBeGreaterThan(0);
    expect(CHAPTER6_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER6_FLAVOR.boss.title.length).toBeGreaterThan(0);
    expect(CHAPTER6_FLAVOR.boss.xpReward).toBeGreaterThan(0);
    for (const room of [...CHAPTER6_FLAVOR.shrines, ...CHAPTER6_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });
});
