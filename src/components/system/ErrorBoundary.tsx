import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  /** True when this error is a recoverable chunk failure we're auto-reloading for. */
  reloading: boolean;
}

/**
 * Session guard shared with engine/delve/loadDelveFactory: a single auto-reload
 * across BOTH render-time chunk failures (caught here) and imperative dynamic
 * imports (loadDelveFactory). Set just before a reload, cleared on a confirmed
 * healthy load — so we self-heal a stale deploy without ever looping.
 */
const RELOAD_FLAG = 'godwake-chunk-reload';
/** A clean render lasting this long counts as a successful load → re-arm the guard. */
const HEALTHY_LOAD_MS = 5000;

/**
 * A code-split chunk that 404s after a redeploy (the player sat on an old tab)
 * surfaces as one of these. They are RECOVERABLE — a reload fetches the current
 * build — so we never want to dump the player on the manual error screen for them.
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const haystack = `${error.name} ${error.message}`.toLowerCase();
  return (
    haystack.includes('mime type') || // "'text/html' is not a valid JavaScript MIME type"
    haystack.includes('loading chunk') ||
    haystack.includes('chunkloaderror') ||
    haystack.includes('failed to fetch dynamically imported module') ||
    haystack.includes('error loading dynamically imported module') ||
    haystack.includes('importing a module script failed') // Safari's phrasing
  );
}

function readReloadFlag(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) != null;
  } catch {
    return false;
  }
}
function writeReloadFlag(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // ignore — best-effort guard; a single reload still beats a hard crash
  }
}
function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // ignore
  }
}

/**
 * Top-level error boundary. A render-time throw anywhere below this lands here
 * instead of taking down the whole tree.
 *
 * Two recovery paths:
 *  - A stale-chunk / dynamic-import failure (a deploy landed while the tab was
 *    open) is recoverable: auto-reload ONCE to fetch the current build. Guarded
 *    by a sessionStorage flag so it can never loop — a second failure after the
 *    reload falls through to the manual screen.
 *  - Anything else gets the manual "wheel slipped" screen: reload, or wipe save
 *    + reload. We don't know which state is corrupted, so less destructive
 *    recovery isn't safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, reloading: false };
  private healthyTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Decide the recovery path up front (before componentDidCatch) so the first
    // render after the throw never flashes the scary manual screen during an
    // auto-reload. First chunk failure this session → we will reload.
    const reloading = isChunkLoadError(error) && !readReloadFlag();
    return { error, componentStack: null, reloading };
  }

  componentDidMount() {
    // A render that survives this long is a successful load — clear the guard so
    // a LATER deploy can auto-reload again. If a chunk throws first, we'll have
    // reloaded (page gone) or shown the manual screen; either way no loop.
    this.healthyTimer = setTimeout(clearReloadFlag, HEALTHY_LOAD_MS);
  }

  componentWillUnmount() {
    if (this.healthyTimer) clearTimeout(this.healthyTimer);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Render failed:', error, info);
    this.setState({ componentStack: info.componentStack ?? null });
    if (isChunkLoadError(error) && !readReloadFlag()) {
      writeReloadFlag();
      window.location.reload();
    }
  }

  reload = () => {
    window.location.reload();
  };

  wipeAndReload = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('godwake-')) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore — even if wipe fails, reload still tries
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    // Recoverable stale-chunk failure: a reload is already in flight. Show a calm
    // in-world beat instead of the alarm screen — the page is about to refresh.
    if (this.state.reloading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-2xl mx-auto gap-5 text-center">
          <div
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] uppercase tracking-[0.3em] animate-pulse"
            style={{ textShadow: '0 0 24px rgba(244,167,66,0.5), 4px 4px 0 rgba(0,0,0,0.9)' }}
          >
            ◆ The wheel turns ◆
          </div>
          <p className="font-narrative italic text-[var(--color-text-secondary)] text-base leading-relaxed">
            The world has been remade beneath your feet. Drawing the soul through to
            the new shape of things…
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-2xl mx-auto gap-6 text-center">
        <div
          className="font-display text-3xl md:text-4xl text-[var(--color-accent-blood)] uppercase tracking-[0.3em]"
          style={{ textShadow: '0 0 24px rgba(200,51,46,0.6), 4px 4px 0 rgba(0,0,0,0.9)' }}
        >
          ✗ The Wheel Slipped ✗
        </div>
        <p className="font-narrative italic text-[var(--color-text-secondary)] text-base leading-relaxed">
          Something tore loose between the soul and the flesh. The Grove cannot fix this one
          itself.
        </p>
        <div className="panel-etched border border-[var(--color-border-warm)] p-4 font-mono text-xs text-[var(--color-text-dim)] text-left w-full max-h-48 overflow-auto">
          <div className="text-[var(--color-accent-blood)] mb-2 font-display uppercase tracking-widest text-[10px]">
            {this.state.error.name}
          </div>
          <div className="break-words">{this.state.error.message}</div>
          {this.state.componentStack && (
            <pre className="mt-2 text-[10px] opacity-60 whitespace-pre-wrap">
              {this.state.componentStack.split('\n').slice(0, 6).join('\n')}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={this.reload}
            className="btn-chunky border-2 border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-panel-hover)] px-4 py-2 uppercase tracking-wider text-sm font-bold"
          >
            ↻ Reload
          </button>
          <button
            onClick={this.wipeAndReload}
            className="btn-chunky border-2 border-[var(--color-accent-blood)] bg-[var(--color-accent-deep-blood)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-blood)] px-4 py-2 uppercase tracking-wider text-sm font-bold"
          >
            ⚠ Wipe save + Reload
          </button>
        </div>
        <p className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest mt-2 italic">
          If reload fails twice, wipe — your save is the most likely culprit.
        </p>
      </div>
    );
  }
}
