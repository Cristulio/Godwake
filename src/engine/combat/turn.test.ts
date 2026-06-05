import { describe, it, expect, beforeEach } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { hasRemainingTurnPlay } from './turn';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { ClassId } from '../../schemas/ids';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

function make(classId: ClassId, level = 1): Character {
  const base = buildPlayerCharacter(presetCreationInput(classId));
  return { ...base, level };
}

/** A clean one-goblin encounter; the state only feeds the ranger mark check. */
function arena(character: Character): { state: CombatState; character: Character } {
  return createCombat({
    roller: createDiceRoller(1),
    character,
    monsters: [{ def: getMonster('goblin') }],
  });
}

function actionSpent(c: Character): Character {
  return { ...c, actionEconomy: { ...c.actionEconomy, actionUsed: true } };
}

function goblinId(state: CombatState): string {
  return (state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
}

describe('hasRemainingTurnPlay — turn auto-end gate (every class)', () => {
  it('holds the turn while the action is still unspent, whatever the class', () => {
    for (const id of ['wizard', 'druid', 'fighter', 'rogue', 'barbarian', 'ranger', 'monk'] as const) {
      const { state, character } = arena(make(id));
      // Fresh turn: the action hasn't been used, so there is always a play left.
      expect(hasRemainingTurnPlay(character, state)).toBe(true);
    }
  });

  it('casters (wizard/druid) auto-end the moment the action is spent — nothing else to hold for', () => {
    // This is the bug-2 case: a mage that has cast its one action has nothing
    // left, so the turn must release (the coach must not trap it). At L1 the
    // druid has no 2nd-level slot, so its bonus-action Entangle hold can't fire.
    for (const id of ['wizard', 'druid'] as const) {
      const { state, character } = arena(make(id));
      expect(hasRemainingTurnPlay(actionSpent(character), state)).toBe(false);
    }
  });

  it('druid: holds for a bonus-action Entangle while a 2nd-level slot + the bonus action are free', () => {
    const { state, character } = arena(make('druid'));
    const withSlot: Character = {
      ...actionSpent(character),
      resources: {
        ...character.resources,
        spellSlots: { ...(character.resources.spellSlots ?? {}), 2: 1 },
      },
    };
    // Action spent, but a 2nd-level slot + the bonus action are free → hold for Roots.
    expect(hasRemainingTurnPlay(withSlot, state)).toBe(true);
    // Bonus action already spent → nothing left, release.
    expect(
      hasRemainingTurnPlay(
        { ...withSlot, actionEconomy: { ...withSlot.actionEconomy, bonusActionUsed: true } },
        state,
      ),
    ).toBe(false);
    // No 2nd-level slot (a low-level druid) → release.
    expect(
      hasRemainingTurnPlay(
        { ...withSlot, resources: { ...withSlot.resources, spellSlots: { 1: 2 } } },
        state,
      ),
    ).toBe(false);
  });

  it('fighter: holds for an affordable Second Wind / Action Surge, releases once neither is usable', () => {
    const { state, character } = arena(make('fighter'));
    const spent = actionSpent(character);

    // Hurt + Second Wind available + bonus free → hold.
    const woundedWithSecondWind: Character = {
      ...spent,
      hp: { ...spent.hp, current: spent.hp.max - 1 },
      actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
      resources: { ...spent.resources, secondWindAvailable: true, actionSurgeRemaining: 0 },
    };
    expect(hasRemainingTurnPlay(woundedWithSecondWind, state)).toBe(true);

    // Action Surge in the well → hold even at full HP.
    expect(
      hasRemainingTurnPlay(
        { ...spent, resources: { ...spent.resources, secondWindAvailable: false, actionSurgeRemaining: 1 } },
        state,
      ),
    ).toBe(true);

    // Full HP (Second Wind would heal nothing) + no Action Surge → release.
    const tappedOut: Character = {
      ...spent,
      hp: { ...spent.hp, current: spent.hp.max },
      resources: { ...spent.resources, secondWindAvailable: true, actionSurgeRemaining: 0 },
    };
    expect(hasRemainingTurnPlay(tappedOut, state)).toBe(false);
  });

  it('rogue: holds for an unspent Cunning Action, releases once it is gone', () => {
    const { state, character } = arena(make('rogue'));
    const spent = actionSpent(character);
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
          resources: { ...spent.resources, cunningActionUsesRemaining: 1 },
        },
        state,
      ),
    ).toBe(true);
    expect(
      hasRemainingTurnPlay(
        { ...spent, resources: { ...spent.resources, cunningActionUsesRemaining: 0 } },
        state,
      ),
    ).toBe(false);
  });

  it('barbarian: holds to enter Rage, releases once raging / bonus spent / out of charges', () => {
    const { state, character } = arena(make('barbarian'));
    const spent = actionSpent(character);
    // Not yet raging, bonus free, a charge in hand → wants to Rage.
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
          resources: { ...spent.resources, rageRoundsRemaining: 0, rageChargesRemaining: 1 },
        },
        state,
      ),
    ).toBe(true);
    // Already raging → nothing left to spend the turn on.
    expect(
      hasRemainingTurnPlay(
        { ...spent, resources: { ...spent.resources, rageRoundsRemaining: 2 } },
        state,
      ),
    ).toBe(false);
    // Out of charges (not raging) → Rage can't fire, so nothing holds the turn.
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
          resources: { ...spent.resources, rageRoundsRemaining: 0, rageChargesRemaining: 0 },
        },
        state,
      ),
    ).toBe(false);
  });

  it('ranger: holds to place Hunter’s Mark, releases once the mark rides a live quarry', () => {
    const { state, character } = arena(make('ranger'));
    const spent = actionSpent(character);
    const markFree: Character = {
      ...spent,
      actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
    };
    // No mark out, bonus free → place it.
    expect(hasRemainingTurnPlay(markFree, { ...state, huntersMarkTargetId: undefined })).toBe(true);
    // Mark already on the live goblin → re-marking is pointless, release.
    expect(
      hasRemainingTurnPlay(markFree, { ...state, huntersMarkTargetId: goblinId(state) }),
    ).toBe(false);
    // Bonus already spent → release regardless.
    expect(
      hasRemainingTurnPlay(
        { ...spent, actionEconomy: { ...spent.actionEconomy, bonusActionUsed: true } },
        { ...state, huntersMarkTargetId: undefined },
      ),
    ).toBe(false);
  });

  it('monk: keeps the #401 guard — holds for usable Ki / a queued Flurry, releases when dry', () => {
    const { state, character } = arena(make('monk', 5));
    const spent = actionSpent(character);
    // Ki in the well + bonus free → hold (usable Ki).
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          actionEconomy: { ...spent.actionEconomy, bonusActionUsed: false },
          resources: { ...spent.resources, kiPointsRemaining: 3 },
          flurryStrikesRemaining: 0,
        },
        state,
      ),
    ).toBe(true);
    // Mid-Flurry with strikes still queued, even after the bonus is spent → hold.
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          actionEconomy: { ...spent.actionEconomy, bonusActionUsed: true },
          flurryStrikesRemaining: 2,
        },
        state,
      ),
    ).toBe(true);
    // Ki dry + nothing queued → release.
    expect(
      hasRemainingTurnPlay(
        {
          ...spent,
          resources: { ...spent.resources, kiPointsRemaining: 0 },
          flurryStrikesRemaining: 0,
        },
        state,
      ),
    ).toBe(false);
  });
});
