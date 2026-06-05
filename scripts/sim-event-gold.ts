/**
 * EVENT-GOLD analytic (#426 validation) — MEASUREMENT ONLY.
 *
 * #426 ramps an event's authored gold (rewards AND the `requiresGold` costs that
 * buy them) by the chapter it fires in — ×1 at Ch1 climbing to
 * ×EVENT_GOLD_CH14_MULTIPLE by Ch14 — ANCHORED at the event's own `minChapter`,
 * so a deep-authored windfall doesn't double-count off a phantom Ch1 baseline.
 *
 * The design claim to check: a scaled event payout is "meaningful but not a
 * jackpot" — i.e. by the late delve a Ch1 roadside boon is no longer pocket lint,
 * yet still a slice of (not bigger than) the gold a NORMAL FIGHT in that chapter
 * drops. The combat curve climbs far steeper than the event ramp, so the event
 * share of a normal fight should DROP with depth even as the absolute payout grows.
 *
 * No magnitudes tuned. Reads the real eventGoldScale helpers + the live delve's
 * authored per-room gold, so this is exactly what the player sees.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { listEvents } from '../src/content/events';
import {
  eventGoldScale,
  chapterGoldRamp,
  scaleGold,
  EVENT_GOLD_CH14_MULTIPLE,
} from '../src/engine/delve/eventGoldScale';
import { bossIntelCoinCost } from '../src/content/bossIntel';

const CHAPTERS = Array.from({ length: 14 }, (_, i) => i + 1);
const SEEDS = Number(process.env.SEEDS ?? 60);

// ── 1. Normal-fight gold per chapter, straight off the live delve's combat rooms.
function normalFightGold(): Map<number, number> {
  const acc = new Map<number, { sum: number; n: number }>();
  for (let s = 0; s < SEEDS; s++) {
    const delve = createGodwakeDelve({ seed: (0xe7 + s * 101) >>> 0, ascension: 0, fullChain: true });
    for (const room of delve.rooms) {
      if (room.kind !== 'combat') continue;
      const ch = room.chapter ?? 0;
      const g = room.goldReward ?? 0;
      if (!ch || g <= 0) continue;
      const cur = acc.get(ch) ?? { sum: 0, n: 0 };
      cur.sum += g; cur.n += 1; acc.set(ch, cur);
    }
  }
  const out = new Map<number, number>();
  for (const [ch, { sum, n }] of acc) out.set(ch, n ? sum / n : 0);
  return out;
}

// ── 2. Authored gold amounts per event (the single best positive gold_delta in
//       the template) + the event's minChapter. Deep-walks every outcome branch.
interface EventGold { id: string; minCh: number; reward: number; cost: number }
function collectGold(node: unknown, onGold: (amount: number) => void, onCost: (amount: number) => void): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj.kind === 'gold_delta' && typeof obj.amount === 'number') onGold(obj.amount);
  if (typeof obj.requiresGold === 'number') onCost(obj.requiresGold);
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) for (const item of v) collectGold(item, onGold, onCost);
    else if (v && typeof v === 'object') collectGold(v, onGold, onCost);
  }
}
function eventGoldEntries(): EventGold[] {
  const out: EventGold[] = [];
  for (const ev of listEvents()) {
    const minCh = ev.minChapter ?? 1;
    let reward = 0;
    let cost = 0;
    collectGold(ev, (a) => { if (a > reward) reward = a; }, (a) => { if (a > cost) cost = a; });
    out.push({ id: ev.id, minCh, reward, cost });
  }
  return out;
}

const median = (a: number[]): number => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

function main(): void {
  const normal = normalFightGold();
  const entries = eventGoldEntries();
  const rewardEntries = entries.filter((e) => e.reward > 0);

  const L: string[] = [];
  L.push('# Event-gold scaling — meaningful-but-not-a-jackpot check (#426)\n');
  L.push(
    `Ramp ×1 @Ch1 → ×**${EVENT_GOLD_CH14_MULTIPLE}** @Ch14 (knob \`EVENT_GOLD_CH14_MULTIPLE\` in ` +
      `\`src/engine/delve/eventGoldScale.ts\`), anchored at each event's \`minChapter\`. ` +
      `${rewardEntries.length} of ${entries.length} events carry a positive gold reward. ` +
      `Normal-fight gold = mean \`goldReward\` over live-delve combat rooms (${SEEDS} seeds). ` +
      `MEASUREMENT ONLY.\n`,
  );

  // ── A. The ramp + a worked Ch1-anchored example across chapters.
  L.push('## A. The ramp, and a Ch1-anchored +25 boon across the delve\n');
  L.push('| Ch | ramp× | Ch1 +25 boon → | normal-fight gold | event % of a normal fight | boss-intel fee |');
  L.push('|---|---|---|---|---|---|');
  for (const ch of CHAPTERS) {
    const ramp = chapterGoldRamp(ch);
    const boon = scaleGold(25, eventGoldScale(ch, 1));
    const nf = normal.get(ch) ?? 0;
    const share = nf ? `${Math.round((100 * boon) / nf)}%` : '—';
    const intelTier = ch <= 3 ? 1 : ch <= 7 ? 2 : ch <= 11 ? 3 : 4;
    L.push(`| ${ch} | ${ramp.toFixed(2)}× | ${boon}g | ${Math.round(nf)}g | ${share} | ${bossIntelCoinCost(intelTier as 1 | 2 | 3 | 4)}g |`);
  }
  L.push('');

  // ── B. Realized event reward distribution per chapter vs normal-fight gold.
  //      At chapter C, every event with minCh<=C is eligible; its realized reward
  //      is authored×scale(C, minCh). We summarise the eligible pool.
  L.push('## B. Realized event reward (all eligible events) vs normal-fight gold\n');
  L.push(
    'At chapter C the eligible pool is every event with `minChapter ≤ C`, each realized at ' +
      '`authored × eventGoldScale(C, minChapter)`. The jackpot test rides the **MEDIAN** (the ' +
      'typical event) ÷ normal-fight gold — `max` is the single richest reachable event (usually ' +
      'a high-stakes trade/gamble, not free money) and is informational. Verdict: ✓ <0.7×, ~ rich ' +
      '0.7-1×, ⚠ ≥ a normal fight.\n',
  );
  L.push('| Ch | eligible | median reward | median ÷ normal | mean | MAX (gamble) | normal-fight gold | verdict |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const ch of CHAPTERS) {
    const realized = rewardEntries
      .filter((e) => e.minCh <= ch)
      .map((e) => scaleGold(e.reward, eventGoldScale(ch, e.minCh)));
    const nf = normal.get(ch) ?? 0;
    const med = median(realized);
    const mx = realized.length ? Math.max(...realized) : 0;
    const ratio = nf ? med / nf : 0;
    const verdict = !nf ? '· (no fight gold)' : ratio >= 1 ? '⚠ ≥ a fight' : ratio >= 0.7 ? '~ rich' : '✓ a slice';
    L.push(
      `| ${ch} | ${realized.length} | ${Math.round(med)}g | ${nf ? ratio.toFixed(2) + '×' : '—'} | ${Math.round(mean(realized))}g | ${mx}g | ${Math.round(nf)}g | ${verdict} |`,
    );
  }
  L.push('');

  // ── C. Anchoring proof — a deep-authored windfall doesn't balloon.
  const deep = rewardEntries.filter((e) => e.minCh >= 8).sort((a, b) => b.reward - a.reward).slice(0, 6);
  if (deep.length) {
    L.push('## C. Anchoring proof — deep-authored events scale from THEIR floor, not Ch1\n');
    L.push('A deep event authored rich sits at ×1 when it first appears (anchored at its own minChapter) and only creeps up by Ch14 — never the full ×6.\n');
    L.push('| event | minCh | authored | at minCh | at Ch14 | naïve ×6 (avoided) |');
    L.push('|---|---|---|---|---|---|');
    for (const e of deep) {
      const atMin = scaleGold(e.reward, eventGoldScale(e.minCh, e.minCh));
      const at14 = scaleGold(e.reward, eventGoldScale(14, e.minCh));
      const naive = scaleGold(e.reward, EVENT_GOLD_CH14_MULTIPLE);
      L.push(`| ${e.id} | ${e.minCh} | ${e.reward}g | ${atMin}g | ${at14}g | ${naive}g |`);
    }
    L.push('');
  }

  const doc = L.join('\n') + '\n';
  const outPath = resolve(process.cwd(), 'sim-reports/event-gold.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  process.stdout.write(doc);
  process.stdout.write(`\n[event-gold] wrote ${outPath}\n`);
}

main();
