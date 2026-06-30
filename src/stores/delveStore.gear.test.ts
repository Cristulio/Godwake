import { describe, it, expect, beforeEach, vi } from 'vitest';

// Inject a synthetic legendary-rarity weapon to verify it gets reset with the
// rest of the run gear. Every real id still resolves through the actual registry.
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
    cost: 0,
    rarity: 'legendary',
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
import { setPieceRef } from '../engine/items';
import { getSetPiece } from '../content/sets';
import { sellValue } from '../components/delve/shopStock';
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

  it('legendary-rarity gear resets to kit on descent (no cross-delve carry)', () => {
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
    // All run gear resets to the class kit — legendary-rarity gear is not special.
    expect(hasItem(c.inventory, 'soulpiercer')).toBe(false);
    expect(hasItem(c.inventory, 'greatsword')).toBe(false);
  });

  it('legendary-rarity gear resets to kit on death (no cross-delve carry)', () => {
    seed(
      makeFighter({
        quirks: [],
        inventory: [{ itemId: 'soulpiercer' }, { itemId: 'greatsword' }],
      }),
    );

    useDelveStore.getState().failDelve();

    const c = char();
    // All run gear resets to the class kit — legendary-rarity gear is not special.
    expect(hasItem(c.inventory, 'soulpiercer')).toBe(false);
    expect(hasItem(c.inventory, 'greatsword')).toBe(false);
  });
});

describe('delveStore — selling to a merchant', () => {
  beforeEach(() => setActiveRoller('sell-seed'));

  it('removes the item and credits its sell value', () => {
    const greatsword: ItemRef = { itemId: 'greatsword' };
    seed(makeFighter({ quirks: [], goldInPocket: 100, inventory: [greatsword] }));
    const expected = sellValue(greatsword);

    const r = useDelveStore.getState().sellItem(0);

    expect(r.ok).toBe(true);
    expect(r.gold).toBe(expected);
    expect(char().goldInPocket).toBe(100 + expected);
    expect(hasItem(char().inventory, 'greatsword')).toBe(false);
  });

  it('sells a SET piece from the pack (run-scoped loot now; the set stays unlocked)', () => {
    const setRef = setPieceRef(getSetPiece('vigil-helm')!);
    seed(makeFighter({ quirks: [], goldInPocket: 0, inventory: [setRef] }));
    const expected = sellValue(setRef);
    expect(expected).toBeGreaterThan(0);

    const r = useDelveStore.getState().sellItem(0);

    expect(r.ok).toBe(true);
    expect(r.gold).toBe(expected);
    expect(char().goldInPocket).toBe(expected);
    expect(hasItem(char().inventory, 'vigil-helm')).toBe(false);
  });

  it('refuses to sell an equipped item (unequip first)', () => {
    const sword: ItemRef = { itemId: 'longsword' };
    seed(
      makeFighter({
        quirks: [],
        goldInPocket: 0,
        inventory: [sword],
        equipped: { mainHand: sword, offHand: null, armor: null },
      }),
    );

    const r = useDelveStore.getState().sellItem(0);

    expect(r.ok).toBe(false);
    expect(char().goldInPocket).toBe(0);
    expect(hasItem(char().inventory, 'longsword')).toBe(true);
  });

  it('refuses to sell an equipped item after a reload (refs no longer share identity)', () => {
    // A JSON persist/rehydrate splits the shared ref: equipped.mainHand and the
    // bag entry become distinct objects with the same itemId. The guard must
    // still block the sale and keep the equipped slot intact — selling here is
    // the corruption the lane fixes (sold from the bag, orphaned in the slot).
    const reloaded = JSON.parse(
      JSON.stringify(
        makeFighter({
          quirks: [],
          goldInPocket: 0,
          inventory: [{ itemId: 'longsword' }],
          equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
        }),
      ),
    ) as Character;
    expect(reloaded.inventory[0]).not.toBe(reloaded.equipped.mainHand);
    seed(reloaded);

    const r = useDelveStore.getState().sellItem(0);

    expect(r.ok).toBe(false);
    expect(char().goldInPocket).toBe(0);
    expect(hasItem(char().inventory, 'longsword')).toBe(true);
    expect(char().equipped.mainHand?.itemId).toBe('longsword');
  });

  it('buyback undoes a misclicked sale at the same price (net-zero gold, item restored)', () => {
    const greatsword: ItemRef = { itemId: 'greatsword' };
    seed(makeFighter({ quirks: [], goldInPocket: 100, inventory: [greatsword] }));
    const price = sellValue(greatsword);
    expect(price).toBeGreaterThan(0);

    const sold = useDelveStore.getState().sellItem(0);
    expect(sold.ok).toBe(true);
    expect(char().goldInPocket).toBe(100 + price);
    expect(hasItem(char().inventory, 'greatsword')).toBe(false);
    expect(useDelveStore.getState().delve?.recentlySold).toHaveLength(1);

    const back = useDelveStore.getState().buyBackItem(0);
    expect(back.ok).toBe(true);
    expect(back.gold).toBe(price);
    expect(char().goldInPocket).toBe(100); // net zero — a clean undo
    expect(hasItem(char().inventory, 'greatsword')).toBe(true);
    expect(useDelveStore.getState().delve?.recentlySold ?? []).toHaveLength(0);
  });

  it('refuses buyback once the sale proceeds have been spent; the item stays on the stack', () => {
    const greatsword: ItemRef = { itemId: 'greatsword' };
    seed(makeFighter({ quirks: [], goldInPocket: 0, inventory: [greatsword] }));
    expect(sellValue(greatsword)).toBeGreaterThan(0);

    useDelveStore.getState().sellItem(0);
    useCharacterStore.setState({ character: { ...char(), goldInPocket: 0 } }); // spent it

    const back = useDelveStore.getState().buyBackItem(0);
    expect(back.ok).toBe(false);
    expect(hasItem(char().inventory, 'greatsword')).toBe(false);
    expect(useDelveStore.getState().delve?.recentlySold).toHaveLength(1);
  });

  it('clears the buyback stack on room entry (leaving the shop ends the window)', () => {
    const greatsword: ItemRef = { itemId: 'greatsword' };
    seed(makeFighter({ quirks: [], goldInPocket: 50, inventory: [greatsword] }));
    useDelveStore.getState().sellItem(0);
    expect(useDelveStore.getState().delve?.recentlySold).toHaveLength(1);

    useDelveStore.getState().advanceRoom();
    expect(useDelveStore.getState().delve?.recentlySold ?? []).toHaveLength(0);
  });
});
