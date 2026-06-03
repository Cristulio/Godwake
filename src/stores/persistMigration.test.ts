import { describe, it, expect, beforeEach } from 'vitest';
import { TOTAL_CHAPTERS, BASE_GAME_CHAPTERS } from '../engine/delve/constants';
import { migrateV1ToV2, migrateUnlockedUpgrades, SAVE_VERSION } from './persistMigration';
import { useGameStore, SAVE_SLOT_KEY_PREFIX } from './gameStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { isFeatureUnlocked } from '../engine/progression/unlocks';

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
  it('is 17', () => {
    expect(SAVE_VERSION).toBe(17);
  });
});

describe('migrateV1ToV2 — v16 → v17 renown-spent tracker', () => {
  it('defaults renownSpent to 0 when missing (no back-credit for past spends)', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {} }).renownSpent).toBe(0);
  });

  it('preserves a present renownSpent', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, renownSpent: 250 }).renownSpent).toBe(250);
  });

  it('coerces a garbage/negative renownSpent back to 0', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, renownSpent: -10 }).renownSpent).toBe(0);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, renownSpent: 'x' as unknown as number }).renownSpent,
    ).toBe(0);
  });
});

describe('migrateV1ToV2 — v14 → v15 ending capstone flag', () => {
  it('defaults gameCompleted to false when missing', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.gameCompleted).toBe(false);
  });

  it('preserves a set gameCompleted across migration', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {}, gameCompleted: true });
    expect(v.gameCompleted).toBe(true);
  });
});

describe('migrateV1ToV2 — v15 → v16 flavor ending + ascension run-config', () => {
  it('drops the legacy endingChosen branch cleanly', () => {
    const v = migrateV1ToV2({
      unlockedUpgrades: {},
      gameCompleted: true,
      endingChosen: 'ascend',
    });
    expect(v.gameCompleted).toBe(true);
    expect('endingChosen' in v).toBe(false);
  });

  it('defaults selectedAscension to 0 when missing', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.selectedAscension).toBe(0);
  });

  it('preserves a present selectedAscension', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {}, selectedAscension: 3 });
    expect(v.selectedAscension).toBe(3);
  });

  it('coerces a garbage selectedAscension back to 0', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {}, selectedAscension: -4 });
    expect(v.selectedAscension).toBe(0);
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
  it('floors a missing delveCount to 999 when the save shows prior progression (veteran not re-gated)', () => {
    // Any ONE progression marker is enough to read a missing delveCount as a veteran.
    expect(migrateV1ToV2({ unlockedUpgrades: {}, chaptersCleared: 3 }).delveCount).toBe(999);
    expect(migrateV1ToV2({ unlockedUpgrades: { 'heirloom-blade': 1 } }).delveCount).toBe(999);
    expect(migrateV1ToV2({ unlockedUpgrades: {}, gameCompleted: true }).delveCount).toBe(999);
    expect(migrateV1ToV2({ unlockedUpgrades: {}, deathCount: 2 }).delveCount).toBe(999);
    // hasReincarnated seeds deathCount → 1, which also reads as a veteran.
    expect(migrateV1ToV2({ unlockedUpgrades: {}, hasReincarnated: true }).delveCount).toBe(999);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, discoveredMonsters: ['goblin'] }).delveCount,
    ).toBe(999);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, monsterEncounters: { goblin: 4 } }).delveCount,
    ).toBe(999);
  });

  it('defaults a missing delveCount to 0 for a fresh/wiped save with no markers (onboarding gates stay closed)', () => {
    const v = migrateV1ToV2({ unlockedUpgrades: {} });
    expect(v.delveCount).toBe(0);
    const meta = {
      delveCount: v.delveCount,
      chaptersCleared: typeof v.chaptersCleared === 'number' ? v.chaptersCleared : 0,
      druidGroveUnlocked: v.druidGroveUnlocked === true,
    };
    // The curtain is ON: elites and the Grove stay locked for a brand-new soul.
    expect(isFeatureUnlocked('elite-nodes', meta)).toBe(false);
    expect(isFeatureUnlocked('grove', meta)).toBe(false);
    // Sanity: the 999 floor still opens the delve-paced reveals (elites)...
    expect(isFeatureUnlocked('elite-nodes', { ...meta, delveCount: 999 })).toBe(true);
    // ...but the Grove no longer rides delve count — it is reincarnation-gated now,
    // so a 999 floor alone does NOT open it; the legacy flag (or a reincarnation) does.
    expect(isFeatureUnlocked('grove', { ...meta, delveCount: 999 })).toBe(false);
    expect(isFeatureUnlocked('grove', { ...meta, druidGroveUnlocked: true })).toBe(true);
  });

  it('preserves a present delveCount, including a fresh-game 0', () => {
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 0 }).delveCount).toBe(0);
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 7 }).delveCount).toBe(7);
    // A present 0 wins even beside veteran markers — an explicit count is authoritative.
    expect(
      migrateV1ToV2({
        unlockedUpgrades: { 'heirloom-blade': 1 },
        delveCount: 0,
        chaptersCleared: 5,
      }).delveCount,
    ).toBe(0);
  });

  it('treats a garbage/negative delveCount like a missing one: 999 with markers, 0 without', () => {
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, delveCount: -3, chaptersCleared: 2 }).delveCount,
    ).toBe(999);
    expect(
      migrateV1ToV2({ unlockedUpgrades: {}, delveCount: 'x' as unknown as number, deathCount: 1 })
        .delveCount,
    ).toBe(999);
    expect(migrateV1ToV2({ unlockedUpgrades: {}, delveCount: -3 }).delveCount).toBe(0);
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

describe('loadFromSlot — completion recovery for a crashed ending', () => {
  beforeEach(() => {
    localStorage.clear();
    useMetaStore.getState().resetMeta();
  });

  function writeSlot(stateOverrides: Record<string, unknown>) {
    localStorage.setItem(
      `${SAVE_SLOT_KEY_PREFIX}1`,
      JSON.stringify({
        version: SAVE_VERSION,
        state: { screen: 'hub', character: null, ...stateOverrides },
      }),
    );
  }

  it('a save with the whole chain cleared but gameCompleted false recovers to true', () => {
    // The exact shape an older build left behind when the lazy ending screen
    // crashed before recording completion.
    writeSlot({ chaptersCleared: TOTAL_CHAPTERS, gameCompleted: false });

    expect(useGameStore.getState().loadFromSlot(1).ok).toBe(true);
    expect(useMetaStore.getState().gameCompleted).toBe(true);
  });

  it('does NOT spuriously complete a save that never felled the base chain (Irenicus)', () => {
    // Base completion = clearing through Ch11 (Irenicus). A save short of that
    // stays incomplete — the recovery floor is BASE_GAME_CHAPTERS, not TOTAL.
    writeSlot({ chaptersCleared: BASE_GAME_CHAPTERS - 1, gameCompleted: false });

    expect(useGameStore.getState().loadFromSlot(1).ok).toBe(true);
    expect(useMetaStore.getState().gameCompleted).toBe(false);
  });

  it('leaves an already-completed save completed', () => {
    writeSlot({ chaptersCleared: TOTAL_CHAPTERS, gameCompleted: true });

    expect(useGameStore.getState().loadFromSlot(1).ok).toBe(true);
    expect(useMetaStore.getState().gameCompleted).toBe(true);
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
