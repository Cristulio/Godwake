import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalLocation = window.location;

function stubReload(): ReturnType<typeof vi.fn> {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  });
  return reload;
}

describe('loadDelveFactory', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.doUnmock('./createDelve');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('returns the factory on a successful chunk load', async () => {
    const fake = vi.fn();
    vi.doMock('./createDelve', () => ({ createGodwakeDelve: fake }));
    const { loadDelveFactory } = await import('./loadDelveFactory');

    await expect(loadDelveFactory()).resolves.toBe(fake);
  });

  it('recovers with a reload and returns null when the chunk fails to load', async () => {
    const reload = stubReload();
    vi.doMock('./createDelve', () => {
      throw new Error('chunk 404 — stale deploy');
    });
    const { loadDelveFactory } = await import('./loadDelveFactory');

    // The rejection must be swallowed: no unhandled rejection escapes.
    await expect(loadDelveFactory()).resolves.toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads only once per session even if the chunk stays gone (loop guard)', async () => {
    const reload = stubReload();
    vi.doMock('./createDelve', () => {
      throw new Error('still gone');
    });
    const { loadDelveFactory } = await import('./loadDelveFactory');

    await loadDelveFactory();
    await loadDelveFactory();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
