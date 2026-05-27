import { Button } from '../ui/Button';
import type { CunningActionChoice } from '../../engine/combat';

interface CunningActionPickerProps {
  onPick: (choice: CunningActionChoice) => void;
  onCancel: () => void;
}

const OPTIONS: Array<{ choice: CunningActionChoice; label: string; blurb: string }> = [
  {
    choice: 'hide',
    label: 'Hide',
    blurb: 'Slip into the shadow. Your next attack rolls with advantage.',
  },
  {
    choice: 'disengage',
    label: 'Disengage',
    blurb: 'Twist out of the way. The next incoming hit deals 2 less damage.',
  },
  {
    choice: 'dash',
    label: 'Dash',
    blurb: 'Surge forward — take a quick second strike this turn (no Sneak Attack on the second).',
  },
];

export function CunningActionPicker({ onPick, onCancel }: CunningActionPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/80">
      <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-5 max-w-md w-full">
        <div className="text-[var(--color-accent-amber)] text-sm uppercase tracking-widest mb-3">
          Cunning Action
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(({ choice, label, blurb }) => (
            <button
              key={choice}
              type="button"
              onClick={() => onPick(choice)}
              className="text-left p-3 border border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)] transition-colors"
            >
              <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm">
                {label}
              </div>
              <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
                {blurb}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
