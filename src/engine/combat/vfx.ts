import type {
  CombatState,
  SpellEffectEvent,
  SpellEffectKind,
  SpellElement,
} from '../../types/combat';
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
  element?: SpellElement,
  outcome?: 'landed' | 'resisted',
  damage?: number,
): CombatState {
  const next = (state.spellEffectCounter ?? 0) + 1;
  return {
    ...state,
    spellEffectCounter: next,
    spellEffectEvent: { id: next, kind, attackerId, targetId, element, outcome, damage },
  };
}

/** One per-target effect in a batch — the id is assigned by the emitter. */
export interface BatchVfxEntry {
  kind: SpellEffectKind;
  attackerId: string;
  targetId?: string;
  element?: SpellElement;
  outcome?: 'landed' | 'resisted';
  damage?: number;
}

/**
 * Emit a BATCH of combat-VFX events in one commit, each with its own
 * target/outcome and a unique counter-advanced id. The single `spellEffectEvent`
 * carries one target only, so an AoE control cast that touches many foes at once
 * (Entangle) would lose every foe's verdict but the last; this surfaces them all
 * so each sprite floats its own LANDED/RESISTED and rooted foes show their own
 * roots. Replaced per emit (like `attackEvents`) so stale entries never re-fire.
 */
export function attachCombatVfxBatch(
  state: CombatState,
  entries: readonly BatchVfxEntry[],
): CombatState {
  let counter = state.spellEffectCounter ?? 0;
  const events: SpellEffectEvent[] = entries.map((e) => {
    counter += 1;
    return { id: counter, ...e };
  });
  return { ...state, spellEffectCounter: counter, spellEffectEvents: events };
}

/**
 * Per-weapon-TYPE VFX identity, keyed off the weapon's base id. An axe chops,
 * a hammer cracks the ground, a spear drives a lance line, a dagger flicks,
 * a staff bonks — not just three damage-type swooshes. Content untouched:
 * this table is the only place a weapon id meets a look. Weapons absent here
 * fall through to the damage-type read below, so a new weapon always renders
 * something sane.
 */
const WEAPON_VFX_BY_ID: Record<string, SpellEffectKind> = {
  // Bare fists — the monk's virtual unarmed-strike profiles (every tier).
  'monk-fists': 'unarmed',
  'monk-fists-adept': 'unarmed',
  'monk-fists-master': 'unarmed',
  'monk-fists-grandmaster': 'unarmed',
  // Axes and axe-like sweeps — the heavy descending chop.
  battleaxe: 'axe-chop',
  greataxe: 'axe-chop',
  'monk-temple-glaive': 'axe-chop',
  'bloodrage-fang': 'axe-chop',
  // Maces, hammers, flails — the ground-cracking crush.
  mace: 'crush',
  warhammer: 'crush',
  flail: 'crush',
  // Spears and hafted points — the long lance thrust.
  javelin: 'spear-thrust',
  'ironclad-banner': 'spear-thrust',
  // Quick paired steel — the double flick.
  dagger: 'dagger-flick',
  'monk-paired-kama': 'dagger-flick',
  'shadowdancer-blade': 'dagger-flick',
  // Caster implements — the indignant staff/wand bonk.
  quarterstaff: 'caster-bonk',
  'monk-war-staff': 'caster-bonk',
  'archmagi-wand': 'caster-bonk',
  'war-lute': 'caster-bonk',
  // Shapeshift natural weapons — the rending claw rake (three parallel
  // tear-lines), not a steel slash. The dragon's swing is the same language
  // grown heavy: sword-length talons and a gouge flash where the rake bites.
  'beast-claws': 'claw-rake',
  'beast-claws-elder': 'claw-rake',
  'beast-claws-primal': 'claw-rake',
  'dire-claws': 'claw-rake',
  'dire-claws-savage': 'claw-rake',
  'dire-claws-apex': 'claw-rake',
  'dragon-claws': 'dragon-rake',
};

/**
 * Pick the weapon-swing VFX kind for an attack. The base-id table above gives
 * each weapon TYPE its own identity; ranged weapons (bows, crossbows — flagged
 * `ammunition`) fire the bow-shot; anything unmapped reads off the physical
 * damage type (the original slash/pierce/bludgeon fallbacks). Elemental
 * weapons fall back to a slash so a flaming sablecane still reads as a melee
 * swing rather than a spell.
 */
export function weaponVfxKind(weapon: Weapon): SpellEffectKind {
  const byId = WEAPON_VFX_BY_ID[weapon.id];
  if (byId) return byId;
  if (weapon.properties.includes('ammunition')) return 'bow-shot';
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
