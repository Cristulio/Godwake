import type { CombatState, SpellEffectKind } from '../../types/combat';
import type { Weapon } from '../../schemas/item';

/**
 * Attach a combat-VFX event to the state so the SpellEffectLayer mounts a
 * fresh bespoke effect. Mirrors the spell-cast emit (`attachSpellEffect`) but
 * lives here, dependency-free, so weapon attacks and class-ability appliers can
 * emit without pulling in the spell module (which would create an import
 * cycle through attack/damage).
 */
export function attachCombatVfx(
  state: CombatState,
  kind: SpellEffectKind,
  attackerId: string,
  targetId?: string,
): CombatState {
  const next = (state.spellEffectCounter ?? 0) + 1;
  return {
    ...state,
    spellEffectCounter: next,
    spellEffectEvent: { id: next, kind, attackerId, targetId },
  };
}

/**
 * Pick the weapon-swing VFX kind for an attack. Ranged weapons (bows,
 * crossbows — flagged `ammunition`) fire an arrow; everything else reads off
 * the physical damage type. Elemental weapons fall back to a slash so a
 * flaming sablecane still reads as a melee swing rather than a spell.
 */
export function weaponVfxKind(weapon: Weapon): SpellEffectKind {
  if (weapon.properties.includes('ammunition')) return 'arrow';
  switch (weapon.damageType) {
    case 'bludgeoning':
      return 'bludgeon';
    case 'piercing':
      return 'pierce';
    case 'slashing':
      return 'slash';
    default:
      return 'slash';
  }
}
