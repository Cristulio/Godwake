import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker, {
  validate,
  buildTelegramText,
  isAllowedOrigin,
  checkRateLimit,
  type Env,
} from './index';

// Minimal in-memory KV stand-in — enough for get/put with TTL ignored.
function makeKV() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  };
}

function makeEnv(): Env {
  return {
    TELEGRAM_TOKEN: 'test-token',
    TELEGRAM_CHAT_ID: '123',
    FEEDBACK_RL: makeKV() as unknown as Env['FEEDBACK_RL'],
    FEEDBACK_LOG: makeKV() as unknown as Env['FEEDBACK_LOG'],
  };
}

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as Parameters<
  typeof worker.fetch
>[2];

function post(body: unknown, origin = 'http://localhost:5173'): Request {
  return new Request('https://feedback.example.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '1.2.3.4' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', { status: 200 })));
});

describe('validate', () => {
  it('accepts a well-formed bug report', () => {
    const r = validate({ message: 'crash on boss', category: 'bug', context: { chapter: 3 } });
    expect(r.ok).toBe(true);
    expect(r.payload?.message).toBe('crash on boss');
  });

  it('rejects empty messages', () => {
    expect(validate({ message: '   ', category: 'bug' }).ok).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(validate({ message: 'hi', category: 'praise' }).ok).toBe(false);
  });

  it('rejects an over-length message', () => {
    expect(validate({ message: 'x'.repeat(4001), category: 'suggestion' }).ok).toBe(false);
  });

  it('drops a non-object context', () => {
    const r = validate({ message: 'hi', category: 'bug', context: 'nope' });
    expect(r.ok).toBe(true);
    expect(r.payload?.context).toBeUndefined();
  });
});

describe('isAllowedOrigin', () => {
  const env = makeEnv();
  it('allows localhost and pages.dev', () => {
    expect(isAllowedOrigin('http://localhost:5173', env)).toBe(true);
    expect(isAllowedOrigin('https://godwake.pages.dev', env)).toBe(true);
    expect(isAllowedOrigin('https://feat-x.godwake.pages.dev', env)).toBe(true);
  });
  it('blocks other origins', () => {
    expect(isAllowedOrigin('https://evil.example.com', env)).toBe(false);
    expect(isAllowedOrigin(null, env)).toBe(false);
  });
  it('honors ALLOWED_ORIGINS', () => {
    expect(isAllowedOrigin('https://play.godwake.com', { ...env, ALLOWED_ORIGINS: 'https://play.godwake.com' })).toBe(true);
  });
});

describe('buildTelegramText', () => {
  it('formats category emoji, message, and context', () => {
    const text = buildTelegramText({
      message: 'spell does no damage',
      category: 'bug',
      context: { chapter: 5, class: 'wizard', empty: '' },
    });
    expect(text).toContain('🐞 Godwake Bug');
    expect(text).toContain('spell does no damage');
    expect(text).toContain('chapter: 5');
    expect(text).toContain('class: wizard');
    expect(text).not.toContain('empty:'); // empty values skipped
  });

  it('uses the suggestion emoji', () => {
    expect(buildTelegramText({ message: 'add hats', category: 'suggestion' })).toContain('💡');
  });
});

describe('checkRateLimit', () => {
  it('allows up to the per-minute limit then blocks', async () => {
    const env = makeEnv();
    const now = 1_000_000_000_000;
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit(env, 'ip', now)).ok).toBe(true);
    }
    expect((await checkRateLimit(env, 'ip', now)).ok).toBe(false);
  });
});

describe('fetch handler', () => {
  it('handles an OPTIONS preflight with CORS headers', async () => {
    const env = makeEnv();
    const res = await worker.fetch(
      new Request('https://x/', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }),
      env,
      ctx,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('rejects a disallowed origin', async () => {
    const env = makeEnv();
    const res = await worker.fetch(post({ message: 'hi', category: 'bug' }, 'https://evil.com'), env, ctx);
    expect(res.status).toBe(403);
  });

  it('posts the right Telegram payload and stores a log entry', async () => {
    const env = makeEnv();
    const logKV = env.FEEDBACK_LOG as unknown as ReturnType<typeof makeKV>;
    const res = await worker.fetch(
      post({ message: 'boss is invincible', category: 'bug', context: { chapter: 8 } }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.chat_id).toBe('123');
    expect(sent.text).toContain('boss is invincible');
    expect(sent.text).toContain('chapter: 8');

    expect(logKV.put).toHaveBeenCalledOnce();
  });

  it('rejects invalid bodies with 400', async () => {
    const env = makeEnv();
    const res = await worker.fetch(post({ message: '', category: 'bug' }), env, ctx);
    expect(res.status).toBe(400);
  });

  it('returns 429 once the rate limit is exceeded', async () => {
    const env = makeEnv();
    for (let i = 0; i < 5; i++) {
      await worker.fetch(post({ message: 'hi', category: 'bug' }), env, ctx);
    }
    const res = await worker.fetch(post({ message: 'hi', category: 'bug' }), env, ctx);
    expect(res.status).toBe(429);
  });

  it('returns 502 when Telegram delivery fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const env = makeEnv();
    const res = await worker.fetch(post({ message: 'hi', category: 'bug' }), env, ctx);
    expect(res.status).toBe(502);
  });
});
