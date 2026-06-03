import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IrenicusTaunt } from './IrenicusTaunt';

const LINE = 'You wake.';

describe('IrenicusTaunt — blocking reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function runTypewriter() {
    // Advance well past the line length × base tick to finish typing.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  }

  it('Continue is disabled while typing and clicking the backdrop never dismisses', () => {
    const onDismiss = vi.fn();
    render(
      <IrenicusTaunt speaker="imoen" context="reincarnation" line={LINE} onDismiss={onDismiss} />,
    );

    const overlay = screen.getByRole('dialog');

    // Mid-typewriter: clicking the backdrop fast-forwards, it must not dismiss.
    fireEvent.click(overlay);
    expect(onDismiss).not.toHaveBeenCalled();

    runTypewriter();

    // Even once the line is fully revealed, the backdrop is inert.
    fireEvent.click(overlay);
    fireEvent.doubleClick(overlay);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses only through the explicit Continue button, once typing is done', () => {
    const onDismiss = vi.fn();
    render(
      <IrenicusTaunt speaker="irenicus" context="idle" line={LINE} onDismiss={onDismiss} />,
    );

    runTypewriter();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
