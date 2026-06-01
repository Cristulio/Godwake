import type { RoomMonster } from '../../types/delve';

/**
 * Chapter 12 · "The Siege of Saradush" encounter pools. Mirrors chapter9Pools —
 * pooled compositions for each combat slot in the burning, besieged city the
 * Throne of Bhaal crisis pulls the player into. After Irenicus, the dead god's
 * blood drags the heir on; Melissan sends them in past the line, through the
 * fire, to break the siege of a city packed with refugee Bhaalspawn and ringed
 * by the fire-giant army of Yaga-Shura, one of the Five.
 *
 * Theme: a city dying twice over — burned from without by the giants and held
 * from within by the mad Bhaalspawn warlord Gromnir, with the immolated dead
 * walking the streets between. Mechanically the chapter leans into fire,
 * reach, and attrition: huge hitters that strike from a distance, dead that
 * frighten and re-kindle, a shaman that never runs out of bodies, and a boss
 * whose ritually-hidden heart means wounds only stoke him. Continues the curve
 * a clear notch past Chapter 9: warmups CR 10, early-mid CR 11, mid CR 12,
 * elite CR 14, boss (Yaga-Shura) CR 15.
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
    title: 'A Sentry on the Broken Wall',
    flavorText:
      'The road comes up out of the smoke onto a breach in Saradush\'s outer wall, and a single Saradush marauder is posted in the gap — bored, fat on a season of plunder, picking through a dead man\'s pack. He sees you the way a man sees one more thing to be burned, and reaches for the looted greataxe without much hurrying about it.',
    monsters: [{ defId: 'saradush-marauder', count: 1 }],
    xpReward: 1490,
    goldReward: 116,
  },
  {
    title: 'Something Still Burning',
    flavorText:
      'A shape comes down the smoking street toward you, walking wrong, and the wrongness is that it is on fire and does not seem to mind. One of the burning dead — a townsman the siege caught and would not let lie — reaches for you with hands that are still alight, mouth fixed open around a scream it finished an age ago.',
    monsters: [{ defId: 'burning-dead', count: 1 }],
    xpReward: 1490,
    goldReward: 120,
  },
  {
    title: 'Two of the Ring',
    flavorText:
      'Two Saradush marauders share a doorway out of the ash-fall, dicing on a drumhead over the spoils of a house whose owners are smoke now. They rise together when they see you, unhurried, the way men rise who have not had to fight for anything in weeks and have forgotten it can cost them.',
    monsters: [{ defId: 'saradush-marauder', count: 2, displayPrefix: 'Marauder' }],
    xpReward: 1510,
    goldReward: 114,
  },
  {
    title: 'The Sellsword and the Cinder',
    flavorText:
      'A Saradush marauder backs down the street ahead of a burning dead, herding it toward you the way you herd a fire you cannot put out — let it have the stranger, and keep clear of it yourself. The living thing wants your purse intact. The dead one only wants you alight.',
    monsters: [
      { defId: 'saradush-marauder', count: 1 },
      { defId: 'burning-dead', count: 1 },
    ],
    xpReward: 1520,
    goldReward: 122,
  },
  {
    title: 'A Pair From the Pyres',
    flavorText:
      'Two of the burning dead come up the street together, out of step, each carrying its own fire like a thing it has been told to bring to the next house. They do not coordinate. They only converge, because you are the one cool thing left in a street that is all coal, and the fire in them knows it.',
    monsters: [{ defId: 'burning-dead', count: 2, displayPrefix: 'Burning Dead' }],
    xpReward: 1510,
    goldReward: 118,
  },
  {
    title: 'A Squad on the Cordon',
    flavorText:
      'Three Saradush marauders hold a corner of the cordon where the road tries to thread out of the city, leaning on looted spears with the easy boredom of men whose only standing order is that nothing gets past them alive. You are the most interesting thing to come up this street in a week. They mean to keep you here.',
    monsters: [{ defId: 'saradush-marauder', count: 3, displayPrefix: 'Marauder' }],
    xpReward: 1530,
    goldReward: 112,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Thing That Broke the Gate',
    flavorText:
      'The road narrows where the inner gate used to stand, and the thing that broke it is still there — a half-giant siegebreaker, hung with a beam-sized ram-maul, idly knocking the last of the gate-timbers off their hinges for want of anything left to ruin. It turns the slow way a wrecking-thing turns, and decides you will do.',
    monsters: [{ defId: 'half-giant-siegebreaker', count: 1 }],
    xpReward: 2030,
    goldReward: 146,
  },
  {
    title: 'The Smoke Has a Keeper',
    flavorText:
      'A fire-giant shaman wades up the burning street ahead of its own smoke, a brazier of live coal held high where a banner ought to be. The murk reaches you first, stinging and orange; then a fistful of glowing ash thrown for your eyes; and somewhere behind the blur it is already breathing the rite that wakes the dead back up.',
    monsters: [{ defId: 'fire-giant-shaman', count: 1 }],
    xpReward: 2040,
    goldReward: 150,
  },
  {
    title: 'The Breaker and Its Cinder',
    flavorText:
      'A half-giant siegebreaker holds the rubble with a single burning dead shambling at its flank — the wall you cannot move and the fire you cannot ignore. One swings a ram-maul on a slow certain arc; the other simply walks into you alight. Between them is exactly enough room left on the street for that problem.',
    monsters: [
      { defId: 'half-giant-siegebreaker', count: 1 },
      { defId: 'burning-dead', count: 1 },
    ],
    xpReward: 2050,
    goldReward: 152,
  },
  {
    title: 'Blind in the Burning',
    flavorText:
      'A fire-giant shaman rolls its smoke over the street while it stokes the pyres, so the dead get back up faster than you can put them down and you are fighting them half-blind. You cannot see the next one coming. You only feel where it has been, by the burns, and by the shaman feeding the fire from the murk it hides in.',
    monsters: [
      { defId: 'fire-giant-shaman', count: 1 },
      { defId: 'burning-dead', count: 1 },
    ],
    xpReward: 2060,
    goldReward: 154,
  },
  {
    title: 'The Shaman and the Cordon',
    flavorText:
      'A fire-giant shaman keeps its rite at the back while two Saradush marauders hold the line in front of it — the coin-men to keep you off the priest, the priest to make sure the dead never thin. Cut through the sellswords fast, or fight the whole smoking street eyes-streaming while it refills around you.',
    monsters: [
      { defId: 'fire-giant-shaman', count: 1 },
      { defId: 'saradush-marauder', count: 2, displayPrefix: 'Marauder' },
    ],
    xpReward: 2070,
    goldReward: 150,
  },
  {
    title: 'The Breaker and the Pack',
    flavorText:
      'A half-giant siegebreaker anchors the street and a burning dead works around it, the immovable thing and the relentless thing pinning you between a maul you cannot dodge and a fire you cannot smother. The breaker does not coordinate with the corpse. It does not have to. It only has to stand in the one gap out.',
    monsters: [
      { defId: 'half-giant-siegebreaker', count: 1 },
      { defId: 'burning-dead', count: 1 },
    ],
    xpReward: 2070,
    goldReward: 152,
  },
  {
    title: 'Two That Break Walls',
    flavorText:
      'Two half-giant siegebreakers close the avenue shoulder to shoulder, a frontage of muscle and banded iron with no gap left to slip. There is no flanking it and no rushing it — only the slow, ugly work of bringing down two wall-breakers while their ram-mauls come down on the same patient, crushing arc.',
    monsters: [{ defId: 'half-giant-siegebreaker', count: 2, displayPrefix: 'Siegebreaker' }],
    xpReward: 2080,
    goldReward: 156,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'Kin on the Barricade',
    flavorText:
      "A barricade of furniture and dead-cart blocks the inner street, and the thing that holds it is one of your own — a Gromnir's defender, Bhaalspawn-blooded, notched longsword already out. There is a half-instant of awful recognition on both sides, the same dead god's ichor answering itself across the rubble, before it decides you are one more rival come for the murder in its veins and comes on fast.",
    monsters: [{ defId: 'gromnir-defender', count: 1 }],
    xpReward: 2580,
    goldReward: 182,
  },
  {
    title: 'The Line Itself',
    flavorText:
      'The smoke parts on a mountain of red iron — a fire giant of Yaga-Shura\'s host, scorched plate and a greatsword banked to a sullen orange, blocking the whole width of the street. It does not hurry. It tears a chunk of the broken wall loose, weighs it in one hand, and you understand that there is no distance from this thing that is safe.',
    monsters: [{ defId: 'fire-giant', count: 1 }],
    xpReward: 2600,
    goldReward: 186,
  },
  {
    title: 'The Giant and the Kindling',
    flavorText:
      'A fire giant holds the street while a burning dead shambles in its shadow — the unstoppable thing and the inextinguishable thing, the greatsword that cuts and cauterises and the corpse that simply will not stop being on fire. Spend too long on the giant and the dead has had its hands on you; turn to the dead and the greatsword arrives.',
    monsters: [
      { defId: 'fire-giant', count: 1 },
      { defId: 'burning-dead', count: 1 },
    ],
    xpReward: 2610,
    goldReward: 184,
  },
  {
    title: 'The Defender and the Smoke',
    flavorText:
      "A Gromnir's defender fights inside a fire-giant shaman's murk — the kin to keep you swinging fast, the priest to blind you and wake the dead behind you. Between the longsword you can barely see and the bodies that keep getting back up, the street is meant to leave you nothing you can be sure of except that all of it wants you down.",
    monsters: [
      { defId: 'gromnir-defender', count: 1 },
      { defId: 'fire-giant-shaman', count: 1 },
    ],
    xpReward: 2630,
    goldReward: 188,
  },
  {
    title: 'The Giant and the Breaker',
    flavorText:
      'A fire giant anchors the avenue with a half-giant siegebreaker working beside it — the host and the rabble, the greatsword at reach and the ram-maul up close, two slow crushing arcs you have to be out of the way of at once. Neither needs to be quick. Between them there is no quick way through the street they hold.',
    monsters: [
      { defId: 'fire-giant', count: 1 },
      { defId: 'half-giant-siegebreaker', count: 1 },
    ],
    xpReward: 2630,
    goldReward: 186,
  },
  {
    title: 'The Giant and the Rite',
    flavorText:
      'A fire giant holds the street from reach while a fire-giant shaman keeps station behind it, re-kindling the dead and breathing coal back into the giant\'s banked heat faster than you can grind it down. The mountain never wears thin and the smoke never lifts. Drop the shaman first, or fight the giant until the city finishes burning around you.',
    monsters: [
      { defId: 'fire-giant', count: 1 },
      { defId: 'fire-giant-shaman', count: 1 },
    ],
    xpReward: 2640,
    goldReward: 190,
  },
  {
    title: 'Two of the Blood',
    flavorText:
      "Two Gromnir's defenders hold the gate to the citadel together, both Bhaalspawn, both fighting the way things fight when the siege has burned the fear off and left only the rage — fast, vicious, with the economy gone. They are your kin twice over, and they will kill you twice as gladly for it, because if you live they do not.",
    monsters: [{ defId: 'gromnir-defender', count: 2, displayPrefix: 'Defender' }],
    xpReward: 2640,
    goldReward: 188,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'A Captain of the Siege',
    flavorText:
      'The street opens onto a plaza and the thing that commands this wing of the ring is waiting in it — a fire-giant warlord, older and huger than the line, a forge-black greatblade longer than the giants below it carry. It hits from further than seems fair, and what you open on it, it breathes shut again, banking its own heat back into the wound. One of Yaga-Shura\'s fingers. The hand is further in.',
    monsters: [{ defId: 'fire-giant-warlord', count: 1 }],
    xpReward: 3460,
    goldReward: 240,
  },
  {
    title: 'The Warlord and Its Line',
    flavorText:
      'A fire-giant warlord holds the plaza with a single fire giant of the line dressed in beside it — the captain that mends itself and the soldier that simply does not stop, two greatswords at two reaches and a wall of red iron between you and the citadel. Fell the warlord and the line still stands; fell the line and the warlord has re-tempered itself behind it.',
    monsters: [
      { defId: 'fire-giant-warlord', count: 1 },
      { defId: 'fire-giant', count: 1 },
    ],
    xpReward: 3500,
    goldReward: 246,
  },
  {
    title: 'The Warlord in the Smoke',
    flavorText:
      'A fire-giant warlord commands from the plaza while a fire-giant shaman fills it with murk and walking dead, so the great fire-blade falls at you out of a blur you cannot read and the wounds you do land seal shut behind the smoke. You will not see the long arc coming. You will only learn, once, where it ends.',
    monsters: [
      { defId: 'fire-giant-warlord', count: 1 },
      { defId: 'fire-giant-shaman', count: 1 },
    ],
    xpReward: 3520,
    goldReward: 250,
  },
  {
    title: 'The Warlord and the Blood',
    flavorText:
      "A fire-giant warlord holds the plaza while a Gromnir's defender fights at its feet — the captain of the siege and one of the city's own desperate kin, the immovable and the relentless, fighting on opposite sides of the same war and both of them, for this minute, against you. Spend too long on the giant and the Bhaalspawn has bled you; turn to the kin and the greatblade arrives at reach.",
    monsters: [
      { defId: 'fire-giant-warlord', count: 1 },
      { defId: 'gromnir-defender', count: 1 },
    ],
    xpReward: 3540,
    goldReward: 248,
  },
  {
    title: 'The Wing Holds the Plaza',
    flavorText:
      'A fire-giant warlord with a fire giant at one hand and a half-giant siegebreaker at the other — the whole wing of the ring stood across the citadel approach, the captain, the line, and the wall-breaker, mending and manning and absolutely immovable. It is a long, ugly fight: nothing here is fast, and nothing here stays down while the warlord still breathes.',
    monsters: [
      { defId: 'fire-giant-warlord', count: 1 },
      { defId: 'fire-giant', count: 1 },
      { defId: 'half-giant-siegebreaker', count: 1 },
    ],
    xpReward: 3540,
    goldReward: 244,
  },
  {
    title: 'The Warlord and the Kindling',
    flavorText:
      'A fire-giant warlord crushes the plaza from reach while a fire-giant shaman feeds the burning dead in around your flanks — the captain you cannot out-damage and the rite you cannot out-last, the great arc you cannot dodge and the fire that keeps getting back up. Find the shaman in the smoke and silence the rite, or fight the warlord forever in a plaza that never empties.',
    monsters: [
      { defId: 'fire-giant-warlord', count: 1 },
      { defId: 'fire-giant-shaman', count: 1 },
    ],
    xpReward: 3560,
    goldReward: 250,
  },
];

/** Title + flavor for a non-combat Chapter 12 room (shrine / rest / shop). */
export interface ChapterRoomFlavor {
  title: string;
  flavorText: string;
}

