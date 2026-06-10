import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestRoom } from './RestRoom';
import { useCharacterStore } from '../../stores/characterStore';
import { useDelveStore } from '../../stores/delveStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { enhancementOf } from '../../engine/items/affixMods';
import type { RoomSpec, DelveState } from '../../types/delve';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';

const restRoom: RoomSpec = {
  id: 'rest-test',
  kind: 'rest',
  title: 'Quiet Alcove',
  flavorText: 'A guttering torch, a dry corner.',
  restType: 'short',
};

/** A minimal in-room delve so the store-level rest gate is live. */
function freshDelve(): DelveState {
  return { restChoice: undefined } as unknown as DelveState;
}

function makeWoundedFighter(): Character {
  const fighter = createCharacter({
    id: 'rest-fighter',
    name: 'Brick',
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
  const weapon: ItemRef = {
    itemId: 'longsword',
    rolled: { baseId: 'longsword', rarity: 'blue', affixes: [], enhancement: 1, name: '+1 Longsword' },
  };
  return {
    ...fighter,
    hp: { ...fighter.hp, current: 1 },
    equipped: { ...fighter.equipped, mainHand: weapon },
    inventory: [weapon],
  };
}

describe('RestRoom — Rest / Hone fork', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: makeWoundedFighter(), saveSeed: null });
    useDelveStore.setState({ delve: freshDelve() });
  });

  it('Rest still heals exactly Math.floor(hp.max * 0.7)', () => {
    const before = useCharacterStore.getState().character!;
    const expectedHeal = Math.floor(before.hp.max * 0.7);
    const expectedHp = Math.min(before.hp.max, before.hp.current + expectedHeal);

    render(<RestRoom room={restRoom} onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /heal 70%/i }));

    expect(useCharacterStore.getState().character!.hp.current).toBe(expectedHp);
    expect(useDelveStore.getState().delve!.restChoice).toBe('rest');
  });

  it('Hone forgoes the heal and lands +1 on the chosen item, read by the combat path', () => {
    const before = useCharacterStore.getState().character!;
    render(<RestRoom room={restRoom} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /set to the stone/i }));
    // The picker lists the equipped weapon — sharpen it.
    fireEvent.click(screen.getByRole('button', { name: /longsword/i }));

    const after = useCharacterStore.getState().character!;
    expect(enhancementOf(after.equipped.mainHand)).toBe(2);
    // No heal taken.
    expect(after.hp.current).toBe(before.hp.current);
    expect(useDelveStore.getState().delve!.restChoice).toBe('hone');
  });

  it('the once-per-room gate lives on the delve store and survives a remount', () => {
    const { unmount } = render(<RestRoom room={restRoom} onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /heal 70%/i }));
    const healedHp = useCharacterStore.getState().character!.hp.current;
    unmount();

    // Remount (as the backpack-trip unmount/remount would): the choice is locked,
    // no fresh heal button is offered, and a second resolve can't re-heal.
    render(<RestRoom room={restRoom} onContinue={() => {}} />);
    expect(screen.queryByRole('button', { name: /heal 70%/i })).toBeNull();
    expect(useCharacterStore.getState().character!.hp.current).toBe(healedHp);
  });

  it('clearing the gate (next room entry) re-arms the fork', () => {
    render(<RestRoom room={restRoom} onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /heal 70%/i }));
    expect(useDelveStore.getState().delve!.restChoice).toBe('rest');

    // enterRoom clears restChoice; the gate re-arms.
    useDelveStore.setState({ delve: freshDelve() });
    expect(useDelveStore.getState().pickRestChoice('hone', 'mainHand')).toBe(true);
  });
});
