import { SpellSchema, type Spell } from '../../schemas/spell';

export const FIRE_BOLT: Spell = SpellSchema.parse({
  id: 'fire-bolt',
  name: 'Fire Bolt',
  level: 0,
  school: 'evocation',
  range: '120 ft',
  target: 'single',
  damageType: 'fire',
  description:
    'A mote of fire streaks at one target you can see. Deals d10 fire damage + your Intelligence modifier, the bolt growing brighter as you do — 1d10, then 2d10 at level 5, 3d10 at level 7, 4d10 at level 8. A Dexterity save halves the burn.',
  effectKey: 'fire-bolt',
});

export const MAGIC_MISSILE: Spell = SpellSchema.parse({
  id: 'magic-missile',
  name: 'Magic Missile',
  level: 1,
  school: 'evocation',
  range: '120 ft',
  target: 'single',
  damageType: 'force',
  description:
    'Darts of force lance from your fingertips — 1d4+1 each, no attack roll and no save: they simply land. Three to start, and another as you grow (4 at level 5, 5 at level 8, on up). The answer to a foe too armoured or too slippery to hit.',
  effectKey: 'magic-missile',
});

export const BURNING_HANDS: Spell = SpellSchema.parse({
  id: 'burning-hands',
  name: 'Burning Hands',
  level: 1,
  school: 'evocation',
  range: 'Self (15-ft cone)',
  target: 'area',
  damageType: 'fire',
  description:
    'A sheet of flame roars from your outstretched fingers — 3d6 fire damage. Evocation wizards burn one die hotter.',
  effectKey: 'burning-hands',
});

export const SHIELD: Spell = SpellSchema.parse({
  id: 'shield',
  name: 'Shield',
  level: 1,
  school: 'abjuration',
  range: 'Self',
  target: 'self',
  description:
    'A wall of invisible force snaps into place. +5 AC until your next turn.',
  effectKey: 'shield',
});

export const MAGE_ARMOR: Spell = SpellSchema.parse({
  id: 'mage-armor',
  name: 'Mage Armor',
  level: 1,
  school: 'abjuration',
  range: 'Self',
  target: 'self',
  description:
    'A shimmering film of force settles over you. +3 AC for the rest of this combat.',
  effectKey: 'mage-armor',
});

export const HOLD_PERSON: Spell = SpellSchema.parse({
  id: 'hold-person',
  name: 'Hold Person',
  level: 2,
  school: 'enchantment',
  range: '60 ft',
  target: 'single',
  description:
    'A binding word — the target must succeed a Wisdom save or be paralyzed for the next 2 rounds.',
  effectKey: 'hold-person',
});

export const MISTY_STEP: Spell = SpellSchema.parse({
  id: 'misty-step',
  name: 'Misty Step',
  level: 2,
  school: 'conjuration',
  range: 'Self',
  target: 'self',
  description:
    'You sidestep into a brief fold of silver mist and reappear half a pace askew. +2 AC until the start of your next turn. Cast as a bonus action.',
  effectKey: 'misty-step',
});

export const SCORCHING_RAY: Spell = SpellSchema.parse({
  id: 'scorching-ray',
  name: 'Scorching Ray',
  level: 2,
  school: 'evocation',
  range: '120 ft',
  target: 'single',
  damageType: 'fire',
  description:
    'Searing rays streak from your hand at one target — each its own attack roll, 2d6 fire on a hit. Three to start, and more as you grow (4 at level 6, 5 at level 9, on up). Every ray is a fresh chance to crit; a hard target rarely shrugs off the whole volley.',
  effectKey: 'scorching-ray',
});

export const BLUR: Spell = SpellSchema.parse({
  id: 'blur',
  name: 'Blur',
  level: 2,
  school: 'illusion',
  range: 'Self',
  target: 'self',
  description:
    'Your outline smears and doubles. For the next 5 rounds, attackers roll against you with disadvantage.',
  effectKey: 'blur',
});

export const MIRROR_IMAGE: Spell = SpellSchema.parse({
  id: 'mirror-image',
  name: 'Mirror Image',
  level: 2,
  school: 'illusion',
  range: 'Self',
  target: 'self',
  description:
    'Three flickering duplicates wheel around you. Each blow that would land shatters a duplicate instead, until none remain.',
  effectKey: 'mirror-image',
});