/**
 * Ready-to-wire non-combat flavor for Chapter 12. Shaped to drop straight into
 * the `GODWAKE_CHAPTERS` `ChapterContent` entry in createDelve.ts (shrines /
 * rests / shop / boss + bossDefId), beside the pools, so the wiring re-authors
 * nothing.
 *
 * NOTE: the gods of Saradush burned with it — the "shrines" here are the few
 * places the fire has not yet reached, where a refugee Bhaalspawn can stand
 * out of the heat and the murder in the blood for a moment before the siege
 * finds them again.
 */
export const CHAPTER12_FLAVOR = {
  chapter: 12 as const,
  prefix: 'c12',
  title: 'The Siege of Saradush',
  shrines: [
    {
      title: 'A Cistern the Fire Has Not Found',
      flavorText:
        "A stair down into a stone cistern under a burned house, the water in it black and still and cool — the one thing in Saradush the giants' fire has not yet drunk. Refugees sheltered here until the smoke came down the steps; their things are still set out, waiting for them. Kneel at the cold edge of the water a while. The heat cannot follow you down here, and for as long as you stay the siege seems very far above.",
    },
    {
      title: 'A Shrine Under the Rubble',
      flavorText:
        "A small streetside shrine to some kinder god, half-buried when the wall came down, its little flame guttering on in a pocket of unburned air. No priest tends it now; the priest is ash. But the prayers worn into the stone by a hundred frightened hands still hold a kind of quiet, and the dead god's pull in your blood goes briefly silent in front of it. Whatever was worshipped here did not ask for murder. Stand with it a moment.",
    },
  ] as ChapterRoomFlavor[],
  rests: [
    {
      title: 'The Lee of a Fallen Tower',
      flavorText:
        'A guard-tower came down across the street when the giants breached the wall, and where it fell it makes a windbreak the smoke streams around instead of through. In the hollow behind the rubble the air is almost clear and the roar of the burning is almost far away. It is not safe. It is only a place the fire has to go around.',
    },
    {
      title: 'A Cellar the Refugees Left',
      flavorText:
        "A cellar under a merchant's house where some of the city's refugee Bhaalspawn hid before Gromnir's men or the giants' fire moved them on — cold ashes of a small careful cook-fire, a child's blanket, a tally of days scratched on the wall that stops. The dead god's blood is quiet down here, among the leavings of people who only wanted to live. Sit a while in the place they kept. Nothing in it wants anything from you.",
    },
  ] as ChapterRoomFlavor[],
  shop: {
    title: 'A Quartermaster Gone to Ground',
    flavorText:
      "Something that was once Saradush's garrison quartermaster keeps a barred cellar off the muster-yard, still sorting the city's last stores by a logic worn down to habit — the good steel the dead guard left, harness off the fallen of both sides, potions and charms looted from the refugee column before it scattered. It does not want coin to spend; there is nothing left in the city to spend it on. It wants coin because counting the stores is the last duty it has, and it would rather keep the ledger than think about who the ledger was for.",
  } as ChapterRoomFlavor,
  bossDefId: 'yaga-shura',
  boss: {
    title: 'At the Heart of the Fire',
    flavorText:
      "The last street ends at the breach in the inner keep, and the siege is all around you at once — the ring closing at your back, the smoke folding down, the whole burning weight of the army gathered behind the one thing it was built around. At the centre of the fire he made, a mountain of red-iron muscle turns to regard you, almost delighted. \"You came up out of the dark for THIS?\" says Yaga-Shura, one of the Five, the great fire-blade already rising. \"Melissan's little errand-godling, sent to break my siege. Break it, then. Cut me. You will find there is no heart in me to stop — they took it out and hid it where you will never reach, and a thing with no heart does not feel the wounds that kill a giant. So burn with the rest of them, little kin. I cannot even feel you.\"",
    xpReward: 4800,
    goldReward: 660,
  },
} as const;

