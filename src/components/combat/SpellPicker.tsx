import type { Character, SpellSlotLevel } from '../../types/character';
import type { Spell } from '../../schemas/spell';
import { getSpell } from '../../content/spells';
import { Button } from '../ui/Button';
import { canCastSpell, slotsAt } from '../../engine/combat/spells';
import { wizardSpellSlotsForLevel } from '../../engine/character/actions';

const SLOT_TIERS: SpellSlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function ordinal(n: number): string {
  switch (n) {
    case 1: return '1st';
    case 2: return '2nd';
    case 3: return '3rd';
    default: return `${n}th`;
  }
}

function spellScopeLabel(target: Spell['target']): string {
  switch (target) {
    case 'area': return 'Hits all enemies';
    case 'single': return 'Hits one enemy';
    case 'self': return 'Self only';
  }
}

interface SpellPickerProps {
  character: Character;
  /** Picked a spell to cast. Caller resolves target selection (if needed) before applying. */
  onPick: (spellId: string) => void;
  onCancel: () => void;
}

export function SpellPicker({ character, onPick, onCancel }: SpellPickerProps) {
  const known = character.resources.knownSpells ?? [];
  const maxSlots = wizardSpellSlotsForLevel(character.level);
  const slotSummary = SLOT_TIERS.filter((lvl) => (maxSlots[lvl] ?? 0) > 0)
    .map((lvl) => `${ordinal(lvl)}: ${slotsAt(character, lvl)}`)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-40 bg-[var(--color-bg-base)]/80 flex items-center justify-center p-6 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] p-5 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.3em] text-sm mb-2">
          ✦ Cast a Spell
        </div>
        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mb-3">
          Slots — {slotSummary}
        </div>
        {known.length === 0 ? (
          <div className="text-[var(--color-text-secondary)] text-sm italic mb-4">
            No spells prepared.
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {known.map((id) => {
              const spell = getSpell(id);
              const check = canCastSpell(character, id);
              const ok = check.ok;
              const slotLabel =
                spell.level === 0
                  ? 'Cantrip · at-will'
                  : `Level ${spell.level} · costs 1 slot`;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!ok}
                  onClick={() => onPick(id)}
                  className={`text-left p-3 border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    ok
                      ? 'border-[var(--color-border-warm)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'
                      : 'border-[var(--color-border-dim)]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold">
                      {spell.name}
                    </div>
                    <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest shrink-0">
                      {slotLabel}
                    </div>
                  </div>
                  <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
                    {spell.description}
                  </div>
                  <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-2">
                    {spell.school} · {spellScopeLabel(spell.target)}
                    {!ok && check.ok === false && (
                      <span className="ml-2 text-[var(--color-accent-blood)]">
                        — {check.reason}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
