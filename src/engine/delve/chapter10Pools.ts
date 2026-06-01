import type { RoomMonster } from '../../types/delve';
import type { BossIntelCard } from '../../content/bossIntel';

/**
 * Chapter 10 · "Suldanessellar" encounter pools. Mirrors chapter9Pools — pooled
 * compositions for each combat slot in the hidden elven city of Tethyr, stormed
 * and burning as the player climbs it toward the Tree of Life. Jon Irenicus (the
 * exiled Joneleth) and his vampire ally Bodhi have taken the city; he means to
 * drain the Tree and reclaim the godhood the elves stripped from him. The road
 * climbs through the canopy and the temple terraces toward the desecrated temple
 * of Rillifane, where a green dragon coils between the player and the Tree.
 *
 * Theme: the holy place defiled and turned against its own. The city's own
 * defenders charmed and hollowed, its woodland spirits sickened with the dying
 * Tree, its grown guardians still keeping a city that is already lost, the
 * captor's rakshasa lieutenants holding the stairs, and Bodhi's spawn bleeding
 * up from the catacombs. Continues the curve a notch past Chapter 9: warmups
 * CR 9, early-mid CR 10, mid CR 11, elite CR 13, boss (Nizidramanii'yt) CR 14.
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
    title: 'Up From the Catacombs',
    flavorText:
      'The path off the forest road runs in under the first of the burning boughs, and something pale uncoils from the shadow of a burst tomb to meet it. One of Bodhi\'s spawn, still in the torn finery of the pilgrim it last drank, comes at you quick and low and silent — not to fight so much as to feed, and the climb has already made you slow.',
    monsters: [{ defId: 'bodhi-spawn', count: 1 }],
    xpReward: 1240,
    goldReward: 96,
  },
  {
    title: 'The Watch, Turned',
    flavorText:
      'An arrow takes the bark by your ear before you hear the bow. High in the canopy a Suldanessellar archer nocks another with the unhurried grace of three centuries on the watch, eyes open and empty and aimed at the city it was born to guard. Something reached into it and turned the loyalty around without troubling to remove it.',
    monsters: [{ defId: 'suldanessellar-archer', count: 1 }],
    xpReward: 1250,
    goldReward: 100,
  },
  {
    title: 'Two of the Pale',
    flavorText:
      'Two of Bodhi\'s spawn rise together out of the under-roots, circling wide to take you from both sides the way a pair of dogs work a thing larger than either. Neither speaks. Both watch your throat, and wait for the half-step the climb has left in your guard.',
    monsters: [{ defId: 'bodhi-spawn', count: 2, displayPrefix: 'Spawn' }],
    xpReward: 1280,
    goldReward: 94,
  },
  {
    title: 'Arrow and Fang',
    flavorText:
      'A charmed archer fixes you from the high bough while one of Bodhi\'s spawn breaks from the brush below — the shaft to keep you turning, the cold mouth to close while you are looking up. The city\'s own watch and the city\'s invaders, working you between them as though they had always been on the same side.',
    monsters: [
      { defId: 'suldanessellar-archer', count: 1 },
      { defId: 'bodhi-spawn', count: 1 },
    ],
    xpReward: 1300,
    goldReward: 102,
  },
  {
    title: 'Crossing Volleys',
    flavorText:
      'Two of the canopy-watch hold opposite boughs and loose in turn, so the air across the path is never empty of an arrow long enough to cross it. They do not call to one another. They do not need to. They drilled this killing-ground together for a hundred years, and the drill outlived whatever they were drilling it to protect.',
    monsters: [{ defId: 'suldanessellar-archer', count: 2, displayPrefix: 'Archer' }],
    xpReward: 1290,
    goldReward: 98,
  },
  {
    title: 'The Feeding-Pack at the Gate',
    flavorText:
      'Where the path passes the first broken gate of the inner slopes, two of Bodhi\'s spawn worry at something best not looked at, and a charmed archer keeps the high ground above them. The spawn come off their meal hungrier than they went to it, and the watch looses to keep you in the killing-ground while they close.',
    monsters: [
      { defId: 'bodhi-spawn', count: 2, displayPrefix: 'Spawn' },
      { defId: 'suldanessellar-archer', count: 1 },
    ],
    xpReward: 1320,
    goldReward: 100,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Beautiful Defence',
    flavorText:
      'A bladesinger of Suldanessellar steps into the path and salutes you out of an etiquette nothing in it remains to feel. Then it dances — the war-song of the elves moving through it perfectly while the mind that gave the song meaning has been emptied and refilled with the captor\'s want — and the dance is the most beautiful thing in this burning city, and it is to kill you.',
    monsters: [{ defId: 'suldanessellar-bladesinger', count: 1 }],
    xpReward: 1740,
    goldReward: 124,
  },
  {
    title: 'Come and Rest',
    flavorText:
      'A dryad of the Tree opens its arms across the path the way it once opened them to lead the lost into safe shade — and the old warmth still reaches for you, soured now under the dying Tree into the long reaching sweetness of a thing pulling you under. It wants you to come to it. It still opens its arms. That is the worst of it.',
    monsters: [{ defId: 'defiled-dryad', count: 1 }],
    xpReward: 1750,
    goldReward: 130,
  },
  {
    title: 'The Dance and the Drinker',
    flavorText:
      'A bladesinger holds the terrace with one of Bodhi\'s spawn loose at its flank — the turned war-song to keep your blade busy and beautiful, the cold mouth to close the moment the measure pulls you out of line. The art of the city and the rot beneath it, fighting you to the same time.',
    monsters: [
      { defId: 'suldanessellar-bladesinger', count: 1 },
      { defId: 'bodhi-spawn', count: 1 },
    ],
    xpReward: 1780,
    goldReward: 132,
  },
  {
    title: 'Shade and Shaft',
    flavorText:
      'A defiled dryad reaches for you from the glade-shade while a charmed archer holds the bough above — the one to fill you with dread of the welcome, the other to put a shaft through you while you flinch from it. The forest itself sick, and still defending the way to its own poisoning.',
    monsters: [
      { defId: 'defiled-dryad', count: 1 },
      { defId: 'suldanessellar-archer', count: 1 },
    ],
    xpReward: 1800,
    goldReward: 134,
  },
  {
    title: 'The Singer and the Sickened Tree',
    flavorText:
      'A bladesinger works the front of the terrace while a defiled dryad lashes its blackened thorns from the shade behind — the perfect blade and the curdled welcome, one keeping you in the measure while the other reaches for your courage. Cut the singer fast, or fence the whole sick glade at once.',
    monsters: [
      { defId: 'suldanessellar-bladesinger', count: 1 },
      { defId: 'defiled-dryad', count: 1 },
    ],
    xpReward: 1820,
    goldReward: 136,
  },
  {
    title: 'The Fencer and the Watch',
    flavorText:
      'A bladesinger dances the centre of the terrace with two of the canopy-watch loosing across it from the boughs — the seconds to keep you turning while the singer picks its line, the war-song to open you when the turning leaves a gap. The whole defence of Suldanessellar, said against the city it was raised to keep.',
    monsters: [
      { defId: 'suldanessellar-bladesinger', count: 1 },
      { defId: 'suldanessellar-archer', count: 2, displayPrefix: 'Archer' },
    ],
    xpReward: 1840,
    goldReward: 132,
  },
  {
    title: 'Two of the Soured Grove',
    flavorText:
      'Two defiled dryads share the glade, reaching from either side with arms full of the same dying sweetness, so wherever you turn there is a welcome you cannot bear and a thorn-whip out of it. The grief of the Tree doubled, and doubled it is harder to refuse.',
    monsters: [{ defId: 'defiled-dryad', count: 2, displayPrefix: 'Dryad' }],
    xpReward: 1800,
    goldReward: 130,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Hymn Run Backward',
    flavorText:
      'A war-priest of Rillifane moves up the temple stair swinging a censer that smokes with the wrong incense, singing over you the funeral hymn the elves sing to ease their dead across — turned on the living, it does the same work too soon, your strength leaking off toward whatever country the song is meant to send souls to. It heals still. That is the obscenity of it.',
    monsters: [{ defId: 'suldanessellar-warpriest', count: 1 }],
    xpReward: 2240,
    goldReward: 160,
  },
  {
    title: 'The Door That Does Not Know',
    flavorText:
      'A palace golem of grown ironwood bars the terrace gate, woken to one long instruction — admit only the blood of the city — and keeping it yet, because no one told it the city was lost and it would not understand if they had. It reads you, finds you are not of the blood, and steps to close the way with the patience of a thing that has never once been tired.',
    monsters: [{ defId: 'palace-golem', count: 1 }],
    xpReward: 2250,
    goldReward: 165,
  },
  {
    title: 'The Grief at the Roots',
    flavorText:
      'A defiled treant hauls itself across the slope, the green gone black at its heart, the long patient mind curdled to a single ache. It no longer remembers the difference between a friend of the city and an enemy of it. It remembers only that something is killing the Tree, and that it hurts, and that you are near enough to crush.',
    monsters: [{ defId: 'defiled-treant', count: 1 }],
    xpReward: 2260,
    goldReward: 162,
  },
  {
    title: 'The Priest and the Beautiful Blade',
    flavorText:
      'A war-priest works its backward mending behind a bladesinger that holds the front — the song that raises the city\'s dead defenders to die again, and the dead defender it raises, dancing. Spend too long on the blade and the priest has refilled the terrace; spend too long on the priest and the bladesong has opened you.',
    monsters: [
      { defId: 'suldanessellar-warpriest', count: 1 },
      { defId: 'suldanessellar-bladesinger', count: 1 },
    ],
    xpReward: 2290,
    goldReward: 168,
  },
  {
    title: 'The Gate and the Glade',
    flavorText:
      'A palace golem holds the temple door while a defiled dryad reaches from the sickened green beside it — the slow inevitable arc of the warden\'s fists and the curdled welcome that wants you to stand still and take them. One asks nothing and gives nothing; the other gives only the wish to stop.',
    monsters: [
      { defId: 'palace-golem', count: 1 },
      { defId: 'defiled-dryad', count: 1 },
    ],
    xpReward: 2310,
    goldReward: 170,
  },
  {
    title: 'The Treant and the Funeral',
    flavorText:
      'A defiled treant crushes the centre of the slope while a war-priest sings behind it, mending the black wood faster than you can split it and hollowing you with the hymn while it works. The dying Tree\'s grief made into a weight, and a priest to keep that weight standing past when it should fall.',
    monsters: [
      { defId: 'defiled-treant', count: 1 },
      { defId: 'suldanessellar-warpriest', count: 1 },
    ],
    xpReward: 2330,
    goldReward: 172,
  },
  {
    title: 'The Warden and Its Singers',
    flavorText:
      'A palace golem stands the temple stair with two bladesingers dancing its flanks — the immovable gate and the two beautiful blades, the one to make sure you cannot pass and the others to make sure you cannot wait. Fell the warden and the stair is yours; mind the measure, or the singers fence you off it before you reach the wood.',
    monsters: [
      { defId: 'palace-golem', count: 1 },
      { defId: 'suldanessellar-bladesinger', count: 2, displayPrefix: 'Bladesinger' },
    ],
    xpReward: 2360,
    goldReward: 168,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The Lieutenant on the Stair',
    flavorText:
      'The way up is held by a thing in a murdered noble\'s robes, tiger-headed, its hands set backward at the wrist — one of the captor\'s rakshasa, warded against your lesser spells and contemptuous of the rest. It has held a thousand such stairs on a thousand fallen worlds, and it greets you with the bottomless good humour of a thing that has never once, in all that time, lost.',
    monsters: [{ defId: 'rakshasa', count: 1 }],
    xpReward: 3140,
    goldReward: 220,
  },
  {
    title: 'The Fiend and Its Funeral-Singer',
    flavorText:
      'A rakshasa holds the temple stair with a war-priest mending behind it — the lieutenant to curse and rake while the priest keeps it whole and sings your strength away. The captor\'s own hand and the city\'s turned faith, working you between them as the stink of swamp and funeral-smoke rolls down the steps.',
    monsters: [
      { defId: 'rakshasa', count: 1 },
      { defId: 'suldanessellar-warpriest', count: 1 },
    ],
    xpReward: 3180,
    goldReward: 226,
  },
  {
    title: 'The Fiend Behind the Gate',
    flavorText:
      'A palace golem bars the final terrace and a rakshasa works behind its immovable arms, raking with backward claws whenever the warden\'s slow fists drive you in close. The thing that will not move and the thing you cannot easily touch — and the way to the Tree behind them both.',
    monsters: [
      { defId: 'rakshasa', count: 1 },
      { defId: 'palace-golem', count: 1 },
    ],
    xpReward: 3210,
    goldReward: 230,
  },
  {
    title: 'The Lieutenant and Its Blades',
    flavorText:
      'A rakshasa presides over the stair-head with two bladesingers dancing before it — the cursed claws kept back while the turned war-song keeps you in the measure, then the fiend stepping through whatever gap the dance leaves with its backward hands. The whole defence of the city pressed into the captor\'s service at once.',
    monsters: [
      { defId: 'rakshasa', count: 1 },
      { defId: 'suldanessellar-bladesinger', count: 2, displayPrefix: 'Bladesinger' },
    ],
    xpReward: 3240,
    goldReward: 234,
  },
  {
    title: 'The Fiend in the Sick Grove',
    flavorText:
      'A rakshasa holds the last green slope below the temple with a defiled treant rooted at its side — the fiend\'s illusions filling the air with the city already gone to ash while the black wood crushes anything the lie holds still. Find the rakshasa through the glamour, or be ground into the dying grove by a grief you cannot reach.',
    monsters: [
      { defId: 'rakshasa', count: 1 },
      { defId: 'defiled-treant', count: 1 },
    ],
    xpReward: 3220,
    goldReward: 228,
  },
  {
    title: 'The Captor\'s Honour Guard',
    flavorText:
      'At the very mouth of the desecrated temple the rakshasa makes its stand with a dryad and a watcher at its shoulders — the curdled welcome, the high arrow, and the backward-handed fiend that has held this kind of door for ages. The last guard between you and the dragon, and behind the dragon, the Tree.',
    monsters: [
      { defId: 'rakshasa', count: 1 },
      { defId: 'defiled-dryad', count: 1 },
      { defId: 'suldanessellar-archer', count: 1 },
    ],
    xpReward: 3260,
    goldReward: 236,
  },
];

/** Title + flavor for a non-combat Chapter 10 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 10. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * The shrines here are the holy places of Suldanessellar not yet wholly taken:
 * a shard of the Tree of Life still keeping its light, and an undefiled altar of
 * Rillifane Rallathil in a side-chapel the fire has not reached.
 */
