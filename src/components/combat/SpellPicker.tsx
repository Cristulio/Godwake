import type { Character, SpellSlotLevel } from '../../types/character';
import type { Spell } from '../../schemas/spell';
import { getSpell } from '../../content/spells';
import { Button } from '../ui/Button';
import { canCastSpell, slotsAt } from '../../engine/combat/spells';
import { wizardSpellSlotsForLevel } from '../../engine/character/actions';
import { useT } from '../../i18n/useT';

const SLOT_TIERS: SpellSlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function ordinal(n: number): string {
  switch (n) {
    case 1: return '1st';
    case 2: return '2nd';
    case 3: return '3rd';
    default: return `${n}th`;
  }
}

interface SpellPickerProps {
  character: Character;
  /** Picked a spell to cast. Caller resolves target selection (if needed) before applying. */
  onPick: (spellId: string) => void;
  onCancel: () => void;
}

export function SpellPicker({ character, onPick, onCancel }: SpellPickerProps) {
  const { t, tc } = useT();
  const spellScopeLabel = (target: Spell['target']): string => {
    switch (target) {
      case 'area': return t('ui.combat.hitsAll');
      case 'single': return t('ui.combat.hitsOne');
      case 'self': return t('ui.combat.selfOnly');
    }
  };
  const maxSlots = wizardSpellSlotsForLevel(character.level);
  // Only surface spells the character can actually cast at this level: cantrips
  // always, leveled spells once their slot tier has opened. Higher-tier spells
  // sitting in the book (e.g. Hold Person known from L1) stay hidden until the
  // slot exists — they appear, greyed for "no slot remaining", only once real.
  const known = (character.resources.knownSpells ?? []).filter((id) => {
    // Entangling Roots has its own dedicated bonus-action button in the
    // ActionBar — keep it out of the Spells list so it isn't a confusing
    // double-entry.
    if (id === 'entangling-roots') return false;
    const spell = getSpell(id);
    return spell.level === 0 || (maxSlots[spell.level as SpellSlotLevel] ?? 0) > 0;
  });
  const slotSummary = SLOT_TIERS.filter((lvl) => (maxSlots[lvl] ?? 0) > 0)
    .map((lvl) => `${ordinal(lvl)}: ${slotsAt(character, lvl)}`)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-40 bg-[var(--color-bg-base)]/80 flex items-center justify-center p-6 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] p-5 max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0">
          <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.3em] text-sm mb-2">
            ✦ {t('ui.combat.castSpell')}
          </div>
          <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mb-3">
            {t('ui.combat.slots', { summary: slotSummary })}
          </div>
        </div>
        {known.length === 0 ? (
          <div className="text-[var(--color-text-secondary)] text-sm italic mb-4">
            {t('ui.combat.noSpellsPrepared')}
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4 flex-1 overflow-y-auto min-h-0 -mr-2 pr-2">
            {known.map((id) => {
              const spell = getSpell(id);
              const check = canCastSpell(character, id);
              const ok = check.ok;
              const slotLabel =
                spell.level === 0
                  ? t('ui.combat.cantripAtWill')
                  : t('ui.combat.spellSlotCost', { level: spell.level });
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
                      {tc('spells', spell.id, 'name', spell.name)}
                    </div>
                    <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest shrink-0">
                      {slotLabel}
                    </div>
                  </div>
                  <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
                    {tc('spells', spell.id, 'description', spell.description)}
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
        <div className="flex justify-end shrink-0">
          <Button variant="secondary" onClick={onCancel}>
            {t('ui.common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
