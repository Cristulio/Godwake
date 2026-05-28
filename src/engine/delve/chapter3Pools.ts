import type { RoomMonster } from '../../types/delve';

/**
 * Spellhold / Chapter 3 encounter pools. Mirrors the chapter1Pools and
 * chapter2Pools layout — pooled compositions for each combat slot in the
 * Spellhold side-delve. Rewards scale roughly +50% over Ch2 to match the
 * tougher CR band (warmups around CR 2, elites a mix of CR 3-4).
 *
 * Slot ordering (8-room side-delve):
 *   warmup (R1) → shrine (R2) → mid (R3) → rest (R4) → elite (R5) →
 *   shrine (R6) → elite (R7) → boss (R8, Asylum Director, fixed).
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
    title: 'A Cell Door Left Ajar',
    flavorText:
      "The door of your cell hangs open on one hinge — and so does the next. A prisoner in a soiled robe stands in the corridor reciting the same three sigils to no one. He sees you and the recitation does not stop.",
    monsters: [{ defId: 'mad-mage-prisoner', count: 1 }],
    xpReward: 210,
    goldReward: 18,
  },
  {
    title: 'The Stitched Subject',
    flavorText:
      "A body in a stained smock is propped against the corridor wall, the seams along its arms healed too straight to be natural. The mouth is sewn shut. It pushes off the stone when it sees you and walks.",
    monsters: [{ defId: 'bonebound-test-subject', count: 1 }],
    xpReward: 220,
  },
  {
    title: 'The Kennel-Corridor',
    flavorText:
      "A long grey hound steps out of a kennel-cage that the wardens forgot to chain. It does not bark. It only watches you, lowers its head, and starts walking.",
    monsters: [{ defId: 'slayer-hound', count: 1 }],
    xpReward: 230,
    goldReward: 14,
  },
  {
    title: 'The Reciting Inmate',
    flavorText:
      "Three cells down, a man in a Cowled apprentice's stained robe is reciting a memorised cantrip in perfect cadence. He has been reciting it for a long time. He has not stopped to eat.",
    monsters: [{ defId: 'mad-mage-prisoner', count: 1 }],
    xpReward: 200,
  },
  {
    title: 'A Hound at the Cell-Block End',
    flavorText:
      "A slayer hound lies at the corridor's end, head on its paws, eyes catching the corridor-light. It does not rise when you turn the corner. It only stands, slowly, the way a dog stands when the rest of the work is its.",
    monsters: [{ defId: 'slayer-hound', count: 1 }],
    xpReward: 220,
    goldReward: 12,
  },
  {
    title: "An Apprentice's First Patrol",
    flavorText:
      "A young Cowled apprentice in a uniform two sizes too crisp steps into the corridor with the wand-grip her mistress drilled into her wrong-side-up. She is going to die here, but she does not know it yet.",
    monsters: [{ defId: 'wardens-apprentice', count: 1 }],
    xpReward: 250,
    goldReward: 16,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'Two Inmates of the Same Cell',
    flavorText:
      "Two prisoners come down the corridor in lockstep, fingers already tracing sigils in parallel. The wardens kept them in adjacent cells. They learned the same incantation in the same year.",
    monsters: [{ defId: 'mad-mage-prisoner', count: 2, displayPrefix: 'Inmate' }],
    xpReward: 420,
    goldReward: 22,
  },
  {
    title: 'The Vivisection Ward',
    flavorText:
      "A stitched-undead subject and the prisoner who used to be its mage — they were experimented on together; they exit the ward together. The prisoner does not look at the corpse beside him.",
    monsters: [
      { defId: 'bonebound-test-subject', count: 1 },
      { defId: 'mad-mage-prisoner', count: 1 },
    ],
    xpReward: 440,
    goldReward: 24,
  },
  {
    title: 'The Bone Drift',
    flavorText:
      "A pair of stitched test-subjects shamble in from a side-corridor. Their seams are different hands' work — the wardens didn't even bother to pair them properly.",
    monsters: [{ defId: 'bonebound-test-subject', count: 2, displayPrefix: 'Subject' }],
    xpReward: 430,
  },
  {
    title: 'A Hound on a Long Leash',
    flavorText:
      "A slayer hound rounds the corner with a Mad Mage Prisoner three paces behind it, still chanting. The hound is leashed. The prisoner is not.",
    monsters: [
      { defId: 'slayer-hound', count: 1 },
      { defId: 'mad-mage-prisoner', count: 1 },
    ],
    xpReward: 450,
    goldReward: 20,
  },
  {
    title: "The Apprentice's Subject",
    flavorText:
      "A Warden's Apprentice walks the gallery beside a stitched test-subject she is grading on its gait. She glances at you the way a clerk glances at an extra line of work.",
    monsters: [
      { defId: 'wardens-apprentice', count: 1 },
      { defId: 'bonebound-test-subject', count: 1 },
    ],
    xpReward: 460,
    goldReward: 26,
  },
  {
    title: 'The Kennel-Pair',
    flavorText:
      "Two slayer hounds in matched livery come up the corridor abreast. They have been raised in adjacent kennels and they have already agreed which of them takes the throat.",
    monsters: [{ defId: 'slayer-hound', count: 2, displayPrefix: 'Hound' }],
    xpReward: 480,
    goldReward: 18,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Sage in the Reading Room',
    flavorText:
      "A robed figure stands at a lectern with his back to you. When you cross the threshold he turns — and where the eyes should be, there is only very still bright air.",
    monsters: [{ defId: 'hollow-sage', count: 1 }],
    xpReward: 540,
    goldReward: 32,
  },
  {
    title: 'The Warden\'s Apprentice',
    flavorText:
      "A young Cowled apprentice in silver-trim livery steps into the corridor with a wand half-raised. She is not surprised to see you. She is annoyed that you made it this far.",
    monsters: [{ defId: 'wardens-apprentice', count: 1 }],
    xpReward: 560,
    goldReward: 36,
  },
  {
    title: 'The Pair of Hollows',
    flavorText:
      "Two emptied-out sages stand at the head of the gallery, facing the same direction. They turn together when they see you, and the still air between them widens.",
    monsters: [{ defId: 'hollow-sage', count: 2, displayPrefix: 'Sage' }],
    xpReward: 580,
    goldReward: 30,
  },
  {
    title: 'The Hound-Pack',
    flavorText:
      "Two slayer hounds come up the corridor shoulder to shoulder. They have been hunting together for a while. They split as they reach you, hoping you cannot watch both.",
    monsters: [{ defId: 'slayer-hound', count: 2, displayPrefix: 'Hound' }],
    xpReward: 560,
  },
  {
    title: 'The Reading-Room Ambush',
    flavorText:
      "A Hollow Sage at the lectern, a Mad Mage Prisoner crouched between two shelves. The shelves were chosen for the angle of attack. The sage was chosen for being already empty.",
    monsters: [
      { defId: 'hollow-sage', count: 1 },
      { defId: 'mad-mage-prisoner', count: 1 },
    ],
    xpReward: 600,
    goldReward: 28,
  },
  {
    title: "The Apprentice's Final",
    flavorText:
      "A Warden's Apprentice stands at the end of the gallery with a stitched test-subject at her hand. This is her practical examination. The wardens grade in blood.",
    monsters: [
      { defId: 'wardens-apprentice', count: 1 },
      { defId: 'bonebound-test-subject', count: 1 },
    ],
    xpReward: 560,
    goldReward: 28,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: "The Warden's Patrol",
    flavorText:
      "A Warden's Apprentice has been waiting at the gallery turn with a slayer hound at her hip. The hound is on no leash. The apprentice's wand is already drawn.",
    monsters: [
      { defId: 'wardens-apprentice', count: 1 },
      { defId: 'slayer-hound', count: 1 },
    ],
    xpReward: 760,
    goldReward: 46,
  },
  {
    title: 'The Sage-Lock',
    flavorText:
      "A Hollow Sage and a Warden's Apprentice stand on opposite sides of the gallery, framing the way ahead. The Sage's empty face turns first. The apprentice's wand follows.",
    monsters: [
      { defId: 'hollow-sage', count: 1 },
      { defId: 'wardens-apprentice', count: 1 },
    ],
    xpReward: 800,
    goldReward: 40,
  },
  {
    title: 'The Test-Pit',
    flavorText:
      "The Cowled Wizards have built a pit at the end of the gallery and the pit is currently in use — a Hollow Sage circles a stitched subject like he's grading its gait.",
    monsters: [
      { defId: 'hollow-sage', count: 1 },
      { defId: 'bonebound-test-subject', count: 1 },
    ],
    xpReward: 720,
    goldReward: 30,
  },
  {
    title: 'The Apprentice and Her Subject',
    flavorText:
      "A Warden's Apprentice walks the corridor with a Mad Mage Prisoner three paces behind her, reciting the same syllable her wand-grip is shaped for. She has been grading him for weeks. He has stopped noticing.",
    monsters: [
      { defId: 'wardens-apprentice', count: 1 },
      { defId: 'mad-mage-prisoner', count: 1 },
    ],
    xpReward: 700,
    goldReward: 34,
  },
  {
    title: "The Sages' Conference",
    flavorText:
      "Two Hollow Sages stand at the head of the gallery, facing the same direction. They turn together when they see you, and the still air between them widens until you can feel it on your teeth.",
    monsters: [
      { defId: 'hollow-sage', count: 2, displayPrefix: 'Sage' },
    ],
    xpReward: 800,
    goldReward: 42,
  },
  {
    title: 'The Examiner and His Subject',
    flavorText:
      "A Hollow Sage stands at a lectern with a stitched test-subject at his hip — the subject's seams catch the corridor-light. The lectern is open to a page someone has been crossing names off.",
    monsters: [
      { defId: 'hollow-sage', count: 1 },
      { defId: 'bonebound-test-subject', count: 1 },
    ],
    xpReward: 740,
    goldReward: 36,
  },
];
