import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MirrorImages } from './SpellEffect';

afterEach(() => {
  vi.useRealTimers();
});

function ghosts(container: HTMLElement) {
  return container.querySelectorAll('.animate-mirror-shimmer');
}

function shards(container: HTMLElement) {
  return container.querySelectorAll('.animate-spark');
}

describe('MirrorImages VFX', () => {
  it('renders nothing when there are no images', () => {
    const { container } = render(<MirrorImages classId="wizard" count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one shimmering duplicate per image', () => {
    const { container } = render(<MirrorImages classId="wizard" count={3} />);
    expect(ghosts(container)).toHaveLength(3);
  });

  it('scales the duplicate count with the resource value', () => {
    const { container, rerender } = render(<MirrorImages classId="wizard" count={3} />);
    expect(ghosts(container)).toHaveLength(3);
    rerender(<MirrorImages classId="wizard" count={1} />);
    expect(ghosts(container)).toHaveLength(1);
  });

  it('plays a shatter burst when an image absorbs a hit', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<MirrorImages classId="wizard" count={2} />);
    expect(shards(container)).toHaveLength(0);

    act(() => {
      rerender(<MirrorImages classId="wizard" count={1} />);
    });
    // One broken duplicate -> 7 shards in the burst.
    expect(shards(container).length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(shards(container)).toHaveLength(0);
  });

  it('keeps the overlay mounted through a shatter even at zero images', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<MirrorImages classId="wizard" count={1} />);
    act(() => {
      rerender(<MirrorImages classId="wizard" count={0} />);
    });
    // No surviving ghosts, but the shatter burst is still on screen.
    expect(ghosts(container)).toHaveLength(0);
    expect(shards(container).length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(container.firstChild).toBeNull();
  });
});
