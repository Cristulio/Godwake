import type { DelveState, RoomSpec } from '../../types/delve';

/**
 * Chapter 1 / The Iron Cells — a tight 5-room linear delve for the MVP.
 * Once procedural generation lands, this becomes one of several hand-authored
 * starter delves the procedural pool can fall back to.
 */
export function createIronCellsDelve(): DelveState {
  const rooms: RoomSpec[] = [
    {
      id: 'room-1',
      kind: 'combat',
      title: 'The Iron Cells',
      flavorText:
        'Sealed doors line the corridor. A lone goblin scout has been left to keep watch — and to die slow if it fails.',
      monsters: [{ defId: 'goblin', count: 1 }],
      xpReward: 50,
    },
    {
      id: 'room-2',
      kind: 'rest',
      title: 'A Quiet Alcove',
      flavorText:
        'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know. You can catch your breath here.',
      restType: 'short',
    },
    {
      id: 'room-3',
      kind: 'combat',
      title: 'The Vivisector’s Antechamber',
      flavorText:
        'A slab slick with old blood. A single goblin crouches in the shadow of it, gnawing on something pale.',
      monsters: [{ defId: 'goblin', count: 1 }],
      xpReward: 75,
    },
    {
      id: 'room-4',
      kind: 'treasure',
      title: 'A Forgotten Stash',
      flavorText:
        'A loose stone in the wall, prised open by long-dead hands. Coins glint among dust and dried bone.',
      goldReward: 18,
    },
    {
      id: 'room-5',
      kind: 'boss',
      title: 'The Warden’s Hall',
      flavorText:
        'A wide stone hall. The Warden waits at the far end, chain-bound greatsword dragging behind it.',
      monsters: [{ defId: 'goblin-warden', count: 1 }],
      xpReward: 200,
    },
  ];

  return {
    dungeonName: 'The Iron Cells',
    chapterId: 'chapter-1',
    rooms,
    currentRoomIdx: 0,
    phase: 'in-room',
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
  };
}

export function currentRoom(state: DelveState): RoomSpec {
  return state.rooms[state.currentRoomIdx];
}

export function isFinalRoom(state: DelveState): boolean {
  return state.currentRoomIdx >= state.rooms.length - 1;
}
