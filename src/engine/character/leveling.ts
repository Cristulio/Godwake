import type { Character } from '../../types/character';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores, isFullCaster } from './derived';
import { getClass } from '../../content/classes';
import { getRace } from '../../content/races';
import { wizardSpellSlots } from './actions';
import { listSpells } from '../../content/spells';
import type { Spell, SpellLevel } from '../../schemas/spell';

/**
 * XP-to-level table, extended to level 20. Index 0 = level 1 = 0 xp.
 *
 * The L1-8 band is unchanged — it was tuned for ROUTED play (the branching map
 * walks ~one node per layer, so a single route feeds roughly half the XP of the
 * old all-rooms delve; the L3→L4 cliff is flattened so a normal route reaches
 * the level the content expects). The L9-20 continuation carries that curve out
 * across the planned 14-chapter expansion: each level needs progressively more,
 * with deltas that grow smoothly (≈3.5k at L9 climbing to ≈18k at L20) so the
 * back half is a steady climb rather than a wall. A full scaled run tops out at
 * the L20 cap (≈126k total) right at the Irenicus finale.
 */
const XP_TABLE = [
  0, 250, 550, 1100, 2200, 4000, 6200, 9000, 12500, 16800, 22000, 28000, 35500,
  44000, 54000, 65000, 78000, 92000, 108000, 126000,
] as const;

export const MAX_LEVEL = XP_TABLE.length;

/** XP required to be AT this level. Level 1 = 0, Level 2 = 300, etc. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return XP_TABLE[MAX_LEVEL - 1];
  return XP_TABLE[level - 1];
}

/** True if the character has enough XP to advance past their current level. */
export function hasPendingLevelUp(character: Character): boolean {
  if (character.level >= MAX_LEVEL) return false;
  return character.xp >= xpForLevel(character.level + 1);
}

/** Average HP gain per level: (hitDie/2 + 1) + CON modifier + race bonusHpPerLevel + class bonus (wizard +1). */
export function hpGainForLevelUp(character: Character): number {
  const cls = getClass(character.classId);
  const avg = cls.hitDie / 2 + 1;
  const con = abilityModifier(effectiveAbilityScores(character).con);
  const raceBonus = getRace(character.raceId).bonusHpPerLevel ?? 0;
  const classBonus = character.classId === 'wizard' ? 1 : 0;
  return Math.max(1, avg + con + raceBonus + classBonus);
}

/**
 * Apply one level-up to a character. Advances level by 1, increases max HP
 * (and current HP by the same delta — feels good to heal-on-level), bumps
 * hit dice, refreshes class resources that scale with level (Action Surge).
 *
 * Does NOT consume XP — XP is cumulative. Subclass choice / ASI choices are
 * handled by the level-up screen calling this with pre-applied changes.
 */
export function applyLevelUp(character: Character): Character {
  const newLevel = character.level + 1;
  const hpDelta = hpGainForLevelUp(character);
  const newMaxHp = character.hp.max + hpDelta;
  const resources = { ...character.resources };

  if (character.classId === 'fighter' && newLevel >= 2) {
    // Improved Action Surge (L17) opens a second charge.
    resources.actionSurgeRemaining = newLevel >= 17 ? 2 : 1;
  }

  // Default the subclass to the class's first archetype when the subclass-pick
  // level is reached and the player hasn't chosen one. Each class now offers
  // 2-3 archetypes, so the LevelUpScreen surfaces a real picker; the chosen id
  // arrives via the `subclassId` override (set on `character` before this runs,
  // so it is preserved). This fallback keeps headless callers (sims, tests) and
  // any player who skips the pick on a sensible default archetype.
  let subclassId = character.subclassId;
  if (!subclassId) {
    const cls = getClass(character.classId);
    if (newLevel >= cls.subclassLevel && cls.subclasses.length > 0) {
      subclassId = cls.subclasses[0].id;
    }
  }

  // Rogue Thief: Fast Hands grants a second Cunning Action use per combat.
  // Refresh the pool so the upgrade is felt on the very next encounter.
  if (character.classId === 'rogue' && subclassId === 'thief' && newLevel >= 3) {
    resources.cunningActionUsesRemaining = 2;
  }

  // Full casters (Wizard / Druid): slots scale with level on the shared ladder.
  // Granting via the slot table also refills the well — leveling reads as a long
  // rest in narrative terms. The Wizard surfaces a spell-learn picker at the odd
  // levels (the picked id arrives via the `resources.knownSpells` override); the
  // Druid prepares a fixed nature book, so no picker fires for it.
  if (isFullCaster(character.classId)) {
    resources.spellSlots = wizardSpellSlots({ ...character, level: newLevel });
  }

  return {
    ...character,
    level: newLevel,
    subclassId,
    hp: {
      max: newMaxHp,
      current: character.hp.current + hpDelta,
      temp: character.hp.temp,
    },
    hitDice: {
      ...character.hitDice,
      max: character.hitDice.max + 1,
      current: character.hitDice.current + 1,
    },
    resources,
  };
}

