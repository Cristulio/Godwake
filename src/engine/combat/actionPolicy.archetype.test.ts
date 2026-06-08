import { describe, it, expect } from 'vitest';
import type { Character } from '../../types/character';
import type { RaceId } from '../../schemas/ids';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { simulateLevelUp } from '../character/leveling';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { createCombat } from './createCombat';
import { chooseCombatAction, ARCHETYPES, PROFILES } from './actionPolicy';

function rogue(): Character {
  const c = createCharacter({
    id: 'p-rogue',
    name: 'Shiv',
    raceId: 'wood-elf' as RaceId,
    classId: 'rogue',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['stealth', 'sleight-of-hand'],
  });
  return {
    ...c,
    inventory: [{ itemId: 'rapier' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'rapier' }, offHand: null, armor: { itemId: 'leather-armor' } },
  };
}

function wizard(): Character {
  const c = createCharacter({
    id: 'p-wizard',
    name: 'Quill',
    raceId: 'human' as RaceId,
    classId: 'wizard',
    baseAbilityScores: {
      int: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      str: STANDARD_ARRAY[5],
    },
    skillProficiencies: ['arcana', 'investigation'],
  });
  return {
    ...c,
    inventory: [{ itemId: 'dagger' }, { itemId: 'potion-of-healing' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

function atLevel(builder: () => Character, level: number): Character {
  let c = builder();
  while (c.level < level) c = simulateLevelUp({ ...c, xp: 9_999_999 });
  return c;
}

function startCombat(c: Character, monsters: { defId: string; count: number }[]) {
  const roller = createDiceRoller(1);
  const defs = monsters.flatMap((m) =>
    Array.from({ length: m.count }, () => ({ def: getMonster(m.defId) })),
  );
  return createCombat({ roller, character: c, monsters: defs });
}

describe('archetype profiles', () => {
  it('exposes exactly the three archetypes', () => {
    expect([...ARCHETYPES]).toEqual(['cautious', 'balanced', 'aggressive']);
  });

  it('pins the balanced profile to the pre-archetype constants', () => {
    expect(PROFILES.balanced).toEqual({
      emergencyHp: 0.35,
      secondWindHp: 0.5,
      surgeHp: 0.7,
      wizardDefensiveHp: 0.5,
      wizardDrainHp: 0.6,
      holdPersonThreat: 8,
    });
  });
});

describe('balanced == default (no-archetype behaviour is unchanged)', () => {
  const cases = [
    {
      name: 'wizard vs a crowd',
      setup: () => startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 3 }]),
    },
    {
      name: 'rogue opener',
      setup: () => startCombat(rogue(), [{ defId: 'goblin', count: 1 }]),
    },
    {
      name: 'hurt wizard (life-drain)',
      setup: () => {
        const { state, character } = startCombat(atLevel(wizard, 5), [{ defId: 'goblin', count: 1 }]);
        const hurt: Character = {
          ...character,
          hp: { ...character.hp, current: Math.floor(character.hp.max * 0.5) },
          resources: {
            ...character.resources,
            knownSpells: ['fire-bolt', 'vampiric-touch'],
            spellSlots: { 1: 2, 2: 0, 3: 2, 4: 0 },
          },
        };
        return { state, character: hurt };
      },
    },
  ];

  for (const { name, setup } of cases) {
    it(`reproduces the baseline action — ${name}`, () => {
      const { state, character } = setup();
      expect(chooseCombatAction(state, character)).toEqual(
        chooseCombatAction(state, character, 'balanced'),
      );
    });
  }
});

describe('cautious vs aggressive diverge on a low-HP read', () => {
  // HP at 0.4: above aggressive.emergencyHp (0.2) and balanced (0.35), but
  // below cautious (0.5). Cautious drinks the potion; aggressive keeps pressing.
  it('cautious heals where aggressive presses (rogue, 40% HP)', () => {
    const { state, character } = startCombat(rogue(), [{ defId: 'goblin', count: 1 }]);
    const hurt: Character = {
      ...character,
      hp: { ...character.hp, current: Math.floor(character.hp.max * 0.4) },
    };
    expect(chooseCombatAction(state, hurt, 'cautious').kind).toBe('item');
    expect(chooseCombatAction(state, hurt, 'aggressive').kind).not.toBe('item');
    expect(chooseCombatAction(state, hurt, 'balanced').kind).not.toBe('item');
  });
});
