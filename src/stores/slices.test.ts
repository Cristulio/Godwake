import { describe, it, expect, beforeEach } from 'vitest';
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
      id: 'slice-fighter',
      name: 'SliceTest',
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

describe('useCharacterStore — basic CRUD', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useScreenStore.setState({ screen: 'hub' });
  });

  it('starts with no character', () => {
    expect(useCharacterStore.getState().character).toBeNull();
  });

  it('setCharacter stores the character', () => {
    const ch = makeFighter();
    useCharacterStore.getState().setCharacter(ch);
    expect(useCharacterStore.getState().character).toBe(ch);
  });

  it('setSaveSeed stores the seed', () => {
    useCharacterStore.getState().setSaveSeed('abc');
    expect(useCharacterStore.getState().saveSeed).toBe('abc');
  });

  it('addBlessing pushes to blessings list', () => {
    const ch = makeFighter();
    useCharacterStore.setState({ character: ch });
    useCharacterStore.getState().addBlessing('tymora-wink');
    expect(useCharacterStore.getState().character?.blessings).toContain('tymora-wink');
  });

  it('addBlessing is no-op when character is null', () => {
    useCharacterStore.setState({ character: null });
    expect(() => useCharacterStore.getState().addBlessing('foo')).not.toThrow();
    expect(useCharacterStore.getState().character).toBeNull();
  });

  it('unequipSlot updates equipped slot to null', () => {
    const ch = makeFighter();
    useCharacterStore.setState({ character: ch });
    useCharacterStore.getState().unequipSlot('mainHand');
    expect(useCharacterStore.getState().character?.equipped.mainHand).toBeNull();
  });
});

describe('useDelveStore — basic CRUD', () => {
  beforeEach(() => {
    useDelveStore.setState({ delve: null });
    useCharacterStore.setState({ character: makeFighter() });
    useScreenStore.setState({ screen: 'hub' });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({ unlockedUpgrades: {}, chapter1Cleared: false });
  });

  it('starts with no delve', () => {
    expect(useDelveStore.getState().delve).toBeNull();
  });

  it('setDelve stores the delve', () => {
    const d = createGodwakeDelve(1);
    useDelveStore.getState().setDelve(d);
    expect(useDelveStore.getState().delve).toBe(d);
  });

  it('advanceRoom moves currentRoomIdx forward', () => {
    const d = createGodwakeDelve(1);
    useDelveStore.setState({ delve: { ...d, currentRoomIdx: 0 } });
    useDelveStore.getState().advanceRoom();
    expect(useDelveStore.getState().delve?.currentRoomIdx).toBe(1);
  });

  it('markChapter1BossKilled flips the flag on the delve', () => {
    useDelveStore.setState({ delve: createGodwakeDelve(1) });
    useDelveStore.getState().markChapter1BossKilled();
    expect(useDelveStore.getState().delve?.chapter1BossKilled).toBe(true);
  });

  it('concludeDelveAtCamp flips phase to completed', () => {
    useDelveStore.setState({ delve: createGodwakeDelve(1) });
    useDelveStore.getState().concludeDelveAtCamp();
    expect(useDelveStore.getState().delve?.phase).toBe('completed');
  });
});

describe('useCombatStore — basic CRUD', () => {
  beforeEach(() => {
    useCombatStore.setState({ combat: null });
  });

  it('starts with no combat', () => {
    expect(useCombatStore.getState().combat).toBeNull();
  });

  it('setCombat stores the combat state', () => {
    const fake = { rounds: [], log: [] } as never;
    useCombatStore.getState().setCombat(fake);
    expect(useCombatStore.getState().combat).toBe(fake);
  });

  it('setCombat(null) clears combat', () => {
    useCombatStore.setState({ combat: { rounds: [], log: [] } as never });
    useCombatStore.getState().setCombat(null);
    expect(useCombatStore.getState().combat).toBeNull();
  });
});

describe('useMetaStore — basic CRUD', () => {
  beforeEach(() => {
    useMetaStore.getState().resetMeta();
    useCharacterStore.setState({ character: makeFighter({ renown: 1000 }) });
  });

  it('starts with defaulted meta fields', () => {
    const s = useMetaStore.getState();
    expect(s.hasReincarnated).toBe(false);
    expect(s.deathCount).toBe(0);
    expect(s.discoveredMonsters).toEqual([]);
    expect(s.monsterEncounters).toEqual({});
    expect(s.unlockedUpgrades).toEqual({});
    expect(s.chapter1Cleared).toBe(false);
    expect(s.druidGroveUnlocked).toBe(false);
  });

  it('discoverMonster adds to discoveredMonsters and increments encounter count', () => {
    useMetaStore.getState().discoverMonster('goblin');
    expect(useMetaStore.getState().discoveredMonsters).toEqual(['goblin']);
    expect(useMetaStore.getState().monsterEncounters['goblin']).toBe(1);
    // Second encounter increments without duplicating
    useMetaStore.getState().discoverMonster('goblin');
    expect(useMetaStore.getState().discoveredMonsters).toEqual(['goblin']);
    expect(useMetaStore.getState().monsterEncounters['goblin']).toBe(2);
  });

  it('incrementDeathCount bumps deathCount', () => {
    useMetaStore.getState().incrementDeathCount();
    useMetaStore.getState().incrementDeathCount();
    expect(useMetaStore.getState().deathCount).toBe(2);
  });

  it('resetMeta wipes all fields', () => {
    useMetaStore.setState({
      hasReincarnated: true,
      deathCount: 5,
      discoveredMonsters: ['x'],
      monsterEncounters: { x: 3 },
      unlockedUpgrades: { 'heirloom-blade': 1 },
      chapter1Cleared: true,
      druidGroveUnlocked: true,
    });
    useMetaStore.getState().resetMeta();
    const s = useMetaStore.getState();
    expect(s.hasReincarnated).toBe(false);
    expect(s.deathCount).toBe(0);
    expect(s.discoveredMonsters).toEqual([]);
    expect(s.unlockedUpgrades).toEqual({});
  });
});

describe('useScreenStore — basic CRUD', () => {
  beforeEach(() => {
    useScreenStore.setState({
      screen: 'title',
      introSeen: false,
      quirksTutorialSeen: false,
      taunt: null,
    });
  });

  it('starts on the title screen', () => {
    expect(useScreenStore.getState().screen).toBe('title');
  });

  it('goToHub flips screen to hub', () => {
    useScreenStore.getState().goToHub();
    expect(useScreenStore.getState().screen).toBe('hub');
  });

  it('goToCodex / goToInventory flip screen', () => {
    useScreenStore.getState().goToCodex();
    expect(useScreenStore.getState().screen).toBe('codex');
    useScreenStore.getState().goToInventory();
    expect(useScreenStore.getState().screen).toBe('inventory');
  });

  it('showTaunt sets the taunt; dismissTaunt clears', () => {
    useScreenStore.getState().showTaunt('irenicus', 'descent');
    expect(useScreenStore.getState().taunt?.speaker).toBe('irenicus');
    useScreenStore.getState().dismissTaunt();
    expect(useScreenStore.getState().taunt).toBeNull();
  });

  it('markQuirksTutorialSeen flips the flag', () => {
    useScreenStore.getState().markQuirksTutorialSeen();
    expect(useScreenStore.getState().quirksTutorialSeen).toBe(true);
  });

  it('setIntroSeen mutates introSeen', () => {
    useScreenStore.getState().setIntroSeen(true);
    expect(useScreenStore.getState().introSeen).toBe(true);
  });
});
