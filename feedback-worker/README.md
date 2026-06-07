# Godwake feedback Worker

A tiny Cloudflare Worker that receives in-game feedback from players, forwards
each report to **your Telegram** (instant phone notification), and stores a
history in KV. The game is a static site, so this Worker is its only backend.
The Telegram bot token lives here as a secret — never in the game's client code.

```
Game (browser)  ──POST /──▶  this Worker  ──▶  Telegram (you)
                                  └──▶  KV log (history)
```

---

## 1. Make a Telegram bot + find your chat id (one time, ~2 min)

1. In Telegram, message **@BotFather** → `/newbot` → follow prompts. It gives you
   a **bot token** like `7123456789:AAH...`. Keep it secret.
2. Send any message to your new bot (so it's allowed to message you back).
3. Get your **chat id**: open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser, send your
   bot another message, refresh, and read `result[].message.chat.id`. That number
   is your `TELEGRAM_CHAT_ID`.

You now have the two secrets: `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID`.

---

## 2. Deploy the Worker

You can do this **entirely in the Cloudflare dashboard** (no tools to install) or
with the **wrangler CLI**. Pick one.

### Option A — Cloudflare dashboard (no CLI)

1. **Create the Worker**: dash.cloudflare.com → *Workers & Pages* → *Create
   application* → *Create Worker*. Name it `godwake-feedback`, *Deploy*, then
   *Edit code*. Paste the contents of `src/index.ts` into the editor and *Deploy*.
2. **Create two KV namespaces**: *Workers & Pages* → *KV* → *Create a namespace*.
   Make one called `FEEDBACK_RL` (rate-limit) and one called `FEEDBACK_LOG`
   (history).
3. **Bind the KV namespaces to the Worker**: open the Worker → *Settings* →
   *Bindings* → *Add* → *KV namespace*. Add:
   - Variable name `FEEDBACK_RL` → the `FEEDBACK_RL` namespace.
   - Variable name `FEEDBACK_LOG` → the `FEEDBACK_LOG` namespace.
4. **Add the two secrets**: same *Settings* → *Variables and Secrets* → *Add* →
   type **Secret**:
   - `TELEGRAM_TOKEN` = your bot token.
   - `TELEGRAM_CHAT_ID` = your chat id.
   *(Optional)* a plain **Text** variable `ALLOWED_ORIGINS` if you serve the game
   from a custom domain — comma-separated. `*.pages.dev` and `localhost` are
   always allowed.
5. **Deploy** again so the bindings + secrets take effect.

### Option B — wrangler CLI

```bash
cd feedback-worker
npm install

# Create the two KV namespaces. Each command prints an id — paste it into
# wrangler.toml (and the --preview id into preview_id).
npx wrangler kv namespace create FEEDBACK_RL
npx wrangler kv namespace create FEEDBACK_RL --preview
npx wrangler kv namespace create FEEDBACK_LOG
npx wrangler kv namespace create FEEDBACK_LOG --preview

# Set the two secrets (you'll be prompted to paste each value).
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# Deploy.
npx wrangler deploy
```

`wrangler tail` streams live logs if you want to watch reports arrive.

---

## 3. Get the deployed URL → wire it into the game

After deploy, the Worker URL is shown in the CLI output and in the dashboard
(Worker → *Settings* → *Domains & Routes*, e.g.
`https://godwake-feedback.<your-subdomain>.workers.dev`).

In the **game's** build, set the env var so the feedback button turns on:

```
VITE_FEEDBACK_URL=https://godwake-feedback.<your-subdomain>.workers.dev
```

- Local dev: add that line to a `.env` (or `.env.local`) at the game repo root.
- Cloudflare **Pages** (the game): *Pages project* → *Settings* → *Environment
  variables* → add `VITE_FEEDBACK_URL`, then redeploy.

If `VITE_FEEDBACK_URL` is unset, the in-game Feedback button is hidden and the
feature no-ops — so nothing breaks before you wire the URL.

---

## API

`POST /` with JSON:

```json
{ "message": "string (1–4000 chars)", "category": "bug" | "suggestion", "context": { } }
```

- `200 { "ok": true }` on success.
- `400` invalid body · `403` disallowed origin · `413` body too large ·
  `429` rate-limited (5/min, 30/hour per IP) · `502` stored but Telegram failed.

History lives in the `FEEDBACK_LOG` KV namespace, one entry per submission
(`key = ISO timestamp + random`).
