import { describe, it, expect, beforeEach, vi } from 'vitest';

// Inject a single legendary-rarity weapon so the cross-delve carry path can be
// exercised — no legendary items exist in content yet. Every real id still
// resolves through the actual registry.
vi.mock('../content/items', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/items')>();
  const legendary = {
    id: 'soulpiercer',
    kind: 'weapon',
    name: 'Soulpiercer',
    category: 'martial',
    damage: '1d8',
    damageType: 'slashing',
    properties: [],
    weight: 3,
    cost: 0,
    rarity: 'legendary',
    attunement: false,
  };
  return {
    ...actual,
    getItem: (id: string) =>
      id === 'soulpiercer'
        ? (legendary as unknown as ReturnType<typeof actual.getItem>)
        : actual.getItem(id),
  };
});

import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useCombatStore } from './combatStore';
import { createGodwakeDelve } from '../engine/delve';
import { setActiveRoller } from '../engine/dice';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import type { Character } from '../types/character';
import type { ItemRef } from '../schemas/item';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-fighter',
      name: 'Brick',
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

function seed(character: Character) {
  useCharacterStore.setState({ character, saveSeed: null });
  useDelveStore.setState({ delve: createGodwakeDelve(1) });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({ unlockedUpgrades: {}, hasReincarnated: false });
  useScreenStore.setState({ screen: 'delve' });
}

const char = () => useCharacterStore.getState().character!;
const hasItem = (inv: ItemRef[], id: string) => inv.some((r) => r.itemId === id);

describe('delveStore — found/bought gear is intra-delve', () => {
  beforeEach(() => {
    setActiveRoller('gear-seed');
  });

  it('a found weapon is wiped on the next descent (reset to the class kit)', () => {
    seed(
      makeFighter({
        quirks: [],
        inventory: [{ itemId: 'longsword' }, { itemId: 'greatsword' }],
      }),
    );
    expect(hasItem(char().inventory, 'greatsword')).toBe(true);

    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    expect(hasItem(char().inventory, 'greatsword')).toBe(false);
    // Kit restored: a fighter descends with the longsword.
    expect(hasItem(char().inventory, 'longsword')).toBe(true);
    expect(char().equipped.mainHand?.itemId).toBe('longsword');
  });

  it('a found weapon does not survive reincarnation (death)', () => {
    seed(
      makeFighter({
        quirks: [],
        inventory: [{ itemId: 'longsword' }, { itemId: 'greatsword' }],
      }),
    );

    useDelveStore.getState().failDelve();

    expect(hasItem(char().inventory, 'greatsword')).toBe(false);
    expect(hasItem(char().inventory, 'longsword')).toBe(true);
  });

  it('a legendary-tagged item survives the kit reset on descent', () => {
    const legendaryRef: ItemRef = { itemId: 'soulpiercer' };
    seed(
      makeFighter({
        quirks: [],
        inventory: [legendaryRef, { itemId: 'greatsword' }],
        equipped: { mainHand: legendaryRef, offHand: null, armor: null },
      }),
    );

    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    const c = char();
    // The legendary rides the wheel; the mundane road drop does not.
    expect(hasItem(c.inventory, 'soulpiercer')).toBe(true);
    expect(hasItem(c.inventory, 'greatsword')).toBe(false);
    // It stays equipped over the kit's default main-hand.
    expect(c.equipped.mainHand?.itemId).toBe('soulpiercer');
  });

  it('a legendary-tagged item survives reincarnation on death', () => {
    seed(
      makeFighter({
        quirks: [],
        inventory: [{ itemId: 'soulpiercer' }, { itemId: 'greatsword' }],
      }),
    );

    useDelveStore.getState().failDelve();

    const c = char();
    expect(hasItem(c.inventory, 'soulpiercer')).toBe(true);
    expect(hasItem(c.inventory, 'greatsword')).toBe(false);
  });
});
