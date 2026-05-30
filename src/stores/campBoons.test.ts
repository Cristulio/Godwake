import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useCombatStore } from './combatStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { createGodwakeDelve } from '../engine/delve';
import type { Character } from '../types/character';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'boon-store-tester',
      name: 'Pilgrim',
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
    ...extra,
  };
}

function reset(character: Character) {
  useCharacterStore.setState({ character, saveSeed: null });
  useDelveStore.setState({ delve: createGodwakeDelve(1) });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    hasReincarnated: false,
    deathCount: 0,
    discoveredMonsters: [],
    monsterEncounters: {},
    unlockedUpgrades: {},
    chapter1Cleared: false,
    druidGroveUnlocked: false,
  });
  useScreenStore.setState({
    screen: 'delve',
    introSeen: true,
    quirksTutorialSeen: false,
    taunt: null,
  });
}

describe('camp boons — delve store', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
  });

  it('pickCampBoon mirrors the boon onto character.campBoons and resolves the tier', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    const after = useCharacterStore.getState().character!;
    expect(after.campBoons).toEqual(['eye-of-the-hawk']);
    const delve = useDelveStore.getState().delve!;
    expect(delve.campBoons).toEqual([{ tier: 1, boonId: 'eye-of-the-hawk' }]);
  });

  it('cannot resolve the same tier twice', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    useGameStore.getState().pickCampBoon(1, 'vigor-of-the-road');
    const after = useCharacterStore.getState().character!;
    expect(after.campBoons).toEqual(['eye-of-the-hawk']);
    expect(useDelveStore.getState().delve!.campBoons!.length).toBe(1);
  });

  it('explicit skip records null and locks the tier', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, null);
    expect(useCharacterStore.getState().character!.campBoons ?? []).toEqual([]);
    expect(useDelveStore.getState().delve!.campBoons).toEqual([
      { tier: 1, boonId: null },
    ]);

    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    expect(useCharacterStore.getState().character!.campBoons ?? []).toEqual([]);
  });

  it('vigor-of-the-road raises max HP by 5% (min +1) on pick', () => {
    const char = makeFighter();
    const startMax = char.hp.max;
    reset(char);
    useGameStore.getState().pickCampBoon(1, 'vigor-of-the-road');
    const after = useCharacterStore.getState().character!;
    const expectedBump = Math.max(1, Math.floor(startMax * 0.05));
    expect(after.hp.max).toBe(startMax + expectedBump);
    expect(after.hp.current).toBe(char.hp.current + expectedBump);
  });

  it('mantle-of-the-slain raises max HP by +1 per level on pick', () => {
    const char = makeFighter({ level: 5 });
    char.hp.max = 50;
    char.hp.current = 50;
    reset(char);
    useGameStore.getState().pickCampBoon(3, 'mantle-of-the-slain');
    const after = useCharacterStore.getState().character!;
    expect(after.hp.max).toBe(50 + 5);
    expect(after.hp.current).toBe(50 + 5);
  });

  it('eyes-of-the-lich adds the boon to campBoons (no flag on delve)', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(3, 'eyes-of-the-lich');
    const boons = useCharacterStore.getState().character!.campBoons;
    expect(boons).toContain('eyes-of-the-lich');
  });

  it('failDelve (reincarnation) clears campBoons on the soul', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    useGameStore.getState().pickCampBoon(2, 'steel-of-the-brave');
    expect(useCharacterStore.getState().character!.campBoons).toEqual([
      'eye-of-the-hawk',
      'steel-of-the-brave',
    ]);
    useGameStore.getState().failDelve();
    expect(useCharacterStore.getState().character!.campBoons).toEqual([]);
  });

  it('finishDelve clears campBoons too', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    // Drive the delve to completed so finishDelve runs the boss-clear path.
    useDelveStore.setState({
      delve: { ...useDelveStore.getState().delve!, phase: 'completed' },
    });
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.campBoons).toEqual([]);
  });

  it('all three boons stack onto a single character', () => {
    reset(makeFighter());
    useGameStore.getState().pickCampBoon(1, 'eye-of-the-hawk');
    useGameStore.getState().pickCampBoon(2, 'steel-of-the-brave');
    useGameStore.getState().pickCampBoon(3, 'blade-of-the-vow');
    expect(useCharacterStore.getState().character!.campBoons).toEqual([
      'eye-of-the-hawk',
      'steel-of-the-brave',
      'blade-of-the-vow',
    ]);
  });
});
