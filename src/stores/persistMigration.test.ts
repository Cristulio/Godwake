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

  it('re-derives permanentBonuses.hp from Mantle/Iron Will ranks for legacy chars', () => {
    const character = makeBareCharacter({});
    const v2 = migrateV1ToV2({
      character,
      unlockedUpgrades: { 'mantle-of-the-wakened': 3, 'iron-will': 2 },
    });
    // 3*5 (Mantle) + 2*5 (Iron Will) = 25
    expect(v2.character?.permanentBonuses?.hp).toBe(25);
  });

  it('leaves permanentBonuses.hp alone when already set on a v2 char', () => {
    const character = makeBareCharacter({ permanentHpBonus: 7 });
    const v2 = migrateV1ToV2({
      character,
      unlockedUpgrades: { 'mantle-of-the-wakened': 5 },
    });
    expect(v2.character?.permanentBonuses?.hp).toBe(7);
    // Top-level field is gone after v3 fold.
    expect((v2.character as unknown as Record<string, unknown>).permanentHpBonus).toBeUndefined();
  });

  it('folds the legacy permanentXxxBonus fields into permanentBonuses (v2→v3); strips removed init (v6→v7)', () => {
    const character = makeBareCharacter({
      permanentAcBonus: 1,
      permanentInitBonus: 2,
      permanentAttackBonus: 3,
      permanentDamageBonus: 4,
      permanentCritRangeBonus: 1,
      permanentHpBonus: 5,
      permanentSpellAttackBonus: 1,
      permanentSpellDcBonus: 1,
      permanentSpellDamageBonus: 2,
      permanentCunningActionBonus: 1,
      permanentSneakAttackDiceBonus: 2,
    });
    const v3 = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v3.character?.permanentBonuses).toEqual({
      ac: 1,
      attack: 3,
      damage: 4,
      critRange: 1,
      hp: 5,
      spellAttack: 1,
      spellDc: 1,
      spellDamage: 2,
      cunningAction: 1,
      sneakAttackDice: 2,
    });
    const ch = v3.character as unknown as Record<string, unknown>;
    expect(ch.permanentAcBonus).toBeUndefined();
    expect(ch.permanentSneakAttackDiceBonus).toBeUndefined();
    expect(ch.permanentInitBonus).toBeUndefined();
    expect((v3.character?.permanentBonuses as Record<string, unknown> | undefined)?.init).toBeUndefined();
  });

  it('is idempotent on an already-v3 character (permanentBonuses passes through)', () => {
    const character = {
      ...makeBareCharacter({}),
      permanentBonuses: { ac: 2, hp: 10 },
    };
    const v3 = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v3.character?.permanentBonuses).toEqual({ ac: 2, hp: 10 });
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

  it('defaults the v5 codex tracking maps to empty objects', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.monsterDefeats).toEqual({});
    expect(v.monsterKilledBy).toEqual({});
    expect(v.monsterKillingAbilities).toEqual({});
  });

  it('preserves existing v5 codex tracking maps when present', () => {
    const v = migrateV1ToV2({
      unlockedUpgrades: {},
      monsterDefeats: { goblin: 4 },
      monsterKilledBy: { 'duergar-ilyich': 2 },
      monsterKillingAbilities: { 'duergar-ilyich': { 'Eldritch Burst': 2 } },
    });
    expect(v.monsterDefeats).toEqual({ goblin: 4 });
    expect(v.monsterKilledBy).toEqual({ 'duergar-ilyich': 2 });
    expect(v.monsterKillingAbilities).toEqual({
      'duergar-ilyich': { 'Eldritch Burst': 2 },
    });
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
  it('is 13', () => {
    expect(SAVE_VERSION).toBe(14);
  });
});

describe('migrateV1ToV2 — v9 → v10 seenDialogueBeats', () => {
  it('defaults seenDialogueBeats to [] when missing', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.seenDialogueBeats).toEqual([]);
  });

  it('preserves an existing seenDialogueBeats array', () => {
    const v = migrateV1ToV2({
      unlockedUpgrades: {},
      seenDialogueBeats: ['imoen-camp-whisper'],
    });
    expect(v.seenDialogueBeats).toEqual(['imoen-camp-whisper']);
  });
});

