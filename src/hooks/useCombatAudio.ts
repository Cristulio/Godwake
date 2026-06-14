import { useEffect } from 'react';
import { useCombatStore } from '../stores/combatStore';
import { bumpMusicIntensity, playSfx, type SfxId } from '../engine/audio';
import type { SpellEffectKind, SpellElement } from '../types/combat';

/**
 * Maps every battlefield VFX event to a sound. The `spellEffectEvent` bus
 * already carries spell casts, class-ability signatures, and enemy abilities,
 * so reacting to it covers the half of combat that the attack-roll path
 * (DiceRollOverlay swing/hit/crit/miss + damage.ts monster_death) does not.
 *
 * Weapon-swing kinds (slash/pierce/bludgeon/arrow/multiattack-flurry) are
 * deliberately absent: those already sound via `playerAttack`/DiceRollOverlay,
 * and adding them here would double up.
 */
const SPELL_EFFECT_SFX: Partial<Record<SpellEffectKind, SfxId>> = {
  // Bespoke spell casts. The element-aware SHAPE kinds (spell-bolt / spell-burst
  // / spell-fork / spell-drain) are deliberately absent — they resolve by
  // `element` below so a fire bolt cracks, a cold blast chimes, a fork zaps.
  'magic-missile': 'spell_arcane',
  // Druid at-wills: their own nature look, but lean on the existing fire/arcane
  // cues so the cast still sounds right (no bespoke nature SFX in the bank).
  'nature-flame': 'spell_fire',
  'thorn-lash': 'spell_arcane',
  'misty-step': 'spell_arcane',
  'mage-armor': 'spell_arcane',
  'burning-hands': 'spell_fire',
  shield: 'armor_clang',
  'hold-person': 'spell_debuff',
  // Class-ability signatures.
  rage: 'buff_surge',
  reckless: 'buff_surge',
  'hunters-mark': 'buff_surge',
  colossus: 'buff_surge',
  'cunning-action': 'buff_surge',
  'action-surge': 'buff_surge',
  'second-wind': 'second_wind',
  // Monk ki spends + control landings (animations-revamp). The weapon-swing
  // kinds (unarmed/axe-chop/crush/...) stay absent like slash/pierce — the
  // attack path already sounds them via swingSfxForWeapon.
  'ki-charge': 'buff_surge',
  'stun-burst': 'spell_debuff',
  // A martial DISRUPT landing (staggering strike topple) — the same control-took-
  // hold cue as the monk's stun, so a knockdown is never silent.
  'knockdown-burst': 'spell_debuff',
  // Enemy abilities.
  'enemy-summon': 'enemy_cast',
  'enemy-frenzy': 'boss_phase',
  'debuff-poison': 'spell_debuff',
  'debuff-frighten': 'spell_ice',
  'debuff-blind': 'spell_debuff',
  'debuff-weaken': 'spell_debuff',
  'debuff-restrain': 'spell_debuff',
  'sustain-heal': 'spell_holy',
  'sustain-ward': 'armor_clang',
  'sustain-drain': 'spell_debuff',
  // Signature cues that were shipping silent (audio sweep): the Bard's always-on
  // Song pulse, the Druid's Regrowth heal + Spirit Beast summon.
  'song-pulse': 'shrine_chime',
  regrowth: 'spell_holy',
  'summon-beast': 'enemy_cast',
};

/** SFX for the element-aware shape kinds, keyed off the cast's element. */
const ELEMENT_SFX: Record<SpellElement, SfxId> = {
  fire: 'spell_fire',
  cold: 'spell_ice',
  lightning: 'spell_lightning',
  thunder: 'spell_lightning',
  acid: 'spell_debuff',
  poison: 'spell_debuff',
  necrotic: 'spell_necrotic',
  radiant: 'spell_holy',
  force: 'spell_arcane',
};

/**
 * Resolve the SFX for a VFX event. Bespoke kinds map directly; the shape kinds
 * (spell-bolt / spell-burst / spell-fork / spell-drain) carry no fixed sound and
 * fall back to their `element` so the audio stays element-flavored. Exported for
 * testing.
 */
export function sfxForSpellEffect(kind: SpellEffectKind, element?: SpellElement): SfxId | undefined {
  return SPELL_EFFECT_SFX[kind] ?? (element ? ELEMENT_SFX[element] : undefined);
}

/**
 * Subscribe-and-play audio reaction. Mount once near the app root. Reads the
 * combat store directly (never touches CombatScreen's JSX) so it stays disjoint
 * from the combat-visuals lane and keeps firing across every screen.
 */
export function useCombatAudio(): void {
  useEffect(() => {
    let lastEventId = useCombatStore.getState().combat?.spellEffectEvent?.id ?? 0;
    const unsub = useCombatStore.subscribe((state) => {
      const event = state.combat?.spellEffectEvent;
      if (!event || event.id === lastEventId) return;
      lastEventId = event.id;
      const sfx = sfxForSpellEffect(event.kind, event.element);
      if (sfx) playSfx(sfx);
      // A boss refusing to fall raises the arrangement a layer.
      if (event.kind === 'enemy-frenzy') bumpMusicIntensity();
    });
    return unsub;
  }, []);
}
