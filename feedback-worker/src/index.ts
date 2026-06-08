// Godwake in-game feedback endpoint.
//
// The game is a static site (Cloudflare Pages) with no backend, so this Worker
// is the one server-side seam: it holds the Telegram bot secret, rate-limits
// abuse, forwards each report to the owner's Telegram for an instant phone
// ping, and keeps a KV history. The client never sees the token.

import type { KVNamespace, ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  /** Telegram bot token (BotFather). Set via `wrangler secret put`. */
  TELEGRAM_TOKEN: string;
  /** Telegram chat id to deliver reports to. Set via `wrangler secret put`. */
  TELEGRAM_CHAT_ID: string;
  /** KV for per-IP rate-limit counters (short-TTL keys). */
  FEEDBACK_RL: KVNamespace;
  /** KV holding the full submission history (key = ISO timestamp + rand). */
  FEEDBACK_LOG: KVNamespace;
  /** Optional comma-separated extra origins to allow (e.g. a custom domain). */
  ALLOWED_ORIGINS?: string;
}

export type Category = 'bug' | 'suggestion';

export interface FeedbackPayload {
  message: string;
  category: Category;
  context?: Record<string, unknown>;
}

const MAX_MESSAGE_LEN = 4000;
// Reject obviously oversized bodies before reading them into memory. The
// message cap is 4000 chars; context + JSON overhead fit comfortably under 16KB.
const MAX_BODY_BYTES = 16 * 1024;

// Soft abuse limits per client IP.
const PER_MINUTE = 5;
const PER_HOUR = 30;

export function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  // Any Cloudflare Pages deployment (project + per-branch preview subdomains).
  if (/^https:\/\/([a-z0-9-]+\.)*pages\.dev$/.test(origin)) return true;
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = isAllowedOrigin(origin, env);
  return {
    // Reflect the origin only when allowed; otherwise omit (browser blocks it).
    ...(allowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  env: Env,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
  });
}

export interface ValidationResult {
  ok: boolean;
  payload?: FeedbackPayload;
  error?: string;
}

export function validate(raw: unknown): ValidationResult {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, error: 'Body must be a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  const message = obj.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { ok: false, error: 'message is required.' };
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `message exceeds ${MAX_MESSAGE_LEN} characters.` };
  }
  const category = obj.category;
  if (category !== 'bug' && category !== 'suggestion') {
    return { ok: false, error: "category must be 'bug' or 'suggestion'." };
  }
  const context =
    obj.context != null && typeof obj.context === 'object' && !Array.isArray(obj.context)
      ? (obj.context as Record<string, unknown>)
      : undefined;
  return { ok: true, payload: { message: message.trim(), category, context } };
}

/** Telegram-flavoured plain text, readable on a phone. */
export function buildTelegramText(payload: FeedbackPayload): string {
  const emoji = payload.category === 'bug' ? '🐞' : '💡';
  const heading = payload.category === 'bug' ? 'Bug' : 'Suggestion';
  const lines = [`${emoji} Godwake ${heading}`, '', payload.message];
  const ctx = payload.context ?? {};
  const ctxKeys = Object.keys(ctx);
  if (ctxKeys.length > 0) {
    lines.push('', '———');
    for (const key of ctxKeys) {
      const value = ctx[key];
      if (value == null || value === '') continue;
      const printed =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      lines.push(`${key}: ${printed}`);
    }
  }
  return lines.join('\n');
}

async function bump(env: Env, key: string, ttlSeconds: number): Promise<number> {
  const current = parseInt((await env.FEEDBACK_RL.get(key)) ?? '0', 10) || 0;
  const next = current + 1;
  await env.FEEDBACK_RL.put(key, String(next), { expirationTtl: ttlSeconds });
  return next;
}

/** KV-backed soft rate limit. Eventually-consistent, fine for abuse damping. */
export async function checkRateLimit(
  env: Env,
  ip: string,
  now: number = Date.now(),
): Promise<{ ok: boolean }> {
  const minuteBucket = Math.floor(now / 60_000);
  const hourBucket = Math.floor(now / 3_600_000);
  const perMin = await bump(env, `rl:min:${ip}:${minuteBucket}`, 70);
  const perHour = await bump(env, `rl:hr:${ip}:${hourBucket}`, 3700);
  return { ok: perMin <= PER_MINUTE && perHour <= PER_HOUR };
}

async function sendTelegram(env: Env, text: string): Promise<boolean> {
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    },
  );
  return res.ok;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, origin, env);
    }
    if (!isAllowedOrigin(origin, env)) {
      return json({ ok: false, error: 'Origin not allowed.' }, 403, origin, env);
    }

    const declaredLen = parseInt(request.headers.get('Content-Length') ?? '0', 10);
    if (declaredLen > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'Body too large.' }, 413, origin, env);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const limit = await checkRateLimit(env, ip);
    if (!limit.ok) {
      return json({ ok: false, error: 'Too many reports. Try again later.' }, 429, origin, env);
    }

    let raw: unknown;
    try {
      const body = await request.text();
      if (body.length > MAX_BODY_BYTES) {
        return json({ ok: false, error: 'Body too large.' }, 413, origin, env);
      }
      raw = JSON.parse(body);
    } catch {
      return json({ ok: false, error: 'Invalid JSON.' }, 400, origin, env);
    }

    const result = validate(raw);
    if (!result.ok || !result.payload) {
      return json({ ok: false, error: result.error ?? 'Invalid.' }, 400, origin, env);
    }
    const payload = result.payload;

    // Persist every submission before anything else can fail, so nothing is lost.
    const logKey = `${new Date().toISOString()}-${crypto.randomUUID()}`;
    const logValue = JSON.stringify({ ...payload, ip, receivedAt: Date.now() });
    ctx.waitUntil(env.FEEDBACK_LOG.put(logKey, logValue));

    const delivered = await sendTelegram(env, buildTelegramText(payload));
    if (!delivered) {
      return json(
        { ok: false, error: 'Stored, but delivery failed.' },
        502,
        origin,
        env,
      );
    }

    return json({ ok: true }, 200, origin, env);
  },
};
