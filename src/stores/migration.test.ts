import { describe, it, expect } from 'vitest';
import { migrateV1ToV2, SAVE_VERSION } from './persistMigration';

/**
 * Save-migration chain coverage. The existing persistMigration.test.ts covers
 * each migration in isolation — this file exists to test the chained shape:
 * a single legacy save walking from v1 all the way to the current SAVE_VERSION.
 *
 * v2 is the latest version on main right now (see persistMigration.ts). The
 * v2 → v3 step (permanent-bonuses consolidation) is in design but unmerged,
 * so the v3 chain test below is `it.todo` until that PR lands. See [[dd-
 * roguelite-store-split-plan]] / [[dd-roguelite-mutation-refactor-plan]] for
 * the consolidation context.
 */
describe('save-migration chain — v1 → v2', () => {
  it('migrates a v1 save that mixes top-level permanentHpBonus AND array unlockedUpgrades', () => {
    const v1Snapshot: Record<string, unknown> = {
      screen: 'hub',
      saveSeed: 'chain-test-seed',
      character: {
        id: 'legacy',
        name: 'Old Walker',
        raceId: 'human',
        classId: 'fighter',
        subclassId: 'champion',
        baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
        level: 3,
        xp: 1200,
        skillProficiencies: [],
        expertSkills: [],
        hp: { current: 20, max: 28, temp: 0 },
        hitDice: { current: 3, max: 3, die: 10 },
        conditions: [],
        inventory: [],
        equipped: { mainHand: null, offHand: null, armor: null },
        resources: {},
        actionEconomy: {
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false,
          movementRemaining: 30,
        },
        quirks: [],
        blessings: [],
        goldInPocket: 0,
        renown: 150,
        // Top-level permanentHpBonus set on the character — pre-consolidation
        // (still the current v2 shape).
        permanentHpBonus: 5,
      },
      // Legacy array shape; v1→v2 converts to record.
      unlockedUpgrades: ['mantle-of-the-wakened'],
      discoveredMonsters: ['goblin'],
      hasReincarnated: true,
    };

    const v2 = migrateV1ToV2(v1Snapshot);

    // Step 1: array → record, rank=1 default.
    expect(v2.unlockedUpgrades).toEqual({ 'mantle-of-the-wakened': 1 });

    // Step 2: legacy permanentHpBonus folded into permanentBonuses.hp (v3 shape).
    expect(v2.character?.permanentBonuses?.hp).toBe(5);
    expect((v2.character as Record<string, unknown> | null)?.permanentHpBonus).toBeUndefined();

    // Step 3: monsterEncounters seeded from discoveredMonsters.
    expect(v2.monsterEncounters).toEqual({ goblin: 1 });

    // Step 4: druidGroveUnlocked retroactively true (renown >= 30).
    expect(v2.druidGroveUnlocked).toBe(true);

    // Step 5: deathCount seeded from hasReincarnated when missing.
    expect(v2.deathCount).toBe(1);
  });

  it.todo(
    'v1 → v2 → v3 chain: top-level permanentHpBonus consolidates into character.permanentBonuses.hp. Add when permanent-bonuses-consolidation PR lands (SAVE_VERSION currently 2).',
  );

  it('SAVE_VERSION is exposed and pins the current chain endpoint', () => {
    // Sanity check the chain endpoint so the v3 todo above is unambiguous.
    expect(SAVE_VERSION).toBe(11);
  });
});
