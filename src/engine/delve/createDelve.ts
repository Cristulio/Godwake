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
// Spellhold composition uses warmup / mid / elite slots only (no early-mid).
// EARLY_MID_POOL is authored in chapter3Pools for future variants / extension.
import {
  WARMUP_POOL as SPH_WARMUP_POOL,
  MID_POOL as SPH_MID_POOL,
  ELITE_POOL as SPH_ELITE_POOL,
} from './chapter3Pools';

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

/**
 * Godwake — the single continuous delve. Iron Cells (Ch1, 8 rooms) → roadside
 * camp (1 room, Short Rest + merchant + branch) → Athkatla (Ch2, 6 rooms,
 * ending at the Magistrate). 15 rooms total.
 *
 * Camp is the seam: HP damage, blessings, Second Wind / Action Surge state,
 * gold, and XP all carry across. The player can press south (continue) or
 * make for Phandalin (early exit with rewards). Combined chapterId='godwake';
 * room ids 1-8 are Ch1, room 9 is camp, rooms 10-15 are Ch2.
 */
export function createGodwakeDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);

  const rooms: RoomSpec[] = [
    // Ch1 — The Iron Cells (warmup → shrine → early-mid → rest → mid → shrine → elite → Ilyich)
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
    // Camp — the seam between chapters
    {
      id: 'room-9',
      kind: 'camp',
      title: 'A Roadside Fire',
      flavorText:
        "Three days south of the Iron Cells the trees thin, and the Trade Way bends towards Amn. A caravan-merchant has a fire going by the milestone — kettle on, ox unhitched, a tarp pegged out in case the night turns. He looks up without surprise, as if he had been expecting someone walking out of the north on foot and bloody.",
    },
    // Ch2 — Athkatla (warmup → early-mid → shrine → mid → elite → Magistrate)
    combatRoom('room-10', pick(rng, ATH_WARMUP_POOL)),
    combatRoom('room-11', pick(rng, ATH_EARLY_MID_POOL)),
    {
      id: 'room-12',
      kind: 'shrine',
      title: 'A Plague-Worn Altar to Ilmater',
      flavorText:
        "Even Athkatla cannot stamp out the Crying God. A cracked stone basin half-hidden in a brick recess — Ilmater's red knot scratched in chalk and re-chalked a hundred times. Bandages hang dry on a nail.",
    },
    combatRoom('room-13', pick(rng, ATH_MID_POOL)),
    combatRoom('room-14', pick(rng, ATH_ELITE_POOL)),
    {
      id: 'room-15',
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
    dungeonName: 'The Long Road — Iron Cells to Athkatla',
    chapterId: 'godwake',
    rooms,
    currentRoomIdx: 0,
    phase: 'in-room',
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
  };
}

/**
 * Chapter 3 / Spellhold — eight rooms inside the Cowled Wizards' island
 * asylum, gated on the hub by `chapter1Cleared && renown >= 1500`. A side
 * delve, not an extension of the Godwake run — the player chooses whether
 * to descend the Iron Cells or sail to Spellhold from the hub.
 *
 * Slot pattern: warmup → shrine → mid → rest → elite → shrine → elite →
 *               Asylum Director (boss).
 *
 * Same procedural-pool pattern as Ch1/Ch2: each combat slot draws one entry
 * from its themed pool via a seeded RNG.
 */
export function createSpellholdDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', pick(rng, SPH_WARMUP_POOL)),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Smuggled Shrine to Mystra',
      flavorText:
        "Half-hidden behind a moved bookcase in a side-cell — a chalk circle around a star of seven points, and a stub of candle burned by hand-shielding rather than by holder. The Weave is thin in here, but Mystra's silver hand still reaches.",
    },
    combatRoom('room-3', pick(rng, SPH_MID_POOL)),
    {
      id: 'room-4',
      kind: 'rest',
      title: 'The Disused Cell-Block',
      flavorText:
        "A row of cells the wardens stopped using after the last riot — doors hanging open, straw mouldering on the floors. Quiet enough to sit down. You can catch your breath here.",
      restType: 'short',
    },
    combatRoom('room-5', pick(rng, SPH_ELITE_POOL)),
    {
      id: 'room-6',
      kind: 'shrine',
      title: "The Crying God's Mark",
      flavorText:
        "A red-knotted bandage hangs on a nail above a cracked basin in a warden's washroom. Someone has been smuggling Ilmater's mercy into Spellhold one prayer at a time. The basin is still wet.",
    },
    combatRoom('room-7', pick(rng, SPH_ELITE_POOL)),
    {
      id: 'room-8',
      kind: 'boss',
      title: "The Director's Chamber",
      flavorText:
        "A long vaulted room at the heart of the warden's wing — a desk at the far end with the asylum's ledgers stacked in perfect order, and behind it, in the silver-trim robe and the small round monocle, the man who has been signing the warrants. He does not look surprised. \"You will be still while I work.\"",
      monsters: [{ defId: 'asylum-director', count: 1 }],
      xpReward: 1100,
      goldReward: 140,
    },
  ];

  return {
    dungeonName: 'Spellhold — The Cowled Asylum',
    chapterId: 'chapter-3',
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
