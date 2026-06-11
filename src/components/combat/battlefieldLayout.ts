import type { MonsterCombatant } from '../../types/combat';

/**
 * The enemy row's slot layout — corpse culling + crowd compression — extracted
 * to a leaf so both the Battlefield (sprite positions) and the SpellEffect
 * overlay (bolt/impact anchors) read the SAME truth. They diverged once:
 * summons crowded the row, corpses were culled, and spell visuals landed
 * mid-field while damage hit the right sprite.
 */
export const FIELD_WIDTH = 824;
export const ROW_RIGHT = 40; // rightmost slot's offset from the board's right edge
export const SLOT_WIDTH = 96; // nominal per-sprite footprint
export const DEFAULT_PITCH = 116; // centre-to-centre spacing at full size
export const PLAYER_ZONE = 152; // monsters must stay right of this (hero slot + gap)
const ROW_SPAN = FIELD_WIDTH - ROW_RIGHT - PLAYER_ZONE;

export interface MonsterSlot {
  combatant: MonsterCombatant;
  right: number;
  scale: number;
}

export function layoutMonsterSprites(monsters: MonsterCombatant[]): MonsterSlot[] {
  const living = monsters.filter((c) => c.instance.hp.current > 0);
  const corpses = monsters.filter((c) => c.instance.hp.current <= 0);

  const fitAtFullSize = Math.floor((ROW_SPAN - SLOT_WIDTH) / DEFAULT_PITCH) + 1;
  const corpseBudget = Math.max(0, fitAtFullSize - living.length);
  // Keep the freshest corpses (tail of the spawn-ordered list); cull the oldest.
  const keptCorpses = new Set(corpses.slice(corpses.length - corpseBudget));

  // Preserve spawn order so survivors keep their place as the field thins.
  const shown = monsters.filter((c) => c.instance.hp.current > 0 || keptCorpses.has(c));

  const n = shown.length;
  let pitch = DEFAULT_PITCH;
  let scale = 1;
  if (n > fitAtFullSize && n > 1) {
    pitch = (ROW_SPAN - SLOT_WIDTH) / (n - 1);
    if (pitch < SLOT_WIDTH) scale = pitch / SLOT_WIDTH;
  }

  return shown.map((combatant, idx) => ({
    combatant,
    right: ROW_RIGHT + idx * pitch,
    scale,
  }));
}
