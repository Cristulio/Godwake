import { useEffect, useRef, useState, type ReactNode } from 'react';

interface TouchTooltipProps {
  /** Tooltip body — a sentence, or a rich node (e.g. an ItemTooltip). */
  content: ReactNode;
  /** The visible trigger: a chip, glyph, icon, ⓘ mark. */
  children: ReactNode;
  /** Accessible label for the trigger button. */
  label?: string;
  /** Which side the panel pops toward. Default 'top'. */
  placement?: 'top' | 'bottom';
  /** Classes applied to the trigger button (carry the chip's own styling here). */
  className?: string;
  /** Classes applied to the default text panel (ignored when `bare`). */
  panelClassName?: string;
  /**
   * Render `content` directly without the default bordered panel — use when the
   * content already is its own styled panel (ItemTooltip).
   */
  bare?: boolean;
}

/**
 * Hover/focus on desktop, tap on touch. Phones have no hover, so any number a
 * player needs to make a decision can't live behind a native title=. This
 * toggles on a touch tap, opens on mouse hover or keyboard focus, and closes
 * when the player taps anywhere else (which also dismisses it before another
 * tooltip's tap opens that one). Click/tap on the trigger never bubbles to a
 * parent handler, so an info chip on a clickable card won't also fire the card.
 */
export function TouchTooltip({
  content,
  children,
  label,
  placement = 'top',
  className = '',
  panelClassName = '',
  bare = false,
}: TouchTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  const posClass = placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {children}
      </button>
      {open &&
        (bare ? (
          <span
            role="tooltip"
            className={`absolute left-1/2 -translate-x-1/2 ${posClass} z-50 normal-case tracking-normal text-left`}
          >
            {content}
          </span>
        ) : (
          <span
            role="tooltip"
            className={`absolute left-1/2 -translate-x-1/2 ${posClass} z-50 w-52 max-w-[min(18rem,calc(100vw-1.5rem))] p-2 border-2 border-[var(--color-accent-gold)] bg-[var(--color-bg-panel)] shadow-[0_4px_16px_rgba(0,0,0,0.6)] normal-case tracking-normal text-left text-[10px] leading-snug text-[var(--color-text-secondary)] ${panelClassName}`}
          >
            {content}
          </span>
        ))}
    </span>
  );
}
