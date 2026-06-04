import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, SAVE_SLOT_KEY_PREFIX } from './gameStore';
import { SAVE_VERSION } from './persistMigration';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { createGodwakeDelve } from '../engine/delve';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getClass } from '../content/classes';
import { getRace } from '../content/races';
import { setActiveRoller } from '../engine/dice';
import type { Character } from '../types/character';

const KEY = `${SAVE_SLOT_KEY_PREFIX}0`;

function makeFighter(extra: Partial<Character> = {}): Character {
  return { ...buildPlayerCharacter(presetCreationInput('fighter')), ...extra };
}

function baseL1HpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const raceHp = getRace(ch.raceId).bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  return cls.hitDie + conMod + raceHp + classBonusHp + (ch.permanentBonuses?.hp ?? 0);
}

beforeEach(() => {
  setActiveRoller('meta-persistence-seed');
  useCharacterStore.setState({ character: makeFighter({ renown: 1000 }), saveSeed: 'seed' });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    hasReincarnated: false,
    deathCount: 0,
    discoveredMonsters: [],
    monsterEncounters: {},
    monsterDefeats: {},
    monsterKilledBy: {},
    monsterKillingAbilities: {},
    unlockedUpgrades: {},
    chaptersCleared: 0,
    chapter1Cleared: false,
    druidGroveUnlocked: true,
    ascensionUnlocked: 3,
    renownSpent: 1500, // every relic slot open, so swap tests aren't slot-gated
    knownNpcs: [],
    ownedLegendaries: [],
    equippedRelics: {},
  });
  useScreenStore.setState({ screen: 'druid-grove', introSeen: true, quirksTutorialSeen: true });
});

describe('Grove HP upgrade — raises live max HP on purchase (the header bug)', () => {
  it("Pilgrim's Boots bumps hp.max and hp.current immediately, not just on next descent", () => {
    const before = useCharacterStore.getState().character!;
    const beforeMax = before.hp.max;
    const beforeCur = before.hp.current;

    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(res.ok).toBe(true);

    const after = useCharacterStore.getState().character!;
    expect(after.permanentBonuses?.hp).toBe(2);
    expect(after.hp.max).toBe(beforeMax + 2);
    expect(after.hp.current).toBe(beforeCur + 2);
  });

  it('Mantle of the Wakened rank 1 raises live max HP by 5', () => {
    const beforeMax = useCharacterStore.getState().character!.hp.max;
    const res = useGameStore.getState().purchaseUpgrade('mantle-of-the-wakened');
    expect(res.ok).toBe(true);
    expect(useCharacterStore.getState().character!.hp.max).toBe(beforeMax + 5);
  });

  it('compounds across multiple HP-upgrade purchases', () => {
    const beforeMax = useCharacterStore.getState().character!.hp.max;
    useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // +2
    useGameStore.getState().purchaseUpgrade('mantle-of-the-wakened'); // +5
    useGameStore.getState().purchaseUpgrade('iron-will'); // +5
    const after = useCharacterStore.getState().character!;
    expect(after.permanentBonuses?.hp).toBe(12);
    expect(after.hp.max).toBe(beforeMax + 12);
  });

  it('non-HP permanent upgrades leave hp.max untouched', () => {
    const beforeMax = useCharacterStore.getState().character!.hp.max;
    useGameStore.getState().purchaseUpgrade('cloak-of-the-grove'); // +AC
    expect(useCharacterStore.getState().character!.hp.max).toBe(beforeMax);
  });

  it('purchase-time bump matches what the next descent rebuilds (no double-count)', () => {
    useGameStore.getState().purchaseUpgrade('mantle-of-the-wakened'); // +5
    const afterBuy = useCharacterStore.getState().character!;
    const expected = baseL1HpMax(afterBuy); // includes the +5 in permanentBonuses

    expect(afterBuy.hp.max).toBe(expected);

    // Descending rebuilds HP from level1HpMax — must land on the same number.
    useGameStore.getState().startDelve(createGodwakeDelve(1));
    expect(useCharacterStore.getState().character!.hp.max).toBe(expected);
  });
});

