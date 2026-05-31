import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 7 · "The Drowned Archive" encounter pools. Mirrors chapter6Pools —
 * pooled compositions for each combat slot of the first chapter of the L20
 * expansion: a flooded vault of forbidden knowledge, the first stop on the deep
 * descent toward the captor, sunk beneath everything the soul has already
 * climbed through. Stat blocks and rewards both sit a clear notch above
 * Chapter 6: warmups CR 7, early-mid/mid CR 8-9, elites CR 9-10, boss (The
 * Drowned Custodian) CR 11. The party arrives ~L8 and should leave ~L10.
 *
 * Theme: a library the captor drowned rather than let its dangerous knowing
 * loose — and that drowned with it everything that was reading there. Ink-
 * drowned scholars, page-wraiths, a guardian-construct of waterlogged books, and
 * the things that learned too much and came apart. The forbidden floor below the
 * end of the world, where the road down toward the captor truly begins.
 */

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  xpReward: number;
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'Still at the Desk',
    flavorText:
      'The water in the entry-hall comes to your knees and is black and does not move. A single drowned acolyte stands bent over a reading-desk that the flood swallowed an age ago, still turning a page that long since became pulp, and as you wade past it lifts its bloated face toward you with the mild, terrible patience of a thing that has all the time the deep has.',
    monsters: [{ defId: 'drowned-acolyte', count: 1 }],
    xpReward: 760,
    goldReward: 66,
  },
  {
    title: 'A Drift of Loose Leaves',
    flavorText:
      'Something stirs the dead water ahead — a slow grey drift of pages, hundreds of them, loosed from a burst spine and learning, in the dark, to move with one mind. The page-wraith folds itself into the rough shape of a reaching hand and comes at you edge-on, and every leaf of it is a small bright cut waiting to happen.',
    monsters: [{ defId: 'page-wraith', count: 1 }],
    xpReward: 770,
    goldReward: 70,
  },
  {
    title: 'The Copyists',
    flavorText:
      'Two drowned acolytes share a long sunken table, each bent to its own ruined book, each still copying nothing onto nothing with a finger worn to the bone. Neither has a name left under the bloat. Neither needs one to rise, when you disturb the water, and keep the only appointment they have left.',
    monsters: [{ defId: 'drowned-acolyte', count: 2, displayPrefix: 'Acolyte' }],
    xpReward: 790,
    goldReward: 68,
  },
  {
    title: 'The Acolyte and the Leaves',
    flavorText:
      'A drowned acolyte wades the flooded aisle with a drift of loose pages trailing it like a cloak that will not settle — the dead clerk to take hold of you, the flock to open you while it does. They were a reader and a book once, the both of them. The Archive does not waste either.',
    monsters: [
      { defId: 'drowned-acolyte', count: 1 },
      { defId: 'page-wraith', count: 1 },
    ],
    xpReward: 780,
    goldReward: 72,
  },
  {
    title: 'Two Hungering Folios',
    flavorText:
      'Two page-wraiths cross the black water from either side, each a drift of cutting leaves that has been alone in the dark long enough to forget it was ever bound. They do not flock together — they cannot — but they both find the warm thing in the room at the same moment, and the room is small, and the warm thing is you.',
    monsters: [{ defId: 'page-wraith', count: 2, displayPrefix: 'Wraith' }],
    xpReward: 790,
    goldReward: 70,
  },
  {
    title: 'The Reading-Room',
    flavorText:
      'Three drowned acolytes at their drowned desks, a whole reading-room of the diligent dead, each one still keeping the appointment the flood interrupted. None of them sees you. All of them rise when the black water moves, with the unhurried certainty of clerks summoned to a duty older than their drowning.',
    monsters: [{ defId: 'drowned-acolyte', count: 3, displayPrefix: 'Acolyte' }],
    xpReward: 810,
    goldReward: 66,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Ink That Was a Man',
    flavorText:
      'A standing column of black water holds itself upright where no current should let it — an ink-drowned scholar, a reader run together with everything it read until man and text are one slow bloom of dark. It turns the place where its face used to be toward you, and the ink behind it brightens, and you feel it want, more than anything, to teach you what it knows.',
    monsters: [{ defId: 'ink-drowned-scholar', count: 1 }],
    xpReward: 1160,
    goldReward: 92,
  },
  {
    title: 'The Scholar and Its Copyist',
    flavorText:
      'An ink-drowned scholar drifts the aisle with a drowned acolyte shuffling in its lee — one to flood your eyes with the dark it learned, one to take hold of you while you cannot see. The blind half of the fight is the scholar; the bleeding half is the clerk. Cut the ink, or fight the rest of it in the dark.',
    monsters: [
      { defId: 'ink-drowned-scholar', count: 1 },
      { defId: 'drowned-acolyte', count: 1 },
    ],
    xpReward: 1220,
    goldReward: 96,
  },
  {
    title: 'The Archivist and the Drowned',
    flavorText:
      'A brine-archivist works the flooded stack with a drowned acolyte at its side, mending the clerk with salt and stiffened thread each time you cut it down — to the archivist your blow is not a wound but a mis-shelving, to be quietly corrected. Drop the keeper, or the dead clerk simply keeps being put back on the shelf in front of you.',
    monsters: [
      { defId: 'brine-archivist', count: 1 },
      { defId: 'drowned-acolyte', count: 1 },
    ],
    xpReward: 1240,
    goldReward: 98,
  },
  {
    title: 'The Burst Spines',
    flavorText:
      'Two page-wraiths boil up out of a collapsed shelf-row, two whole drowned encyclopaedias come apart and turned to cutting drift. They close from both flanks at once, edge-on, and the narrow flooded aisle becomes a place where every surface is a thousand small mouths and none of them is on your side.',
    monsters: [{ defId: 'page-wraith', count: 2, displayPrefix: 'Wraith' }],
    xpReward: 1180,
    goldReward: 92,
  },
  {
    title: 'The Ink and the Flock',
    flavorText:
      'An ink-drowned scholar floods the aisle dark while a page-wraith reads you in the blindness it makes — the worst pairing the early stacks can throw, sight taken and warmth taken in the same drowned breath. You will not see the cuts coming. The Archive prefers it that way; the blind are so much easier to file.',
    monsters: [
      { defId: 'ink-drowned-scholar', count: 1 },
      { defId: 'page-wraith', count: 1 },
    ],
    xpReward: 1240,
    goldReward: 98,
  },
  {
    title: 'The Keeper and Its Ruin',
    flavorText:
      'A brine-archivist tends an ink-drowned scholar the way a verger tends a leak — patient, hopeless, endless — sealing the scholar whole with salt-thread each time you open the ink. Neither tires. Neither hurries. Between the mending and the flooding there is meant to be no dry moment left in which to win.',
    monsters: [
      { defId: 'brine-archivist', count: 1 },
      { defId: 'ink-drowned-scholar', count: 1 },
    ],
    xpReward: 1280,
    goldReward: 102,
  },
  {
    title: 'The Scholar and Its Clerks',
    flavorText:
      'An ink-drowned scholar holds the deep end of the aisle with two drowned acolytes wading ahead of it, fed back upright whenever they fall by the cold logic of the place: a reader needs hands, and the Archive has hands to spare. Blind the math will not solve itself — cut the ink, and the clerks lose the thing that aims them.',
    monsters: [
      { defId: 'ink-drowned-scholar', count: 1 },
      { defId: 'drowned-acolyte', count: 2, displayPrefix: 'Acolyte' },
    ],
    xpReward: 1300,
    goldReward: 100,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'Everything It Ever Read',
    flavorText:
      'The water in the lower gallery is colder, and a thing stands in it that is not a body but a memory of one — a drowned mnemonic, the whole recall of some sunken scholar peeled loose and kept. As you near it, your own head begins to fill with someone else\'s knowing, page on page on drowning page, and the small thought of moving grows hard to find under the weight.',
    monsters: [{ defId: 'drowned-mnemonic', count: 1 }],
    xpReward: 1420,
    goldReward: 112,
  },
  {
    title: 'The Thing Struck From the List',
    flavorText:
      'It comes out of order down the flooded hall — the unindexed, a reader that took in more than any shape could hold and came apart under it, limbs arriving out of sequence and all at once. It does not see you as prey. It sees you as something still whole and ordered and filed, and it cannot forgive you that, not after what the knowing cost it.',
    monsters: [{ defId: 'the-unindexed', count: 1 }],
    xpReward: 1460,
    goldReward: 116,
  },
  {
    title: 'The Memory and the Drowned',
    flavorText:
      'A drowned mnemonic holds the cold turn of the gallery with a drowned acolyte wading at its edge — the memory to still you under a sea of someone else\'s knowing, the clerk to work at you while you cannot move. The Archive is economical this deep. It spends what is shelved nearest to hand.',
    monsters: [
      { defId: 'drowned-mnemonic', count: 1 },
      { defId: 'drowned-acolyte', count: 1 },
    ],
    xpReward: 1480,
    goldReward: 118,
  },
  {
    title: 'The Unindexed and the Ink',
    flavorText:
      'An ink-drowned scholar floods the hall dark and the unindexed comes apart in the dark, striking everything still whole — the blindness to hold you, the ruin to strike you blind. When the unindexed thing drops past half it stops trying to hold its own edges and simply commits, all its lost order spent on you at once.',
    monsters: [
      { defId: 'the-unindexed', count: 1 },
      { defId: 'ink-drowned-scholar', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 122,
  },
  {
    title: 'The Memory and the Ink',
    flavorText:
      'A drowned mnemonic drowns you in remembered dark while an ink-drowned scholar drowns your eyes in the present one — the past that will not lift and the sight that will not clear, set against you in the same cold water. Between the two of them there is meant to be nothing left of you that can still tell which drowning is which.',
    monsters: [
      { defId: 'drowned-mnemonic', count: 1 },
      { defId: 'ink-drowned-scholar', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 120,
  },
  {
    title: 'The Archivist and the Memory',
    flavorText:
      'A brine-archivist keeps a drowned mnemonic whole, re-shelving the standing memory with salt-thread each time you scatter it — pour your blows into a thing that is only a recall, and the keeper pours it back together behind you. Fell the archivist first, or drown forever in a memory that will not stay broken.',
    monsters: [
      { defId: 'brine-archivist', count: 1 },
      { defId: 'drowned-mnemonic', count: 1 },
    ],
    xpReward: 1520,
    goldReward: 124,
  },
  {
    title: 'The Unindexed and Its Keeper',
    flavorText:
      'A brine-archivist shadows the unindexed down the flooded hall, mending its ruin as fast as you can open it — pouring salt and thread into a shape that no longer holds any order to mend. Drop the keeper, or watch the Archive stitch its own worst failure back together and send it at you again, and again, until your arm fails first.',
    monsters: [
      { defId: 'the-unindexed', count: 1 },
      { defId: 'brine-archivist', count: 1 },
    ],
    xpReward: 1540,
    goldReward: 126,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Door of the Forbidden Stacks',
    flavorText:
      'The aisle ends at a great drowned threshold, and the threshold is guarded. A tidebound codex fills it — a hulk of waterlogged tomes and brass clasps bound here before the flood to let nothing out, and made only heavier by the drowning. With a sound like a spine breaking it sheds a ream of pages off itself into the dark, and brings round a folio the size of a door on its binding-chain. Race the flock it sheds, or be read to the bottom.',
    monsters: [{ defId: 'tidebound-codex', count: 1 }],
    xpReward: 1980,
    goldReward: 150,
  },
  {
    title: 'The Codex and the Clerk',
    flavorText:
      'The tidebound codex holds the forbidden door with a drowned acolyte already wading at its foot — the loose page it has not yet finished shedding given a clerk\'s worn hands. The chained folio comes on the long slow arc while the dead copyist closes from the side. Two drownings, and only one of them stops when you hit it.',
    monsters: [
      { defId: 'tidebound-codex', count: 1 },
      { defId: 'drowned-acolyte', count: 1 },
    ],
    xpReward: 2040,
    goldReward: 158,
  },
  {
    title: 'The Codex and the Ink',
    flavorText:
      'A tidebound codex turns the forbidden threshold black with shed pages while an ink-drowned scholar floods the water dark in front of it — bound in blindness, held precisely where the great folio is already falling. The codex does not aim for you. It aims for the place at the door a thing must not be allowed past, and the ink has put you there.',
    monsters: [
      { defId: 'tidebound-codex', count: 1 },
      { defId: 'ink-drowned-scholar', count: 1 },
    ],
    xpReward: 2080,
    goldReward: 164,
  },
  {
    title: 'Two Struck From the Order',
    flavorText:
      'Two unindexed things share the flooded hall, each a reader that won its forbidden knowing and was ruined by it, each striking anything still whole. They do not coordinate — they cannot — but past half they both commit at once, and the hall becomes a place where two losses of order arrive on you together.',
    monsters: [{ defId: 'the-unindexed', count: 2, displayPrefix: 'The Unindexed' }],
    xpReward: 2060,
    goldReward: 156,
  },
  {
    title: 'The Memory and the Ruin',
    flavorText:
      'A drowned mnemonic to still you under the weight of everything it ever read, and the unindexed to spend its whole lost order on you while you cannot move. The Archive sets the two ends of its drowning against you at once: the knowing that will not lift, and the knowing that destroys.',
    monsters: [
      { defId: 'drowned-mnemonic', count: 1 },
      { defId: 'the-unindexed', count: 1 },
    ],
    xpReward: 2100,
    goldReward: 166,
  },
  {
    title: 'The Codex and the Keeper',
    flavorText:
      'The tidebound codex guards the forbidden door and a brine-archivist keeps it whole — re-shelving the construct, warding it, mending the very pages it sheds back into the flock. The machine of the Archive, tending itself at the last threshold. Cut the keeper first, or the codex never wears down and the door is never yours.',
    monsters: [
      { defId: 'tidebound-codex', count: 1 },
      { defId: 'brine-archivist', count: 1 },
    ],
    xpReward: 2120,
    goldReward: 168,
  },
];

/** Title + flavor for a non-combat Chapter 7 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 7, shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId). Kept here, beside the pools, so the wiring
 * step re-authors nothing.
 *
 * NOTE: this is a drowned library, not a temple — the "shrines" are the few dry
 * scraps of true and harmless knowing the flood did not reach, where a soul can
 * read something that does not want to read it back.
 */
export const CHAPTER7_FLAVOR = {
  chapter: 7 as const,
  prefix: 'c7',
  title: 'The Drowned Archive',
  shrines: [
    {
      title: 'A Page That Stayed Dry',
      flavorText:
        'Sealed in an air-pocket under a fallen lintel, one page has come through the drowning whole — and the hand on it wrote nothing forbidden, only a small true thing: a name for the dark, a way to hold a candle in deep water, a kindness. Read it. In a place that drowned to keep its knowing from you, a thing freely given back is worth bracing on.',
    },
    {
      title: 'The Reliquary of a True Name',
      flavorText:
        'A lead casket bolted to the stone above the waterline, the kind the old keepers used to file the one fact too dangerous to leave loose and too precious to drown. The lock has long since rusted open. Inside, in a hand worn nearly to nothing, is a true name — not the captor\'s, not yet, but yours, the one you forgot how to answer to. Take a moment with it. It is, for once, the Archive giving instead of keeping.',
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'A Dry Carrel',
      flavorText:
        'One reading-carrel built high enough into the wall that the flood stopped at its step — a hard bench, a dead lamp, the black water lapping the floor a hand\'s breadth below. Nothing drowned climbs up here; there is nothing up here to keep. For a little while you can sit above the deep and not be filed.',
    },
    {
      title: 'The Lee of a Toppled Stack',
      flavorText:
        'A whole shelving-tier came down in the drowning and leans now against its neighbour, making a dry slanted hollow the current cannot reach. In the lee of all those ruined books the cold is only cold, not hungry. Rest. The drift does not drift here, and for once the dark is just dark.',
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'The Salvage-Keeper',
    flavorText:
      "Something that was a junior keeper, and has stopped believing the books are worth drowning for, has a dry shelf above the waterline stacked with what the flood loosed from the dead — a reader's rings, a warded blade left at the door, draughts sealed against the wet. It does not want coin for the coin. It wants the count to come out even, the last habit of a place that filed everything, and it would rather trade than think about what it still guards.",
  } as ChapterRoomFlavor,
  bossDefId: 'drowned-custodian',
  boss: {
    title: 'Where the Keeper Drowned the Library',
    flavorText:
      "The stacks open at last into the great drowned rotunda, and the black water here is deeper than anything above — forty fathoms of it, every dangerous page in the world sunk and silent at the bottom. At the centre, where the floodgate-wheel still stands locked open, the Drowned Custodian rises the way a tide rises: certain, slow, and full of the dark it let in. \"You are the first thing to come down here in an age that still has a name,\" it says, in a voice full of black water. \"Give it to me. I will file you where the others are filed, and you will be kept, and never have to climb again. The road below leads only to the one who drowned us both. Be still. Let me close you here, where it is quiet.\"",
    xpReward: 2800,
    goldReward: 360,
  },
} as const;
