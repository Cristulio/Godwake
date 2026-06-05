import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { monsterAttack } from './attack/monsterAttack';
import { castSpell } from './spells';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

/**
 * Part A data layer: the player-action choke points (playerAttack, castSpell)
 * stamp source:'player' on the roll/damage lines they produce, so CombatLog can
 * render the hero's own beats dominant. The point of the field (over matching
 * the player's name in the text) is the two lines below that name-matching would
 * MISS: the bare "Damage: …" weapon line, and a spell line that starts with the
 * MONSTER's name ("Goblin takes …").
 */

function monster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

function fighter(): Character {
  return {
    ...createCharacter({
      id: 'mpl-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
}

function wizard(): Character {
  return {
    ...createCharacter({
      id: 'mpl-wizard',
      name: 'Ember',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        con: STANDARD_ARRAY[2],
        dex: STANDARD_ARRAY[3],
        wis: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[0],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

describe('markPlayerLog — player action choke points tag their own lines', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("tags the weapon roll AND the bare 'Damage:' line as the player's", () => {
    const init = createCombat({
      roller: createDiceRoller(5),
      character: fighter(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monster(init.state);
    goblin.instance.ac = 2; // guarantee the hit so the damage line is present

    const { state } = playerAttack(
      { roller: createDiceRoller(5), character: init.character, state: init.state },
      goblin.id,
      'longsword',
    );

    const roll = state.log.find((l) => /attacks .* with Longsword/.test(l.text))!;
    expect(roll.source).toBe('player');

    const damage = state.log.find((l) => l.kind === 'damage' && l.text.startsWith('Damage:'))!;
    // The crux: this line carries no player name, yet it is correctly the hero's.
    expect(damage.source).toBe('player');
  });

  it("tags a spell's damage line even when it starts with the monster's name", () => {
    const init = createCombat({
      roller: createDiceRoller(7),
      character: wizard(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const cast = castSpell({
      roller: createDiceRoller(7),
      character: init.character,
      state: init.state,
      spellId: 'burning-hands',
    });
    expect(cast.cast).toBe(true);

    const dmg = cast.state.log.find((l) => l.kind === 'damage' && /takes \d+ fire/.test(l.text));
    expect(dmg).toBeDefined();
    expect(dmg!.source).toBe('player');
  });

  it("leaves the enemy's own attack lines un-promoted (source: 'enemy')", () => {
    const init = createCombat({
      roller: createDiceRoller(3),
      character: fighter(),
      monsters: [{ def: getMonster('goblin') }],
    });
    const goblin = monster(init.state);
    const after = monsterAttack(
      { roller: createDiceRoller(3), character: init.character, state: init.state },
      goblin.id,
    );
    const enemyRoll = after.state.log.find((l) => l.kind === 'roll' && /attacks Brick/.test(l.text));
    expect(enemyRoll).toBeDefined();
    expect(enemyRoll!.source).not.toBe('player');
  });
});
