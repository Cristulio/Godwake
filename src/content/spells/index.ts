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
    'A mote of fire streaks at one target you can see. On a hit, 1d10 fire damage.',
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
    'Three darts of force lance from your fingertips. Each strikes for 1d4+1 force damage. No attack roll, no save — it simply lands.',
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

export const FIREBALL: Spell = SpellSchema.parse({
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  school: 'evocation',
  range: '150 ft',
  target: 'area',
  damageType: 'fire',
  description:
    'A bead of ember leaves your fingertip and blooms — 8d6 fire damage to every enemy in the room. A successful Dexterity save halves the burn.',
  effectKey: 'fireball',
});

export const LIGHTNING_BOLT: Spell = SpellSchema.parse({
  id: 'lightning-bolt',
  name: 'Lightning Bolt',
  level: 3,
  school: 'evocation',
  range: '100 ft line',
  target: 'area',
  damageType: 'lightning',
  description:
    'A jagged arc of white lightning leaps from your palm and carves the room — 8d6 lightning damage to every enemy. A successful Dexterity save halves the strike.',
  effectKey: 'lightning-bolt',
});

const ALL_SPELLS: Spell[] = [
  FIRE_BOLT,
  MAGIC_MISSILE,
  BURNING_HANDS,
  SHIELD,
  MAGE_ARMOR,
  HOLD_PERSON,
  MISTY_STEP,
  FIREBALL,
  LIGHTNING_BOLT,
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