describe('legendaries survive a character swap (account-level, soul-carried)', () => {
  it('keeps owned relics + the loadout and the baked effects across selectCharacter', () => {
    useMetaStore.setState({ ownedLegendaries: ['heartwood-talisman', 'bulwark-sigil'] });
    const meta0 = useMetaStore.getState();
    meta0.equipRelic('heartwood-talisman'); // Vampire
    meta0.equipRelic('bulwark-sigil'); // Aegis
    // Both relics are class-agnostic → two effect payloads baked on.
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(2);

    useGameStore.getState().selectCharacter('wizard');

    const meta = useMetaStore.getState();
    expect(meta.ownedLegendaries).toEqual(['heartwood-talisman', 'bulwark-sigil']);
    expect(meta.equippedRelics).toEqual({ vampire: 'heartwood-talisman', aegis: 'bulwark-sigil' });
    // The baked effects ride carrySoulProgress + the swap re-bake onto the new vessel.
    const after = useCharacterStore.getState().character!;
    expect(after.classId).toBe('wizard');
    expect(after.legendaryEffects).toHaveLength(2);
  });

  it('drops a class-bound relic the new class cannot seat on swap', () => {
    useCharacterStore.setState({ character: makeFighter({ renown: 1000 }) });
    useMetaStore.setState({ ownedLegendaries: ['warsong-gauntlet', 'bulwark-sigil'] });
    const meta0 = useMetaStore.getState();
    meta0.equipRelic('warsong-gauntlet'); // Cascade (Fighter-bound)
    meta0.equipRelic('bulwark-sigil'); // Aegis (agnostic)
    expect(useMetaStore.getState().equippedRelics.cascade).toBe('warsong-gauntlet');

    useGameStore.getState().selectCharacter('wizard');

    // The Fighter-bound Warsong gauntlet falls out of its slot; the agnostic relic stays.
    const meta = useMetaStore.getState();
    expect(meta.equippedRelics).toEqual({ aegis: 'bulwark-sigil' });
    expect(meta.ownedLegendaries).toContain('warsong-gauntlet'); // still owned, just stashed
  });
});

describe('shared Grove bonuses survive a character swap', () => {
  it('carries permanentBonuses + the metaStore ledger across selectCharacter', () => {
    useMetaStore.setState({ unlockedUpgrades: { 'mantle-of-the-wakened': 3, 'heirloom-blade': 2 } });
    useCharacterStore.setState({
      character: makeFighter({
        renown: 500,
        permanentBonuses: { hp: 15, attack: 2 },
      }),
    });

    useGameStore.getState().selectCharacter('rogue');

    const after = useCharacterStore.getState().character!;
    expect(after.classId).toBe('rogue');
    expect(after.renown).toBe(500);
    expect(after.permanentBonuses).toEqual({ hp: 15, attack: 2 });
    // hub shows the fresh L1 ceiling + carried Grove HP.
    expect(after.hp.max).toBe(baseL1HpMax(after));
    // The account-level ledger is untouched by a swap.
    expect(useMetaStore.getState().unlockedUpgrades).toEqual({
      'mantle-of-the-wakened': 3,
      'heirloom-blade': 2,
    });
  });
});

describe('Grove buffs survive death + reincarnation', () => {
  it('keeps permanentBonuses and rebuilds HP to the L1 ceiling including Grove HP', () => {
    useCharacterStore.setState({
      character: makeFighter({ level: 5, xp: 6000, permanentBonuses: { hp: 10, damage: 1 } }),
    });
    useDelveStore.setState({ delve: createGodwakeDelve(1) });

    // Death turns the wheel.
    useDelveStore.getState().failDelve();

    const after = useCharacterStore.getState().character!;
    expect(after.level).toBe(1);
    expect(after.permanentBonuses).toEqual({ hp: 10, damage: 1 });
    expect(after.hp.max).toBe(baseL1HpMax(after));
  });
});

