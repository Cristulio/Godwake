import type { Character } from '../../types/character';
import { spellAttackBonus, spellSaveDC } from '../../engine/combat/spells';

interface SpellHUDProps {
  character: Character;
}

export function SpellHUD({ character }: SpellHUDProps) {
  if (character.classId !== 'wizard') return null;

  const atk = spellAttackBonus(character);
  const dc = spellSaveDC(character);
  const atkLabel = atk >= 0 ? `+${atk}` : `${atk}`;

  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] font-bold">
      <span className="font-display text-[var(--color-accent-gold)] text-[9px] tracking-[0.25em]">
        ✦ Caster
      </span>
      <span
        className="px-2.5 py-1 border-2 bg-[var(--color-bg-panel)] border-[var(--color-accent-gold)] text-[var(--color-accent-amber)] tabular-nums"
        title="Cantrip / spell attack bonus: INT mod + proficiency + Grove bonuses."
      >
        Spell Attack: {atkLabel}
      </span>
      <span
        className="px-2.5 py-1 border-2 bg-[var(--color-bg-panel)] border-[var(--color-accent-gold)] text-[var(--color-accent-amber)] tabular-nums"
        title="Save DC enemies roll against: 8 + INT mod + proficiency + Grove bonuses (+1 Focused Casting for wizards)."
      >
        Spell Save DC: {dc}
      </span>
    </div>
  );
}
