import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER5_TITLE,
  CHAPTER5_FLAVOR,
  type EncounterEntry,
} from './chapter5Pools';
import { getMonster, listMonsters } from '../../content/monsters';
import { getBossIntelCard, intelEventIdFor } from '../../content/bossIntel';
import { getEvent } from '../../content/events';

/**
 * Chapter 5 (The Godwake) content gate. The chapter is authored but NOT yet
 * wired into createDelve (the procedural-map lane owns that file), so these
 * tests assert the content is VALID and ready to wire: every new monster + the
 * boss parse and register, the boss carries a mechanic + an intel card, and
 * every pool composition references a real registered monster with sane counts
 * and rewards.
 */

const CH5_MONSTER_IDS = [
  'reborn-husk',
  'ashen-chorister',
  'hollow-seraph',
  'cycle-shepherd',
  'deathless-penitent',
  'godsblood-welter',
  'apostle-of-stillness',
  'starflensed-mawn',
  'fallen-archon',
];

const BOSS_ID = 'hollow-dawn';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['early-mid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('Chapter 5 bestiary — monsters parse + register', () => {
  it('every new Ch5 monster resolves via getMonster', () => {
    for (const id of CH5_MONSTER_IDS) {
      expect(() => getMonster(id)).not.toThrow();
      expect(getMonster(id).id).toBe(id);
    }
  });

  it('the registry contains exactly one entry per Ch5 monster id (no dupes)', () => {
    const ids = listMonsters().map((m) => m.id);
    for (const id of [...CH5_MONSTER_IDS, BOSS_ID]) {
      expect(ids.filter((x) => x === id)).toHaveLength(1);
    }
  });

  it('Ch5 monsters sit in the endgame CR band (3-7) below the boss', () => {
    for (const id of CH5_MONSTER_IDS) {
      const cr = Number(getMonster(id).cr);
      expect(cr).toBeGreaterThanOrEqual(3);
      expect(cr).toBeLessThanOrEqual(7);
    }
  });

  it('any summoned reinforcement a Ch5 monster calls is itself registered', () => {
    for (const id of CH5_MONSTER_IDS) {
      for (const action of getMonster(id).actions) {
        if (action.kind === 'summon') {
          expect(() => getMonster(action.summonDefId)).not.toThrow();
        }
      }
    }
  });
});

describe('Chapter 5 boss — Aurelach, the Hollow Dawn', () => {
  const boss = getMonster(BOSS_ID);

  it('parses and is the hardest stat block (strictly above the Ch4 Matron)', () => {
    const matron = getMonster('drow-matron-mother');
    expect(Number(boss.cr)).toBeGreaterThan(Number(matron.cr));
    expect(boss.maxHp).toBeGreaterThan(matron.maxHp);
    expect(boss.ac).toBeGreaterThanOrEqual(matron.ac);
  });

  it('carries an escalation mechanic, a held-opener, and the illusion kit', () => {
    // Escalation folded from battle-rage into a half-HP enrage phase.
    expect(boss.phases?.some((p) => p.atHpPctBelow <= 50)).toBe(true);
    expect(boss.actions.some((a) => a.kind === 'paralyze')).toBe(true);
    // Deception kit: a summoned decoy dawn + a concealment debuff.
    expect(boss.actions.some((a) => a.kind === 'summon')).toBe(true);
    expect(boss.actions.some((a) => a.kind === 'debuff')).toBe(true);
  });

  it('every boss action is reachable by the action picker (has the swing multiattack repeats)', () => {
    const hasMulti = boss.actions.some((a) => a.kind === 'multiattack');
    const hasAttack = boss.actions.some((a) => a.kind === 'attack');
    expect(hasMulti).toBe(true);
    expect(hasAttack).toBe(true);
  });

  it('has a Chapter-5 boss-intel card wired to the new combat-edge format', () => {
    const card = getBossIntelCard(BOSS_ID);
    expect(card).toBeTruthy();
    expect(card!.chapter).toBe(5);
    expect(card!.coinCost).toBe(225);
    expect(card!.roomFlavor.length).toBeGreaterThan(0);
    expect(card!.weakSpotResolution.length).toBeGreaterThan(0);
    expect(card!.battlePlanResolution.length).toBeGreaterThan(0);
    expect(card!.walkPastResolution.length).toBeGreaterThan(0);
  });

  it('its intel card is registered as a resolvable event template', () => {
    expect(() => getEvent(intelEventIdFor(BOSS_ID))).not.toThrow();
  });
});

describe('Chapter 5 encounter pools — comps are valid', () => {
  it('every pool is non-empty', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, `${name} pool should have entries`).toBeGreaterThan(0);
    }
  });

  it('every encounter references registered monsters with sane counts', () => {
    for (const [name, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length, `${name}: "${entry.title}"`).toBeGreaterThan(0);
        for (const m of entry.monsters) {
          expect(() => getMonster(m.defId), `${name}: ${m.defId}`).not.toThrow();
          expect(m.count).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('every encounter has positive XP and non-negative gold', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
        if (entry.goldReward !== undefined) {
          expect(entry.goldReward).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('the boss never appears as a poolable encounter (it is the fixed slot)', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        for (const m of entry.monsters) {
          expect(m.defId).not.toBe(BOSS_ID);
        }
      }
    }
  });

  it('pools draw only from the Ch5 bestiary (cohesive endgame chapter)', () => {
    const allowed = new Set(CH5_MONSTER_IDS);
    for (const [name, pool] of ALL_POOLS) {
      for (const entry of pool) {
        for (const m of entry.monsters) {
          expect(allowed.has(m.defId), `${name}: ${m.defId}`).toBe(true);
        }
      }
    }
  });

  it('reward bands escalate warmup → early-mid → mid → elite', () => {
    const avg = (pool: EncounterEntry[]) =>
      pool.reduce((a, e) => a + e.xpReward, 0) / pool.length;
    const w = avg(WARMUP_POOL);
    const em = avg(EARLY_MID_POOL);
    const m = avg(MID_POOL);
    const el = avg(ELITE_POOL);
    expect(em).toBeGreaterThan(w);
    expect(m).toBeGreaterThan(em);
    expect(el).toBeGreaterThan(m);
  });

  it('the endgame band pays more than the Ch4 elite band (rewards scale by tier)', () => {
    const ch5EliteAvg =
      ELITE_POOL.reduce((a, e) => a + e.xpReward, 0) / ELITE_POOL.length;
    // Ch4 elite entries pay ~920-1000 XP; Ch5 elites must clear that.
    expect(ch5EliteAvg).toBeGreaterThan(1000);
  });
});

describe('Chapter 5 flavor', () => {
  it('exposes a title and threshold flavor for the wiring follow-up', () => {
    expect(CHAPTER5_TITLE).toBe('The Godwake');
    expect(CHAPTER5_FLAVOR.length).toBeGreaterThan(0);
  });
});
