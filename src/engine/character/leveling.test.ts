import { describe, it, expect } from 'vitest';
import {
  applyLevelUp,
  hasPendingLevelUp,
  xpForLevel,
  MAX_LEVEL,
  wizardSpellLearnTierForLevel,
  availableWizardSpellsForLearn,
  simulateLevelUp,
  asiBumpCost,
  asiPlanCost,
  ASI_POINT_BUDGET,
  ABILITY_SCORE_CAP,
} from './leveling';
import type { AbilityScores } from '../../types/abilities';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import {
  wizardSpellSlotsForLevel,
  rageDamageBonus,
  rogueCunningActionMax,
} from './actions';
import { characterHasMechanic } from './derived';
import { presetCreationInput } from './defaultCharacter';
import { maxAttacksPerAction } from '../combat/attack/playerAttack';
import { getClass } from '../../content/classes';
import type { Character } from '../../types/character';
import type { ClassId } from '../../schemas/ids';

/**
 * A preset character of the given class, force-set to a level with the first
 * archetype selected (the default a sim or skipped-pick player lands on).
 */
function charAt(classId: ClassId, level: number): Character {
  const input = presetCreationInput(classId);
  const base = createCharacter({ id: 't', ...input });
  const firstArchetype = getClass(classId).subclasses[0]?.id ?? null;
  return { ...base, level, subclassId: base.subclassId ?? firstArchetype };
}

const SIR_BRICK = createCharacter({
  id: 'test-sir-brick',
  name: 'Sir Brick',
  raceId: 'human',
  classId: 'fighter',
  baseAbilityScores: {
    str: STANDARD_ARRAY[0], // 15
    dex: STANDARD_ARRAY[2], // 13
    con: STANDARD_ARRAY[1], // 14
    int: STANDARD_ARRAY[5], // 8
    wis: STANDARD_ARRAY[3], // 12
    cha: STANDARD_ARRAY[4], // 10
  },
  skillProficiencies: ['athletics', 'perception'],
});

describe('ASI cost curve — +1 at 18+ costs 2 points', () => {
  const scores = (over: Partial<AbilityScores>): AbilityScores => ({
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...over,
  });

  it('a +1 below 18 costs 1 point', () => {
    expect(asiBumpCost(10, 1)).toBe(1);
    expect(asiBumpCost(17, 1)).toBe(1); // 17→18 still starts below 18
  });

  it('a +1 starting at 18 or above costs 2 points', () => {
    expect(asiBumpCost(18, 1)).toBe(2); // 18→19
    expect(asiBumpCost(19, 1)).toBe(2); // 19→20
  });

  it('+2 on a sub-18 score costs 2, but a 17 crossing into 18+ costs 3', () => {
    expect(asiBumpCost(14, 2)).toBe(2); // 14→16
    expect(asiBumpCost(16, 2)).toBe(2); // 16→18 (both steps start <18)
    expect(asiBumpCost(17, 2)).toBe(3); // 17→18 (1) then 18→19 (2)
  });

  it('raising one stat 18→19 consumes the whole 2-point budget', () => {
    expect(asiPlanCost(scores({ str: 18 }), { str: 1 })).toBe(ASI_POINT_BUDGET);
  });

  it('raising two sub-18 stats by 1 each spends exactly the budget', () => {
    expect(asiPlanCost(scores({}), { str: 1, dex: 1 })).toBe(ASI_POINT_BUDGET);
  });

  it('raising one sub-18 stat by 2 spends exactly the budget', () => {
    expect(asiPlanCost(scores({}), { str: 2 })).toBe(ASI_POINT_BUDGET);
  });

  it('a plan that would overspend reports a cost above the budget', () => {
    // Three sub-18 +1s = 3 points, and a +1 on an 18 stat plus any other bump.
    expect(asiPlanCost(scores({}), { str: 1, dex: 1, con: 1 })).toBeGreaterThan(ASI_POINT_BUDGET);
    expect(asiPlanCost(scores({ str: 18 }), { str: 1, dex: 1 })).toBeGreaterThan(ASI_POINT_BUDGET);
  });

  it('caps any ability at 20', () => {
    expect(ABILITY_SCORE_CAP).toBe(20);
  });
});

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });
  it('matches routed-play thresholds for levels 2-5 (cliff flattened so a route reaches the expected level)', () => {
    expect(xpForLevel(2)).toBe(200);
    expect(xpForLevel(3)).toBe(500);
    expect(xpForLevel(4)).toBe(1000);
    expect(xpForLevel(5)).toBe(1900);
  });
  it('uses routed-play thresholds for levels 6-8', () => {
    expect(xpForLevel(6)).toBe(3200);
    expect(xpForLevel(7)).toBe(5000);
    expect(xpForLevel(8)).toBe(7400);
  });
});

