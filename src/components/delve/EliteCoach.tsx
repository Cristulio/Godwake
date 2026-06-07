import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useMetaStore } from '../../stores/metaStore';
import { ELITE_INTRO_TUTORIAL_ID } from '../../content/tutorials';
import { useT } from '../../i18n/useT';
import {
  unionBox,
  spotlightGeometry,
  type Box,
} from '../combat/CombatCoach';

/**
 * The first-elite coach: a one-time spotlight/coachmark that points a brand-new
 * soul at the first SELECTABLE elite node on the route map, mirroring the
 * first-combat coach (CombatCoach) but for the map instead of the Attack button.
 * It reuses CombatCoach's cutout geometry (a dim mask with a hole over the live
 * node, tracked from getBoundingClientRect) and portals to <body>.
 *
 * Two deliberate differences from the combat coach: it is GENTLER — the dim
 * panels are pointer-events-none so the player can still click ANY node (the
 * coach never blocks the route choice) — and it is a single informational beat
 * rather than a multi-step walkthrough.
 */

/** What the first-elite gate reads. */
export interface EliteIntroGate {
  hasReincarnated: boolean;
  seenTutorials: string[];
  /** True when a reachable, unlocked elite node is on the current map. */
  hasSelectableElite: boolean;
}

/**
 * Should the first-elite coach fire? ONCE, on a brand-new soul's first-ever life
 * (`!hasReincarnated`), only while a SELECTABLE elite is on the route, and only
 * until the seen-flag is set — which the coach writes the moment it activates
 * (see useEliteIntroCoach), so it is strictly one-time and never reappears on a
 * later map even if the player never explicitly dismissed it.
 */
export function eliteIntroEligible(gate: EliteIntroGate): boolean {
  return (
    !gate.hasReincarnated &&
    gate.hasSelectableElite &&
    !gate.seenTutorials.includes(ELITE_INTRO_TUTORIAL_ID)
  );
}

/**
 * Drives the one-time first-elite coach off whether a selectable elite is on the
 * map. The moment the gate first passes, it locks (a fight can't re-arm it this
 * mount), shows the overlay, AND writes the seen-flag — NOT only on dismiss.
 *
 * That write-on-activate is the #417 lesson: the combat coach once wrote its
 * flag only on explicit Skip/Dismiss, so a player who simply moved on left it
 * unset and the coach re-appeared. Marking seen on activation makes a later map
 * (a fresh DelveMap mount) ineligible whether or not this one was dismissed.
 */
export function useEliteIntroCoach(hasSelectableElite: boolean): {
  active: boolean;
  dismiss: () => void;
} {
  const [active, setActive] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    if (locked.current) return;
    const eligible = eliteIntroEligible({
      hasReincarnated: useMetaStore.getState().hasReincarnated,
      seenTutorials: useMetaStore.getState().seenTutorials,
      hasSelectableElite,
    });
    if (eligible) {
      locked.current = true;
      setActive(true);
      useMetaStore.getState().markTutorialSeen(ELITE_INTRO_TUTORIAL_ID);
    }
  }, [hasSelectableElite]);
  return { active, dismiss: () => setActive(false) };
}

const SELECTOR = '[data-tutorial="elite"]';

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

interface EliteCoachProps {
  /** Acknowledge / skip — hides the overlay. Seen is already written on activate. */
  onDismiss: () => void;
}

export function EliteCoach({ onDismiss }: EliteCoachProps) {
  const { t } = useT();
  const [box, setBox] = useState<Box | null>(null);
  const boxRef = useRef<Box | null>(null);
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Track the elite node's live rect with a cheap, change-gated rAF loop so the
  // cutout follows layout shifts (resize, scroll, hover growth) without juggling
  // listeners — same approach as CombatCoach.
  useLayoutEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = unionBox(Array.from(document.querySelectorAll(SELECTOR)));
      if (boxChanged(boxRef.current, next)) {
        boxRef.current = next;
        setBox(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  // Fail-safe: a missing / zero-area / offscreen elite yields no geometry, so the
  // coach renders nothing rather than dimming the screen with the hole out of
  // view (e.g. mid route-transition). The player is never trapped.
  const spot = spotlightGeometry(box, vw, vh);
  if (!spot) return null;
  const { x0, y0, x1, y1, w, h } = spot;

  const placeAbove = y0 > vh * 0.5;
  const bubblePos: CSSProperties = placeAbove
    ? { bottom: Math.max(8, vh - y0 + 12) }
    : { top: y1 + 12 };

  // pointer-events-none on the dim panels: the coach is purely visual and must
  // NOT block selecting the elite — or any other — node. Only the bubble's
  // buttons capture taps.
  const dimPanel = 'absolute bg-black/55 pointer-events-none';

  const overlay = (
    <div className="fixed inset-0 z-[60] pointer-events-none" role="dialog" aria-label={t('delve.coach.aria')}>
      <div className={dimPanel} style={{ top: 0, left: 0, right: 0, height: y0 }} />
      <div className={dimPanel} style={{ top: y1, left: 0, right: 0, bottom: 0 }} />
      <div className={dimPanel} style={{ top: y0, left: 0, width: x0, height: h }} />
      <div className={dimPanel} style={{ top: y0, left: x1, right: 0, height: h }} />

      {/* Highlight ring around the elite node. */}
      <div
        className={`absolute pointer-events-none border-2 border-[var(--color-accent-blood)] ${
          reduced ? '' : 'animate-pulse-glow'
        }`}
        style={{
          top: y0,
          left: x0,
          width: w,
          height: h,
          borderRadius: 10,
          boxShadow: '0 0 0 2px rgba(167,42,42,0.4), 0 0 22px 4px rgba(167,42,42,0.32)',
        }}
      />

      {/* Prompt bubble */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[min(22rem,90vw)] pointer-events-auto
          bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-blood)] px-4 py-3 text-center
          shadow-[0_6px_28px_rgba(0,0,0,0.65)] ${reduced ? '' : 'animate-fade-in'}`}
        style={bubblePos}
        aria-live="polite"
      >
        <p className="text-[var(--color-text-primary)] text-sm leading-snug">{t('delve.coach.copy')}</p>
        <div className="flex items-center justify-center gap-3 mt-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className="btn-chunky border-2 px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold
              bg-[var(--color-accent-blood)] text-[var(--color-bg-base)] border-[var(--color-accent-deep-blood)]"
          >
            {t('delve.coach.gotIt')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]
              hover:text-[var(--color-accent-blood)] transition-colors"
          >
            {t('delve.coach.skip')}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body>: DelveMap's map frame uses transforms (mobile scale,
  // animate-fade-in), and a transformed ancestor becomes the containing block
  // for fixed descendants, which would skew the getBoundingClientRect-derived
  // cutout. Same reason CombatCoach portals.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}
