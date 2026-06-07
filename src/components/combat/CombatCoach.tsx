import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { ClassId } from '../../schemas/ids';
import { STARTER_CLASSES } from '../../engine/progression/unlocks';
import { COMBAT_INTRO_TUTORIAL_ID } from '../../content/tutorials';
import { useT } from '../../i18n/useT';

/**
 * The first-combat coach: a one-time spotlight/coachmark overlay that teaches a
 * brand-new player the core loop (Attack → pick a target → where the class
 * actions live). It is a SEPARATE system from the tutorialQueue reveal cards —
 * this one paints a dim mask with a cutout over the live combat UI and advances
 * off the player's own taps. Gentle by design: the spotlighted control stays
 * fully interactive, nothing is keyboard-trapped, and Skip is always present.
 */

export type CoachStep = 'attack' | 'target' | 'abilities';

/** The bits of meta + context the first-combat gate reads. */
export interface CombatIntroGate {
  hasReincarnated: boolean;
  seenTutorials: string[];
  classId: ClassId;
  scene: 'combat' | 'boss';
}

/**
 * Should the first-combat coach fire? ONCE, on a brand-new soul's first-ever
 * life (`!hasReincarnated`), in a normal combat (not a boss), while wearing a
 * starter body (a fresh soul always is), and only until the seen-flag is set —
 * which the coach writes on dismiss so it never repeats across reincarnations
 * or class swaps. "First combat" falls out of the seen-flag: it is written the
 * first time the coach completes, so later fights in the same life never re-show.
 */
export function combatIntroEligible(gate: CombatIntroGate): boolean {
  return (
    !gate.hasReincarnated &&
    gate.scene === 'combat' &&
    STARTER_CLASSES.includes(gate.classId) &&
    !gate.seenTutorials.includes(COMBAT_INTRO_TUTORIAL_ID)
  );
}

const SELECTOR: Record<CoachStep, string> = {
  attack: '[data-tutorial="attack"]',
  target: '[data-tutorial="targets"]',
  abilities: '[data-tutorial="abilities"]',
};

const PROMPT_KEY: Record<CoachStep, string> = {
  attack: 'combat.coach.attack',
  target: 'combat.coach.target',
  abilities: 'combat.coach.abilities',
};

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Padding baked around the target so the cutout never clips the control. */
const PAD = 10;

/** The viewport bounding box enclosing every element matching the selector. */
export function unionBox(els: Element[]): Box | null {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(top)) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/** The padded cutout rectangle, in viewport pixels, clamped to the screen. */
export interface Spotlight {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  h: number;
}

/**
 * Resolve the cutout geometry from the target box, or null when masking would
 * be unsafe. The coach must NEVER trap the screen, so a null/zero-area/wholly-
 * offscreen target yields null — the caller then renders no blocking overlay
 * rather than a full-screen dim with the hole out of view. When the target is
 * present the cutout is its rect grown by PAD and clamped to the viewport, so
 * the hole always sits over the live control and the dim panels never cover it.
 */
export function spotlightGeometry(box: Box | null, vw: number, vh: number): Spotlight | null {
  if (!box) return null;
  if (box.width <= 0 || box.height <= 0) return null;
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  if (box.left >= vw || box.top >= vh || right <= 0 || bottom <= 0) return null;
  const x0 = Math.max(0, box.left - PAD);
  const y0 = Math.max(0, box.top - PAD);
  const x1 = Math.min(vw, right + PAD);
  const y1 = Math.min(vh, bottom + PAD);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function boxChanged(a: Box | null, b: Box | null): boolean {
  if ((a == null) !== (b == null)) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) > 0.5 ||
    Math.abs(a.left - b.left) > 0.5 ||
    Math.abs(a.width - b.width) > 0.5 ||
    Math.abs(a.height - b.height) > 0.5
  );
}