describe('hasPendingLevelUp', () => {
  it('false when below next-level threshold', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, xp: 100 })).toBe(false);
  });
  it('true at or above next-level threshold', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, xp: 300 })).toBe(true);
  });
  it('still pending at the old L8 cap now that the ladder runs to 20', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, level: 8, xp: 99999 })).toBe(true);
  });
  it('false once the level-20 cap is reached', () => {
    expect(hasPendingLevelUp({ ...SIR_BRICK, level: 20, xp: 999999 })).toBe(false);
  });
});

describe('applyLevelUp', () => {
  it('advances level by 1, adds avg fighter HP + CON mod', () => {
    // CON 14 + human +1 = 15 → +2 mod; avg(d10) = 6; +2 = 8 HP
    const next = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(next.level).toBe(2);
    expect(next.hp.max).toBe(SIR_BRICK.hp.max + 8);
    expect(next.hp.current).toBe(SIR_BRICK.hp.current + 8);
  });

  it('grants Action Surge charge at level 2', () => {
    expect(SIR_BRICK.resources.actionSurgeRemaining).toBe(0);
    const next = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(next.resources.actionSurgeRemaining).toBe(1);
  });

  it('auto-picks Champion subclass at level 2', () => {
    const l2 = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(l2.subclassId).toBe('champion');
  });

  it('preserves an already-chosen school across later level-ups (within-run)', () => {
    const wiz = charAt('wizard', 2);
    const evoker: Character = { ...wiz, subclassId: 'evocation' };
    let c = applyLevelUp({ ...evoker, xp: xpForLevel(3) });
    c = applyLevelUp({ ...c, xp: xpForLevel(4) });
    expect(c.subclassId).toBe('evocation');
  });

  it('bumps hit dice in lockstep with level', () => {
    const l2 = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    expect(l2.hitDice.max).toBe(SIR_BRICK.hitDice.max + 1);
  });

  it('ASI override at L4 boosts ability scores', () => {
    let c = applyLevelUp({ ...SIR_BRICK, xp: 300 });
    c = applyLevelUp({ ...c, xp: 900 });
    const l4 = applyLevelUp({
      ...c,
      xp: 2700,
      baseAbilityScores: { ...c.baseAbilityScores, str: c.baseAbilityScores.str + 2 },
    });
    expect(l4.baseAbilityScores.str).toBe(SIR_BRICK.baseAbilityScores.str + 2);
  });
});

describe('XP table → level 20', () => {
  it('caps at level 20', () => {
    expect(MAX_LEVEL).toBe(20);
  });

  it('hits the target totals at the key bands', () => {
    expect(xpForLevel(9)).toBe(10000);
    expect(xpForLevel(20)).toBe(98000);
  });

  it('is strictly increasing with non-shrinking deltas in the back half', () => {
    let prevDelta = 0;
    for (let lvl = 9; lvl <= MAX_LEVEL; lvl++) {
      const delta = xpForLevel(lvl) - xpForLevel(lvl - 1);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeGreaterThanOrEqual(prevDelta);
      prevDelta = delta;
    }
  });

  it('clamps requests past the cap to the L20 threshold', () => {
    expect(xpForLevel(21)).toBe(98000);
  });
});

describe('wizard slot progression to 9th level', () => {
  it('opens each higher tier on schedule', () => {
    expect(wizardSpellSlotsForLevel(7)[4]).toBe(1);
    expect(wizardSpellSlotsForLevel(9)[5]).toBe(1);
    expect(wizardSpellSlotsForLevel(11)[6]).toBe(1);
    expect(wizardSpellSlotsForLevel(13)[7]).toBe(1);
    expect(wizardSpellSlotsForLevel(15)[8]).toBe(1);
    expect(wizardSpellSlotsForLevel(17)[9]).toBe(1);
  });

  it('reaches the full L20 table', () => {
    expect(wizardSpellSlotsForLevel(20)).toEqual({
      1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1,
    });
  });

  it('leaves the cap-8 band untouched', () => {
    expect(wizardSpellSlotsForLevel(5)).toEqual({ 1: 4, 2: 3, 3: 2 });
  });
});

