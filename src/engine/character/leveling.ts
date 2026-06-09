import type { Character } from '../../types/character';
import type { AbilityName, AbilityScores } from '../../types/abilities';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores } from './derived';
import { getClass } from '../../content/classes';
import { getRace } from '../../content/races';
import { casterSpellSlots } from './actions';
import { listSpells } from '../../content/spells';
import type { Spell, SpellLevel } from '../../schemas/spell';

/**
 * XP-to-level table, fit to level 20. Index 0 = level 1 = 0 xp.
 *
 * Re-fit for the tighter chapters: each chapter now draws ~⅓ fewer combat rooms
 * (the encounter pools are untouched — just fewer fights drawn per chapter), so
 * a routed clear banks ~16% less XP per chapter than the old layout. The whole
 * curve is lowered to match (L20 cap ≈98k, down from ≈126k) so a median routed
 * clear still lands L20 in the Ch12-13 band — the realized-XP target measured by
 * scripts/sim-xp-curve.ts, NOT the authored pool sums (which overcount ~2.5×
 * because a player walks one node per column, not every room).
 *
 * The L9-20 back half keeps non-shrinking deltas (≈4k at L9 climbing to ≈12k at
 * L20) so it reads as a steady climb rather than a wall.
 */
const XP_TABLE = [
  0, 200, 500, 1000, 1900, 3200, 5000, 7400, 10000, 14000, 18800, 24400, 30800,
  38000, 46000, 54800, 64400, 74800, 86000, 98000,
] as const;

export const MAX_LEVEL = XP_TABLE.length;

/** Points an Ability Score Improvement grants to spend. */
export const ASI_POINT_BUDGET = 2;

/** Hard ceiling on any ability score — no ASI bump may carry a score past this. */
export const ABILITY_SCORE_CAP = 20;

/**
 * Point cost of raising one ability by `steps` (+1 each) starting from
 * `fromScore`. A +1 that *starts* at 18 or above costs 2 points; every +1 below
 * 18 costs 1. So 16→18 is 2 points (1+1), 18→19 and 19→20 are 2 points each, and
 * 17→18 is 1 — a single ASI can lift one 18+ score by one, two sub-18 scores by
 * one each, or one sub-18 score by two.
 */
export function asiBumpCost(fromScore: number, steps: number): number {
  let cost = 0;
  for (let i = 0; i < steps; i += 1) {
    cost += fromScore + i >= 18 ? 2 : 1;
  }
  return cost;
}

/**
 * Total points an ASI plan spends, given the pre-ASI effective scores it raises
 * from. Used by the level-up screen to gate the plan against ASI_POINT_BUDGET.
 */
export function asiPlanCost(
  effectiveScores: AbilityScores,
  plan: Partial<Record<AbilityName, number>>,
): number {
  return (Object.keys(plan) as AbilityName[]).reduce(
    (sum, ability) => sum + asiBumpCost(effectiveScores[ability], plan[ability] ?? 0),
    0,
  );
}

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

  // Monk: the Ki well deepens by one each level (+2 more at the L20 capstone) and
  // refills on the level-up, narratively a long rest. Mirrors monkKiMax.
  if (character.classId === 'monk') {
    resources.kiPointsRemaining = newLevel + (newLevel >= 20 ? 2 : 0);
  }

  // Spell-slot classes (full casters on the shared ladder; the Paladin on the
  // shallower half-caster ladder): slots scale with level. Granting via the slot
  // table also refills the well — leveling reads as a long rest in narrative
  // terms. The Wizard surfaces a spell-learn picker at the odd levels (the picked
  // id arrives via the `resources.knownSpells` override); the Druid, Bard, and
  // Paladin prepare a fixed book, so no picker fires for them.
  const refilledSlots = casterSpellSlots({ ...character, level: newLevel });
  if (refilledSlots) {
    resources.spellSlots = refilledSlots;
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
    (s) =>
      s.book === 'wizard' &&
      s.level === tier &&
      s.enabled !== false &&
      !known.has(s.id),
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
  'time-stop',
  'shape-change',
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
