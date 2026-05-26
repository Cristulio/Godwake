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
      kind: 'shrine',
      title: 'A Forgotten Altar',
      flavorText:
        'An altar of weathered stone, three sigils flickering as you approach. The labs above never sealed this off — gods bleed through cracks the master cannot find.',
    },
    {
      id: 'room-3',
      kind: 'combat',
      title: 'The Mephit Cages',
      flavorText:
        'Glass jars line the wall — most cracked. Two chalk-grey mephits pour from the broken seals, claws first, leaving streaks of dust in the air.',
      monsters: [{ defId: 'dust-mephit', count: 2, displayPrefix: 'Mephit' }],
      xpReward: 60,
    },
    {
      id: 'room-4',
      kind: 'rest',
      title: 'A Quiet Alcove',
      flavorText:
        'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know. You can catch your breath here.',
      restType: 'short',
    },
    {
      id: 'room-5',
      kind: 'combat',
      title: 'The Vault Guardian',
      flavorText:
        'An empty harness stands sentinel in the next chamber. The plates ring like a bell as it pivots to face you — a faint green light moves where the eyes should be. The master\'s work.',
      monsters: [{ defId: 'animated-armor', count: 1 }],
      xpReward: 100,
    },
    {
      id: 'room-6',
      kind: 'shrine',
      title: 'The Cracked Sigil',
      flavorText:
        'A second altar, half-buried in rubble. Someone tried to chisel the sigils out — and someone else, later, deepened them again. The god is still listening.',
    },
    {
      id: 'room-7',
      kind: 'treasure',
      title: 'A Forgotten Stash',
      flavorText:
        'A loose stone in the wall, prised open by long-dead hands. Coins glint among dust and dried bone.',
      goldReward: 18,
    },
    {
      id: 'room-8',
      kind: 'boss',
      title: 'Ilyich\'s Hall',
      flavorText:
        'The duergar slaver waits at the centre of a wide stone hall. He spits on the floor when he sees you. "Another of his pets, are you? Walking. Tch. We\'ll see how long."',
      monsters: [{ defId: 'duergar-ilyich', count: 1 }],
      xpReward: 250,
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
