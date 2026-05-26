import type { Character } from '../../types/character';
import { abilityModifier } from '../../types/abilities';
import { effectiveAbilityScores } from './derived';
import { getClass } from '../../content/classes';

/**
 * XP-to-level table, capped at level 8. L1-L5 are 5e RAW; L6-L8 are tuned
 * down from RAW so the current Ch1+Ch2 content can carry the cap raise
 * without forcing 6+ repeat delves. Index 0 = level 1 = 0 xp.
 */
const XP_TABLE = [0, 300, 900, 2700, 6500, 9000, 13000, 18000] as const;

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

/** Average HP gain per Fighter level: (hitDie/2 + 1) + CON modifier. */
export function hpGainForLevelUp(character: Character): number {
  const cls = getClass(character.classId);
  const avg = cls.hitDie / 2 + 1;
  const con = abilityModifier(effectiveAbilityScores(character).con);
  return Math.max(1, avg + con);
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
