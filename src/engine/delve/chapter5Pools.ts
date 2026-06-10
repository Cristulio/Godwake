import type { RoomMonster } from '../../types/delve';

/**
 * The Godwake / Chapter 5 encounter pools. The endgame chapter beyond the
 * Deepdark: past Zhal Vasha the soul breaks through to the power behind the
 * death-and-rebirth cycle it has been caught in — a fallen god of dawns that
 * could not let anything, itself least of all, stay ended.
 *
 * Mirrors chapter4Pools — pooled compositions for each combat slot. This is the
 * hardest band in the game: warmups draw CR 3-4, early-mid CR 4-5, mid CR 5-6,
 * elites CR 6-7, with the fixed boss (Aurelach, the Hollow Dawn, CR 8) wired in
 * separately. Rewards scale roughly +45% over Ch4 to match the tier.
 *
 * Content only — NOT yet wired into createDelve. The chain-wiring
 * (Ch4 → camp → Ch5 → the Hollow Dawn, ascension scaling) is a deliberate
 * follow-up; these pools and the chapter flavor below are authored ready to
 * slot in once the procedural-map restructure of createDelve lands.
 *
 * Intended slot ordering (8-room endgame chapter, for the wiring follow-up):
 *   warmup (R1) → shrine (R2) → early-mid (R3) → rest (R4) → mid (R5) →
 *   shrine (R6) → elite (R7) → the Hollow Dawn (R8, fixed boss).
 */

/** Chapter title for the wiring follow-up (createDelve owns placement). */
export const CHAPTER5_TITLE = 'The Godwake';

/**
 * Chapter intro / threshold flavor — the moment the soul crosses out of the
 * Deepdark and into the light that should not be down here. BG2/FromSoft tone.
 */
