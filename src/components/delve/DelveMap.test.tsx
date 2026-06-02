import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DelveMap } from './DelveMap';
import { useGameStore } from '../../stores/gameStore';
import { useDelveStore } from '../../stores/delveStore';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { createGodwakeDelve } from '../../engine/delve';

function makeFighter() {
  return createCharacter({
    id: 'map-fighter',
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
}

describe('DelveMap — route choice UI', () => {
  beforeEach(() => {
    const delve = { ...createGodwakeDelve(1), phase: 'between-rooms' as const };
    useGameStore.setState({ character: makeFighter(), combat: null });
    useDelveStore.setState({ delve });
  });

  it('renders a clickable node for each reachable next room', () => {
    const delve = useDelveStore.getState().delve!;
    const reachable = delve.rooms[delve.currentRoomIdx].next ?? [];
    expect(reachable.length).toBeGreaterThan(1);

    const { container } = render(
      <DelveMap delve={delve} character={useGameStore.getState().character!} />,
    );
    const enabled = container.querySelectorAll('button.bm-node:not([disabled])');
    expect(enabled.length).toBe(reachable.length);
  });

  it('clicking a reachable node steps the run into it', () => {
    const delve = useDelveStore.getState().delve!;
    const targetId = delve.rooms[delve.currentRoomIdx].next![0];

    const { container } = render(
      <DelveMap delve={delve} character={useGameStore.getState().character!} />,
    );
    const first = container.querySelector('button.bm-node:not([disabled])') as HTMLButtonElement;
    fireEvent.click(first);

    const after = useDelveStore.getState().delve!;
    expect(after.phase).toBe('in-room');
    expect(after.currentRoomId).toBe(targetId);
  });

  it('shows the chapter heading and the open-pack control', () => {
    render(<DelveMap delve={useDelveStore.getState().delve!} character={useGameStore.getState().character!} />);
    expect(screen.getByText(/choose your road/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pack/i })).toBeInTheDocument();
  });

  it('renders a locked elite greyed and unselectable, not hidden', () => {
    const delve = { ...createGodwakeDelve({ seed: 1, elitesEnabled: false }), phase: 'between-rooms' as const };
    // Chapter 1 carries at least one locked elite (rendered, not hidden).
    const ch1Elites = delve.rooms.filter((r) => r.chapter === 1 && r.kind === 'elite');
    expect(ch1Elites.length).toBeGreaterThan(0);
    expect(ch1Elites.every((r) => r.locked)).toBe(true);

    const { container } = render(
      <DelveMap delve={delve} character={useGameStore.getState().character!} />,
    );
    const blocked = container.querySelectorAll('button.bm-node-blocked');
    expect(blocked.length).toBe(ch1Elites.length);
    blocked.forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('hovering a node with an unresolved twistId does not throw', () => {
    const delve = useDelveStore.getState().delve!;
    const targetId = delve.rooms[delve.currentRoomIdx].next![0];
    const withBogusTwist: typeof delve = {
      ...delve,
      rooms: delve.rooms.map((r) =>
        r.id === targetId ? { ...r, twistId: '__nonexistent_twist__' } : r,
      ),
    };

    const { container } = render(
      <DelveMap delve={withBogusTwist} character={useGameStore.getState().character!} />,
    );
    const target = container.querySelector(
      'button.bm-node:not([disabled])',
    ) as HTMLButtonElement;
    expect(() => fireEvent.mouseEnter(target)).not.toThrow();
    // The unresolved twist simply renders no telegraph line.
    expect(container.textContent).not.toContain('✦ ');
  });
});
