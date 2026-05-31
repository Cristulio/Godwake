import { BlessingSchema, type Blessing, type BlessingModifiers } from '../../schemas/blessing';

// Classes whose primary action is a weapon attack roll. Spells in this build
// either save-for-half or auto-hit, so first-attack-bonus / crit-range /
// damage-on-hit / reroll-miss blessings never fire for Wizards. Tagging them
// here lets shrines and camps filter the offer pool by class.
const WEAPON_CLASSES = ['fighter', 'rogue', 'barbarian', 'ranger'] as const;

const POOL: Blessing[] = [
  BlessingSchema.parse({
    id: 'tymoras-coin',
    name: "Tymora's Coin",
    god: 'tymora',
    flavor: 'A copper finds its way into your hand. You did not put it there.',
    effect: 'Reroll one missed attack per encounter.',
    modifiers: { rerollMissesPerEncounter: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'helms-aegis',
    name: "Helm's Aegis",
    god: 'helm',
    flavor: 'A weight settles on your shoulders — invisible, watchful, unwearying.',
    effect: '+1 AC.',
    modifiers: { acBonus: 1 },
  }),
  BlessingSchema.parse({
    id: 'tempus-fury',
    name: "Tempus's Fury",
    god: 'tempus',
    flavor: 'The first blow is always the truest. Tempus has a soft spot for the brave.',
    effect: '+2 damage on the first attack of each combat.',
    modifiers: { firstAttackDamage: 2 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'mystras-whisper',
    name: "Mystra's Whisper",
    god: 'mystra',
    flavor: 'The Weave hums faintly around your weapon. Your strikes carry an unseen edge.',
    effect: '+1 force damage on all attacks.',
    modifiers: { damageBonus: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'lathanders-dawn',
    name: "Lathander's Dawn",
    god: 'lathander',
    flavor: 'A faint warmth in the dark. New light at the threshold of each room.',
    effect: 'Gain 3 temporary HP at the start of each combat.',
    modifiers: { extraTempHpPerRoom: 3 },
  }),
  BlessingSchema.parse({
    id: 'selunes-veil',
    name: "Selûne's Veil",
    god: 'selune',
    flavor: 'You catch them not seeing you — even when you are obviously there.',
    effect: 'Advantage on your first attack each combat.',
    modifiers: { firstAttackAdvantage: true },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'ilmaters-patience',
    name: "Ilmater's Patience",
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
    name: "Tempus's Edge",
    god: 'tempus',
    flavor: 'Your crit range widens. The god of war prefers a decisive ending.',
    effect: 'Crit range extends by 1 (e.g. Champion crits on 18-20 instead of 19-20).',
    modifiers: { critRangeBonus: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'tymoras-wink',
    name: "Tymora's Wink",
    god: 'tymora',
    flavor: "The lady's luck has no patience for careful aim. Once per encounter the dice owe you one.",
    effect: 'Once per encounter, reroll any missed attack roll (weapon or spell).',
    modifiers: { rerollMissesPerEncounter: 1 },
  }),
  BlessingSchema.parse({
    id: 'tymoras-gambit',
    name: "Tymora's Gambit",
    god: 'tymora',
    flavor: 'A reckless prayer answered. The dice tip one way — but your guard tips the other.',
    effect: 'Crit range extends by 1, but you lose 1 AC. Tymora deals what she deals.',
    modifiers: { critRangeBonus: 1, acBonus: -1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'helms-bulwark',
    name: "Helm's Bulwark",
    god: 'helm',
    flavor: 'Your strikes carry a witness. Steel rings as if struck twice — once by you, once by Him.',
    effect: '+1 radiant damage on hits.',
    modifiers: { holyDamageBonus: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'mystras-ward',
    name: "Mystra's Ward",
    god: 'mystra',
    flavor: 'The Weave holds closest when you are untouched. The first wound unravels the spell.',
    effect: '+1 AC while at full HP.',
    modifiers: { acBonusWhileFull: 1 },
  }),
  BlessingSchema.parse({
    id: 'mystras-veil',
    name: "Mystra's Veil",
    god: 'mystra',
    flavor: 'A thread of the Weave guides your first strike. It does not let go until it lands.',
    effect: '+2 to-hit on the first attack of each combat.',
    modifiers: { firstAttackBonus: 2 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'lathanders-ember',
    name: "Lathander's Ember",
    god: 'lathander',
    flavor: 'A speck of dawn settles in the chest and does not go out. The morning mends even the stubborn wound.',
    effect: 'Regenerate 1 HP at the start of each combat.',
    modifiers: { regenPerCombat: 1 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-crown',
    name: "Ilmater's Crown",
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
    classRelevance: [...WEAPON_CLASSES],
  }),
  // --- v2 pool: relic-style conditional / scaling / synergy blessings ---
  BlessingSchema.parse({
    id: 'lathanders-ascendance',
    name: "Lathander's Ascendance",
    god: 'lathander',
    flavor: 'Each dawn you survive leaves more light in you than the last. The deeper you go, the brighter you burn.',
    effect:
      'At the start of each combat, gain temporary HP equal to your current delve level.',
    modifiers: { tempHpPerDelveLevel: 1 },
  }),
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
    name: "Ilmater's Mercy",
    god: 'ilmater',
    flavor: 'The Crying God takes a measure of your pain onto Himself between each trial. You enter the next a little whole.',
    effect: 'Heal 10% of your maximum HP at the start of each combat.',
    modifiers: { regenPctPerCombat: 10 },
  }),
  BlessingSchema.parse({
    id: 'helms-vigil',
    name: "Helm's Vigil",
    god: 'helm',
    flavor: 'Unhurt, you stand the Watch unbroken — every guard kept, every gap closed. The first wound is what breaks the spell.',
    effect: '+2 AC while at full HP.',
    modifiers: { acBonusWhileFull: 2 },
  }),
  BlessingSchema.parse({
    id: 'ilmaters-forbearance',
    name: "Ilmater's Forbearance",
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
    name: "Mystra's Reserve",
    god: 'mystra',
    flavor: 'The Weave gathers thickest around the marked and the damned. Your curses draw it close like moths to a candle.',
    effect:
      'At the start of each combat, gain 2 temporary HP for each bane the soul carries.',
    modifiers: { tempHpPerBaneQuirk: 2 },
  }),
  BlessingSchema.parse({
    id: 'selunes-clarity',
    name: "Selûne's Clarity",
    god: 'selune',
    flavor: 'Whole and unhurt, you see the killing line as moonlight on water — clear, certain, already drawn.',
    effect: 'While at full HP, your crit range widens by 1.',
    modifiers: { critRangeBonusWhileFull: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'tempus-bloodfury',
    name: "Tempus's Bloodfury",
    god: 'tempus',
    flavor: 'Bleeding, cornered, the brave strike truest. Tempus leans closest to the warrior who has nothing left to lose.',
    effect: 'While bloodied (at half HP or less), your crit range widens by 1.',
    modifiers: { critRangeBonusWhileBloodied: 1 },
    classRelevance: [...WEAPON_CLASSES],
  }),
  BlessingSchema.parse({
    id: 'helms-bastion',
    name: "Helm's Bastion",
    god: 'helm',
    flavor: 'Before the great enemy, the Watcher sets His shield against your back. You will not be the one who breaks the line.',
    effect: 'Gain 6 temporary HP at the start of a chapter-boss fight.',
    modifiers: { bossTempHp: 6 },
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
  | 'fortune';

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
