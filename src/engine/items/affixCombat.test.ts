import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../combat/createCombat';
import { playerAttack } from '../combat/attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { ItemRef } from '../../schemas/item';

function strFighter(): Character {
  return createCharacter({
    id: 'f',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0], // 15 → +1 = 16 → +3
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: [],
  });
}

function rolledWeapon(affixes: string[]): ItemRef {
  return {
    itemId: 'longsword',
    rolled: { baseId: 'longsword', rarity: 'blue', affixes, name: 'Test Blade' },
  };
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

/** Pre-clamp damage total from the combat-log damage headline, or null on a miss. */
function damageTotal(state: CombatState): number | null {
  const line = state.log.find((l) => l.kind === 'damage');
  if (!line) return null;
  const m = line.text.match(/Damage:\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Run a single attack with the given equipped weapon ref + seed; return result. */
function attackOnce(weapon: ItemRef, seed: string) {
  _resetMonsterInstanceCounter();
  const roller = createDiceRoller(seed);
  const character: Character = {
    ...strFighter(),
    equipped: { mainHand: weapon, offHand: null, armor: null },
  };
  const combat = createCombat({ roller, character, monsters: [{ def: getMonster('goblin') }] });
  const target = findMonster(combat.state);
  const res = playerAttack(
    { roller, character: combat.character, state: combat.state },
    target.id,
    'longsword',
  );
  return res;
}

describe('weapon affixes in playerAttack', () => {
  it('a Cruel affix deals exactly +2 damage on a hit', () => {
    // Find a seed where the plain longsword lands a hit (a damage line appears).
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      if (damageTotal(attackOnce({ itemId: 'longsword' }, `cruel-${i}`).state) !== null) {
        hitSeed = `cruel-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    const plain = attackOnce({ itemId: 'longsword' }, hitSeed!);
    const cruel = attackOnce(rolledWeapon(['cruel']), hitSeed!);
    // Pre-clamp totals: the same dice + the flat +2 from the affix.
    expect(damageTotal(cruel.state)! - damageTotal(plain.state)!).toBe(2);

    const cruelDamageLine = cruel.state.log.find((l) => l.kind === 'damage');
    expect(cruelDamageLine?.text).toContain('2 gear');
  });

  it('a Relentless affix adds damage only on a follow-up swing', () => {
    // Find a seed where the longsword lands a hit.
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      if (damageTotal(attackOnce(rolledWeapon(['relentless']), `rel-${i}`).state) !== null) {
        hitSeed = `rel-${i}`;
      }
    }
    expect(hitSeed).not.toBeNull();

    const runAt = (attacksThisTurn: number) => {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(hitSeed!);
      const character: Character = {
        ...strFighter(),
        equipped: { mainHand: rolledWeapon(['relentless']), offHand: null, armor: null },
      };
      const combat = createCombat({ roller, character, monsters: [{ def: getMonster('goblin') }] });
      const target = findMonster(combat.state);
      return playerAttack(
        { roller, character: combat.character, state: { ...combat.state, playerAttacksThisTurn: attacksThisTurn } },
        target.id,
        'longsword',
      );
    };

    const firstSwing = runAt(0);
    const followUp = runAt(1);
    // Same seed → same dice; the only difference is the +3 follow-up bonus.
    expect(damageTotal(followUp.state)! - damageTotal(firstSwing.state)!).toBe(3);
    expect(firstSwing.state.log.find((l) => l.kind === 'damage')?.text).not.toContain('Relentless');
    expect(followUp.state.log.find((l) => l.kind === 'damage')?.text).toContain('3 Relentless');
  });

  it('a Leeching affix heals the wounded wielder on a hit', () => {
    let hitSeed: string | null = null;
    for (let i = 0; i < 40 && !hitSeed; i++) {
      const plain = attackOnce({ itemId: 'longsword' }, `leech-${i}`);
      const goblin = findMonster(plain.state);
      if (goblin.instance.hp.current < goblin.instance.hp.max) hitSeed = `leech-${i}`;
    }
    expect(hitSeed).not.toBeNull();

    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(hitSeed!);
    const wounded: Character = {
      ...strFighter(),
      hp: { current: 1, max: 30, temp: 0 },
      equipped: { mainHand: rolledWeapon(['leeching']), offHand: null, armor: null },
    };
    const combat = createCombat({ roller, character: wounded, monsters: [{ def: getMonster('goblin') }] });
    const target = findMonster(combat.state);
    const res = playerAttack(
      { roller, character: combat.character, state: combat.state },
      target.id,
      'longsword',
    );
    expect(res.character.hp.current).toBeGreaterThan(1);
    expect(res.state.log.some((l) => l.text.includes('drains'))).toBe(true);
  });
});
