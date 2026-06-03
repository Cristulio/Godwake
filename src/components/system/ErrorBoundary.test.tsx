import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const originalLocation = window.location;

function stubReload(): ReturnType<typeof vi.fn> {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  });
  return reload;
}

/** A child that throws on render — the only way to drive an error boundary. */
function Boom({ error }: { error: Error }): null {
  throw error;
}

function chunkError(message: string): Error {
  return new Error(message);
}

describe('ErrorBoundary — stale-chunk auto-recovery', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    // React + the boundary both log caught errors; keep the test output clean.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('auto-reloads ONCE on a dynamic-import chunk failure and shows a calm beat', () => {
    const reload = stubReload();
    const { container } = render(
      <ErrorBoundary>
        <Boom error={chunkError('Failed to fetch dynamically imported module: /assets/EndingScreen-a1b2.js')} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('godwake-chunk-reload')).toBe('1');
    // Reloading beat, NOT the alarm screen.
    expect(container.textContent).toContain('The wheel turns');
    expect(container.textContent).not.toContain('The Wheel Slipped');
  });

  it('treats a stale text/html MIME error as a recoverable chunk failure', () => {
    const reload = stubReload();
    render(
      <ErrorBoundary>
        <Boom error={chunkError("Expected a JavaScript module script but the server responded with a MIME type of 'text/html'.")} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does NOT reload a second time once the guard is set — shows the manual screen', () => {
    sessionStorage.setItem('godwake-chunk-reload', '1'); // a reload already happened this session
    const reload = stubReload();
    const { container } = render(
      <ErrorBoundary>
        <Boom error={chunkError('error loading dynamically imported module: /assets/x.js')} />
      </ErrorBoundary>,
    );

    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('The Wheel Slipped');
  });

  it('shows the manual screen (no reload) for an ordinary render error', () => {
    const reload = stubReload();
    const { container } = render(
      <ErrorBoundary>
        <Boom error={new Error('Cannot read properties of undefined (reading thing)')} />
      </ErrorBoundary>,
    );

    expect(reload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('The Wheel Slipped');
    expect(sessionStorage.getItem('godwake-chunk-reload')).toBeNull();
  });

  it('renders children untouched when nothing throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>the soul endures</div>
      </ErrorBoundary>,
    );
    expect(getByText('the soul endures')).toBeInTheDocument();
  });
});
