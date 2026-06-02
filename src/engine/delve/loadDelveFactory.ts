import type { createGodwakeDelve } from './createDelve';

/**
 * The delve content graph (chapter pools + bestiary + events) is code-split
 * out of the initial bundle (see [[dd-roguelite-2026-06-01-bundle-codesplit-lane]])
 * and pulled in on descend via a dynamic import. Cloudflare Pages redeploys
 * often, so a player sitting on an old tab can request a now-404'd chunk hash:
 * the import rejects in an async event handler, ErrorBoundary never sees it,
 * and descend silently does nothing.
 *
 * This is the single guarded entry point. On a load failure it recovers by
 * reloading the page — a fresh load fetches the current deploy's chunk, and
 * since meta/soul state is persisted and the delve is session-only (and being
 * started fresh anyway), a reload-then-redescend loses nothing.
 */
const RELOAD_FLAG = 'godwake-chunk-reload';

function recoverFromStaleChunk(): void {
  if (typeof window === 'undefined') return;
  // Guard against a reload loop if the chunk is genuinely gone rather than
  // merely stale: only auto-reload once per session until a load succeeds.
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // sessionStorage unavailable — fall through to a single reload attempt.
  }
  window.location.reload();
}

/**
 * Resolve the delve factory, loading its code-split chunk. Returns the factory
 * on success, or `null` when the chunk failed to load — in which case a
 * recovery reload has already been triggered and the caller must not proceed.
 */
export async function loadDelveFactory(): Promise<typeof createGodwakeDelve | null> {
  try {
    const mod = await import('./createDelve');
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      // ignore — recovery flag is best-effort
    }
    return mod.createGodwakeDelve;
  } catch {
    recoverFromStaleChunk();
    return null;
  }
}
