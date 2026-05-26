import type { DelveState, RoomSpec } from '../../types/delve';
import { createRng, randomSeed } from '../dice/rng';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  type EncounterEntry,
} from './chapter1Pools';
import {
  WARMUP_POOL as ATH_WARMUP_POOL,
  EARLY_MID_POOL as ATH_EARLY_MID_POOL,
  MID_POOL as ATH_MID_POOL,
  ELITE_POOL as ATH_ELITE_POOL,
} from './chapter2Pools';

function pick<T>(rng: { next(): number }, pool: T[]): T {
  if (pool.length === 0) throw new Error('Empty encounter pool');
  return pool[Math.floor(rng.next() * pool.length)];
}

function combatRoom(id: string, e: EncounterEntry): RoomSpec {
  return {
    id,
    kind: 'combat',
    title: e.title,
    flavorText: e.flavorText,
    monsters: e.monsters,
    xpReward: e.xpReward,
    goldReward: e.goldReward,
  };
}

/**
 * Chapter 1 / The Iron Cells — eight rooms with a difficulty ramp.
 *
 * Slot pattern: warmup → shrine → early-mid → rest → mid → shrine → elite → boss
 *
 * Each combat slot draws from a pool of pre-authored encounters via a seeded
 * RNG, so a given seed always produces the same delve (good for save/resume),
 * but each new delve gets a fresh seed (different monsters every run).
 */
export function createIronCellsDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', pick(rng, WARMUP_POOL)),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Forgotten Altar',
      flavorText:
        'An altar of weathered stone, three sigils flickering as you approach. The labs above never sealed this off — gods bleed through cracks the master cannot find.',
    },
    combatRoom('room-3', pick(rng, EARLY_MID_POOL)),
    {
      id: 'room-4',
      kind: 'rest',
      title: 'A Quiet Alcove',
      flavorText:
        'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know. You can catch your breath here.',
      restType: 'short',
    },
    combatRoom('room-5', pick(rng, MID_POOL)),
    {
      id: 'room-6',
      kind: 'shrine',
      title: 'The Cracked Sigil',
      flavorText:
        'A second altar, half-buried in rubble. Someone tried to chisel the sigils out — and someone else, later, deepened them again. The god is still listening.',
    },
    combatRoom('room-7', pick(rng, ELITE_POOL)),
    {
      id: 'room-8',
      kind: 'boss',
      title: "Ilyich's Hall",
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

/**
 * Chapter 2 / Athkatla — eight rooms threading the City of Coin from the
 * customs gate to the Magistrate's hall.
 *
 * Slot pattern: alley → shrine → counting house → rest → guild patrol →
 *               shrine → rooftop chase → Magistrate
 *
 * Same procedural-pool pattern as Ch1: each combat slot draws one entry
 * from its themed pool via a seeded RNG.
 */
export function createAthkatlaDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', pick(rng, ATH_WARMUP_POOL)),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Curbside Shrine to Waukeen',
      flavorText:
        "A pillar of guilded sandstone, four niches at the base. Athkatla's merchant queen does not promise gold — only that the scale will tip true. Coins clink at the bottom of the basin.",
    },
    combatRoom('room-3', pick(rng, ATH_EARLY_MID_POOL)),
    {
      id: 'room-4',
      kind: 'rest',
      title: 'A Festhall Backroom',
      flavorText:
        "A back room of the Bronze Lion, its proprietor pretending not to see. A jug of watered wine and a stool by the brazier. You can catch your breath here.",
      restType: 'short',
    },
    combatRoom('room-5', pick(rng, ATH_MID_POOL)),
    {
      id: 'room-6',
      kind: 'shrine',
      title: 'A Plague-Worn Altar to Ilmater',
      flavorText:
        "Even Athkatla cannot stamp out the Crying God. A cracked stone basin half-hidden in a brick recess — Ilmater's red knot scratched in chalk and re-chalked a hundred times. Bandages hang dry on a nail.",
    },
    combatRoom('room-7', pick(rng, ATH_ELITE_POOL)),
    {
      id: 'room-8',
      kind: 'boss',
      title: "The Magistrate's Hall",
      flavorText:
        "A vaulted chamber, marble underfoot, a high bench at the far end. The Magistrate is already seated. He looks up from a warrant and folds it once. \"You are not on the docket. The exception is easily corrected.\"",
      monsters: [{ defId: 'athkatla-magistrate', count: 1 }],
      xpReward: 700,
      goldReward: 80,
    },
  ];

  return {
    dungeonName: 'Athkatla — City of Coin',
    chapterId: 'chapter-2',
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
