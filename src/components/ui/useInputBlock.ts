import { useEffect, useRef } from 'react';

/**
 * Makes a mounted modal truly blocking. Returns a ref to attach to the
 * full-screen overlay container (give it `tabIndex={-1}`): on mount the
 * container takes focus, keyboard events aimed anywhere outside it are
 * swallowed in the capture phase so the window-level key listeners on the
 * game screen behind it never fire, and body scroll is locked.
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
    };
  }, []);

  return ref;
}
