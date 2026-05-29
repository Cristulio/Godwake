import type { DelveState, RoomSpec } from '../../types/delve';
import { createRng, randomSeed } from '../dice/rng';
import { clampAscension } from './ascension';
import { eventsForChapter } from '../../content/events';
import { intelEventIdFor, getBossIntelCard } from '../../content/bossIntel';
import type { EventTemplate } from '../../schemas/event';
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
import {
  WARMUP_POOL as SPH_WARMUP_POOL,
  EARLY_MID_POOL as SPH_EARLY_MID_POOL,
  MID_POOL as SPH_MID_POOL,
  ELITE_POOL as SPH_ELITE_POOL,
} from './chapter3Pools';
import {
  WARMUP_POOL as UN_WARMUP_POOL,
  EARLY_MID_POOL as UN_EARLY_MID_POOL,
  MID_POOL as UN_MID_POOL,
  ELITE_POOL as UN_ELITE_POOL,
} from './chapter4Pools';

interface Rng {
  next(): number;
}

function pick<T>(rng: Rng, pool: T[]): T {
  if (pool.length === 0) throw new Error('Empty encounter pool');
  return pool[Math.floor(rng.next() * pool.length)];
}

/**
 * Draw `count` distinct entries from a pool via the seeded RNG. Used by the
 * longer Ch2–4 spans, which fill a fifth combat slot from the mid-tier pool and
 * must not repeat a composition within the same chapter. Only allows a repeat
 * if the pool is smaller than `count` (it isn't — every pool holds six entries).
 */