interface CombatCoachProps {
  step: CoachStep;
  /** Abandon the coach entirely (Skip) — marks it seen, never re-shows. */
  onSkip: () => void;
  /** Acknowledge the informational final step ("Got it"). */
  onDismiss: () => void;
}

export function CombatCoach({ step, onSkip, onDismiss }: CombatCoachProps) {
  const { t } = useT();
  const [box, setBox] = useState<Box | null>(null);
  const boxRef = useRef<Box | null>(null);
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const selector = SELECTOR[step];
  // Track the target's live rect with a rAF loop (cheap, change-gated) so the
  // cutout follows layout shifts from resize, scroll, the battlefield's mobile
  // scale transform, and sprite motion without juggling listeners.
  useLayoutEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = unionBox(Array.from(document.querySelectorAll(selector)));
      if (boxChanged(boxRef.current, next)) {
        boxRef.current = next;
        setBox(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [selector]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  // Fail-safe: a missing, zero-area, or offscreen target yields no geometry, so
  // the coach renders nothing blocking rather than dimming the screen with the
  // hole out of view. The player is never trapped.
  const spot = spotlightGeometry(box, vw, vh);
  if (!spot) return null;
  const { x0, y0, x1, y1, w, h } = spot;

  // Put the bubble on the side of the cutout with more room: above a low
  // control (the action bar), below a high one (the battlefield).
  const placeAbove = y0 > vh * 0.5;
  const bubblePos: CSSProperties = placeAbove
    ? { bottom: Math.max(8, vh - y0 + 12) }
    : { top: y1 + 12 };

  const dimPanel = 'absolute bg-black/70 pointer-events-auto';

  const overlay = (
    <div className="fixed inset-0 z-[60] pointer-events-none" role="dialog" aria-label={t('combat.coach.tutorialLabel')}>
      {/* Four dim panels frame the cutout and absorb stray taps, gently funnel-
          ing attention to the lit control. The hole itself is left uncovered so
          taps reach the real button beneath. */}
      <div className={dimPanel} style={{ top: 0, left: 0, right: 0, height: y0 }} />
      <div className={dimPanel} style={{ top: y1, left: 0, right: 0, bottom: 0 }} />
      <div className={dimPanel} style={{ top: y0, left: 0, width: x0, height: h }} />
      <div className={dimPanel} style={{ top: y0, left: x1, right: 0, height: h }} />

      {/* Highlight ring — pointer-events-none keeps the control beneath live. */}
      <div
        className={`absolute pointer-events-none border-2 border-[var(--color-accent-amber)] ${
          reduced ? '' : 'animate-pulse-glow'
        }`}
        style={{
          top: y0,
          left: x0,
          width: w,
          height: h,
          borderRadius: 8,
          boxShadow: '0 0 0 2px rgba(244,167,66,0.35), 0 0 22px 4px rgba(244,167,66,0.3)',
        }}
      />

      {/* Prompt bubble */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[min(20rem,90vw)] pointer-events-auto
          bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] px-4 py-3 text-center
          shadow-[0_6px_28px_rgba(0,0,0,0.65)] ${reduced ? '' : 'animate-fade-in'}`}
        style={bubblePos}
        aria-live="polite"
      >
        <p className="text-[var(--color-text-primary)] text-sm leading-snug">{t(PROMPT_KEY[step])}</p>
        <div className="flex items-center justify-center gap-3 mt-2.5">
          {step === 'abilities' && (
            <button
              type="button"
              onClick={onDismiss}
              className="btn-chunky border-2 px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold
                bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]"
            >
              {t('combat.coach.gotIt')}
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]
              hover:text-[var(--color-accent-amber)] transition-colors"
          >
            {t('combat.coach.skip')}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the fixed overlay is positioned against the viewport,
  // not a transformed ancestor. CombatScreen's root carries a persisted
  // transform (animate-room-enter's forwards fill, plus animate-shake while it
  // plays); a transformed ancestor becomes the containing block for fixed
  // descendants, which would skew every getBoundingClientRect-derived coord and
  // slide the cutout off the control.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}
