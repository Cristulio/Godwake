import { SpellSchema, type Spell } from '../../schemas/spell';

export const FIRE_BOLT: Spell = SpellSchema.parse({
  id: 'fire-bolt',
  book: 'wizard',
  name: 'Fire Bolt',
  level: 0,
  school: 'evocation',
  range: '120 ft',
  target: 'single',
  damageType: 'fire',
  description:
    'A mote of fire streaks at one target you can see. Deals d10 fire damage + your Intelligence modifier, the bolt burning brighter as you grow in power. A Dexterity save halves the burn.',
  effectKey: 'fire-bolt',
});

export const MAGIC_MISSILE: Spell = SpellSchema.parse({
  id: 'magic-missile',
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
  name: 'Misty Step',
  level: 2,
  school: 'conjuration',
  range: 'Self',
  target: 'self',
  description:
    'You sidestep into a brief fold of silver mist and reappear half a pace askew. +2 AC until the start of your next turn. Cast as a bonus action.',
  effectKey: 'misty-step',
  castTime: 'bonus',
});

export const SCORCHING_RAY: Spell = SpellSchema.parse({
  id: 'scorching-ray',
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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
  book: 'wizard',
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

// --- Druid: the nature book (Silvanus's craft). A curated set spanning every
// slot tier so no slot the climb opens is left dead. Each maps onto an EXISTING
// spell-effect handler (no new engine kinds) — the flavor is the Druid's, the
// machinery is shared with the arcane book. Cantrip + tiers 1–9.

export const PRODUCE_FLAME: Spell = SpellSchema.parse({
  id: 'produce-flame',
  book: 'druid',
  name: 'Produce Flame',
  level: 0,
  school: 'conjuration',
  range: '60 ft',
  target: 'single',
  damageType: 'fire',
  description:
    'A flickering flame kindles in your cupped hand and leaps at one target — d10 fire + your Wisdom modifier, the flame growing fiercer as you do. A Dexterity save halves the burn. The light never leaves you wanting for a torch.',
  effectKey: 'fire-bolt',
});

export const THORNLASH: Spell = SpellSchema.parse({
  id: 'thornlash',
  book: 'druid',
  name: 'Thornlash',
  level: 1,
  school: 'conjuration',
  range: '90 ft',
  target: 'single',
  damageType: 'force',
  description:
    'Barbed tendrils whip from the ground and lash one target — 1d4+1 each, no attack roll and no save: they simply find skin. Three lashes to start, and more as you grow. The answer to a foe too armoured or too quick to strike clean.',
  effectKey: 'magic-missile',
});

// Signature: AoE soft-control, distinct from the Wizard's single-target
// Hold Person — every foe saves or loses a turn (effectKey 'entangle').
export const ENTANGLING_ROOTS: Spell = SpellSchema.parse({
  id: 'entangling-roots',
  book: 'druid',
  name: 'Entangling Roots',
  level: 2,
  school: 'transmutation',
  range: '60 ft',
  target: 'area',
  description:
    'Grasping roots erupt across the whole floor — every enemy must win a Strength save or be rooted fast, losing its next turn as it tears free. A whole room held for a beat, where a binding word holds only one. A swift word calls them up — root the floor as a bonus action and still strike the same breath.',
  effectKey: 'entangle',
  castTime: 'bonus',
});

// Signature: heal-over-time — the Druid's ONLY sustain (effectKey 'regrowth').
export const REGROWTH: Spell = SpellSchema.parse({
  id: 'regrowth',
  book: 'druid',
  name: 'Regrowth',
  level: 2,
  school: 'transmutation',
  range: 'Self',
  target: 'self',
  description:
    'Green life wells up through you and keeps welling — your wounds knit now and again at the start of each of your next two turns. The slow, certain mending of the wild; the only healing the nature book holds.',
  effectKey: 'regrowth',
});

export const CALL_LIGHTNING: Spell = SpellSchema.parse({
  id: 'call-lightning',
  book: 'druid',
  name: 'Call Lightning',
  level: 3,
  school: 'conjuration',
  range: '100 ft',
  target: 'single',
  damageType: 'lightning',
  description:
    'You haul a bolt down out of the air onto one target for 10d6 — and it forks to a second foe for half, and no further. A Dexterity save halves it on each. The focused strike to Wildfire’s crowd-clear.',
  effectKey: 'lightning-bolt',
});

export const WILDFIRE: Spell = SpellSchema.parse({
  id: 'wildfire',
  book: 'druid',
  name: 'Wildfire',
  level: 3,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'A wall of brushfire roars up and sweeps the room — 8d6 fire to every enemy. DEX save halves. Enemies that fail keep burning: 1d6 fire at the start of your next turn.',
  effectKey: 'fireball',
});

export const ICE_STORM: Spell = SpellSchema.parse({
  id: 'ice-storm',
  book: 'druid',
  name: 'Ice Storm',
  level: 4,
  school: 'evocation',
  range: '60 ft',
  target: 'area',
  damageType: 'cold',
  description:
    'A squall of jagged hail batters the room — 7d6 cold to every enemy. A Dexterity save halves the bite.',
  effectKey: 'rime-blast',
});

export const AVALANCHE: Spell = SpellSchema.parse({
  id: 'avalanche',
  book: 'druid',
  name: 'Avalanche',
  level: 5,
  school: 'transmutation',
  range: 'Self (60-ft cone)',
  target: 'area',
  damageType: 'cold',
  description:
    'The mountain comes down at your word — a roaring fan of ice and stone sweeps the room for 9d8 cold. A Dexterity save halves it.',
  effectKey: 'glacial-cone',
});

export const FIRE_STORM: Spell = SpellSchema.parse({
  id: 'fire-storm',
  book: 'druid',
  name: 'Fire Storm',
  level: 6,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'Sheets of roaring flame bloom where you will them — 11d6 fire to every enemy. A Dexterity save halves the blaze.',
  effectKey: 'sunfire-burst',
});

// Signature: a persistent companion — a spirit beast that mauls a foe each turn
// for several rounds (effectKey 'summon-beast'). No ally-combatant entity; it is
// modelled as an auto-damage effect that ticks at the start of your turns.
export const SPIRIT_BEAST: Spell = SpellSchema.parse({
  id: 'spirit-beast',
  book: 'druid',
  name: 'Spirit Beast',
  level: 7,
  school: 'conjuration',
  range: '60 ft',
  target: 'single',
  damageType: 'force',
  description:
    'You call a great spirit of the wild to your side — fang and claw given form. It savages your foe now and again at the start of each of your next two turns, tearing into whichever enemy is closest to falling. A hunter that fights on while you work.',
  effectKey: 'summon-beast',
});

export const WRATH_OF_SILVANUS: Spell = SpellSchema.parse({
  id: 'wrath-of-silvanus',
  book: 'druid',
  name: 'Wrath of Silvanus',
  level: 8,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'The Oak Father answers — the ground splits and a column of wildfire and ruin descends. 15d6 fire to every enemy. A Dexterity save halves the devastation.',
  effectKey: 'cataclysm',
});

export const AVATAR_OF_THE_WILDS: Spell = SpellSchema.parse({
  id: 'avatar-of-the-wilds',
  book: 'druid',
  name: 'Avatar of the Wilds',
  level: 9,
  school: 'transmutation',
  range: 'Self',
  target: 'self',
  description:
    'You let the wild pour through you whole and stand as something primeval. For 4 rounds you gain 30 temporary hit points, +2 AC, and every strike — claw or spell — bites for far more.',
  effectKey: 'apotheosis',
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
  // Druid book.
  PRODUCE_FLAME,
  THORNLASH,
  ENTANGLING_ROOTS,
  REGROWTH,
  CALL_LIGHTNING,
  WILDFIRE,
  ICE_STORM,
  AVALANCHE,
  FIRE_STORM,
  SPIRIT_BEAST,
  WRATH_OF_SILVANUS,
  AVATAR_OF_THE_WILDS,
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