function pickN<T>(rng: Rng, pool: T[], count: number): T[] {
  if (pool.length === 0) throw new Error('Empty encounter pool');
  const remaining = [...pool];
  const out: T[] = [];
  for (let k = 0; k < count; k++) {
    if (remaining.length === 0) remaining.push(...pool);
    const idx = Math.floor(rng.next() * remaining.length);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
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
 * Pick an event template from the pool of events available at or below the
 * given chapter, then wrap it as an event-kind RoomSpec. Used by the chained
 * Godwake delve to drop 1+ narrative beats per chapter. Picks via the same
 * seeded RNG that composes the combat slots, so a delve seed locks events too.
 */
function eventRoom(id: string, rng: Rng, chapter: number, excludeIds: Set<string>): { room: RoomSpec; templateId: string } {
  const pool = eventsForChapter(chapter).filter((e) => !excludeIds.has(e.id));
  if (pool.length === 0) {
    // Fall back to the unfiltered chapter pool if exclusion empties it (small chapter pools).
    const fallback = eventsForChapter(chapter);
    const tpl = pick(rng, fallback);
    return { room: eventRoomFromTemplate(id, tpl), templateId: tpl.id };
  }
  const tpl = pick(rng, pool);
  return { room: eventRoomFromTemplate(id, tpl), templateId: tpl.id };
}

function eventRoomFromTemplate(id: string, tpl: EventTemplate): RoomSpec {
  return {
    id,
    kind: 'event',
    title: tpl.title,
    flavorText: tpl.flavor,
    eventTemplateId: tpl.id,
  };
}

/**
 * Build the deterministic intel room placed 1 step before each chapter boss.
 * The event template is pulled by boss def id, so the player walks into the
 * same intel beat every run — preparation, not surprise.
 */
function intelRoomFor(id: string, bossDefId: string): RoomSpec {
  const card = getBossIntelCard(bossDefId);
  if (!card) throw new Error(`No intel card for boss ${bossDefId}`);
  return {
    id,
    kind: 'event',
    title: card.roomTitle,
    flavorText: card.roomFlavor,
    eventTemplateId: intelEventIdFor(bossDefId),
  };
}

/**
 * Chapter 1 / The Iron Cells — ten rooms with a difficulty ramp.
 *
 * Slot pattern: warmup → shrine → early-mid → early-mid → rest → mid → mid →
 *               shrine → elite → intel → boss
 *
 * Each combat slot draws from a pool of pre-authored encounters via a seeded
 * RNG, so a given seed always produces the same delve (good for save/resume),
 * but each new delve gets a fresh seed (different monsters every run). The
 * paired early-mid / mid slots draw distinct compositions via pickN so the
 * chapter never repeats a fight.
 */
export function createIronCellsDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);
  const warmup = pick(rng, WARMUP_POOL);
  const [emA, emB] = pickN(rng, EARLY_MID_POOL, 2);
  const [midA, midB] = pickN(rng, MID_POOL, 2);
  const elite = pick(rng, ELITE_POOL);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', warmup),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Forgotten Altar',
      flavorText:
        'An altar of weathered stone, three sigils flickering as you approach. The labs above never sealed this off — gods bleed through cracks the master cannot find.',
    },
    combatRoom('room-3', emA),
    combatRoom('room-4', emB),
    {
      id: 'room-5',
      kind: 'rest',
      title: 'A Quiet Alcove',
      flavorText:
        'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know.',
      restType: 'short',
    },
    combatRoom('room-6', midA),
    combatRoom('room-7', midB),
    {
      id: 'room-8',
      kind: 'shrine',
      title: 'The Cracked Sigil',
      flavorText:
        'A second altar, half-buried in rubble. Someone tried to chisel the sigils out — and someone else, later, deepened them again. The god is still listening.',
    },
    combatRoom('room-9', elite),
    intelRoomFor('room-intel-ch1', 'duergar-ilyich'),
    {
      id: 'room-10',
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
 * Chapter 2 / Athkatla — ten rooms threading the City of Coin from the
 * customs gate to the Magistrate's hall.
 *
 * Slot pattern: alley → shrine → counting house → counting house → rest →
 *               guild patrol → guild patrol → shrine → rooftop chase →
 *               intel → Magistrate
 *
 * Same procedural-pool pattern as Ch1: each combat slot draws one entry
 * from its themed pool via a seeded RNG; the paired slots draw distinct
 * compositions via pickN.
 */
export function createAthkatlaDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);
  const warmup = pick(rng, ATH_WARMUP_POOL);
  const [emA, emB] = pickN(rng, ATH_EARLY_MID_POOL, 2);
  const [midA, midB] = pickN(rng, ATH_MID_POOL, 2);
  const elite = pick(rng, ATH_ELITE_POOL);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', warmup),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Curbside Shrine to Waukeen',
      flavorText:
        "A pillar of guilded sandstone, four niches at the base. Athkatla's merchant queen does not promise gold — only that the scale will tip true. Coins clink at the bottom of the basin.",
    },
    combatRoom('room-3', emA),
    combatRoom('room-4', emB),
    {
      id: 'room-5',
      kind: 'rest',
      title: 'A Festhall Backroom',
      flavorText:
        "A back room of the Bronze Lion, its proprietor pretending not to see. A jug of watered wine and a stool by the brazier.",
      restType: 'short',
    },
    combatRoom('room-6', midA),
    combatRoom('room-7', midB),
    {
      id: 'room-8',
      kind: 'shrine',
      title: 'A Plague-Worn Altar to Ilmater',
      flavorText:
        "Even Athkatla cannot stamp out the Crying God. A cracked stone basin half-hidden in a brick recess — Ilmater's red knot scratched in chalk and re-chalked a hundred times. Bandages hang dry on a nail.",
    },
    combatRoom('room-9', elite),
    intelRoomFor('room-intel-ch2', 'athkatla-magistrate'),
    {
      id: 'room-10',
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
 * Godwake — the single continuous delve walking the player through every
 * chapter of the run. 58 rooms across four chapters with three camp seams.
 *
 *   Ch1 Iron Cells (12 + intel) → Camp → Ch2 Athkatla (13 + intel) → Camp →
 *     Ch3 Spellhold (13 + intel) → Camp → Ch4 Ust Natha (13 + intel).
 *     Ends at the Drow Matron Mother.
 *
 * Every chapter runs a 6-combat arc threaded with shrines, rests, and events
 * so the added length is texture, not a damage slog. Ch1 keeps two events and
 * two shrines; Ch2–4 fold in a third mid-tier fight plus an extra event or
 * shrine. The repeated mid-tier slots draw distinct compositions (via pickN)
 * so a chapter never repeats a fight, and the intel beat always sits one room
 * before its boss.
 *
 * Each camp is the seam: HP damage, blessings, Second Wind / Action Surge
 * state, gold, and XP all carry across. Combat slots and event picks share
 * one seeded RNG so a delve seed locks the full run.
 */
export interface GodwakeDelveOptions {
  /** Seed for the encounter pool RNG. */
  seed?: number;
  /** Ascension level to play this run at (0 = base). Scales enemies + payout. */
  ascension?: number;
}

export function createGodwakeDelve(
  optsOrSeed: number | GodwakeDelveOptions = {},
): DelveState {
  const opts: GodwakeDelveOptions =
    typeof optsOrSeed === 'number' ? { seed: optsOrSeed } : optsOrSeed;
  const rng = createRng(opts.seed ?? randomSeed());

  // Track already-picked event templates so a single delve never repeats a
  // narrative beat. Pool is shared across chapter filters because a Ch1 event
  // is also a Ch4 event candidate (eventsForChapter is cumulative).
  const usedEventIds = new Set<string>();
  function nextEvent(id: string, chapter: number): RoomSpec {
    const { room, templateId } = eventRoom(id, rng, chapter, usedEventIds);
    usedEventIds.add(templateId);
    return room;
  }

  // The fifth combat in each later chapter is a second, distinct mid-tier
  // draw so a chapter never repeats a composition. Computed per chapter just
  // before that chapter's rooms so Ch1's RNG sequence is untouched.
  const rooms: RoomSpec[] = [];

  // ─── Chapter 1: Tresendar Manor / The Iron Cells (12 rooms + intel) ──
  const [ch1EmA, ch1EmB] = pickN(rng, EARLY_MID_POOL, 2);
  const [ch1MidA, ch1MidB] = pickN(rng, MID_POOL, 2);
  rooms.push(
    combatRoom('room-1', pick(rng, WARMUP_POOL)),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Forgotten Altar',
      flavorText:
        'An altar of weathered stone, three sigils flickering as you approach. The labs above never sealed this off — gods bleed through cracks the master cannot find.',
    },
    nextEvent('room-3', 1),
    combatRoom('room-4', ch1EmA),
    combatRoom('room-5', ch1EmB),
    {
      id: 'room-6',
      kind: 'rest',
      title: 'A Quiet Alcove',
      flavorText:
        'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know.',
      restType: 'short',
    },
    combatRoom('room-7', ch1MidA),
    combatRoom('room-8', ch1MidB),
    {
      id: 'room-9',
      kind: 'shrine',
      title: 'The Cracked Sigil',
      flavorText:
        'A second altar, half-buried in rubble. Someone tried to chisel the sigils out — and someone else, later, deepened them again. The god is still listening.',
    },
    combatRoom('room-10', pick(rng, ELITE_POOL)),
    nextEvent('room-11', 1),
    intelRoomFor('room-intel-ch1', 'duergar-ilyich'),
    {
      id: 'room-12',
      kind: 'boss',
      title: "Ilyich's Hall",
      flavorText:
        'The duergar slaver waits at the centre of a wide stone hall. He spits on the floor when he sees you. "Another of his pets, are you? Walking. Tch. We\'ll see how long."',
      monsters: [{ defId: 'duergar-ilyich', count: 1 }],
      xpReward: 250,
    },
  );

  // ─── Camp 1: roadside fire south of the Cells ───────────────────────
  rooms.push({
    id: 'room-13',
    kind: 'camp',
    title: 'A Roadside Fire',
    flavorText:
      "Three days south of the Iron Cells the trees thin, and the Trade Way bends towards Amn. A caravan-merchant has a fire going by the milestone — kettle on, ox unhitched, a tarp pegged out in case the night turns. He looks up without surprise, as if he had been expecting someone walking out of the north on foot and bloody.",
  });

  // ─── Chapter 2: Athkatla / City of Coin (13 rooms, 6 combats, 2 rests) ─
  const [athMidA, athMidB, athMidC] = pickN(rng, ATH_MID_POOL, 3);
  rooms.push(
    combatRoom('room-14', pick(rng, ATH_WARMUP_POOL)),
    {
      id: 'room-15',
      kind: 'shrine',
      title: 'A Curbside Shrine to Waukeen',
      flavorText:
        "A pillar of guilded sandstone, four niches at the base. Athkatla's merchant queen does not promise gold — only that the scale will tip true. Coins clink at the bottom of the basin.",
    },
    combatRoom('room-16', pick(rng, ATH_EARLY_MID_POOL)),
    {
      id: 'room-17',
      kind: 'rest',
      title: 'A Festhall Backroom',
      flavorText:
        "A back room of the Bronze Lion, its proprietor pretending not to see. A jug of watered wine and a stool by the brazier.",
      restType: 'short',
    },
    combatRoom('room-18', athMidA),
    nextEvent('room-19', 2),
    combatRoom('room-20', athMidB),
    {
      id: 'room-21',
      kind: 'shrine',
      title: 'A Plague-Worn Altar to Ilmater',
      flavorText:
        "Even Athkatla cannot stamp out the Crying God. A cracked stone basin half-hidden in a brick recess — Ilmater's red knot scratched in chalk and re-chalked a hundred times. Bandages hang dry on a nail.",
    },
    combatRoom('room-22', athMidC),
    nextEvent('room-23', 2),
    combatRoom('room-24', pick(rng, ATH_ELITE_POOL)),
    {
      id: 'room-25',
      kind: 'rest',
      title: "A Shuttered Notary's Office",
      flavorText:
        "A notary's back office with the shutters drawn and the day's warrants still drying on a line. Whoever worked here left in a hurry. The cot in the corner is narrow, but the door bolts from the inside.",
      restType: 'short',
    },
    intelRoomFor('room-intel-ch2', 'athkatla-magistrate'),
    {
      id: 'room-26',
      kind: 'boss',
      title: "The Magistrate's Hall",
      flavorText:
        "A vaulted chamber, marble underfoot, a high bench at the far end. The Magistrate is already seated. He looks up from a warrant and folds it once. \"You are not on the docket. The exception is easily corrected.\"",
      monsters: [{ defId: 'athkatla-magistrate', count: 1 }],
      xpReward: 700,
      goldReward: 80,
    },
  );

  // ─── Camp 2: Athkatla docks before the Spellhold crossing ───────────
  rooms.push({
    id: 'room-27',
    kind: 'camp',
    title: 'A Harbour-Lamp at the Docks',
    flavorText:
      "The Magistrate's hall is hours behind you and the docks of Athkatla have not yet been told. A harbour-merchant has set a lamp on a coil of rope at the end of the jetty — kettle in his hand, the keel of a smuggler's wherry ticking against the boards beneath. He sees the blood on your sleeve and offers a cup before he offers a name.",
  });

  // ─── Chapter 3: Spellhold / The Cowled Asylum (13 rooms, 6 combats, 2 rests) ─
  const [sphMidA, sphMidB, sphMidC] = pickN(rng, SPH_MID_POOL, 3);
  rooms.push(
    combatRoom('room-28', pick(rng, SPH_WARMUP_POOL)),
    {
      id: 'room-29',
      kind: 'shrine',
      title: 'A Smuggled Shrine to Mystra',
      flavorText:
        "Half-hidden behind a moved bookcase in a side-cell — a chalk circle around a star of seven points, and a stub of candle burned by hand-shielding rather than by holder. The Weave is thin in here, but Mystra's silver hand still reaches.",
    },
    combatRoom('room-30', pick(rng, SPH_EARLY_MID_POOL)),
    {
      id: 'room-31',
      kind: 'rest',
      title: 'The Disused Cell-Block',
      flavorText:
        "A row of cells the wardens stopped using after the last riot — doors hanging open, straw mouldering on the floors. Quiet enough to sit down.",
      restType: 'short',
    },
    combatRoom('room-32', sphMidA),
    nextEvent('room-33', 3),
    combatRoom('room-34', sphMidB),
    {
      id: 'room-35',
      kind: 'shrine',
      title: "The Crying God's Mark",
      flavorText:
        "A red-knotted bandage hangs on a nail above a cracked basin in a warden's washroom. Someone has been smuggling Ilmater's mercy into Spellhold one prayer at a time. The basin is still wet.",
    },
    combatRoom('room-36', sphMidC),
    {
      id: 'room-37',
      kind: 'shrine',
      title: 'A Defaced Shrine to Azuth',
      flavorText:
        "A niche behind a toppled bookshelf, the High One's grey-gloved hand chalked on the stone and half scuffed out by a warden's boot. The broken mages of Spellhold still leave offerings — a cracked focus-crystal, a tooth, a page of someone's spellbook folded small. Azuth keeps the ones the Weave undid.",
    },
    combatRoom('room-38', pick(rng, SPH_ELITE_POOL)),
    {
      id: 'room-39',
      kind: 'rest',
      title: 'A Water-Stained Observation Gallery',
      flavorText:
        "A gallery the wardens once used to watch the cells below — the glass long since cracked, the floor warped with old flood-water. Nothing watches you here.",
      restType: 'short',
    },
    intelRoomFor('room-intel-ch3', 'asylum-director'),
    {
      id: 'room-40',
      kind: 'boss',
      title: "The Director's Chamber",
      flavorText:
        "A long vaulted room at the heart of the warden's wing — a desk at the far end with the asylum's ledgers stacked in perfect order, and behind it, in the silver-trim robe and the small round monocle, the man who has been signing the warrants. He does not look surprised. \"You will be still while I work.\"",
      monsters: [{ defId: 'asylum-director', count: 1 }],
      xpReward: 1100,
      goldReward: 140,
    },
  );

  // ─── Camp 3: Underdark seam between Spellhold and Ust Natha ─────────
  rooms.push({
    id: 'room-41',
    kind: 'camp',
    title: 'A Smuggler-Fire in the Underdark',
    flavorText:
      "Past the Director's wing the Cowled Wizards keep a service-shaft that drops into the Upperdark. At the first widening, a surface-smuggler has a chemical-fire going in a brass bowl that does not give off smoke. He has been waiting for someone who walked out of Spellhold alive. He has goods to move down. You have a road to walk.",
  });

  // ─── Chapter 4: Ust Natha / The Drow City (13 rooms, 6 combats, 2 rests) ─
  const [unMidA, unMidB, unMidC] = pickN(rng, UN_MID_POOL, 3);
  rooms.push(
    combatRoom('room-42', pick(rng, UN_WARMUP_POOL)),
    {
      id: 'room-43',
      kind: 'shrine',
      title: 'A Faerzress Sigil to Eilistraee',
      flavorText:
        "Hidden behind a fallen slab in the lower tunnels — a circle scratched in chalk, a moon-and-sword glyph at its centre. The drow goddess of the dance, the one Lolth's priestesses have a standing kill-order on. The bone-light flickers green here in a way that is not entirely natural.",
    },
    combatRoom('room-44', pick(rng, UN_EARLY_MID_POOL)),
    {
      id: 'room-45',
      kind: 'rest',
      title: 'A Disused Slave-Pen',
      flavorText:
        "A cage-tier the slavers have not stocked this season — the chains hang slack, the straw is old. The faerzress glow is dim enough here that the corridor-watch will not look in.",
      restType: 'short',
    },
    combatRoom('room-46', unMidA),
    nextEvent('room-47', 4),
    combatRoom('room-48', unMidB),
    {
      id: 'room-49',
      kind: 'shrine',
      title: "A Surface-Smuggled Altar to Selûne",
      flavorText:
        "A scrap of silver-moon tapestry pinned to a niche wall, half a candle-stub still warm. Some surface-elf slave from a previous caravan smuggled the moon-mother down here a prayer at a time. The drow priestesses have not yet found this one. The Lady is still listening.",
    },
    combatRoom('room-50', unMidC),
    nextEvent('room-51', 4),
    combatRoom('room-52', pick(rng, UN_ELITE_POOL)),
    {
      id: 'room-53',
      kind: 'rest',
      title: 'A Cold Faerzress Hollow',
      flavorText:
        "A pocket in the rock where the faerzress has guttered out — no glow, no warmth, and for that reason no drow patrol bothers to sweep it. The dark is total and, for once, on your side.",
      restType: 'short',
    },
    intelRoomFor('room-intel-ch4', 'drow-matron-mother'),
    {
      id: 'room-54',
      kind: 'boss',
      title: "The Matron Mother's Audience",
      flavorText:
        "The inner temple of Lolth — black basalt, eight-legged sigils in arterial red along the walls, the air thick with the resin-smoke the priestesses burn for visions. At the centre, on a low throne carved from a single spider's egg-case, the Matron Mother does not rise. \"You are not on the slave-roll. The exception is easily corrected.\"",
      monsters: [{ defId: 'drow-matron-mother', count: 1 }],
      xpReward: 1650,
      goldReward: 220,
    },
  );

  return {
    dungeonName: 'Godwake — From the Cells to the Spider',
    chapterId: 'godwake',
    rooms,
    currentRoomIdx: 0,
    phase: 'in-room',
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
    ascensionLevel: clampAscension(opts.ascension ?? 0),
  };
}

