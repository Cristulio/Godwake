import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack } from './attack/monsterAttack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

// A wood-elf ranger with the given weapon in the main hand. A bow gates the
// non-spatial ranged payoff (opening volley + early evasion); a shortsword is
// the melee control case that must get neither.
function makeArcher(weaponId: string, extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-archer',
      name: 'Faelar',
      raceId: 'wood-elf',
      classId: 'ranger',
      baseAbilityScores: { dex: 15, con: 14, str: 13, wis: 12, int: 10, cha: 8 },
      skillProficiencies: ['perception', 'survival'],
    }),
    inventory: [{ itemId: weaponId }, { itemId: 'leather-armor' }],
    equipped: { mainHand: { itemId: weaponId }, offHand: null, armor: { itemId: 'leather-armor' } },
    ...extra,
  };
}

function onlyMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

describe('Ranged payoff — opening volley', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a bow-wielder looses a free opening volley at combat start', () => {
    let hitSeen = false;
    for (let seed = 1; seed <= 40 && !hitSeen; seed++) {
      const roller = createDiceRoller(seed);
      const init = createCombat({
        roller,
        character: makeArcher('longbow'),
        monsters: [{ def: getMonster('bugbear') }],
      });
      // The opening-volley line is logged at combat start, before any turn ends.
      expect(init.state.log.some((l) => l.text.includes('opening volley'))).toBe(true);
      // It routes through the real attack pipeline — a bow attack roll is logged.
      expect(init.state.log.some((l) => l.kind === 'roll' && l.text.includes('Longbow'))).toBe(true);
      // The free shot must NOT spend the first-turn action or strike counter.
      expect(init.character.actionEconomy.actionUsed).toBe(false);
      expect(init.state.playerAttacksThisTurn).toBe(0);
      // On a hitting seed, the target actually took the volley's damage.
      const volleyHit = init.state.log.some((l) => l.kind === 'damage');
      if (volleyHit) {
        const bugbear = onlyMonster(init.state);
        expect(bugbear.instance.hp.current).toBeLessThan(bugbear.instance.hp.max);
        hitSeen = true;
      }
    }
    expect(hitSeen).toBe(true);
  });

  it('a melee wielder gets no opening volley', () => {
    const roller = createDiceRoller(1);
    const init = createCombat({
      roller,
      character: makeArcher('shortsword'),
      monsters: [{ def: getMonster('bugbear') }],
    });
    expect(init.state.log.some((l) => l.text.includes('opening volley'))).toBe(false);
    const bugbear = onlyMonster(init.state);
    expect(bugbear.instance.hp.current).toBe(bugbear.instance.hp.max);
  });
});

describe('Ranged payoff — kept at range', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('the first enemy attack is at disadvantage with a bow, then normal', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeArcher('longbow'),
      monsters: [{ def: getMonster('bugbear') }],
    });
    expect(init.state.rangedEvasionRemaining).toBe(1);
    const gid = onlyMonster(init.state).id;

    const before1 = init.state.log.length;
    const a1 = monsterAttack({ roller, character: init.character, state: init.state }, gid);
    const line1 = a1.state.log.slice(before1).find((l) => l.kind === 'roll');
    expect(line1?.text).toContain('(disadvantage — kept at range)');
    // The evasion window is spent by that first swing.
    expect(a1.state.rangedEvasionRemaining ?? 0).toBe(0);

    // Free the monster's action so it can swing again, then confirm the second
    // attack rolls straight.
    const reset: CombatState = {
      ...a1.state,
      combatants: a1.state.combatants.map((c) =>
        c.kind === 'monster' && c.id === gid
          ? { ...c, instance: { ...c.instance, actionEconomy: { ...c.instance.actionEconomy, actionUsed: false } } }
          : c,
      ),
    };
    const before2 = reset.log.length;
    const a2 = monsterAttack({ roller, character: a1.character, state: reset }, gid);
    const line2 = a2.state.log.slice(before2).find((l) => l.kind === 'roll');
    expect(line2?.text).not.toContain('kept at range');
  });

  it('a melee wielder gets no early evasion', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({
      roller,
      character: makeArcher('shortsword'),
      monsters: [{ def: getMonster('bugbear') }],
    });
    expect(init.state.rangedEvasionRemaining ?? 0).toBe(0);
    const gid = onlyMonster(init.state).id;
    const before = init.state.log.length;
    const a1 = monsterAttack({ roller, character: init.character, state: init.state }, gid);
    const line1 = a1.state.log.slice(before).find((l) => l.kind === 'roll');
    expect(line1?.text).not.toContain('kept at range');
  });
});
