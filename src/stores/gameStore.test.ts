import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { createGodwakeDelve } from '../engine/delve';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getClass } from '../content/classes';
import { getRace } from '../content/races';
import type { Character } from '../types/character';

function makeWizard(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-wizard',
      name: 'Inara',
      raceId: 'human',
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
    ...extra,
  };
}

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15
        con: STANDARD_ARRAY[1], // 14
        dex: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        cha: STANDARD_ARRAY[4], // 10
        int: STANDARD_ARRAY[5], // 8
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    ...extra,
  };
}

function expectedBaseHpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const race = getRace(ch.raceId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const bonusHp = race.bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  return cls.hitDie + conMod + bonusHp + classBonusHp;
}

describe('gameStore.startDelve — HP preservation', () => {
  beforeEach(() => {
    useGameStore.setState({
      character: null,
      delve: null,
      combat: null,
      unlockedUpgrades: {},
      screen: 'hub',
    });
  });

  it('preserves the wizard +1/level baseline across a descent', () => {
    const wizard = makeWizard();
    const expectedAtCreation = expectedBaseHpMax(wizard);
    expect(wizard.hp.max).toBe(expectedAtCreation);

    useGameStore.setState({ character: wizard });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expectedAtCreation);
    expect(after.hp.current).toBe(expectedAtCreation);
  });

  it('preserves Mantle of the Wakened R3 (+15 HP) for a wizard across startDelve', () => {
    const wizard = makeWizard({ permanentHpBonus: 15 });
    const expected = expectedBaseHpMax(wizard) + 15;

    useGameStore.setState({
      character: wizard,
      unlockedUpgrades: { 'mantle-of-the-wakened': 3 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('preserves Mantle R5 (+25 HP) for a fighter across startDelve', () => {
    const fighter = makeFighter({ permanentHpBonus: 25 });
    const expected = expectedBaseHpMax(fighter) + 25;

    useGameStore.setState({
      character: fighter,
      unlockedUpgrades: { 'mantle-of-the-wakened': 5 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('stacks permanentHpBonus with the wizard baseline', () => {
    // Mantle R2 (+10) + Iron Will (+5) = +15 over baseline.
    const wizard = makeWizard({ permanentHpBonus: 15 });
    const expected = expectedBaseHpMax(wizard) + 15;

    useGameStore.setState({
      character: wizard,
      unlockedUpgrades: { 'mantle-of-the-wakened': 2, 'iron-will': 1 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
  });
});