describe('wizard spell-learn cadence', () => {
  it('opens a picker tier on each odd level from 3 to 17', () => {
    expect(wizardSpellLearnTierForLevel(3)).toBe(2);
    expect(wizardSpellLearnTierForLevel(7)).toBe(4);
    expect(wizardSpellLearnTierForLevel(9)).toBe(5);
    expect(wizardSpellLearnTierForLevel(17)).toBe(9);
  });

  it('opens no picker on even levels', () => {
    expect(wizardSpellLearnTierForLevel(10)).toBeNull();
    expect(wizardSpellLearnTierForLevel(16)).toBeNull();
  });

  it('offers real picks at every authored higher tier', () => {
    const wiz = charAt('wizard', 1);
    const fresh: Character = { ...wiz, resources: { ...wiz.resources, knownSpells: [] } };
    for (const tier of [4, 5, 6, 7, 8, 9] as const) {
      expect(availableWizardSpellsForLearn(fresh, tier).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('learns a 9th-level capstone when one is rolled headless at L17', () => {
    const wiz = charAt('wizard', 16);
    const cleared: Character = { ...wiz, resources: { ...wiz.resources, knownSpells: [] } };
    const after = simulateLevelUp(cleared); // L16 → L17 opens the 9th tier
    const known = after.resources.knownSpells ?? [];
    expect(known.some((id) => id === 'unmake' || id === 'apotheosis')).toBe(true);
  });
});

describe('wizard spell-learn picker is class-filtered', () => {
  const wiz = charAt('wizard', 1);
  const fresh: Character = { ...wiz, resources: { ...wiz.resources, knownSpells: [] } };

  it('offers only the wizard-book level-3 spells, not the druid reskins', () => {
    const ids = availableWizardSpellsForLearn(fresh, 3).map((s) => s.id).sort();
    expect(ids).toEqual(['fireball', 'lightning-bolt', 'vampiric-touch']);
    expect(ids).not.toContain('wildfire');
    expect(ids).not.toContain('call-lightning');
  });

  it('never surfaces a druid-book spell at any learn tier', () => {
    for (const tier of [2, 3, 4, 5, 6, 7, 8, 9] as const) {
      const pool = availableWizardSpellsForLearn(fresh, tier);
      expect(pool.every((s) => s.book === 'wizard')).toBe(true);
    }
  });
});

describe('druid nature book', () => {
  it('a freshly initialized druid knows all 12 nature spells', () => {
    const known = charAt('druid', 1).resources.knownSpells ?? [];
    expect(known).toEqual([
      'produce-flame',
      'thornlash',
      'entangling-roots',
      'regrowth',
      'call-lightning',
      'wildfire',
      'ice-storm',
      'avalanche',
      'fire-storm',
      'spirit-beast',
      'wrath-of-silvanus',
      'avatar-of-the-wilds',
    ]);
  });
});

describe('high-level martial feature grants', () => {
  it('gives the Fighter a third attack at 11 and a fourth at 20', () => {
    expect(maxAttacksPerAction(charAt('fighter', 8))).toBe(2);
    expect(maxAttacksPerAction(charAt('fighter', 11))).toBe(3);
    expect(maxAttacksPerAction(charAt('fighter', 20))).toBe(4);
  });

  it('does not hand a third attack to non-fighters', () => {
    expect(maxAttacksPerAction(charAt('ranger', 20))).toBe(2);
  });

  it('deepens Barbarian rage damage at 15 and 20', () => {
    // Berserker (first archetype) adds +2 Frenzy from L3, so the L9 base is 4.
    expect(rageDamageBonus(charAt('barbarian', 9))).toBe(4);
    expect(rageDamageBonus(charAt('barbarian', 15))).toBe(6); // + persistent-rage
    expect(rageDamageBonus(charAt('barbarian', 20))).toBe(9); // + primal-champion
  });

  it('adds a Cunning Action to the Rogue at 9', () => {
    // Thief (first archetype) already grants a second use from L3.
    expect(rogueCunningActionMax(charAt('rogue', 8))).toBe(2);
    expect(rogueCunningActionMax(charAt('rogue', 9))).toBe(3);
  });

  it('grants the capstone mechanics at the right level', () => {
    expect(characterHasMechanic(charAt('rogue', 19), 'death-strike')).toBe(false);
    expect(characterHasMechanic(charAt('rogue', 20), 'death-strike')).toBe(true);
    expect(characterHasMechanic(charAt('ranger', 20), 'foe-slayer')).toBe(true);
    expect(characterHasMechanic(charAt('fighter', 9), 'weapon-mastery')).toBe(true);
    expect(characterHasMechanic(charAt('fighter', 8), 'weapon-mastery')).toBe(false);
  });
});
