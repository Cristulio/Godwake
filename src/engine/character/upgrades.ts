import type { Character } from '../../types/character';
import { getUpgrade } from '../../content/upgrades';

/**
 * Apply a permanent upgrade's effect to the character at purchase time.
 * Permanent upgrades are baked into character stats — the unlocked-id list
 * is the source of truth for "owned", but the effects live on the character
 * so reincarnations keep them.
 */
export function applyPermanentUpgrade(character: Character, upgradeId: string): Character {
  const up = getUpgrade(upgradeId);
  if (up.kind !== 'permanent') return character;
  switch (up.id) {
    case 'iron-will': {
      const newMax = character.hp.max + 5;
      return {
        ...character,
        hp: { ...character.hp, max: newMax, current: Math.max(character.hp.current, newMax) },
      };
    }
    case 'mantle-of-the-wakened': {
      const newMax = character.hp.max + 15;
      return {
        ...character,
        hp: { ...character.hp, max: newMax, current: Math.max(character.hp.current, newMax) },
      };
    }
    case 'heirloom-blade':
      return {
        ...character,
        permanentAttackBonus: (character.permanentAttackBonus ?? 0) + 1,
      };
    case 'cloak-of-the-grove':
      return {
        ...character,
        permanentAcBonus: (character.permanentAcBonus ?? 0) + 1,
      };
    case 'whisper-of-the-wild':
      return {
        ...character,
        permanentInitBonus: (character.permanentInitBonus ?? 0) + 2,
      };
    default:
      return character;
  }
}

/**
 * Apply all per-delve upgrade effects to the character right before a delve
 * begins. Pure — produces a new character.
 */
export function applyDelveStartUpgrades(
  character: Character,
  unlockedUpgrades: string[],
): Character {
  let c = character;
  for (const id of unlockedUpgrades) {
    let up;
    try {
      up = getUpgrade(id);
    } catch {
      continue;
    }
    if (up.kind !== 'delveStart') continue;
    switch (up.id) {
      case 'coin-in-pocket':
        c = { ...c, goldInPocket: c.goldInPocket + 25 };
        break;
      case 'mielikki-cache':
        c = { ...c, inventory: [...c.inventory, { itemId: 'potion-of-healing' }] };
        break;
      case 'wellspring-vigil':
        if (c.classId === 'fighter') {
          c = {
            ...c,
            resources: { ...c.resources, secondWindAvailable: true },
          };
        }
        break;
      case 'tymoras-wager':
        c = {
          ...c,
          delveBudgets: {
            ...c.delveBudgets,
            quirkRerollMissesRemaining:
              (c.delveBudgets?.quirkRerollMissesRemaining ?? 0) + 1,
          },
        };
        break;
    }
  }
  return c;
}
