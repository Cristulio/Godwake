import type { RoomMonster } from '../../types/delve';

/**
 * Pre-authored encounter compositions for each combat-room slot in Ch1.
 *
 * Slot ordering reflects the difficulty curve we want a single-life player
 * to feel:
 *   - warmup  (R1): one weak enemy. The player just woke up.
 *   - earlyMid (R3): a real fight but still single-mid or pair.
 *   - mid    (R5): elite-solo or two coordinated foes.
 *   - elite  (R7): pre-boss spike. Solo elite or coordinated trio.
 * Boss (R8) is fixed (Ilyich) and not in this file.
 *
 * Each entry carries the flavor text used for that specific composition so
 * the room reads coherent when it's, say, "a kobold pack" vs "a lone goblin".
 */

export interface EncounterEntry {
  title: string;
  flavorText: string;
  monsters: RoomMonster[];
  /** XP awarded for clearing this specific composition. */
  xpReward: number;
  /** Optional gold bonus dropped on victory (e.g., bugbear's stash). */
  goldReward?: number;
}

export const WARMUP_POOL: EncounterEntry[] = [
  {
    title: 'The Iron Cells',
    flavorText:
      'A goblin scout has been left to keep watch — and to die slow if it fails. It draws a chipped blade and grins all the way to its ears.',
    monsters: [{ defId: 'goblin', count: 1 }],
    xpReward: 50,
  },
  {
    title: 'The Iron Cells',
    flavorText:
      'A kobold skitters at the edge of the lantern light. Smaller than you, and meaner for it. The thing actually hisses.',
    monsters: [{ defId: 'kobold', count: 1 }],
    xpReward: 40,
  },
  {
    title: 'The Iron Cells',
    flavorText:
      'Bone clatters on stone — a skeleton rises from a heap of armor scraps. Whatever the master kept down here, he forgot to bury this one twice.',
    monsters: [{ defId: 'skeleton', count: 1 }],
    xpReward: 50,
  },
  {
    title: 'The Iron Cells',
    flavorText:
      'The rafters above are thick with shapes. One drops first, proboscis already drinking the air.',
    monsters: [{ defId: 'stirge', count: 1 }],
    xpReward: 40,
  },
];

export const EARLY_MID_POOL: EncounterEntry[] = [
  {
    title: 'The Watch Post',
    flavorText:
      'Two pairs of yellow eyes — a goblin and a smaller kobold conscript backing it. They split as they come, hoping you only see one.',
    monsters: [
      { defId: 'goblin', count: 1 },
      { defId: 'kobold', count: 1 },
    ],
    xpReward: 90,
  },
  {
    title: 'The Kobold Den',
    flavorText:
      'A pair of kobolds bicker over the corpse of something soft. They stop bickering when they see you.',
    monsters: [{ defId: 'kobold', count: 2, displayPrefix: 'Kobold' }],
    xpReward: 80,
  },
  {
    title: 'The Bone-Pit',
    flavorText:
      'A skeleton stands over a heap of older bones, a stirge fattening on what little blood is left. Both turn in unison.',
    monsters: [
      { defId: 'skeleton', count: 1 },
      { defId: 'stirge', count: 1 },
    ],
    xpReward: 90,
  },
  {
    title: 'The Dust-Choked Lab',
    flavorText:
      'A glass jar lies cracked on the bench, chalk-grey dust pouring out in the shape of a mephit. It opens its eyes as you cross the threshold.',
    monsters: [{ defId: 'dust-mephit', count: 1 }],
    xpReward: 75,
  },
];

export const MID_POOL: EncounterEntry[] = [
  {
    title: 'The Vault Guardian',
    flavorText:
      'An empty harness stands sentinel in the next chamber. The plates ring like a bell as it pivots to face you — a faint green light moves where the eyes should be.',
    monsters: [{ defId: 'animated-armor', count: 1 }],
    xpReward: 140,
  },
  {
    title: 'The Tomb-Larder',
    flavorText:
      'A ghoul looks up from something it has half-eaten, fingers still in the ribs of it. A skeleton stands at attention behind, like a butler at a long-delayed supper.',
    monsters: [
      { defId: 'ghoul', count: 1 },
      { defId: 'skeleton', count: 1 },
    ],
    xpReward: 160,
  },
  {
    title: 'The Goblin Warren',
    flavorText:
      'Two goblins working a pulley pause and let it slam shut. A stirge drops from the rafters at the sound, looking for whatever they were trying to lift.',
    monsters: [
      { defId: 'goblin', count: 2, displayPrefix: 'Goblin' },
      { defId: 'stirge', count: 1 },
    ],
    xpReward: 150,
  },
  {
    title: 'The Mephit Cages',
    flavorText:
      'A crimson imp perches on the highest shelf, laughing as it kicks one of the cages. A chalk-grey mephit pours from the broken seal.',
    monsters: [
      { defId: 'imp', count: 1 },
      { defId: 'dust-mephit', count: 1 },
    ],
    xpReward: 170,
  },
];

export const ELITE_POOL: EncounterEntry[] = [
  {
    title: "The Bugbear's Trove",
    flavorText:
      'A side-chamber reeks of damp fur and old blood. A hulking goblinoid crouches over a pile of coin and scavenged trinkets. It hefts a spiked club and grunts a challenge.',
    monsters: [{ defId: 'bugbear', count: 1 }],
    xpReward: 200,
    goldReward: 35,
  },
  {
    title: 'The Hobgoblin Picket',
    flavorText:
      'A hobgoblin in scavenged half-plate stands at parade-rest. A goblin recruit cowers behind it — until the hobgoblin barks an order, and the goblin remembers what it\'s for.',
    monsters: [
      { defId: 'hobgoblin', count: 1 },
      { defId: 'goblin', count: 1 },
    ],
    xpReward: 180,
  },
  {
    title: 'The Imp\'s Court',
    flavorText:
      'The imp from earlier — or one just like it — is back, this time with two dust mephits flanking it like petty courtiers. It bows mockingly.',
    monsters: [
      { defId: 'imp', count: 1 },
      { defId: 'dust-mephit', count: 2, displayPrefix: 'Mephit' },
    ],
    xpReward: 220,
  },
  {
    title: 'The Sentinel & The Hunger',
    flavorText:
      'The vault doubles as a tomb, and the tomb doubles as a larder. An animated armor strides between two ghouls feeding in the corner. The plates ring once. The ghouls turn.',
    monsters: [
      { defId: 'animated-armor', count: 1 },
      { defId: 'ghoul', count: 1 },
    ],
    xpReward: 220,
  },
];
