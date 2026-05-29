import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopRoom } from './ShopRoom';
import { merchantStockForTier } from './CampRoom';
import { useGameStore } from '../../stores/gameStore';
import { useCharacterStore } from '../../stores/characterStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { getItem } from '../../content/items';
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
    // mirrors it back for the component's display selector.
    useCharacterStore.setState({ character: makeRichFighter(), saveSeed: null });
    useGameStore.setState({ delve: null, combat: null });
  });

  it('lists the chapter-tiered caravan stock and lets the player buy', () => {
    const stock = merchantStockForTier(2);
    const startInv = useGameStore.getState().character!.inventory.length;

    render(<ShopRoom room={shopRoom} onContinue={() => {}} />);

    // A representative item from the tier-2 stock is shown by name.
    const sample = getItem(stock[0]);
    expect(screen.getAllByText(new RegExp(sample.name, 'i')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /^buy$/i })[0]);
    expect(useGameStore.getState().character!.inventory.length).toBe(startInv + 1);
  });
});