export const CHAPTER10_FLAVOR = {
  chapter: 10 as const,
  prefix: 'c10',
  title: 'Suldanessellar',
  shrines: [
    {
      title: 'A Bough Still Green',
      flavorText:
        "Where the burning has not yet reached, one low branch of the Tree of Life still holds its colour — a single bough of living silver-green in a city going to ash, the last unspoiled reach of the thing the captor means to drain. The light off it is faint and tired, but it is the Tree\'s own, and it remembers what the city was before this night. Stand under it a moment. It is glad, in the dim way a dying thing is glad, that someone came.",
    },
    {
      title: "Rillifane's Untaken Altar",
      flavorText:
        "A side-chapel off the temple stair that the fire and the fiends have somehow passed over — a plain altar of living oak to Rillifane Rallathil, the tree-father, still dressed in its leaves, the only honest stone left standing on this whole climb. No priest tends it now; the priests are sung backward and swinging their censers below. But the wood is still holy, and it has not forgotten, and to lay your hand on it is to be reminded that the city had a god before it had a captor.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'A Talonha Balcony',
      flavorText:
        "A carved balcony of one of the high elven houses, open to the night and the burning canopy below, somehow quiet. The household fled or fell long since; the cushions are still here, and the cold tea, and the view down over the city that was the most beautiful thing in Tethyr before tonight. For a little while you can sit where some elf-lord sat to watch the stars come up over the Tree, and be tired, and let the city burn without you for one held breath.",
    },
    {
      title: 'The Hollow of a Great Root',
      flavorText:
        "Where one of the Tree\'s vast roots breaks the surface of the slope it leaves a dry hollow beneath, floored with old leaf-fall and out of the wind. The defiling has not reached this deep yet; down here the wood still smells of living sap and not of rot. The roots of the Tree of Life held this whole city up for an age. For one night\'s rest they will hold you too.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Fled House\'s Steward',
    flavorText:
      "An old elven steward never left the house it served, though the family it served is gone — it tends the strongroom still, out of the only office it has left, and it will trade with one who fights the captor when it will trade with no one else. Good elven steel off the racks, harness from the armoury, draughts the apothecary left in her flight. It does not want your coin to spend. It wants the strongroom to balance, one last time, before the fire reaches this floor too.",
  } as ChapterRoomFlavor,
  bossDefId: 'nizidramaniiyt',
  boss: {
    title: 'The Temple of Rillifane, Defiled',
    flavorText:
      "The temple stair ends in the great house of the tree-father, and it has been made a reptile\'s den. The altar of Rillifane is smashed and draped across with a sprawl of green-gold scale; the incense of three hundred years lies under a reek of swamp-rot and crushed gold. The captor did not trust the broken city to hold this last door, so he loosed a dragon in the holy place — Nizidramanii\'yt, a green wyrm old enough to remember the planting of the lesser groves, coiled now between you and the way up to the Tree itself. It opens one slitted eye the colour of stagnant water as you come, and does not bother to rise, because nothing has yet climbed this stair worth standing up for, and it does not expect you to be the first.",
    xpReward: 4200,
    goldReward: 600,
  },
} as const;

/**
 * Boss intel card for Chapter 10, exported here so the single integration step
 * can register it without this lane editing the shared `bossIntel.ts`. Typed
 * against the `BossIntelCard` shape but with `chapter: 10` (the intel module\'s
 * chapter union is widened at integration time, per its own note).
 */
export const CHAPTER10_BOSS_INTEL: Omit<BossIntelCard, 'chapter'> & { chapter: 10 } = {
  bossDefId: 'nizidramaniiyt',
  chapter: 10,
  roomTitle: 'A Druid\'s Last Reckoning',
  roomFlavor:
    "A reader\'s nook in the temple wall where one of Rillifane\'s druids stopped, before it died, to set down what it had learned of the thing in the holy place. A slate, a stub of chalk, and a sketch of the great wyrm coiled on the altar — the long neck marked, the reach of the bite traced out twice the body\'s length, and the temple floor washed over with a single scrawled cloud. Beside the cloud, underlined until the chalk snapped: IT BREATHES FIRST. Below, smaller, where the hand had begun to fail: don\'t stand in the green fog · the neck reaches further than it lies · the old worm slows, then it does not — it wakes when it bleeds.",
  weakSpotResolution:
    "You read the slate the way the dying druid meant it to be read. The wyrm does not strike first — it breathes first, rolling the green rot across the temple floor to sicken you before the neck comes down. Knowing where that fog will fall, your opening blow lands in the gap it leaves while it is still drawing the breath.",
  battlePlanResolution:
    "You read the whole shape of the fight off the druid\'s slate: the poison breath first, to fill your lungs and slow your arm — then the long neck reaching twice its body\'s length, bite and coil out of two directions at once — and the moment past half when the old worm stops fighting from habit and wakes in earnest, every wound feeding the rage. You climb into the temple with your mind braced against the fog and your first strike already set for the gap before the breath rolls out.",
  walkPastResolution:
    "You leave the slate unread and the druid\'s last reckoning un-studied, and step past the nook toward the reek of swamp and gold. On the smashed altar ahead a slitted eye the colour of stagnant water opens a fraction and does not trouble to rise. The bold take the temple on their own terms — and what the old worm hoards beneath its coils will weigh a touch heavier when it finally bothers to stand.",
  coinCost: 5 * 10 * 10 + 20 * 10,
};
