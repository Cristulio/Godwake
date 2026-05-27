import type { Character } from '../../types/character';
import { findUpgrade } from '../../content/upgrades';

/** Record<upgradeId, currentRank>. Rank 0 / missing = not owned. */
export type UnlockedUpgrades = Record<string, number>;

/**
 * Apply the DELTA effect of a permanent upgrade rank to the character. Called
 * once at purchase with the just-bought rank — the function knows to apply
 * a single rank's worth of effect (e.g. +5 HP, +1 AC) so multi-rank purchases
 * compound naturally across calls.
 */
export function applyPermanentUpgrade(
  character: Character,
  upgradeId: string,
  rank: number,
): Character {
  const up = findUpgrade(upgradeId);
  if (!up) return character;
  if (up.kind !== 'permanent') return character;
  return up.apply(character, rank);
}

/**
 * Apply all per-delve upgrade effects to the character right before a delve
 * begins. Pure — produces a new character. Per-delve fields (gold floor,
 * potions, reroll budgets, stabilise bonus etc.) are stamped on each call.
 */
export function applyDelveStartUpgrades(
  character: Character,
  unlocked: UnlockedUpgrades,
): Character {
  let c = character;
  // Reset per-delve fields that are owned by upgrades so unowned-after-respec
  // doesn't leave stale values. (We currently can't respec, but defensive.)
  c = {
    ...c,
    delveStabiliseBonus: 0,
    shrineOptionBonus: 0,
    shrineTitheGold: 0,
    chapterClearGoldBonus: 0,
  };
  if (c.resources.secondWindBonusRemaining) {
    c = {
      ...c,
      resources: { ...c.resources, secondWindBonusRemaining: 0 },
    };
  }

  for (const [id, rank] of Object.entries(unlocked)) {
    if (!rank || rank <= 0) continue;
    const up = findUpgrade(id);
    if (!up) continue;
    if (up.kind !== 'delveStart') continue;
    c = up.apply(c, rank);
  }
  return c;
}
