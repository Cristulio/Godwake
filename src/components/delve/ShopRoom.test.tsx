import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopRoom } from './ShopRoom';
import { consumableStockForChapter } from './shopStock';
import { useGameStore } from '../../stores/gameStore';
import { useDelveStore } from '../../stores/delveStore';
import { useCharacterStore } from '../../stores/characterStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { getItem } from '../../content/items';
import { setPieceRef } from '../../engine/items';
import { getSetPiece } from '../../content/sets';
import type { RoomSpec } from '../../types/delve';

const shopRoom: RoomSpec = {
  id: 'shop-test',
  kind: 'shop',
  title: 'A Coin-Lender at the Curb',
  flavorText: 'Scales out, ledger open.',
  chapter: 2,
};

function makeRichFighter() {
  const fighter = createCharacter({
    id: 'shop-fighter',
    name: 'Buyer',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[4],
      cha: STANDARD_ARRAY[3],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
  return { ...fighter, goldInPocket: 9999 };
}

describe('ShopRoom — merchant node', () => {
  beforeEach(() => {
    // Seed the character slice — purchaseFromMerchant reads it; the facade
    // mirrors it back for the component's display selector. Clear the shop
    // sold-state (source-of-truth in delveStore, mirrored to the facade) so a
    // bought item from one test never leaks into the next.
    useCharacterStore.setState({ character: makeRichFighter(), saveSeed: null });
    useDelveStore.setState({ delve: null, purchasedShopKeys: {} });
    useGameStore.setState({ delve: null, combat: null });
  });

  it('lists the chapter-tiered draughts and rolled arms, and lets the player buy', () => {
    const consumables = consumableStockForChapter(2);
    const startInv = useGameStore.getState().character!.inventory.length;

    render(<ShopRoom room={shopRoom} onContinue={() => {}} />);

    // A representative draught from the tier-2 stock is shown by name.
    const sample = getItem(consumables[0]);
    expect(screen.getAllByText(new RegExp(sample.name, 'i')).length).toBeGreaterThan(0);
    // The rolled arms rack is laid out too.
    expect(screen.getByText(/Arms & Armour/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^buy$/i })[0]);
    expect(useGameStore.getState().character!.inventory.length).toBe(startInv + 1);
  });

  it('keeps a bought arms-rack item SOLD across a re-open of the same shop', () => {
    const { unmount } = render(<ShopRoom room={shopRoom} onContinue={() => {}} />);

    // Buy the first arms-rack item; it reads SOLD immediately.
    fireEvent.click(screen.getAllByRole('button', { name: /^buy$/i })[0]);
    expect(screen.getAllByRole('button', { name: /sold/i }).length).toBeGreaterThan(0);

    // Leaving for the pack unmounts the shop; the sold-state lives in delveStore,
    // not component state, so re-entering the SAME room still shows it SOLD —
    // the item is no longer on the rack to re-buy.
    unmount();
    render(<ShopRoom room={shopRoom} onContinue={() => {}} />);
    expect(screen.getAllByRole('button', { name: /sold/i }).length).toBeGreaterThan(0);
  });

  it('never lists persistent SET gear as sellable (banked to the soul)', () => {
    // A banked set piece (vigil-helm, kind=accessory) plus a plain weapon so the
    // sell section renders. Without the filter the set piece would show — it
    // qualifies by kind — so its absence proves the exclusion, not an empty list.
    const base = useCharacterStore.getState().character!;
    useCharacterStore.setState({
      character: {
        ...base,
        inventory: [...base.inventory, setPieceRef(getSetPiece('vigil-helm')!), { itemId: 'greatsword' }],
      },
    });

    render(<ShopRoom room={shopRoom} onContinue={() => {}} />);

    // The sell section rendered (the plain weapon is sellable)...
    expect(screen.getByText(/Sell from your Pack/i)).toBeInTheDocument();
    // ...but the set piece is not offered for sale anywhere.
    expect(screen.queryByText(/Vigil Helm/i)).not.toBeInTheDocument();
  });

  it('starts a different shop room with a fresh, un-sold rack (no cross-shop bleed)', () => {
    const first = render(<ShopRoom room={shopRoom} onContinue={() => {}} />);
    fireEvent.click(screen.getAllByRole('button', { name: /^buy$/i })[0]);
    expect(screen.getAllByRole('button', { name: /sold/i }).length).toBeGreaterThan(0);
    first.unmount();

    // A different room id tracks its own sold-state, so its rack is fully buyable.
    render(<ShopRoom room={{ ...shopRoom, id: 'shop-elsewhere' }} onContinue={() => {}} />);
    expect(screen.queryAllByRole('button', { name: /sold/i })).toHaveLength(0);
  });
});
