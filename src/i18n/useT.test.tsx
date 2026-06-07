import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useT } from './useT';
import { useSettingsStore } from '../stores/settingsStore';

function Probe() {
  const { t, tc } = useT();
  return (
    <div>
      <span data-testid="ui">{t('ui.common.cancel')}</span>
      <span data-testid="content">{tc('spells', 'fire-bolt', 'name', 'Fire Bolt')}</span>
    </div>
  );
}

afterEach(() => {
  act(() => useSettingsStore.setState({ locale: 'en' }));
});

describe('useT subscription', () => {
  it('re-renders a consumer when the locale flips', () => {
    render(<Probe />);
    expect(screen.getByTestId('ui').textContent).toBe('Cancel');

    act(() => useSettingsStore.getState().setLocale('es'));
    expect(screen.getByTestId('ui').textContent).toBe('Cancelar');

    act(() => useSettingsStore.getState().setLocale('en'));
    expect(screen.getByTestId('ui').textContent).toBe('Cancel');
  });

  it('content seam falls back to English while no es overlay exists', () => {
    render(<Probe />);
    act(() => useSettingsStore.getState().setLocale('es'));
    expect(screen.getByTestId('content').textContent).toBe('Fire Bolt');
  });
});
