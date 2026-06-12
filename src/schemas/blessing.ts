import { z } from 'zod';

/**
 * the old realms gods that grant blessings at shrine rooms.
 */
export const BlessingGodSchema = z.enum([
  'tymora',
  'helm',
  'tempus',
  'mystra',
  'lathander',
  'selune',
  'ilmater',
  'silvanus',
]);
export type BlessingGod = z.infer<typeof BlessingGodSchema>;

export const BLESSING_GOD_LABEL: Record<BlessingGod, string> = {
  tymora: 'Tyche · Luck',
  helm: 'Argus · Protection',
  tempus: 'Ares · War',
  mystra: 'Hecate · Magic',
  lathander: 'Eos · Dawn',
  selune: 'Selene · Moon',
  ilmater: 'Atlas · Endurance',
  silvanus: 'Silvanus · Nature',
};

/**
 * A god's holy symbol, as a single 8-bit-dark glyph. Blessings wear their
 * god's mark on the combat HUD so the player can read which powers ride them
 * at a glance — every blessing of a god shares that god's symbol.
 */
export const BLESSING_GOD_GLYPH: Record<BlessingGod, string> = {
  tymora: '◉', // lucky coin
  helm: '⛨', // the Watcher's shield
  tempus: '⚔', // crossed swords of war
  mystra: '✦', // star of the Weft
  lathander: '☀', // the rising sun
  selune: '☾', // the moon's crescent
  ilmater: '✚', // the bound cross of suffering
  silvanus: '❦', // the oak leaf of the wild
};

/**
 * Mechanical hooks a blessing can apply. Engine code reads these where
 * relevant. Unset = flavor-only.
 */
export const BlessingModifiersSchema = z
  .object({
    /** Flat bonus to AC. */
    acBonus: z.number().optional(),
    /** +N to-hit on the first attack of each combat. */
    firstAttackBonus: z.number().optional(),
    /** +N damage on the first attack of each combat. */
    firstAttackDamage: z.number().optional(),
    /** First attack each combat has advantage. */
    firstAttackAdvantage: z.boolean().optional(),
    /** Flat +N damage on all attacks. */
    damageBonus: z.number().optional(),
    /** +N extra radiant damage on hits. */
    holyDamageBonus: z.number().optional(),
    /** Temp HP gained at the start of each combat room. */
    extraTempHpPerRoom: z.number().optional(),
    /**
     * Temp HP at the start of each combat scaling with the character's current
     * delve level (N × level). Folds into the shared start-of-combat temp HP
     * pool (RAW: temp HP doesn't stack — engine takes the max source).
     */
    tempHpPerDelveLevel: z.number().optional(),
    /**
     * Temp HP at the start of each combat scaling with the number of bane
     * quirks the soul carries (N × baneQuirkCount). Soul-mark synergy: the
     * more curses you bear, the harder you are to put down. Folds into the
     * shared temp HP pool.
     */
    tempHpPerBaneQuirk: z.number().optional(),
    /**
     * Flat temp HP granted ONLY at the start of a chapter-boss encounter.
     * Folds into the shared temp HP pool but is inert in normal rooms.
     */
    bossTempHp: z.number().optional(),
    /** Flat HP healed at the start of each combat (real healing, capped at max). */
    regenPerCombat: z.number().optional(),
    /** Percent of max HP healed at the start of each combat (0-100, floored). */
    regenPctPerCombat: z.number().optional(),
    /** +N AC while at full HP (turtle stance — drops the moment you're scratched). */
    acBonusWhileFull: z.number().optional(),
    /** +N AC while bloodied (HP at half or less) — a desperate, defensive last stand. */
    acBonusWhileBloodied: z.number().optional(),
    /** +N AC for each bane quirk the soul carries (soul-mark synergy). */
    acBonusPerBaneQuirk: z.number().optional(),
    /** Crit range widens by N while at full HP (predator's poise). */
    critRangeBonusWhileFull: z.number().optional(),
    /** Crit range widens by N while bloodied (HP at half or less) — a bloodied gamble. */
    critRangeBonusWhileBloodied: z.number().optional(),
    /** Rerolls available per encounter for missed d20s. */
    rerollMissesPerEncounter: z.number().optional(),
    /**
     * Extra "stabilise" charges added on top of the free one each delve. When
     * the player would be reduced to 0 HP and a charge is available, they
     * stabilise at 1 HP instead and the charge is spent.
     */
    extraStabiliseCharges: z.number().optional(),
    /** Crit range expansion (e.g. +1 means crit on 19-20 stacks to 18-20). */
    critRangeBonus: z.number().optional(),
    /**
     * Caster levers. These join the same additive spell sources the engine
     * already reads (camp boons, gear affixes, permanent bonuses) inside
     * `spellSaveDC` / `spellDamageBonus` / `spellAttackBonus` — they are NOT a
     * new effect kind, just blessings as another contributing source. They
     * carry `pool: 'caster'` so they stay off lean-martial offer screens.
     */
    /** +N to the caster's spell save DC (save-or-suck spells land more often). */
    spellDcBonus: z.number().optional(),
    /** +N to spell damage rolls (every damaging spell, flat). */
    spellDamageBonus: z.number().optional(),
    /** +N to spell attack rolls (Fire Bolt, Scorching Ray, et al.). */
    spellAttackBonus: z.number().optional(),
  })
  .default({});
export type BlessingModifiers = z.infer<typeof BlessingModifiersSchema>;

export const BlessingSchema = z.object({
  id: z.string(),
  name: z.string(),
  god: BlessingGodSchema,
  flavor: z.string(),
  effect: z.string(),
  modifiers: BlessingModifiersSchema,
  /**
   * Offer-pool key. Omit = universal (every soul sees it). 'weapon' cards
   * ride attack rolls (first-attack to-hit / damage, crit range, damage and
   * radiant riders, attack rerolls) — dead in a casting hand (sim PR #105:
   * those spells save-for-half or auto-hit). 'caster' cards carry the spell
   * levers, inert for martials. Offers resolve the soul's combat LEAN
   * (engine/character/combatLean — class + subclass, at offer time) rather
   * than a static class list, so a Valor bard draws weapon cards and a
   * Radiant paladin spell cards.
   */
  pool: z.enum(['weapon', 'caster']).optional(),
});
export type Blessing = z.infer<typeof BlessingSchema>;
