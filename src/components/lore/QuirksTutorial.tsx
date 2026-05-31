import { Button } from '../ui/Button';

interface QuirksTutorialProps {
  onDismiss: () => void;
}

/**
 * Shown once, after the player's first reincarnation. Explains the quirk
 * system so the new badges in the hub make sense.
 */
export function QuirksTutorial({ onDismiss }: QuirksTutorialProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/85 p-4 animate-fade-in"
      onClick={onDismiss}
    >
      <div
        className="max-w-xl w-full bg-[#1a140e] border-2 border-[var(--color-accent-amber)] shadow-[0_0_32px_rgba(244,167,66,0.35)] p-5 md:p-7 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.4em] font-bold mb-3">
          ◆ The Druid Speaks
        </div>
        <h2 className="text-[var(--color-text-primary)] text-xl uppercase tracking-wider mb-3">
          Quirks
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
          The grove returns your soul, but never the same flesh twice. Each life carries{' '}
          <span className="text-[var(--color-accent-amber)] font-bold">Quirks</span> — small gifts
          and small curses that came with you out of the dark.
        </p>
        <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] p-3 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-status-poison)] text-[var(--color-status-poison)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              Boon
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              A gift — something that helps you.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              Bane
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              A burden — something that hinders you.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest px-1.5 py-0.5">
              Odd
            </span>
            <span className="text-[var(--color-text-secondary)] text-xs">
              Neither — a trade, a twist, a strangeness.
            </span>
          </div>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed mb-4">
          Your quirks are listed in the hub above the buildings. Every death rolls a new set —
          your soul does not forget the dying, only the dead.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onDismiss}>
            I understand
          </Button>
        </div>
      </div>
    </div>
  );
}
