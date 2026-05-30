import type { Character } from '../../types/character';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores } from './derived';
import { getClass } from '../../content/classes';
import { getRace } from '../../content/races';
import { wizardSpellSlots, barbarianRageMax } from './actions';
import { listSpells } from '../../content/spells';
import type { Spell, SpellLevel } from '../../schemas/spell';

/**
 * XP-to-level table, capped at level 8. Index 0 = level 1 = 0 xp.
 *
 * Tuned for ROUTED play. The branching map walks ~one node per layer, so a
 * single route is far fewer fights than the old all-rooms delve and feeds
 * roughly half the XP. The previous curve (tuned for the all-rooms count) left
 * a routed run chronically under-levelled — bosses fought 2-3 levels light, and
 * the L3→L4 cliff (600→2000) alone stranded players at L3 through most of a run.
 * The upper bands are pulled down ~half and the cliff flattened so a normal
 * route reaches the level the content expects (≈L3-4 by the Ch1 boss, L5 by Ch2,
 * L6 by Ch3, L7-8 in Ch4 — a clean full clear tops out at the cap right at the
 * Matron). The L2/L3 bands stay an early grind on purpose.
 */
const XP_TABLE = [0, 250, 550, 1100, 2200, 4000, 6200, 9000] as const;

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
    resources.actionSurgeRemaining = 1;
  }

  // Barbarian: Rage activations scale with level (1 → 2 at L3). Refresh the
  // pool so the new charge is felt at the hub and the next encounter.
  if (character.classId === 'barbarian') {
    resources.rageUsesRemaining = barbarianRageMax({ ...character, level: newLevel });
  }

  // Auto-pick the only available subclass when the class's subclass-pick
  // level is reached. With one subclass per class (current content state),
  // there's no choice to surface in the UI.
  let subclassId = character.subclassId;
  if (!subclassId) {
    const cls = getClass(character.classId);
    if (newLevel >= cls.subclassLevel && cls.subclasses.length === 1) {
      subclassId = cls.subclasses[0].id;
    }
  }

  // Rogue Thief: Fast Hands grants a second Cunning Action use per combat.
  // Refresh the pool so the upgrade is felt on the very next encounter.
  if (character.classId === 'rogue' && subclassId === 'thief' && newLevel >= 3) {
    resources.cunningActionUsesRemaining = 2;
  }

  // Wizard: slots scale with level. Granting via the slot table also refills
  // the well — leveling reads as a long rest in narrative terms. Spell
  // learning is no longer auto-granted here — the LevelUpScreen surfaces a
  // picker at L3 (first 2nd-level slot) and L5 (first 3rd-level slot); the
  // picked id arrives via the `resources.knownSpells` override.
  if (character.classId === 'wizard') {
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
 * L3 unlocks the first 2nd-level slot; L5 unlocks the first 3rd-level slot.
 * Past L5, slot counts grow but no new tier opens — no further pickers.
 */
export function wizardSpellLearnTierForLevel(newLevel: number): SpellLevel | null {
  if (newLevel === 3) return 2;
  if (newLevel === 5) return 3;
  return null;
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
 * Tie-break order is deterministic so sim runs stay reproducible:
 *   fireball > lightning-bolt > burning-hands > magic-missile > magic-missile
 *   > hold-person > misty-step > shield > mage-armor > fire-bolt
 */
const SIM_SPELL_PRIORITY: readonly string[] = [
  'fireball',
  'lightning-bolt',
  'burning-hands',
  'magic-missile',
  'hold-person',
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
