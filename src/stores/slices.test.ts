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

  it('advanceRoom reveals the route map at a fork; chooseRoom steps into a node', () => {
    const d = createGodwakeDelve(1);
    useDelveStore.setState({ delve: d });
    const entry = d.rooms[0];
    expect(entry.next && entry.next.length).toBeGreaterThan(1); // a real branch

    // Finishing a branch node hands control to the map, leaving position put.
    useDelveStore.getState().advanceRoom();
    expect(useDelveStore.getState().delve?.phase).toBe('between-rooms');
    expect(useDelveStore.getState().delve?.currentRoomIdx).toBe(0);

    // Choosing a reachable node steps the run into it.
    const target = entry.next![0];
    useDelveStore.getState().chooseRoom(target);
    const after = useDelveStore.getState().delve!;
    expect(after.phase).toBe('in-room');
    expect(after.currentRoomId).toBe(target);
    expect(after.rooms[after.currentRoomIdx].id).toBe(target);
  });

  it('chooseRoom refuses a node not reachable from the current one', () => {
    const d = createGodwakeDelve(1);
    useDelveStore.setState({ delve: { ...d, phase: 'between-rooms' } });
    const unreachable = d.rooms.find(
      (r) => r.id !== d.rooms[0].id && !(d.rooms[0].next ?? []).includes(r.id),
    )!;
    useDelveStore.getState().chooseRoom(unreachable.id);
    expect(useDelveStore.getState().delve?.currentRoomIdx).toBe(0);
  });

  it('a full route walk navigates through every chapter to completion', () => {
    useDelveStore.setState({ delve: createGodwakeDelve(7) });
    const store = useDelveStore.getState();
    let guard = 0;
    while (useDelveStore.getState().delve!.phase !== 'completed' && guard++ < 300) {
      const cur = useDelveStore.getState().delve!;
      if (cur.phase === 'between-rooms') {
        const node = cur.rooms[cur.currentRoomIdx];
        store.chooseRoom(node.next![0]); // always take the first open road
      } else {
        store.advanceRoom(); // reveal the map, auto-step a seam, or finish
      }
    }
    const done = useDelveStore.getState().delve!;
    expect(done.phase).toBe('completed');
    const chapters = new Set(
      done.visitedRoomIds!.map((id) => done.rooms.find((r) => r.id === id)?.chapter),
    );
    expect(chapters.has(1)).toBe(true);
    expect(chapters.has(4)).toBe(true);
    // Walked a real subset of the map, not the whole flat list.
    expect(done.visitedRoomIds!.length).toBeLessThan(done.rooms.length);
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

  it('recordMonsterDefeat increments per-def defeat counts', () => {
    useMetaStore.getState().recordMonsterDefeat('goblin');
    useMetaStore.getState().recordMonsterDefeat('goblin');
    useMetaStore.getState().recordMonsterDefeat('skeleton');
    const s = useMetaStore.getState();
    expect(s.monsterDefeats).toEqual({ goblin: 2, skeleton: 1 });
  });

  it('recordPlayerKilledBy increments killer + ability buckets', () => {
    useMetaStore.getState().recordPlayerKilledBy('duergar-ilyich', 'Eldritch Burst');
    useMetaStore.getState().recordPlayerKilledBy('duergar-ilyich', 'Eldritch Burst');
    useMetaStore.getState().recordPlayerKilledBy('duergar-ilyich', 'Greataxe');
    const s = useMetaStore.getState();
    expect(s.monsterKilledBy['duergar-ilyich']).toBe(3);
    expect(s.monsterKillingAbilities['duergar-ilyich']).toEqual({
      'Eldritch Burst': 2,
      Greataxe: 1,
    });
  });

  it('recordPlayerKilledBy with no ability still counts the kill', () => {
    useMetaStore.getState().recordPlayerKilledBy('shadow');
    const s = useMetaStore.getState();
    expect(s.monsterKilledBy['shadow']).toBe(1);
    expect(s.monsterKillingAbilities['shadow']).toBeUndefined();
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