describe('persist round-trip — fresh boot rehydrates the meta loop', () => {
  // A real page reload boots with empty focused stores and NO subscriptions
  // wired yet, then hydrates synchronously. We approximate that here by
  // emptying the focused stores FIRST, then seeding the save LAST (so the
  // mirror write the reset triggers can't clobber the seed), then rehydrating.
  function seedAndReload(state: Record<string, unknown>, version: number) {
    useMetaStore.setState({
      ownedLegendaries: [],
      equippedRelics: {},
      unlockedUpgrades: {},
      ascensionUnlocked: 0,
      chaptersCleared: 0,
    });
    localStorage.setItem(KEY, JSON.stringify({ state, version }));
    return useGameStore.persist.rehydrate();
  }

  it('restores relics + loadout, Grove upgrades, and ascension from a current-version save', async () => {
    await seedAndReload(
      {
        screen: 'hub',
        saveSeed: 'seed',
        character: makeFighter({ renown: 420 }),
        introSeen: true,
        hasReincarnated: true,
        deathCount: 4,
        quirksTutorialSeen: true,
        discoveredMonsters: [],
        monsterEncounters: {},
        monsterDefeats: {},
        monsterKilledBy: {},
        monsterKillingAbilities: {},
        unlockedUpgrades: { 'mantle-of-the-wakened': 3 },
        chaptersCleared: 2,
        chapter1Cleared: true,
        druidGroveUnlocked: true,
        ascensionUnlocked: 1,
        renownSpent: 0,
        knownNpcs: ['imoen'],
        ownedLegendaries: ['heartwood-talisman', 'bulwark-sigil'],
        // heartwood seats in Vampire (a starting slot, open at 0 renown spent).
        equippedRelics: { vampire: 'heartwood-talisman' },
      },
      SAVE_VERSION,
    );

    const meta = useMetaStore.getState();
    expect(meta.ownedLegendaries).toEqual(['heartwood-talisman', 'bulwark-sigil']);
    expect(meta.equippedRelics).toEqual({ vampire: 'heartwood-talisman' });
    expect(meta.unlockedUpgrades).toEqual({ 'mantle-of-the-wakened': 3 });
    expect(meta.ascensionUnlocked).toBe(1);
    expect(meta.chaptersCleared).toBe(2);

    // And the rehydrate must not have left the save wiped on disk.
    const onDisk = JSON.parse(localStorage.getItem(KEY)!);
    expect(onDisk.state.ownedLegendaries).toEqual(['heartwood-talisman', 'bulwark-sigil']);
    expect(onDisk.state.unlockedUpgrades).toEqual({ 'mantle-of-the-wakened': 3 });
  });

  it('migrates a pre-legendary v8 save without wiping the Grove ledger', async () => {
    await seedAndReload(
      {
        screen: 'hub',
        saveSeed: 'seed',
        character: makeFighter({ renown: 300 }),
        introSeen: true,
        hasReincarnated: true,
        deathCount: 5,
        quirksTutorialSeen: true,
        discoveredMonsters: ['goblin'],
        monsterEncounters: { goblin: 3 },
        unlockedUpgrades: { 'mantle-of-the-wakened': 4 },
        chaptersCleared: 3,
        chapter1Cleared: true,
        druidGroveUnlocked: true,
        ascensionUnlocked: 2,
        // v8 predates ownedLegendaries / activeLegendaries
      },
      8,
    );

    const meta = useMetaStore.getState();
    expect(meta.unlockedUpgrades).toEqual({ 'mantle-of-the-wakened': 4 });
    expect(meta.ascensionUnlocked).toBe(2);
    expect(meta.chaptersCleared).toBe(3);
    // Migration backfills the new fields as empty, not the existing ones as empty.
    expect(meta.ownedLegendaries).toEqual([]);

    const onDisk = JSON.parse(localStorage.getItem(KEY)!);
    expect(onDisk.state.unlockedUpgrades).toEqual({ 'mantle-of-the-wakened': 4 });
  });
});

describe('legendary drop sanity', () => {
  it('banks an un-owned relic from the elite-drop pool', () => {
    useMetaStore.setState({ ownedLegendaries: [] });
    const id = useMetaStore.getState().grantLegendaryDrop(false);
    expect(id).not.toBeNull();
    expect(useMetaStore.getState().ownedLegendaries).toContain(id!);
  });
});