/**
 * Chapter 3 / Spellhold — ten rooms inside the Cowled Wizards' island
 * asylum, gated on the hub by `chapter1Cleared && renown >= 1500`. A side
 * delve, not an extension of the Godwake run — the player chooses whether
 * to descend the Iron Cells or sail to Spellhold from the hub.
 *
 * Slot pattern: warmup → shrine → mid → rest → elite → shrine → mid →
 *               shrine → elite → intel → Asylum Director (boss).
 *
 * Same procedural-pool pattern as Ch1/Ch2: each combat slot draws one entry
 * from its themed pool via a seeded RNG; the two mid slots draw distinct
 * compositions via pickN.
 */
export function createSpellholdDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);
  const warmup = pick(rng, SPH_WARMUP_POOL);
  const [midA, midB] = pickN(rng, SPH_MID_POOL, 2);
  const eliteA = pick(rng, SPH_ELITE_POOL);
  const eliteB = pick(rng, SPH_ELITE_POOL);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', warmup),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Smuggled Shrine to Mystra',
      flavorText:
        "Half-hidden behind a moved bookcase in a side-cell — a chalk circle around a star of seven points, and a stub of candle burned by hand-shielding rather than by holder. The Weave is thin in here, but Mystra's silver hand still reaches.",
    },
    combatRoom('room-3', midA),
    {
      id: 'room-4',
      kind: 'rest',
      title: 'The Disused Cell-Block',
      flavorText:
        "A row of cells the wardens stopped using after the last riot — doors hanging open, straw mouldering on the floors. Quiet enough to sit down.",
      restType: 'short',
    },
    combatRoom('room-5', eliteA),
    {
      id: 'room-6',
      kind: 'shrine',
      title: "The Crying God's Mark",
      flavorText:
        "A red-knotted bandage hangs on a nail above a cracked basin in a warden's washroom. Someone has been smuggling Ilmater's mercy into Spellhold one prayer at a time. The basin is still wet.",
    },
    combatRoom('room-7', midB),
    {
      id: 'room-8',
      kind: 'shrine',
      title: 'A Defaced Shrine to Azuth',
      flavorText:
        "A niche behind a toppled bookshelf, the High One's grey-gloved hand chalked on the stone and half scuffed out by a warden's boot. The broken mages of Spellhold still leave offerings — a cracked focus-crystal, a tooth, a page of someone's spellbook folded small. Azuth keeps the ones the Weave undid.",
    },
    combatRoom('room-9', eliteB),
    intelRoomFor('room-intel-ch3', 'asylum-director'),
    {
      id: 'room-10',
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

/**
 * Chapter 4 / Ust Natha — ten rooms threading the drow city of the
 * Underdark, gated on the hub by `renown >= 3000`. A side delve, not an
 * extension of any other run — the player chooses whether to descend the
 * Iron Cells, sail to Spellhold, or take Cowled passage down to Ust Natha
 * from the hub.
 *
 * Slot pattern: warmup → shrine → early-mid → early-mid → rest → mid → mid →
 *               shrine → elite → intel → Matron Mother (boss).
 *
 * Same procedural-pool pattern as Ch1/Ch2/Ch3: each combat slot draws one
 * entry from its themed pool via a seeded RNG; the paired early-mid / mid
 * slots draw distinct compositions via pickN.
 */
export function createUstNathaDelve(seed: number = randomSeed()): DelveState {
  const rng = createRng(seed);
  const warmup = pick(rng, UN_WARMUP_POOL);
  const [emA, emB] = pickN(rng, UN_EARLY_MID_POOL, 2);
  const [midA, midB] = pickN(rng, UN_MID_POOL, 2);
  const elite = pick(rng, UN_ELITE_POOL);

  const rooms: RoomSpec[] = [
    combatRoom('room-1', warmup),
    {
      id: 'room-2',
      kind: 'shrine',
      title: 'A Faerzress Sigil to Eilistraee',
      flavorText:
        "Hidden behind a fallen slab in the lower tunnels — a circle scratched in chalk, a moon-and-sword glyph at its centre. The drow goddess of the dance, the one Lolth's priestesses have a standing kill-order on. The bone-light flickers green here in a way that is not entirely natural.",
    },
    combatRoom('room-3', emA),
    combatRoom('room-4', emB),
    {
      id: 'room-5',
      kind: 'rest',
      title: 'A Disused Slave-Pen',
      flavorText:
        "A cage-tier the slavers have not stocked this season — the chains hang slack, the straw is old. The faerzress glow is dim enough here that the corridor-watch will not look in.",
      restType: 'short',
    },
    combatRoom('room-6', midA),
    combatRoom('room-7', midB),
    {
      id: 'room-8',
      kind: 'shrine',
      title: "A Surface-Smuggled Altar to Selûne",
      flavorText:
        "A scrap of silver-moon tapestry pinned to a niche wall, half a candle-stub still warm. Some surface-elf slave from a previous caravan smuggled the moon-mother down here a prayer at a time. The drow priestesses have not yet found this one. The Lady is still listening.",
    },
    combatRoom('room-9', elite),
    intelRoomFor('room-intel-ch4', 'drow-matron-mother'),
    {
      id: 'room-10',
      kind: 'boss',
      title: "The Matron Mother's Audience",
      flavorText:
        "The inner temple of Lolth — black basalt, eight-legged sigils in arterial red along the walls, the air thick with the resin-smoke the priestesses burn for visions. At the centre, on a low throne carved from a single spider's egg-case, the Matron Mother does not rise. \"You are not on the slave-roll. The exception is easily corrected.\"",
      monsters: [{ defId: 'drow-matron-mother', count: 1 }],
      xpReward: 1650,
      goldReward: 220,
    },
  ];

  return {
    dungeonName: 'Ust Natha — The Drow City',
    chapterId: 'chapter-4',
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
