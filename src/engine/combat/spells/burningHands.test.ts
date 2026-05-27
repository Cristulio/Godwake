import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './';
import { createDiceRoller } from '../../dice';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';

function makeTieflingWizard(): Character {
  return {
    ...createCharacter({
      id: 'tief-wiz',
      name: 'Ember',
      raceId: 'tiefling',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8
        dex: STANDARD_ARRAY[3], // 12
        con: STANDARD_ARRAY[2], // 13
        int: STANDARD_ARRAY[0], // 15
        wis: STANDARD_ARRAY[1], // 14
        cha: STANDARD_ARRAY[4], // 10
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/**
 * (11) Tiefling caster Burning Hands — fire-resistance must not apply to the
 * caster's own spell. Burning Hands iterates monster combatants only; the
 * player is never a damage target. This is a "the silo holds" sanity check
 * so a future refactor that drifts the loop catches it.
 */
describe('Burning Hands — caster Tiefling fire resistance does NOT self-apply', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Tiefling wizard casting Burning Hands takes 0 self damage and keeps full HP', () => {
    const goblin = getMonster('goblin');
    const wizard = makeTieflingWizard();
    const startingHp = wizard.hp.current;

    const roller = createDiceRoller(7);
    const state = createCombat({ roller, character: wizard, monsters: [{ def: goblin }] }).state;

    const cast = castSpell({
      roller,
      character: wizard,
      state,
      spellId: 'burning-hands',
    });
    expect(cast.cast).toBe(true);

    // Caster HP is untouched — the cone iterates monsters only.
    expect(wizard.hp.current).toBe(startingHp);
    expect(wizard.hp.temp).toBe(0);

    // No damage log line ever names the player as the target.
    const playerDamageLines = cast.state.log.filter(
      (l) =>
        l.kind === 'damage' &&
        (l.text.includes(wizard.name) || l.text.includes('Ember')),
    );
    expect(playerDamageLines).toHaveLength(0);

    // And there's no "fire resistance" / "halved" line for the caster — that
    // log shape only appears on monster targets with the trait, never on the
    // wizard themselves.
    const halvedSelf = cast.state.log.filter(
      (l) =>
        l.text.includes('halved') &&
        l.text.includes(wizard.name),
    );
    expect(halvedSelf).toHaveLength(0);
  });

  it('damages the monster target — caster fire-resistance does not shrink the outgoing hit', () => {
    const goblin = getMonster('goblin');
    const wizard = makeTieflingWizard();
    const roller = createDiceRoller(7);
    let state = createCombat({ roller, character: wizard, monsters: [{ def: goblin }] }).state;

    const goblinBefore = findMonster(state).instance.hp.current;
    const cast = castSpell({
      roller,
      character: wizard,
      state,
      spellId: 'burning-hands',
    });
    state = cast.state;
    const goblinAfter = findMonster(state).instance.hp.current;
    expect(goblinAfter).toBeLessThan(goblinBefore);
  });
});
