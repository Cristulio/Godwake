import { Button } from '../ui/Button';
import { getTutorial } from '../../content/tutorials';

interface UnlockTutorialCardProps {
  /** The feature id that just unlocked — also its seenTutorials key. */
  featureId: string;
  onDismiss: () => void;
}

/**
 * One-time reveal card shown the moment a gated feature unlocks. Mechanical
 * teaching (what it is, how to use it) in the 8-bit dark hub style. A single
 * "Got it" dismiss; the trigger marks it seen so it never replays.
 */
export function UnlockTutorialCard({ featureId, onDismiss }: UnlockTutorialCardProps) {
  const tutorial = getTutorial(featureId);
  // Defensive: an unknown id has no copy to show — dismiss rather than wedge.
  if (!tutorial) {
    onDismiss();
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/85 p-4 animate-fade-in"
      onClick={onDismiss}
    >
      <div
        className="max-w-xl w-full bg-[#1a140e] border-2 border-[var(--color-accent-amber)] shadow-[0_0_32px_rgba(244,167,66,0.35)] p-5 md:p-7 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.4em] font-bold mb-3 animate-pulse-glow">
          ◆ New — Unlocked
        </div>
        <h2 className="text-[var(--color-text-primary)] text-xl uppercase tracking-wider mb-4">
          {tutorial.title}
        </h2>
        {tutorial.body.map((para, i) => (
          <p
            key={i}
            className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3"
          >
            {para}
          </p>
        ))}
        <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-accent-gold)]/50 p-3 mb-4 flex items-start gap-2">
          <span className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest font-bold shrink-0 mt-0.5">
            Key
          </span>
          <span className="text-[var(--color-text-primary)] text-sm leading-relaxed">
            {tutorial.key}
          </span>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onDismiss}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