export const CHAPTER5_FLAVOR =
  "The Deepdark does not end so much as give up. The faerzress thins, the rock goes pale, and then there is light ahead where light has no business being — not torch, not faerzress, not the cold blue of the deep fungi, but a high steady dawn-coloured glow leaking up through the floor of the world. You have been here before. You do not remember being here before. The two facts sit in you at once and neither will leave. Every step toward the light, something old and tired turns over in your chest and recognises the road home, and you understand, the way you understand a thing in a dream, that you have walked this last mile more times than you have been alive — and that this time you mean to reach the end of it.";

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  xpReward: number;
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'A Latecomer to the Song',
    flavorText:
      "Something stands in the pale light ahead with its back to you, swaying, and when it turns its eyes are seamed shut with cold light and then they are open and on you. A reborn husk — dragged back through the gate one time too many. It reaches the way a sleeper reaches for a blanket, and means to take the warmth straight off your bones.",
    monsters: [{ defId: 'reborn-husk', count: 1 }],
    xpReward: 420,
    goldReward: 40,
  },
  {
    title: 'Two Who Would Not Stay',
    flavorText:
      "Two husks come up the slope abreast, unhurried, the seams of their last stitching still glowing faint along throat and wrist. They were people, once, and recently, and often. They do not hurry because they have learned there is no hurry — there is only the cycle, and you are early.",
    monsters: [{ defId: 'reborn-husk', count: 2, displayPrefix: 'Husk' }],
    xpReward: 430,
    goldReward: 36,
  },
  {
    title: 'The First Voice',
    flavorText:
      "A robed thing burnt the colour of cooled ash kneels in the threshold-light, and when it hears you it lifts its head and opens a mouth full of grey and begins, gently, to sing. The note finds the part of you that is tired of climbing and asks it, kindly, to lie down.",
    monsters: [{ defId: 'ashen-chorister', count: 1 }],
    xpReward: 460,
    goldReward: 44,
  },
  {
    title: 'A Chorister and Her Risen',
    flavorText:
      "The ashen chorister sings, and at her feet a husk that had been lying still sits up to the tune of it. She does not look at the thing she has woken. She is busy with the verse, and the verse is about you.",
    monsters: [
      { defId: 'ashen-chorister', count: 1 },
      { defId: 'reborn-husk', count: 1 },
    ],
    xpReward: 470,
    goldReward: 42,
  },
  {
    title: 'The Pale Watch',
    flavorText:
      "Two husks stand sentinel where the corridor narrows, facing each other across the gap as if they have been told to hold it and have forgotten, between this moment and the last, why. Your step reminds them of the why. They turn together.",
    monsters: [{ defId: 'reborn-husk', count: 2, displayPrefix: 'Husk' }],
    xpReward: 410,
    goldReward: 34,
  },
  {
    title: 'Soot Where a Halo Was',
    flavorText:
      "A chorister alone in a side-chapel of bleached bone, the ring above its head gone entirely to soot. It is not guarding the chapel. It is filling it — the song needs a nave to ring in, and you have walked into the nave.",
    monsters: [{ defId: 'ashen-chorister', count: 1 }],
    xpReward: 450,
    goldReward: 46,
  },
  {
    title: 'The Loyal Husk of the Threshold',
    flavorText:
      "A hollow seraph stands the threshold in armour gone to soot, and it has been standing it long enough that the light has bleached the floor pale around its boots. The face inside the helm is a smooth absence. It does not challenge you. It simply begins, with terrible economy, the sword-form it was forged knowing.",
    monsters: [{ defId: 'hollow-seraph', count: 1 }],
    xpReward: 540,
    goldReward: 50,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Guardian That Forgot Its Charge',
    flavorText:
      "A hollow seraph runs its drill alone in a long gallery of fixed light — high cut, reverse, the wrists turning the cold blade through the figure forever. It guards a thing that no longer needs guarding, and it will fold you into the next pass without breaking the rhythm of the one before.",
    monsters: [{ defId: 'hollow-seraph', count: 1 }],
    xpReward: 760,
    goldReward: 64,
  },
  {
    title: 'The Shepherd and the Returned',
    flavorText:
      "A stooped, hooded thing with a crook of grey bone draws upward at the floor, slow, and a husk stands out of the seam of light it opens. The shepherd does not look at what it has raised. It has raised so many. It looks only at you, and lowers the crook, and begins to walk you toward the gate.",
    monsters: [
      { defId: 'cycle-shepherd', count: 1 },
      { defId: 'reborn-husk', count: 1 },
    ],
    xpReward: 820,
    goldReward: 70,
  },
  {
    title: 'The One the Cycle Keeps',
    flavorText:
      "A penitent kneels in a worn hollow in the floor, scourging itself in time with a prayer you cannot hear, and every welt it raises seals in cold light before the next falls. It greets you without rising and without rancour. It would like, very much, for you to try to make it stop.",
    monsters: [{ defId: 'deathless-penitent', count: 1 }],
    xpReward: 780,
    goldReward: 66,
  },
  {
    title: 'A Welling in the Low Place',
    flavorText:
      "The floor of the next chamber is wet with a slow, luminous blood, and the wet is moving — climbing the walls in a film, drawing toward the warmth of you. A godsblood welter, gone slow and hungry since the god it belonged to stopped commanding it. It remembers being part of something vast, and it is trying to put you inside the memory.",
    monsters: [{ defId: 'godsblood-welter', count: 1 }],
    xpReward: 800,
    goldReward: 60,
  },
  {
    title: 'The Verse and the Sword',
    flavorText:
      "An ashen chorister holds the centre of the nave and a hollow seraph the door — the chorister to sing you still, the seraph to step in while the song has you. They have done this a long time. They have never once needed to change the order.",
    monsters: [
      { defId: 'ashen-chorister', count: 1 },
      { defId: 'hollow-seraph', count: 1 },
    ],
    xpReward: 880,
    goldReward: 72,
  },
  {
    title: 'The Shepherd at His Work',
    flavorText:
      "The cycle-shepherd works alone in a low round chamber ringed with seams of cold light where it has opened the gate and closed it and opened it again. It will pull the dead up around you faster than you can put them back down. There is only one way to win the arithmetic, and it is to reach the shepherd.",
    monsters: [{ defId: 'cycle-shepherd', count: 1 }],
    xpReward: 800,
    goldReward: 68,
  },
  {
    title: 'The Seraph and the Risen',
    flavorText:
      "A hollow seraph at parade-rest in a bleached gallery, a single husk dragging itself upright at its heel. The seraph does not command the husk; they simply both face the same way, toward the warmth, toward you.",
    monsters: [
      { defId: 'hollow-seraph', count: 1 },
      { defId: 'reborn-husk', count: 1 },
    ],
    xpReward: 840,
    goldReward: 62,
  },
  {
    title: 'Ichor and Hymn',
    flavorText:
      "A godsblood welter drags itself across the chapel floor while a chorister sings it forward from the altar-step — the song for the warmth, the blood for the kill. Where the welter has been, the floor steams. Where the song has been, your sword-arm is slow to answer.",
    monsters: [
      { defId: 'godsblood-welter', count: 1 },
      { defId: 'ashen-chorister', count: 1 },
    ],
    xpReward: 880,
    goldReward: 64,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Sermon of Stillness',
    flavorText:
      "An apostle of stillness stands alone in a high pale chamber, one finger raised forever to its ruined lips. Where its eyes were there are two coins of unmoving light. \"Be still,\" it says, before you have closed half the distance. \"The sermon is short.\" And it intends to keep you still while it preaches the whole of it.",
    monsters: [{ defId: 'apostle-of-stillness', count: 1 }],
    xpReward: 1040,
    goldReward: 90,
  },
  {
    title: 'The Mouth Where a Star Was',
    flavorText:
      "A starflensed mawn fills the far end of the chamber — a hole in the world ringed in luminous teeth, where something used to hang in the firmament. It gapes, and the room fills with the wrong-coloured light of the star it ate, and in the after-image you hear the wet double snap of it coming for the sound of your breath.",
    monsters: [{ defId: 'starflensed-mawn', count: 1 }],
    xpReward: 1080,
    goldReward: 86,
  },
  {
    title: 'Two Loyalties at the Arch',
    flavorText:
      "Two hollow seraphim hold the arch into the inner light, blades already drawn through the first figure of the form. They do not coordinate. They do not need to — the drill is the same drill, run a thousand thousand times, and between the two of them there is no gap a living thing can step through.",
    monsters: [{ defId: 'hollow-seraph', count: 2, displayPrefix: 'Seraph' }],
    xpReward: 1020,
    goldReward: 80,
  },
  {
    title: 'The Shepherd and the Undying',
    flavorText:
      "A cycle-shepherd works the gate at one end of the gallery and a deathless penitent kneels at the other — the shepherd to fill the room with the risen, the penitent to be the wall you waste yourself against while they gather. Neither can be allowed the time. You will not be given a choice about which to spend it on first.",
    monsters: [
      { defId: 'cycle-shepherd', count: 1 },
      { defId: 'deathless-penitent', count: 1 },
    ],
    xpReward: 1100,
    goldReward: 88,
  },
  {
    title: 'The Apostle and the Verse',
    flavorText:
      "An apostle of stillness holds the centre, an ashen chorister singing at its shoulder — the chorister to soften you with dread, the apostle to set you in place once the dread has slowed your guard. The quiet they are walking you toward is real, and total, and very close.",
    monsters: [
      { defId: 'apostle-of-stillness', count: 1 },
      { defId: 'ashen-chorister', count: 1 },
    ],
    xpReward: 1120,
    goldReward: 92,
  },
  {
    title: 'The Mawn and the Risen',
    flavorText:
      "A starflensed mawn drags its ring of teeth across the floor of a wide bright hall, and a single husk shambles in its wake, drawn along in the wake of the hunger like a leaf behind a cart. The husk is not the threat. The husk is what the room looks like just before the mawn opens.",
    monsters: [
      { defId: 'starflensed-mawn', count: 1 },
      { defId: 'reborn-husk', count: 1 },
    ],
    xpReward: 1080,
    goldReward: 82,
  },
  {
    title: 'Blood and the Bright Blade',
    flavorText:
      "A godsblood welter wells up across the floor and a hollow seraph holds the dry ground beyond it — the welter to slow you and sap the strength from your arm, the seraph to be waiting, fresh and tireless, on the far side of the wet.",
    monsters: [
      { defId: 'godsblood-welter', count: 1 },
      { defId: 'hollow-seraph', count: 1 },
    ],
    xpReward: 1100,
    goldReward: 84,
  },
  {
    title: 'The Penitent and the Shepherd',
    flavorText:
      "A deathless penitent kneels in the doorway and a cycle-shepherd stands beyond it, and between the one that will not die and the one that raises the dead, the chamber is a place where nothing you do stays done. Cut a thread. Any thread. Then the next.",
    monsters: [
      { defId: 'deathless-penitent', count: 1 },
      { defId: 'cycle-shepherd', count: 1 },
    ],
    xpReward: 1100,
    goldReward: 86,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: 'The General of the Last Host',
    flavorText:
      "A fallen archon holds the threshold of the inner light alone — pauldrons like shields, a helm with two slits of cold fire, a tabard whose blazon has gone entirely to soot. It led the god's last war and lost, and the losing burnt the captain out without ever letting the armour fall. It will fight you to the half and then, with nothing left to hold the line for, it will simply begin to settle the account.",
    monsters: [{ defId: 'fallen-archon', count: 1 }],
    xpReward: 1480,
    goldReward: 110,
  },
  {
    title: 'The Apostle and Its Guardian',
    flavorText:
      "An apostle of stillness in the centre of the antechamber, a hollow seraph drilling the door behind it. The apostle stills you; the seraph steps in twice while you cannot answer. The order never changes because it has never once needed to.",
    monsters: [
      { defId: 'apostle-of-stillness', count: 1 },
      { defId: 'hollow-seraph', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 114,
  },
  {
    title: 'The Hunger and the Shepherd',
    flavorText:
      "A starflensed mawn drags its ring of teeth across the chamber while a cycle-shepherd works the gate behind it — the shepherd raising the risen to crowd you, the mawn opening into the wrong-coloured light to take you blind. Outlast neither. Reach the shepherd through the dark, or feed the mawn in it.",
    monsters: [
      { defId: 'starflensed-mawn', count: 1 },
      { defId: 'cycle-shepherd', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 108,
  },
  {
    title: 'The Archon and the Risen',
    flavorText:
      "A fallen archon stands the inner arch with a single husk dragging itself upright at its heel — not a guard, just a thing the cycle left lying where the archon happens to stand. The archon will not wait for it. Two flat economical arcs of the great sword, and then the rage, and then the account.",
    monsters: [
      { defId: 'fallen-archon', count: 1 },
      { defId: 'reborn-husk', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 112,
  },
  {
    title: 'The Sermon and the Mouth',
    flavorText:
      "An apostle of stillness and a starflensed mawn hold the last antechamber together — the apostle to set you in place, the mawn to open in the dark and find you where you stand. It is the cruelest pairing in the Godwake: stilled, and then blind, and then fed upon, in that order, with no round of your own between.",
    monsters: [
      { defId: 'apostle-of-stillness', count: 1 },
      { defId: 'starflensed-mawn', count: 1 },
    ],
    xpReward: 1540,
    goldReward: 116,
  },
  {
    title: 'The General and the Verse',
    flavorText:
      "A fallen archon holds the arch and an ashen chorister sings from the altar-step beyond it — the song to slow your guard with dread, the archon to make you pay for every slowed beat at the reach of a blade longer than you are tall.",
    monsters: [
      { defId: 'fallen-archon', count: 1 },
      { defId: 'ashen-chorister', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 110,
  },
  {
    title: 'The Mouth and the Undying',
    flavorText:
      "A starflensed mawn drags across the bright hall and a deathless penitent kneels in its path, scourging itself, reknitting whatever you open. The penitent buys the mawn the rounds it needs to find you. Spend the penitent fast, in one push, or spend the rest of the fight blind and bleeding.",
    monsters: [
      { defId: 'starflensed-mawn', count: 1 },
      { defId: 'deathless-penitent', count: 1 },
    ],
    xpReward: 1500,
    goldReward: 106,
  },
  {
    title: 'The Sermon and the Blood',
    flavorText:
      "An apostle of stillness on dry ground and a godsblood welter wide across the floor before it — the welter to sap the strength from your arm and slow your crossing, the apostle to still you the moment you reach the dry stone. Two ways to be made motionless, set one behind the other.",
    monsters: [
      { defId: 'apostle-of-stillness', count: 1 },
      { defId: 'godsblood-welter', count: 1 },
    ],
    xpReward: 1520,
    goldReward: 112,
  },
];