describe('migrateV1ToV2 — v7 → v8 ascension', () => {
  it('defaults ascensionUnlocked to 0 when missing', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.ascensionUnlocked).toBe(0);
  });

  it('resets a negative/garbage ascensionUnlocked to 0', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, ascensionUnlocked: -2 }).ascensionUnlocked).toBe(0);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, ascensionUnlocked: 'x' as unknown as number })
        .ascensionUnlocked,
    ).toBe(0);
  });

  it('preserves an existing ascensionUnlocked', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, ascensionUnlocked: 4 }).ascensionUnlocked).toBe(4);
  });
});

describe('migrateV1ToV2 — v12 → v13 progressive-unlock ladder', () => {
  it('floors a missing delveCount to 999 so veterans are not re-gated', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.delveCount).toBe(999);
  });

  it('preserves a present delveCount, including a fresh-game 0', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 0 }).delveCount).toBe(0);
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 7 }).delveCount).toBe(7);
  });

  it('floors a garbage/negative delveCount to 999', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: -3 }).delveCount).toBe(999);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 'x' as unknown as number }).delveCount,
    ).toBe(999);
  });

  it('defaults seenTutorials to [] when missing and preserves an existing array', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {} }).seenTutorials).toEqual([]);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, seenTutorials: ['grove-intro'] }).seenTutorials,
    ).toEqual(['grove-intro']);
  });
});

describe('migrateV1ToV2 — v13 → v14 gear enhancement default-fill', () => {
  it('default-fills enhancement: 0 on a pre-v14 equipped rolled item', () => {
    const character = makeBareCharacter({
      equipped: {
        mainHand: { itemId: 'longsword', rolled: { baseId: 'longsword', rarity: 'blue', affixes: ['keen'], name: 'Keen Longsword' } },
        offHand: null,
        armor: null,
      },
    });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    const mh = (v.character as unknown as { equipped: { mainHand: { rolled: { enhancement: number; affixes: string[] } } } }).equipped.mainHand;
    expect(mh.rolled.enhancement).toBe(0);
    expect(mh.rolled.affixes).toEqual(['keen']); // known affix kept
  });

  it('preserves an existing enhancement value', () => {
    const character = makeBareCharacter({
      equipped: {
        mainHand: { itemId: 'longsword', rolled: { baseId: 'longsword', rarity: 'purple', affixes: [], enhancement: 3, name: '+3 Longsword' } },
        offHand: null,
        armor: null,
      },
    });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    const mh = (v.character as unknown as { equipped: { mainHand: { rolled: { enhancement: number } } } }).equipped.mainHand;
    expect(mh.rolled.enhancement).toBe(3);
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

describe('migrateV1ToV2 — v11 → v12 dead content id pruning', () => {
  it('removes unknown affix ids from equipped item rolled.affixes', () => {
    const character = makeBareCharacter({
      equipped: {
        mainHand: {
          itemId: 'dagger',
          rolled: { baseId: 'dagger', rarity: 'green', affixes: ['keen', '__dead-affix__'], name: 'Keen Dagger' },
        },
        offHand: null,
        armor: null,
      },
    });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    const mainHand = v.character?.equipped.mainHand as Record<string, unknown> | null | undefined;
    const rolled = mainHand?.rolled as { affixes: string[] } | undefined;
    expect(rolled?.affixes).toEqual(['keen']);
  });

  it('removes unknown blessing ids from character.blessings', () => {
    const character = makeBareCharacter({ blessings: ['tymoras-coin', '__dead-blessing__'] });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v.character?.blessings).toEqual(['tymoras-coin']);
  });

  it('removes unknown quirk ids from character.quirks', () => {
    const character = makeBareCharacter({ quirks: ['tymoras-eye', '__dead-quirk__'] });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v.character?.quirks).toEqual(['tymoras-eye']);
  });

  it('preserves all-valid affix/blessing/quirk ids unchanged', () => {
    const character = makeBareCharacter({
      blessings: ['tymoras-coin'],
      quirks: ['tymoras-eye'],
    });
    const v = migrateV1ToV2({ character, unlockedUpgrades: {} });
    expect(v.character?.blessings).toEqual(['tymoras-coin']);
    expect(v.character?.quirks).toEqual(['tymoras-eye']);
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
    },
    quirks: [],
    blessings: [],
    goldInPocket: 0,
    renown: 50,
    ...overrides,
  };
}
