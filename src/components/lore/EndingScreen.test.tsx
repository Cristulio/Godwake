import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EndingScreen } from './EndingScreen';
import { useDelveStore } from '../../stores/delveStore';
import { createGodwakeDelve, TOTAL_CHAPTERS } from '../../engine/delve';
import { t } from '../../i18n';

vi.mock('../../engine/audio', () => ({
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
}));

const THRONE_EYEBROW = t('scenes.ending.throneEyebrow');
const PIT_EYEBROW = t('scenes.ending.pitEyebrow');

describe('EndingScreen — isThrone resolves off the run chapterCount', () => {
  beforeEach(() => {
    useDelveStore.setState({ delve: null });
  });

  it('shows the Throne finale for a full-chain run (chapterCount >= TOTAL_CHAPTERS)', () => {
    const delve = createGodwakeDelve({ seed: 1, fullChain: true });
    expect(delve.chapterCount).toBeGreaterThanOrEqual(TOTAL_CHAPTERS);
    useDelveStore.setState({ delve: { ...delve, phase: 'completed' } });

    render(<EndingScreen />);

    expect(screen.getByText(THRONE_EYEBROW)).toBeInTheDocument();
    expect(screen.queryByText(PIT_EYEBROW)).not.toBeInTheDocument();
  });

  it('shows the Pit finale for a base run (chapterCount < TOTAL_CHAPTERS)', () => {
    const delve = createGodwakeDelve({ seed: 1 });
    expect(delve.chapterCount).toBeLessThan(TOTAL_CHAPTERS);
    useDelveStore.setState({ delve: { ...delve, phase: 'completed' } });

    render(<EndingScreen />);

    expect(screen.getByText(PIT_EYEBROW)).toBeInTheDocument();
    expect(screen.queryByText(THRONE_EYEBROW)).not.toBeInTheDocument();
  });
});
