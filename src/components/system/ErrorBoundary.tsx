import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Top-level error boundary. A render-time throw anywhere below this lands
 * here instead of taking down the whole tree. Recovery: clear localStorage
 * and reload (the dramatic fiction is "the wheel slipped"). Less destructive
 * recovery isn't safe — we don't know which state is corrupted.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Render failed:', error, info);
    this.setState({ componentStack: info.componentStack ?? null });
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
