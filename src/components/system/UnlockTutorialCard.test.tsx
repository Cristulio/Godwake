import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnlockTutorialCard } from './UnlockTutorialCard';

describe('UnlockTutorialCard — blocking dismissal', () => {
  it('does NOT dismiss when the backdrop is clicked', () => {
    const onDismiss = vi.fn();
    render(<UnlockTutorialCard featureId="grove" onDismiss={onDismiss} />);

    // The outer overlay is the role="dialog" container.
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses only via the explicit Got it button', () => {
    const onDismiss = vi.fn();
    render(<UnlockTutorialCard featureId="grove" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
