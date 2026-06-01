import { describe, it, expect } from 'vitest';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  CHAPTER10_FLAVOR,
  CHAPTER10_BOSS_INTEL,
  type EncounterEntry,
} from './chapter10Pools';
import type { Monster } from '../../schemas/monster';
import { BODHI_SPAWN } from '../../content/monsters/bodhi-spawn';
import { SULDANESSELLAR_ARCHER } from '../../content/monsters/suldanessellar-archer';
import { SULDANESSELLAR_BLADESINGER } from '../../content/monsters/suldanessellar-bladesinger';
import { DEFILED_DRYAD } from '../../content/monsters/defiled-dryad';
import { SULDANESSELLAR_WARPRIEST } from '../../content/monsters/suldanessellar-warpriest';
import { PALACE_GOLEM } from '../../content/monsters/palace-golem';
import { DEFILED_TREANT } from '../../content/monsters/defiled-treant';
import { RAKSHASA } from '../../content/monsters/rakshasa';
import { NIZIDRAMANIIYT } from '../../content/monsters/nizidramaniiyt';

/**
 * Chapter 10 ("Suldanessellar") content gate. The chapter is not yet wired into
 * the delve registry (a single integration step wires all the L20 chapters at
 * once), so this suite owns the bestiary + pool invariants in isolation: it
 * imports the monster constants directly (each import triggers MonsterSchema
 * parse at load) and checks every pool/boss defId resolves to one of them.
 */

// Importing the constants above already runs MonsterSchema.parse for each — a
// schema error throws at module load and fails the whole suite. This map lets
// the pool checks resolve a defId without depending on the global registry.
const CH10_MONSTERS: Monster[] = [
  BODHI_SPAWN,
  SULDANESSELLAR_ARCHER,
  SULDANESSELLAR_BLADESINGER,
  DEFILED_DRYAD,
  SULDANESSELLAR_WARPRIEST,
  PALACE_GOLEM,
  DEFILED_TREANT,
  RAKSHASA,
  NIZIDRAMANIIYT,
];
const BY_ID = new Map(CH10_MONSTERS.map((m) => [m.id, m]));

const CH10_BOSS_ID = 'nizidramaniiyt';

const ALL_POOLS: Array<[string, EncounterEntry[]]> = [
  ['warmup', WARMUP_POOL],
  ['earlyMid', EARLY_MID_POOL],
  ['mid', MID_POOL],
  ['elite', ELITE_POOL],
];

describe('chapter 10 — bestiary', () => {
  it('every authored monster has a unique id', () => {
    expect(BY_ID.size).toBe(CH10_MONSTERS.length);
  });

  it('the boss (Nizidramanii\'yt) is a CR 14 dragon with the dragon kit', () => {
    const boss = BY_ID.get(CH10_BOSS_ID)!;
    expect(boss).toBeDefined();
    expect(boss.cr).toBe('14');
    expect(boss.bossMechanic).toBe('battle-rage');
    const kinds = boss.actions.map((a) => a.kind);
    expect(kinds).toContain('multiattack');
    expect(kinds).toContain('attack');
    expect(kinds).toContain('debuff');
    // The reach bite is the swing a multiattack repeats — it must be the first
    // 'attack' action and actually have reach.
    const firstAttack = boss.actions.find((a) => a.kind === 'attack');
    expect(firstAttack && 'reach' in firstAttack && firstAttack.reach).toBeGreaterThanOrEqual(10);
  });

  it('every summon action (if any) points at an authored monster', () => {
    for (const m of CH10_MONSTERS) {
      for (const action of m.actions) {
        if (action.kind === 'summon') {
          expect(BY_ID.has(action.summonDefId)).toBe(true);
        }
      }
    }
  });
});

describe('chapter 10 — encounter pools', () => {
  it('each pool has 6-7 entries', () => {
    for (const [name, pool] of ALL_POOLS) {
      expect(pool.length, name).toBeGreaterThanOrEqual(6);
      expect(pool.length, name).toBeLessThanOrEqual(7);
    }
  });

  it('every pool entry references only authored Chapter 10 monster defIds with positive counts', () => {
    for (const [name, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.length, `${name}: ${entry.title}`).toBeGreaterThan(0);
        for (const mon of entry.monsters) {
          expect(BY_ID.has(mon.defId), `${name}: ${entry.title} → ${mon.defId}`).toBe(true);
          expect(mon.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the boss never appears in a normal combat pool', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.monsters.some((m) => m.defId === CH10_BOSS_ID)).toBe(false);
      }
    }
  });

  it('every entry awards positive, chapter-escalating XP', () => {
    for (const [, pool] of ALL_POOLS) {
      for (const entry of pool) {
        expect(entry.xpReward).toBeGreaterThan(0);
      }
    }
    const min = (pool: EncounterEntry[]) => Math.min(...pool.map((e) => e.xpReward));
    expect(min(WARMUP_POOL)).toBeGreaterThan(1200);
    expect(min(EARLY_MID_POOL)).toBeGreaterThan(1700);
    expect(min(MID_POOL)).toBeGreaterThan(2200);
    expect(min(ELITE_POOL)).toBeGreaterThan(3100);
  });
});

describe('chapter 10 — ready-to-wire flavor + intel', () => {
  it('flavor points at the authored boss and carries every non-combat room', () => {
    expect(CHAPTER10_FLAVOR.bossDefId).toBe(CH10_BOSS_ID);
    expect(BY_ID.has(CHAPTER10_FLAVOR.bossDefId)).toBe(true);
    expect(CHAPTER10_FLAVOR.title.length).toBeGreaterThan(0);
    expect(CHAPTER10_FLAVOR.shrines.length).toBe(2);
    expect(CHAPTER10_FLAVOR.rests.length).toBe(2);
    expect(CHAPTER10_FLAVOR.shop.title.length).toBeGreaterThan(0);
    expect(CHAPTER10_FLAVOR.boss.xpReward).toBe(4200);
    expect(CHAPTER10_FLAVOR.boss.goldReward).toBe(600);
    for (const room of [...CHAPTER10_FLAVOR.shrines, ...CHAPTER10_FLAVOR.rests]) {
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.flavorText.length).toBeGreaterThan(0);
    }
  });

  it('the intel card matches the boss and prices at 5·ch²+20·ch = 700', () => {
    expect(CHAPTER10_BOSS_INTEL.bossDefId).toBe(CH10_BOSS_ID);
    expect(CHAPTER10_BOSS_INTEL.chapter).toBe(10);
    expect(CHAPTER10_BOSS_INTEL.coinCost).toBe(700);
    expect(CHAPTER10_BOSS_INTEL.roomTitle.length).toBeGreaterThan(0);
    expect(CHAPTER10_BOSS_INTEL.weakSpotResolution.length).toBeGreaterThan(0);
    expect(CHAPTER10_BOSS_INTEL.battlePlanResolution.length).toBeGreaterThan(0);
    expect(CHAPTER10_BOSS_INTEL.walkPastResolution.length).toBeGreaterThan(0);
  });
});