export const FIREBALL: Spell = SpellSchema.parse({
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'A bead of ember blooms into a roar — 8d6 fire to every enemy. DEX save halves. Enemies that fail ignite: 1d6 fire at the start of your next turn.',
  effectKey: 'fireball',
});

export const LIGHTNING_BOLT: Spell = SpellSchema.parse({
  id: 'lightning-bolt',
  name: 'Lightning Bolt',
  level: 3,
  school: 'evocation',
  range: '100 ft line',
  target: 'single',
  damageType: 'lightning',
  description:
    'A spear of lightning hammers one target for 10d6 and forks to a second foe for half — and no further. A Dexterity save halves it on each. More dice than Fireball, but it picks its marks: the focused strike to Fireball’s crowd-clear.',
  effectKey: 'lightning-bolt',
});

export const VAMPIRIC_TOUCH: Spell = SpellSchema.parse({
  id: 'vampiric-touch',
  name: 'Vampiric Touch',
  level: 3,
  school: 'necromancy',
  range: 'Self (touch)',
  target: 'single',
  damageType: 'necrotic',
  description:
    'Your hand goes grave-cold and you drag the warmth out of one target — 5d6 necrotic, no attack roll and no save. Half of that stolen life knits your own wounds closed. Slots spent for blood become slots that keep you standing.',
  effectKey: 'vampiric-touch',
});

// --- Higher tiers (level 4-9) — the L8→20 progression's deeper book. -------

export const RIME_BLAST: Spell = SpellSchema.parse({
  id: 'rime-blast',
  name: 'Rime Blast',
  level: 4,
  school: 'evocation',
  range: '60 ft',
  target: 'area',
  damageType: 'cold',
  description:
    'A pressure-wave of killing frost detonates across the room — 7d6 cold to every enemy. A Dexterity save halves the bite.',
  effectKey: 'rime-blast',
});

export const FORCE_LANCE: Spell = SpellSchema.parse({
  id: 'force-lance',
  name: 'Force Lance',
  level: 4,
  school: 'evocation',
  range: '120 ft',
  target: 'single',
  damageType: 'force',
  description:
    'A spear of hardened force punches clean through one target — 6d8 force damage. No attack roll, no save; it simply lands.',
  effectKey: 'force-lance',
});

export const GLACIAL_CONE: Spell = SpellSchema.parse({
  id: 'glacial-cone',
  name: 'Glacial Cone',
  level: 5,
  school: 'evocation',
  range: 'Self (60-ft cone)',
  target: 'area',
  damageType: 'cold',
  description:
    'A roaring fan of glacier-cold sweeps the room — 9d8 cold to every enemy. A Dexterity save halves it.',
  effectKey: 'glacial-cone',
});

export const VOID_RAY: Spell = SpellSchema.parse({
  id: 'void-ray',
  name: 'Void Ray',
  level: 5,
  school: 'necromancy',
  range: '120 ft',
  target: 'single',
  damageType: 'necrotic',
  description:
    'A thread of un-light bores into one target — a spell attack for 10d6 necrotic on a hit, and even a miss grazes for half. The wound refuses to close.',
  effectKey: 'void-ray',
});

export const SUNFIRE_BURST: Spell = SpellSchema.parse({
  id: 'sunfire-burst',
  name: 'Sunfire Burst',
  level: 6,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'A second sun blooms and gutters — 11d6 fire to every enemy. A Dexterity save halves the blaze.',
  effectKey: 'sunfire-burst',
});

export const EXSANGUINATE: Spell = SpellSchema.parse({
  id: 'exsanguinate',
  name: 'Exsanguinate',
  level: 6,
  school: 'necromancy',
  range: '120 ft',
  target: 'single',
  damageType: 'necrotic',
  description:
    'You close a fist in the air and one target empties from across the room — 10d6 necrotic torn loose, no attack roll and no save. Half of the spilled life pours back into you. The drain taken to its limit; it pays for itself in blood.',
  effectKey: 'exsanguinate',
});

