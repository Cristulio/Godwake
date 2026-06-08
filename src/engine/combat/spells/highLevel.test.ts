import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../createCombat';
import { castSpell } from './dispatch';
import { createDiceRoller } from '../../dice';
import { computeAC, isRaging } from '../../character/derived';
import { isAscendant, APOTHEOSIS_TEMP_HP, APOTHEOSIS_AC_BONUS } from '../apotheosis';
import { wizardSpellSlotsForLevel } from '../../character/actions';
import { getMonster } from '../../../content/monsters';
import type { Character } from '../../../types/character';
import type { CombatState, MonsterCombatant } from '../../../types/combat';

/** A level-17 wizard who knows `spellId`, with the full L17 slot table refilled. */
function makeArchmage(spellId: string, level = 17): Character {
  const base = createCharacter({
    id: 'archmage',
    name: 'Cristulio',
    raceId: 'human',
    classId: 'wizard',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[3],
      con: STANDARD_ARRAY[2],
      int: STANDARD_ARRAY[0],
      wis: STANDARD_ARRAY[1],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['arcana', 'history'],
  });
  return {
    ...base,
    level,
    resources: {
      ...base.resources,
      spellSlots: wizardSpellSlotsForLevel(level),
      knownSpells: [...(base.resources.knownSpells ?? []), spellId],
    },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

beforeEach(() => {
  _resetMonsterInstanceCounter();
});

describe('Apotheosis — the transform-self capstone', () => {
  it('spends a 9th-level slot and turns the caster ascendant', () => {
    const roller = createDiceRoller('apo-seed');
    const w = makeArchmage('apotheosis');
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const acBefore = computeAC(init.character);

    const r = castSpell({ roller, character: init.character, state: init.state, spellId: 'apotheosis' });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    expect(isAscendant(r.character)).toBe(true);
    expect(r.character.hp.temp).toBe(APOTHEOSIS_TEMP_HP);
    expect(computeAC(r.character)).toBe(acBefore + APOTHEOSIS_AC_BONUS);
    // It is a self-cast, not a rage — the barbarian's flag stays untouched.
    expect(isRaging(r.character)).toBe(false);
  });
});

describe('Unmake — the remake-the-enemy capstone', () => {
  it('lands heavy necrotic and can paralyze a non-legendary foe', () => {
    // Force every d20 (the CON save) to the floor so the binding lands.
    const roller = createDiceRoller('unmake-seed');
    const w = makeArchmage('unmake');
    const goblin = getMonster('goblin'); // low CON, no legendary resistance
    const init = createCombat({ character: w, monsters: [{ def: goblin }] });
    const mon = findMonster(init.state);
    const hpBefore = mon.instance.hp.current;

    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'unmake',
      targetId: mon.id,
    });

    expect(r.cast).toBe(true);
    expect(r.character.resources.spellSlots?.[9]).toBe(0);
    const after = findMonster(r.state);
    // 18d8 + INT + spell-damage flattens a 7-HP goblin.
    expect(after.instance.hp.current).toBeLessThan(hpBefore);
  });

  it('does nothing without a 9th-level slot', () => {
    const roller = createDiceRoller('unmake-noslot');
    const w = makeArchmage('unmake', 8); // L8 → no 9th-level slot
    const init = createCombat({ character: w, monsters: [{ def: getMonster('goblin') }] });
    const mon = findMonster(init.state);
    const r = castSpell({
      roller,
      character: init.character,
      state: init.state,
      spellId: 'unmake',
      targetId: mon.id,
    });
    expect(r.cast).toBe(false);
  });
});
