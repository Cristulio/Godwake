import { useEffect, useRef, useSyncExternalStore } from 'react';

// Self-contained "a blocking modal is open" signal. Every modal that mounts
// useInputBlock counts toward it; while the count is above zero the game must
// not auto-advance (auto-end-turn, auto-battle, monster turns) behind the
// modal. Kept here rather than in screenStore so the tutorial-queue lane can
// touch that store without colliding with this signal.
let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isBlockingModalOpen(): boolean {
  return openCount > 0;
}

/** Reactive read of the shared signal — re-renders when it flips. */
export function useBlockingModalOpen(): boolean {
  return useSyncExternalStore(subscribe, isBlockingModalOpen, isBlockingModalOpen);
}

/**
 * Makes a mounted modal truly blocking. Returns a ref to attach to the
 * full-screen overlay container (give it `tabIndex={-1}`): on mount the
 * container takes focus, keyboard events aimed anywhere outside it are
 * swallowed in the capture phase so the window-level key listeners on the
 * game screen behind it never fire, and body scroll is locked. While mounted
 * it also raises the shared "blocking modal open" signal so auto-mode timers
 * pause until it closes.
 *
 * Pair with a `fixed inset-0` overlay so pointer events can't reach the game
 * either. Dismissal must then be an explicit in-modal action — there is no
 * backdrop or keyboard bypass.
 */
export function useInputBlock<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    node?.focus?.();

    openCount += 1;
    emit();

    const swallow = (e: KeyboardEvent) => {
      if (node && node.contains(e.target as Node)) return;
      e.stopPropagation();
    };
    window.addEventListener('keydown', swallow, true);
    window.addEventListener('keyup', swallow, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', swallow, true);
      window.removeEventListener('keyup', swallow, true);
      document.body.style.overflow = prevOverflow;
      openCount = Math.max(0, openCount - 1);
      emit();
    };
  }, []);

  return ref;
}