/**
 * The spell-tier a wizard unlocks for the *first time* at the given new
 * level. Returns null when the level is not a learning milestone.
 *
 * Each odd level from 3 opens the next slot tier and surfaces a picker for a
 * working to fill it: L3→2nd, L5→3rd, L7→4th, L9→5th, L11→6th, L13→7th,
 * L15→8th, L17→9th (the reality-warping capstones). Even levels grow slot
 * counts but open no new tier, so no picker fires.
 */
export function wizardSpellLearnTierForLevel(newLevel: number): SpellLevel | null {
  const tierByLevel: Record<number, SpellLevel> = {
    3: 2,
    5: 3,
    7: 4,
    9: 5,
    11: 6,
    13: 7,
    15: 8,
    17: 9,
  };
  return tierByLevel[newLevel] ?? null;
}

/**
 * Spells at the given tier that the wizard has not yet learned and that are
 * still enabled in content. The level-up picker offers these; the sim
 * auto-picks from this set.
 */
export function availableWizardSpellsForLearn(
  character: Character,
  tier: SpellLevel,
): Spell[] {
  const known = new Set(character.resources.knownSpells ?? []);
  return listSpells().filter(
    (s) => s.level === tier && s.enabled !== false && !known.has(s.id),
  );
}

/**
 * Headless level-up: auto-picks a wizard spell when the new level opens a
 * spell-tier picker (highest-damage AoE first, then single-target damage,
 * then utility). Sims, balance tests, and any non-UI caller should use this
 * instead of `applyLevelUp` so spell-learning is not skipped by accident.
 *
 * Tie-break order is deterministic so sim runs stay reproducible. Scorching Ray
 * ranks above the self-buff 2nd-level spells: with only one 2nd-tier pick (at
 * L3), a competent caster takes the single-target BURST that closes fights over
 * Misty Step (a one-turn +2 AC panic that does nothing in a no-positioning
 * engine). The defensive smears (Blur > Mirror Image) still rank above Misty
 * Step so the in-game auto-player prefers them too.
 *   fireball > lightning-bolt > scorching-ray > burning-hands > magic-missile
 *   > hold-person > blur > mirror-image > misty-step > shield > mage-armor
 *   > fire-bolt
 */
const SIM_SPELL_PRIORITY: readonly string[] = [
  // 9th-level capstones first — a reachable slot here is the deepest pick.
  'unmake',
  'apotheosis',
  // High-tier blasts, biggest dice first (AoE outranks single-target at parity).
  'cataclysm',
  'stormcrash',
  'sunfire-burst',
  'glacial-cone',
  'rime-blast',
  'wither',
  'dissolution',
  'exsanguinate',
  'void-ray',
  'force-lance',
  'soul-snare',
  // The original cap-8 picks.
  'fireball',
  'lightning-bolt',
  'vampiric-touch',
  'scorching-ray',
  'burning-hands',
  'magic-missile',
  'hold-person',
  'blur',
  'mirror-image',
  'misty-step',
  'shield',
  'mage-armor',
  'fire-bolt',
];

export function simulateLevelUp(character: Character): Character {
  const newLevel = character.level + 1;
  const tier = wizardSpellLearnTierForLevel(newLevel);
  if (character.classId !== 'wizard' || tier === null) {
    return applyLevelUp(character);
  }
  const pool = availableWizardSpellsForLearn(character, tier);
  if (pool.length === 0) return applyLevelUp(character);
  const rank = (id: string): number => {
    const idx = SIM_SPELL_PRIORITY.indexOf(id);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  };
  const pick = [...pool].sort((a, b) => rank(a.id) - rank(b.id))[0];
  const existing = character.resources.knownSpells ?? [];
  return applyLevelUp({
    ...character,
    resources: { ...character.resources, knownSpells: [...existing, pick.id] },
  });
}
