import { describe, it, expect, vi, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import {
  useInputBlock,
  useBlockingModalOpen,
  isBlockingModalOpen,
} from './useInputBlock';

function BlockingModal() {
  const ref = useInputBlock<HTMLDivElement>();
  return <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" />;
}

/**
 * Mirrors CombatScreen's auto-end-turn gate: a timer that fires unless a
 * blocking modal is open. Re-runs when the shared signal flips, so opening a
 * modal cancels a pending auto-end and closing one lets it resume.
 */
function AutoEnder({ onAutoEnd }: { onAutoEnd: () => void }) {
  const blockingModalOpen = useBlockingModalOpen();
  useEffect(() => {
    if (blockingModalOpen) return;
    const t = setTimeout(onAutoEnd, 1000);
    return () => clearTimeout(t);
  }, [blockingModalOpen, onAutoEnd]);
  return null;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useInputBlock — blocking-modal signal', () => {
  it('reflects mount/unmount of a blocking modal', () => {
    expect(isBlockingModalOpen()).toBe(false);
    const { unmount } = render(<BlockingModal />);
    expect(isBlockingModalOpen()).toBe(true);
    unmount();
    expect(isBlockingModalOpen()).toBe(false);
  });

  it('does NOT fire auto-end-turn while a blocking modal is open', () => {
    vi.useFakeTimers();
    const onAutoEnd = vi.fn();

    const { rerender } = render(
      <>
        <AutoEnder onAutoEnd={onAutoEnd} />
        <BlockingModal />
      </>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onAutoEnd).not.toHaveBeenCalled();

    // Close the modal — auto-end resumes and fires after its delay.
    rerender(
      <>
        <AutoEnder onAutoEnd={onAutoEnd} />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onAutoEnd).toHaveBeenCalledTimes(1);
  });
});
