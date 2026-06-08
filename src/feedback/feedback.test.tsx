import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { feedbackEnabled, submitFeedback, collectContext } from './feedback';
import { useFeedbackUi } from './feedbackUi';
import { SettingsButton } from '../components/ui/SettingsButton';
import { FeedbackModal } from '../components/ui/FeedbackModal';
import { useGameStore } from '../stores/gameStore';

const URL = 'https://godwake-feedback.example.workers.dev';

beforeEach(() => {
  act(() => useGameStore.setState({ screen: 'hub' }));
  act(() => useFeedbackUi.setState({ open: false }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('feedbackEnabled', () => {
  it('is false without a URL and true with one', () => {
    vi.stubEnv('VITE_FEEDBACK_URL', '');
    expect(feedbackEnabled()).toBe(false);
    vi.stubEnv('VITE_FEEDBACK_URL', URL);
    expect(feedbackEnabled()).toBe(true);
  });
});

describe('collectContext', () => {
  it('captures the current screen and a timestamp', () => {
    act(() => useGameStore.setState({ screen: 'hub' }));
    const ctx = collectContext();
    expect(ctx.screen).toBe('hub');
    expect(ctx.at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(typeof ctx.appVersion).toBe('string');
  });
});

describe('submitFeedback', () => {
  it('no-ops when the URL is unset', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', '');
    const res = await submitFeedback('hi', 'bug');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('disabled');
  });

  it('POSTs message, category, and context to the worker', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', URL);
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response('{"ok":true}', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await submitFeedback('boss is stuck', 'bug');
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe('boss is stuck');
    expect(body.category).toBe('bug');
    expect(body.context.screen).toBeDefined();
  });

  it('surfaces a rate-limit response', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', URL);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const res = await submitFeedback('hi', 'suggestion');
    expect(res).toEqual({ ok: false, error: 'rate-limited' });
  });
});

describe('feedback pill in the settings cluster', () => {
  it('is absent when the feature is disabled', () => {
    vi.stubEnv('VITE_FEEDBACK_URL', '');
    render(<SettingsButton />);
    expect(screen.queryByRole('button', { name: /send word/i })).toBeNull();
  });

  it('renders and opens the modal when enabled', () => {
    vi.stubEnv('VITE_FEEDBACK_URL', URL);
    render(<SettingsButton />);
    const btn = screen.getByRole('button', { name: /send word/i });
    fireEvent.click(btn);
    expect(useFeedbackUi.getState().open).toBe(true);
  });
});

describe('FeedbackModal', () => {
  it('is closed until opened', () => {
    const { container } = render(<FeedbackModal />);
    expect(container.firstChild).toBeNull();
  });

  it('submits the typed message with auto-context', async () => {
    vi.stubEnv('VITE_FEEDBACK_URL', URL);
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response('{"ok":true}', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<FeedbackModal />);
    act(() => useFeedbackUi.getState().openFeedback());

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'a fire spell does no damage' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.message).toBe('a fire spell does no damage');
    expect(body.category).toBe('bug');
    expect(body.context.appVersion).toBeDefined();
  });
});
