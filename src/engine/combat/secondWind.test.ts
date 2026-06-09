import { describe, it, expect } from 'vitest';
import { buildPlayerCharacter, presetCreationInput } from '../character/defaultCharacter';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { useSecondWind } from './secondWind';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';

function woundedFighter(level: number): Character {
  const base = buildPlayerCharacter(presetCreationInput('fighter'));
  // Big headroom so the heal is never clamped by hp.max.
  return {
    ...base,
    level,
    hp: { current: 1, max: 1000, temp: 0 },
    resources: { ...base.resources, secondWindAvailable: true },
    actionEconomy: { ...base.actionEconomy, bonusActionUsed: false },
  };
}

describe('Second Wind heal — 1d10 + level', () => {
  it('heals within the 1d10 + level band across the seed space, at a few levels', () => {
    _resetMonsterInstanceCounter();
    for (const level of [1, 10, 20]) {
      const lo = 1 + level;
      const hi = 10 + level;
      for (let seed = 0; seed < 50; seed++) {
        const character = woundedFighter(level);
        const { state } = createCombat({
          roller: createDiceRoller(seed),
          character,
          monsters: [{ def: getMonster('goblin') }],
        });
        const roller = createDiceRoller(seed);
        const result = useSecondWind({ roller, character, state });
        const healed = result.character.hp.current - character.hp.current;
        expect(healed).toBeGreaterThanOrEqual(lo);
        expect(healed).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('spends the charge and the bonus action', () => {
    _resetMonsterInstanceCounter();
    const character = woundedFighter(10);
    const { state } = createCombat({
      roller: createDiceRoller(7),
      character,
      monsters: [{ def: getMonster('goblin') }],
    });
    const result = useSecondWind({ roller: createDiceRoller(7), character, state });
    expect(result.character.resources.secondWindAvailable).toBe(false);
    expect(result.character.actionEconomy.bonusActionUsed).toBe(true);
  });
});
