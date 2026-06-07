import { Button } from '../ui/Button';
import type { CunningActionChoice } from '../../engine/combat';
import { useT } from '../../i18n/useT';

interface CunningActionPickerProps {
  onPick: (choice: CunningActionChoice) => void;
  onCancel: () => void;
}

const OPTIONS: Array<{ choice: CunningActionChoice; labelKey: string; blurbKey: string }> = [
  { choice: 'hide', labelKey: 'combat.cunning.hide', blurbKey: 'combat.cunning.hideBlurb' },
  { choice: 'quick-strike', labelKey: 'combat.cunning.quickStrike', blurbKey: 'combat.cunning.quickStrikeBlurb' },
  { choice: 'feint', labelKey: 'combat.cunning.feint', blurbKey: 'combat.cunning.feintBlurb' },
  { choice: 'steel', labelKey: 'combat.cunning.steel', blurbKey: 'combat.cunning.steelBlurb' },
];

export function CunningActionPicker({ onPick, onCancel }: CunningActionPickerProps) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/80">
      <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-5 max-w-md w-full">
        <div className="text-[var(--color-accent-amber)] text-sm uppercase tracking-widest mb-3">
          {t('combat.cunning.title')}
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(({ choice, labelKey, blurbKey }) => (
            <button
              key={choice}
              type="button"
              onClick={() => onPick(choice)}
              className="text-left p-3 border border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)] transition-colors"
            >
              <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm">
                {t(labelKey)}
              </div>
              <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
                {t(blurbKey)}
              </div>
            </button>
          ))}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] mt-3 leading-relaxed">
          {t('combat.cunning.footer')}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onCancel}>
            {t('combat.cunning.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
