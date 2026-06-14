import { BlessingSchema, type Blessing, type BlessingModifiers } from '../../schemas/blessing';

// Pool tags, not class lists. `pool: 'weapon'` = attack-roll-keyed (dead in a
// casting hand: spells here save-for-half or auto-hit); `pool: 'caster'` =
// spell levers (inert for martials); untagged = universal. Offers filter by
// the soul's combat LEAN (engine/character/combatLean — class + subclass,
// resolved at offer time), so the monk and the un-sworn paladin draw the
// weapon pool, a Radiant paladin or Lore bard the caster one.

const POOL: Blessing[] = [
  BlessingSchema.parse({
    id: 'tymoras-coin',
    name: "Tyche's Coin",
    god: 'tymora',
    flavor: 'A copper finds its way into your hand. You did not put it there.',
    effect: 'Reroll one missed attack per encounter.',
    modifiers: { rerollMissesPerEncounter: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'helms-aegis',
    name: "Argus's Aegis",
    god: 'helm',
    flavor: 'A weight settles on your shoulders — invisible, watchful, unwearying.',
    effect: '+1 AC.',
    modifiers: { acBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-fury',
    name: "Ares's Fury",
    god: 'tempus',
    flavor: 'The first blow is always the truest. Ares has a soft spot for the brave.',
    effect: '+2 damage on the first attack of each combat.',
    modifiers: { firstAttackDamage: 2 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'mystras-whisper',
    name: "Hecate's Whisper",
    god: 'mystra',
    flavor: 'The Weft hums faintly around your weapon. Your strikes carry an unseen edge.',
    effect: '+1 force damage on all attacks.',
    modifiers: { damageBonus: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'lathanders-dawn',
    name: "Eos's Dawn",
    god: 'lathander',
    flavor: 'A faint warmth in the dark. New light at the threshold of each room.',
    effect: 'Gain 3 temporary HP at the start of each combat.',
    modifiers: { extraTempHpPerRoom: 3 },
  }),
  BlessingSchema.parse({
    id: 'selunes-veil',
    name: "Selene's Veil",
    god: 'selune',
    flavor: 'You catch them not seeing you — even when you are obviously there.',
    effect: 'Advantage on your first attack each combat.',
    modifiers: { firstAttackAdvantage: true },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'ilmaters-patience',
    name: "Atlas's Patience",
    god: 'ilmater',
    flavor: 'The Crying God knows your weight. He carries it a moment longer than you can.',
    effect:
      "Once per delve, when you would fall, the Crying God spares you — stabilise at 1 HP. Stacks: +1 stabilise charge.",
    modifiers: { extraStabiliseCharges: 1 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-root',
    name: "Silvanus's Root",
    god: 'silvanus',
    flavor: 'The bark hardens most where it has bled. A wound only makes the wood denser.',
    effect: '+1 AC while bloodied (at half HP or less).',
    modifiers: { acBonusWhileBloodied: 1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-edge',
    name: "Ares's Edge",
    god: 'tempus',
    flavor: 'Your crit range widens. The god of war prefers a decisive ending.',
    effect: 'Crit range extends by 1 (e.g. Champion crits on 18-20 instead of 19-20).',
    modifiers: { critRangeBonus: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'tymoras-wink',
    name: "Tyche's Wink",
    god: 'tymora',
    flavor: "The lady's luck has no patience for careful aim. Once per encounter the dice owe you one.",
    effect: 'Once per encounter, reroll any missed attack roll (weapon or spell).',
    modifiers: { rerollMissesPerEncounter: 1 },
  }),
  BlessingSchema.parse({
    id: 'selunes-clarity',
    name: "Selene's Clarity",
    god: 'selune',
    flavor: 'Unhurt, you see by her cold light the one place the strike must land. Untouched, the eye is perfect; the first wound clouds it.',
    effect: 'Crit range extends by 1 while at full HP.',
    modifiers: { critRangeBonusWhileFull: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'tempus-bloodfury',
    name: "Ares's Bloodfury",
    god: 'tempus',
    flavor: 'Bleeding, the war-god leans in close. He has never loved a careful kill — and the killing comes easier the worse you bleed.',
    effect: 'Crit range extends by 1 while bloodied (at half HP or less).',
    modifiers: { critRangeBonusWhileBloodied: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'tymoras-gambit',
    name: "Tyche's Gambit",
    god: 'tymora',
    flavor: 'A reckless prayer answered. The dice tip one way — but your guard tips the other.',
    effect: 'Crit range extends by 1, but you lose 1 AC. Tyche deals what she deals.',
    modifiers: { critRangeBonus: 1, acBonus: -1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'helms-bulwark',
    name: "Argus's Bulwark",
    god: 'helm',
    flavor: 'Your strikes carry a witness. Steel rings as if struck twice — once by you, once by Him.',
    effect: '+1 radiant damage on hits.',
    modifiers: { holyDamageBonus: 1 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'mystras-ward',
    name: "Hecate's Ward",
    god: 'mystra',
    flavor: 'The Weft holds closest when you are untouched. The first wound unravels the spell.',
    effect: '+1 AC while at full HP.',
    modifiers: { acBonusWhileFull: 1 },
  }),
  BlessingSchema.parse({
    id: 'mystras-veil',
    name: "Hecate's Veil",
    god: 'mystra',
    flavor: 'A thread of the Weft guides your first strike. It does not let go until it lands.',
    effect: '+2 to-hit on the first attack of each combat.',
    modifiers: { firstAttackBonus: 2 },
    pool: 'weapon',
  }),
  BlessingSchema.parse({
    id: 'lathanders-ember',
    name: "Eos's Ember",
    god: 'lathander',
    flavor: 'A speck of dawn settles in the chest and does not go out. The morning mends even the stubborn wound.',
    effect: 'Regenerate 1 HP at the start of each combat.',
    modifiers: { regenPerCombat: 1 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-crown',
    name: "Atlas's Crown",
    god: 'ilmater',
    flavor: 'The Crying God presses a thumb to your brow. You will not break here. Not today.',
    effect: 'Gain 2 temporary HP at the start of each combat.',
    modifiers: { extraTempHpPerRoom: 2 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-thorn',
    name: "Silvanus's Thorn",
    god: 'silvanus',
    flavor: 'The briar reaches where the blade hesitates. Wild things do not miss the opening.',
    effect: '+1 to your first attack roll each combat.',
    modifiers: { firstAttackBonus: 1 },
    pool: 'weapon',
  }),
  // --- v2 pool: relic-style conditional / scaling / synergy blessings ---
  BlessingSchema.parse({
    id: 'silvanus-renewal',
    name: "Silvanus's Renewal",
    god: 'silvanus',
    flavor: 'The wound closes as bark seals over a cut bough. Slowly, surely, the wild mends its own.',
    effect: 'Heal 2 HP at the start of each combat.',
    modifiers: { regenPerCombat: 2 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-mercy',
    name: "Atlas's Mercy",
    god: 'ilmater',
    flavor: 'The Crying God takes a measure of your pain onto Himself between each trial. You enter the next a little whole.',
    effect: 'Heal 10% of your maximum HP at the start of each combat.',
    modifiers: { regenPctPerCombat: 10 },
  }),
  BlessingSchema.parse({
    id: 'helms-vigil',
    name: "Argus's Vigil",
    god: 'helm',
    flavor: 'Unhurt, you stand the Watch unbroken — every guard kept, every gap closed. The first wound is what breaks the spell.',
    effect: '+2 AC while at full HP.',
    modifiers: { acBonusWhileFull: 2 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-forbearance',
    name: "Atlas's Forbearance",
    god: 'ilmater',
    flavor: 'Broken and bleeding, you only grow harder to fell. The Crying God loves nothing so much as the one who will not yield.',
    effect: '+2 AC while bloodied (at half HP or less).',
    modifiers: { acBonusWhileBloodied: 2 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-burden',
    name: "Silvanus's Burden",
    god: 'silvanus',
    flavor: 'Every curse on your soul is another root sunk into the world. The cursed are not weak — they are anchored.',
    effect: '+1 AC for each bane the soul carries.',
    modifiers: { acBonusPerBaneQuirk: 1 },
  }),
  BlessingSchema.parse({
    id: 'mystras-reserve',
    name: "Hecate's Reserve",
    god: 'mystra',
    flavor: 'The Weft gathers thickest around the marked and the damned. Your curses draw it close like moths to a candle.',
    effect:
      'At the start of each combat, gain 2 temporary HP for each bane the soul carries.',
    modifiers: { tempHpPerBaneQuirk: 2 },
  }),
  BlessingSchema.parse({
    id: 'helms-bastion',
    name: "Argus's Bastion",
    god: 'helm',
    flavor: 'Before the great enemy, the Watcher sets His shield against your back. You will not be the one who breaks the line.',
    effect: 'Gain 6 temporary HP at the start of a chapter-boss fight.',
    modifiers: { bossTempHp: 6 },
  }),
  // --- caster pool: spell-keyed blessings (lean-caster souls only) ---
  BlessingSchema.parse({
    id: 'mystras-acuity',
    name: "Hecate's Acuity",
    god: 'mystra',
    flavor: 'The Weft sharpens to a point behind your eyes. Where it touches, no ward holds clean.',
    effect: '+1 to your spell save DC.',
    modifiers: { spellDcBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'mystras-surge',
    name: "Hecate's Surge",
    god: 'mystra',
    flavor: 'The current runs fuller through you than the spell was meant to carry. It spills over into the world.',
    effect: '+2 damage on all spells.',
    modifiers: { spellDamageBonus: 2 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'mystras-precision',
    name: "Hecate's Precision",
    god: 'mystra',
    flavor: 'The Weft does not let your aim wander. The bolt goes where the will points.',
    effect: '+1 to spell attack rolls.',
    modifiers: { spellAttackBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'mystras-apex',
    name: "Hecate's Apex",
    god: 'mystra',
    flavor: 'For a breath the Lady of Mysteries casts through you, and the spell remembers what it was at the dawn of the Art.',
    effect: '+1 spell save DC and +1 spell damage.',
    modifiers: { spellDcBonus: 1, spellDamageBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'selunes-beacon',
    name: "Selene's Beacon",
    god: 'selune',
    flavor: 'Her light marks the target before the spell leaves your hand. You strike a thing already lit.',
    effect: '+1 to spell attack rolls and +1 spell damage.',
    modifiers: { spellAttackBonus: 1, spellDamageBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'silvanus-wrath',
    name: "Silvanus's Wrath",
    god: 'silvanus',
    flavor: 'The wild lends its weight to your calling — root, storm, and fang behind every word.',
    effect: '+1 damage on all spells.',
    modifiers: { spellDamageBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'silvanus-insight',
    name: "Silvanus's Insight",
    god: 'silvanus',
    flavor: 'You read the quarry as the oak reads the season — its weakness plain, its dodging already foreseen.',
    effect: '+1 spell save DC and +1 to spell attack rolls.',
    modifiers: { spellDcBonus: 1, spellAttackBonus: 1 },
    pool: 'caster',
  }),
  BlessingSchema.parse({
    id: 'lathanders-mantle',
    name: "Eos's Mantle",
    god: 'lathander',
    flavor: 'Dawn cloaks the caster — fire to throw, warmth to wear. The morning does not send its own out cold.',
    effect: '+1 spell damage and 3 temporary HP at the start of each combat.',
    modifiers: { spellDamageBonus: 1, extraTempHpPerRoom: 3 },
    pool: 'caster',
  }),
  // --- universal pool: class-agnostic depth so every soul cycles fewer repeats ---
  BlessingSchema.parse({
    id: 'tymoras-fortune',
    name: "Tyche's Fortune",
    god: 'tymora',
    flavor: 'The Lady leans close and palms the dice twice. What you fumble, she hands back — and once more besides.',
    effect: 'Reroll up to 2 missed attack rolls per encounter (weapon or spell).',
    modifiers: { rerollMissesPerEncounter: 2 },
  }),
  BlessingSchema.parse({
    id: 'lathanders-renewal',
    name: "Eos's Renewal",
    god: 'lathander',
    flavor: 'Each threshold you cross, the dawn closes a little more of what the last room opened.',
    effect: 'Heal 3 HP at the start of each combat.',
    modifiers: { regenPerCombat: 3 },
  }),
  BlessingSchema.parse({
    id: 'helms-rampart',
    name: "Argus's Rampart",
    god: 'helm',
    flavor: 'The Watcher sets a wall at your shoulder and braces it hardest where the worst is coming.',
    effect: '+1 AC, and 6 temporary HP at the start of a chapter-boss fight.',
    modifiers: { acBonus: 1, bossTempHp: 6 },
  }),
  BlessingSchema.parse({
    id: 'helms-resolve',
    name: "Argus's Resolve",
    god: 'helm',
    flavor: 'Bleeding, the Watch stands harder, not softer. A breached wall is the one He guards closest.',
    effect: '+3 AC while bloodied (at half HP or less).',
    modifiers: { acBonusWhileBloodied: 3 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-solace',
    name: "Atlas's Solace",
    god: 'ilmater',
    flavor: 'The Crying God takes a measure of the hurt between each trial, and you walk into the next less broken than you left the last.',
    effect: 'Heal 15% of your maximum HP at the start of each combat.',
    modifiers: { regenPctPerCombat: 15 },
  }),
  BlessingSchema.parse({
    id: 'silvanus-communion',
    name: "Silvanus's Communion",
    god: 'silvanus',
    flavor: 'The deeper you root into the dark, the more the wild pours into you. The descent itself becomes your armour.',
    effect: 'At the start of each combat, gain temporary HP equal to your current delve level.',
    modifiers: { tempHpPerDelveLevel: 1 },
  }),
];

/**
 * Broad effect-type buckets. Each blessing now uses a distinct lever, so
 * offers are varied by design. This bucketing is a secondary safeguard: it
 * prevents the same broad category (e.g. defense) from filling all three
 * offer slots in a single shrine. Category is derived from the blessing's
 * modifier lever, so a new blessing is bucketed automatically.
 */
export type BlessingCategory =
  | 'defense'
  | 'vitality'
  | 'salvation'
  | 'offense'
  | 'precision'
  | 'crit'
  | 'fortune'
  | 'spellcraft';

/** Modifier lever → effect bucket. Order is the multi-lever tie-break; the
 * current pool is single-lever, so each blessing maps by its one modifier. */
const CATEGORY_BY_MODIFIER: Partial<Record<keyof BlessingModifiers, BlessingCategory>> = {
  acBonus: 'defense',
  acBonusWhileFull: 'defense',
  acBonusWhileBloodied: 'defense',
  acBonusPerBaneQuirk: 'defense',
  damageBonus: 'offense',
  holyDamageBonus: 'offense',
  firstAttackDamage: 'offense',
  // Spell levers, grouped before the weapon-crit keys so multi-lever caster
  // blessings tie-break sensibly: a DC combo reads 'spellcraft', a spell-attack
  // combo reads 'precision', a pure spell-damage card reads 'offense'.
  spellDcBonus: 'spellcraft',
  spellAttackBonus: 'precision',
  spellDamageBonus: 'offense',
  critRangeBonus: 'crit',
  critRangeBonusWhileFull: 'crit',
  critRangeBonusWhileBloodied: 'crit',
  firstAttackBonus: 'precision',
  firstAttackAdvantage: 'precision',
  extraTempHpPerRoom: 'vitality',
  tempHpPerDelveLevel: 'vitality',
  tempHpPerBaneQuirk: 'vitality',
  bossTempHp: 'vitality',
  regenPerCombat: 'vitality',
  regenPctPerCombat: 'vitality',
  extraStabiliseCharges: 'salvation',
  rerollMissesPerEncounter: 'fortune',
};

const CATEGORY_PRIORITY = Object.keys(CATEGORY_BY_MODIFIER) as (keyof BlessingModifiers)[];

export function getBlessingCategory(blessing: Blessing): BlessingCategory {
  const m = blessing.modifiers ?? {};
  for (const key of CATEGORY_PRIORITY) {
    if (m[key] !== undefined) return CATEGORY_BY_MODIFIER[key]!;
  }
  return 'vitality';
}

const BY_ID: Map<string, Blessing> = new Map(POOL.map((b) => [b.id, b]));

export function getBlessing(id: string): Blessing {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Blessing not found: ${id}`);
  return b;
}

export function listBlessings(): Blessing[] {
  return POOL;
}