/**
 * Boss intel card for Yaga-Shura, shaped to match `BossIntelCard` (the integration
 * lane folds this into `bossIntel.ts`; the `chapter` field there is widened to
 * include 12). The paid edge follows the standard curve: `coinCost = 5·ch² + 20·ch`
 * = 5·144 + 20·12 = 960, a real gold sink against the deep purse a Chapter 12
 * delver carries.
 */
export const CHAPTER12_BOSS_INTEL = {
  bossDefId: 'yaga-shura',
  chapter: 12 as const,
  roomTitle: "A Captured Map of the Heart-Rite",
  roomFlavor:
    "An abandoned command-tent in the lee of the breach, where someone who got this far ahead of you stopped to think. On the camp-table a fire-giant shaman's map is still pinned — the siege-ring drawn in charcoal, and at its centre Yaga-Shura, and from the giant a single line running off the edge of the map to a mark no one here could read. Beside it, in a refugee's shaking hand, the thing they worked out before the smoke took them: HIS HEART IS NOT IN HIM. Below, smaller, pressed through the parchment: you cannot kill what cannot bleed — hurt him and he only burns hotter — last the fire, do not trade it.",
  weakSpotResolution:
    "You read the map the way the one who left it meant you to. Yaga-Shura does not guard himself, because he cannot be killed — the heart-rite means the wounds land on a thing that is not there to feel them. But a giant still has to wind up the greatblade, and the first arc is always the widest. Knowing he will not flinch from anything you do, you set your opening strike for the gap before that first arc comes round.",
  battlePlanResolution:
    "You read the whole shape of him off the captured map: the heart cut out and hidden, so the wounds only stoke him; the great fire-blade at reach, twice to the stroke; the hurled wall-stone for when you give ground; and the moment past half when the missing heart means the pain has nowhere to land and he comes on hotter for being hurt. You walk into the fire bracing not to be ended in the first exchange, your guard set for the long arc and your first cut already aimed at the gap before it.",
  walkPastResolution:
    "You leave the command-tent unread and the warning un-heeded, and step past the map without slowing. Out at the centre of the fire a mountain of a giant marks your coming and laughs, glad of the company and certain of the ending. The bold take the heart of the siege on their own terms — and what Yaga-Shura sheds for you will weigh a touch heavier when the fire finally goes out of him.",
  coinCost: 5 * 144 + 20 * 12,
} as const;
