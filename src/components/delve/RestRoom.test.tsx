import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestRoom } from './RestRoom';
import { useGameStore } from '../../stores/gameStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import type { RoomSpec } from '../../types/delve';

const restRoom: RoomSpec = {
  id: 'rest-test',
  kind: 'rest',
  title: 'Quiet Alcove',
  flavorText: 'A guttering torch, a dry corner.',
  restType: 'short',
};

function makeWoundedFighter() {
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
  return { ...fighter, hp: { ...fighter.hp, current: 1 } };
}

describe('RestRoom — short rest heals 70%', () => {
  beforeEach(() => {
    useGameStore.setState({
      character: makeWoundedFighter(),
      delve: null,
      combat: null,
    });
  });

  it('heals exactly Math.floor(hp.max * 0.7)', () => {
    const before = useGameStore.getState().character!;
    const expectedHeal = Math.floor(before.hp.max * 0.7);
    const expectedHp = Math.min(before.hp.max, before.hp.current + expectedHeal);

    render(<RestRoom room={restRoom} onContinue={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /heal 70%/i }));

    const after = useGameStore.getState().character!;
    expect(after.hp.current).toBe(expectedHp);
  });

  it('the rest button label advertises the new 70% amount', () => {
    render(<RestRoom room={restRoom} onContinue={() => {}} />);
    expect(
      screen.getByRole('button', { name: /heal 70%/i }),
    ).toBeInTheDocument();
  });
});