export const DISSOLUTION: Spell = SpellSchema.parse({
  id: 'dissolution',
  name: 'Dissolution',
  level: 6,
  school: 'transmutation',
  range: '120 ft',
  target: 'single',
  damageType: 'force',
  description:
    'Matter unknits at a word — 12d6+24 force to one target. A Constitution save halves it; a foe reduced to nothing is simply gone.',
  effectKey: 'dissolution',
});

export const STORMCRASH: Spell = SpellSchema.parse({
  id: 'stormcrash',
  name: 'Stormcrash',
  level: 7,
  school: 'evocation',
  range: '120 ft',
  target: 'area',
  damageType: 'lightning',
  description:
    'The sky falls indoors — 13d6 lightning to every enemy. A Dexterity save halves it; even a clean save still draws an arc.',
  effectKey: 'stormcrash',
});

export const SOUL_SNARE: Spell = SpellSchema.parse({
  id: 'soul-snare',
  name: 'Soul Snare',
  level: 7,
  school: 'enchantment',
  range: '60 ft',
  target: 'single',
  description:
    'Bindings of pure will seize one target — a Wisdom save or be paralyzed for the next 3 rounds. The grip is far harder to break than a lesser binding.',
  effectKey: 'soul-snare',
});

export const CATACLYSM: Spell = SpellSchema.parse({
  id: 'cataclysm',
  name: 'Cataclysm',
  level: 8,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'A column of ruin descends and the floor cracks — 15d6 fire to every enemy. A Dexterity save halves the devastation.',
  effectKey: 'cataclysm',
});

export const WITHER: Spell = SpellSchema.parse({
  id: 'wither',
  name: 'Wither',
  level: 8,
  school: 'necromancy',
  range: '90 ft',
  target: 'single',
  damageType: 'necrotic',
  description:
    'Years drain from one target in a heartbeat — 16d6 necrotic, and the survivor is left weakened (its blows land softer) for the rest of the fight.',
  effectKey: 'wither',
});

export const APOTHEOSIS: Spell = SpellSchema.parse({
  id: 'apotheosis',
  name: 'Apotheosis',
  level: 9,
  school: 'transmutation',
  range: 'Self',
  target: 'self',
  description:
    'You shed the limits of flesh and burn as something greater. For 4 rounds you gain 30 temporary hit points, +2 AC, and every attack you make — blade or spell — bites for far more.',
  effectKey: 'apotheosis',
});

export const UNMAKE: Spell = SpellSchema.parse({
  id: 'unmake',
  name: 'Unmake',
  level: 9,
  school: 'transmutation',
  range: '90 ft',
  target: 'single',
  damageType: 'necrotic',
  description:
    'You speak one enemy half-out of existence — its form buckles for 18d8 necrotic and it is remade into something helpless, paralyzed for 2 rounds. A Constitution save resists the binding, not the unmaking.',
  effectKey: 'unmake',
});

const ALL_SPELLS: Spell[] = [
  FIRE_BOLT,
  MAGIC_MISSILE,
  BURNING_HANDS,
  SHIELD,
  MAGE_ARMOR,
  HOLD_PERSON,
  MISTY_STEP,
  SCORCHING_RAY,
  BLUR,
  MIRROR_IMAGE,
  FIREBALL,
  LIGHTNING_BOLT,
  VAMPIRIC_TOUCH,
  RIME_BLAST,
  FORCE_LANCE,
  GLACIAL_CONE,
  VOID_RAY,
  SUNFIRE_BURST,
  EXSANGUINATE,
  DISSOLUTION,
  STORMCRASH,
  SOUL_SNARE,
  CATACLYSM,
  WITHER,
  APOTHEOSIS,
  UNMAKE,
];

const SPELL_BY_ID: Map<string, Spell> = new Map(ALL_SPELLS.map((s) => [s.id, s]));

export function getSpell(id: string): Spell {
  const spell = SPELL_BY_ID.get(id);
  if (!spell) {
    throw new Error(`Spell not found: ${id}`);
  }
  return spell;
}

export function listSpells(): Spell[] {
  return ALL_SPELLS;
}
