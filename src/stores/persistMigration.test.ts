import { describe, it, expect, beforeEach } from 'vitest';
import { migrateV1ToV2, migrateUnlockedUpgrades, SAVE_VERSION } from './persistMigration';
import { useGameStore, SAVE_SLOT_KEY_PREFIX } from './gameStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';

describe('migrateUnlockedUpgrades', () => {
  it('converts a v0 string[] to Record<id, 1>', () => {
    const out = migrateUnlockedUpgrades(['heirloom-blade', 'cloak-of-the-grove']);
    expect(out).toEqual({ 'heirloom-blade': 1, 'cloak-of-the-grove': 1 });
  });

  it('passes through a Record<id, rank> shape unchanged', () => {
    const input = { 'mantle-of-the-wakened': 3, 'iron-will': 2 };
    expect(migrateUnlockedUpgrades(input)).toEqual(input);
  });

  it('defaults to {} for nullish or garbage', () => {
    expect(migrateUnlockedUpgrades(null)).toEqual({});
    expect(migrateUnlockedUpgrades(undefined)).toEqual({});
    expect(migrateUnlockedUpgrades(42)).toEqual({});
  });
});

describe('migrateV1ToV2', () => {
  it('converts unlockedUpgrades from array to record', () => {
    const v2 = migrateV1ToV2({
      unlockedUpgrades: ['heirloom-blade'],
      character: null,
    });
    expect(v2.unlockedUpgrades).toEqual({ 'heirloom-blade': 1 });
  });

  it('re-derives permanentHpBonus from Mantle/Iron Will ranks for legacy chars', () => {
    const character = makeBareCharacter({ permanentHpBonus: undefined });
    const v2 = migrateV1ToV2({
      character,
      unlockedUpgrades: { 'mantle-of-the-wakened': 3, 'iron-will': 2 },
    });
    // 3*5 (Mantle) + 2*5 (Iron Will) = 25
    expect(v2.character?.permanentHpBonus).toBe(25);
  });

  it('leaves permanentHpBonus alone when already set', () => {
    const character = makeBareCharacter({ permanentHpBonus: 7 });
    const v2 = migrateV1ToV2({
      character,
      unlockedUpgrades: { 'mantle-of-the-wakened': 5 },
    });
    expect(v2.character?.permanentHpBonus).toBe(7);
  });

  it('defaults quirks and conditions on legacy characters', () => {
    const character = { ...makeBareCharacter({}) } as Record<string, unknown>;
    // Strip the post-init defaults to simulate a pre-quirks save.
    delete character.quirks;
    delete character.conditions;
    const v2 = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v2.character?.quirks).toEqual([]);
    expect(v2.character?.conditions).toEqual([]);
  });

  it('seeds monsterEncounters from discoveredMonsters when absent', () => {
    const v2 = migrateV1ToV2({
      discoveredMonsters: ['goblin', 'skeleton'],
      unlockedUpgrades: {},
    });
    expect(v2.monsterEncounters).toEqual({ goblin: 1, skeleton: 1 });
  });

  it('preserves existing monsterEncounters', () => {
    const v2 = migrateV1ToV2({
      monsterEncounters: { goblin: 7 },
      discoveredMonsters: ['goblin', 'skeleton'],
      unlockedUpgrades: {},
    });
    expect(v2.monsterEncounters).toEqual({ goblin: 7 });
  });

  it('defaults chapter1Cleared to false when missing', () => {
    const v2 = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v2.chapter1Cleared).toBe(false);
  });

  it('retroactively unlocks the Grove when the player owns upgrades', () => {
    const v2 = migrateV1ToV2({
      unlockedUpgrades: { 'heirloom-blade': 1 },
    });
    expect(v2.druidGroveUnlocked).toBe(true);
  });

  it('retroactively unlocks the Grove when renown >= 30', () => {
    const character = makeBareCharacter({ renown: 100 });
    const v2 = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v2.druidGroveUnlocked).toBe(true);
  });

  it('seeds deathCount from hasReincarnated when missing', () => {
    const v2 = migrateV1ToV2({
      hasReincarnated: true,
      unlockedUpgrades: {},
    });
    expect(v2.deathCount).toBe(1);
  });

  it('rehydrates a synthetic full v1 save into a valid v2 shape', () => {
    const v1Snapshot: Record<string, unknown> = {
      screen: 'hub',
      saveSeed: 'seed-123',
      character: makeBareCharacter({
        renown: 200,
        permanentHpBonus: undefined,
      }),
      introSeen: true,
      hasReincarnated: true,
      // deathCount missing — simulates pre-counter save
      quirksTutorialSeen: false,
      discoveredMonsters: ['goblin', 'skeleton'],
      // monsterEncounters missing
      unlockedUpgrades: ['heirloom-blade'], // v0 array shape
      // chapter1Cleared and druidGroveUnlocked missing
    };
    const v2 = migrateV1ToV2(v1Snapshot);
    expect(v2.unlockedUpgrades).toEqual({ 'heirloom-blade': 1 });
    expect(v2.character?.quirks).toEqual([]);
    expect(v2.character?.conditions).toEqual([]);
    expect(v2.monsterEncounters).toEqual({ goblin: 1, skeleton: 1 });
    expect(v2.chapter1Cleared).toBe(false);
    expect(v2.druidGroveUnlocked).toBe(true); // unlocked upgrades + renown 200
    expect(v2.deathCount).toBe(1);
  });
});

describe('SAVE_VERSION', () => {
  it('is 2', () => {
    expect(SAVE_VERSION).toBe(2);
  });
});

describe('loadFromSlot — backward-compat v1 wrapper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates a v1 slot wrapper on load', () => {
    const v1Wrapper = {
      version: 1,
      state: {
        screen: 'hub',
        saveSeed: 'legacy-seed',
        character: makeBareCharacter({
          renown: 80,
          permanentHpBonus: undefined,
        }),
        introSeen: true,
        hasReincarnated: true,
        quirksTutorialSeen: true,
        discoveredMonsters: ['goblin'],
        unlockedUpgrades: ['heirloom-blade'], // legacy array shape
      },
    };
    localStorage.setItem(`${SAVE_SLOT_KEY_PREFIX}1`, JSON.stringify(v1Wrapper));

    const res = useGameStore.getState().loadFromSlot(1);
    expect(res.ok).toBe(true);
    expect(useCharacterStore.getState().character?.renown).toBe(80);
    expect(useCharacterStore.getState().character?.quirks).toEqual([]);
    expect(useCharacterStore.getState().character?.conditions).toEqual([]);
    expect(useMetaStore.getState().unlockedUpgrades).toEqual({
      'heirloom-blade': 1,
    });
    expect(useMetaStore.getState().monsterEncounters).toEqual({ goblin: 1 });
    expect(useMetaStore.getState().deathCount).toBe(1);
    expect(useMetaStore.getState().druidGroveUnlocked).toBe(true);
  });
});

function makeBareCharacter(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'legacy-fighter',
    name: 'Legacy Brick',
    raceId: 'human',
    classId: 'fighter',
    subclassId: 'champion',
    baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    level: 3,
    xp: 1200,
    skillProficiencies: [],
    expertSkills: [],
    hp: { current: 20, max: 28, temp: 0 },
    hitDice: { current: 3, max: 3, die: 10 },
    conditions: [],
    inventory: [],
    equipped: { mainHand: null, offHand: null, armor: null },
    resources: {},
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: 30,
    },
    quirks: [],
    blessings: [],
    goldInPocket: 0,
    renown: 50,
    ...overrides,
  };
}
