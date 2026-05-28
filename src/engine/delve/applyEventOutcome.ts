import type { Character } from '../../types/character';
import type { DiceRoller } from '../dice';
import type {
  EventChoice,
  EventChoiceOutcome,
  EventEffect,
  EventOutcome,
} from '../../schemas/event';
import { listBlessings, getBlessing } from '../../content/blessings';
import { listQuirks, getQuirk } from '../../content/quirks';
import { modifierFor } from '../character/derived';

/** Plain-text record of a single effect that landed. Useful for UI summaries. */
export interface AppliedEffect {
  kind: EventEffect['kind'];
  /** Short human-readable summary ("+5 HP", "+10g", "Tymora's Coin"). */
  detail: string;
}

export interface EventOutcomeResult {
  /** Fresh character reference; immutable-style for memo'd consumers. */
  character: Character;
  /** Player-facing flavor of the outcome that fired. */
  resolution: string;
  /** What landed, in order. UI surfaces these as a tidy list. */
  effectsApplied: AppliedEffect[];
  /**
   * If set, DelveScreen must spawn a combat with these monsters instead of
   * advancing the room. Created by `spawn_ambush` effects.
   */
  ambush?: { monsterDefIds: string[] };
}

/**
 * Availability of a choice for the current character. `ok=true` means every
 * gate passes; `ok=false` means at least one gate fails and the UI should
 * disable / hide the option. The first failing gate populates `reason`.
 */
export type ChoiceAvailability =
  | { ok: true }
  | { ok: false; reason: string; gate: 'gold' | 'hp' | 'cha' };

/**
 * Check whether the character meets every gate on a choice: gold cost, HP
 * threshold, and CHA modifier (BG2-style [Persuade] gate). Returns the first
 * failing gate's reason so the UI can show a single, specific blocker.
 */
export function canTakeChoice(character: Character, choice: EventChoice): ChoiceAvailability {
  if (choice.requiresGold !== undefined && character.goldInPocket < choice.requiresGold) {
    return {
      ok: false,
      gate: 'gold',
      reason: `needs ${choice.requiresGold}g (you have ${character.goldInPocket})`,
    };
  }
  if (choice.requiresHpAtLeast !== undefined && character.hp.current < choice.requiresHpAtLeast) {
    return {
      ok: false,
      gate: 'hp',
      reason: `needs ${choice.requiresHpAtLeast} HP (you have ${character.hp.current})`,
    };
  }
  if (choice.requiresCha !== undefined) {
    const chaMod = modifierFor(character, 'cha');
    if (chaMod < choice.requiresCha) {
      const sign = choice.requiresCha >= 0 ? '+' : '';
      const youSign = chaMod >= 0 ? '+' : '';
      return {
        ok: false,
        gate: 'cha',
        reason: `needs CHA ${sign}${choice.requiresCha} (you have ${youSign}${chaMod})`,
      };
    }
  }
  return { ok: true };
}

/**
 * Roll a choice's success check, when one is defined. When `successChance` is
 * unset, the choice is deterministic and `outcome` is returned unchanged.
 * When set, a 1d100 ≤ Math.round(chance*100) is success; failure falls
 * through to `failureOutcome` (or a quiet empty outcome if none was supplied).
 */
export function rollChoiceCheck(
  choice: EventChoice,
  roller: DiceRoller,
): { succeeded?: boolean; outcome: EventChoiceOutcome } {
  if (choice.successChance === undefined) return { outcome: choice.outcome };
  const roll = roller.roll('1d100').total;
  const threshold = Math.round(choice.successChance * 100);
  const succeeded = roll <= threshold;
  if (succeeded) return { succeeded: true, outcome: choice.outcome };
  const fallback: EventChoiceOutcome = choice.failureOutcome ?? {
    resolution: 'It does not go your way.',
    effects: [],
  };
  return { succeeded: false, outcome: fallback };
}

/**
 * Resolve a choice outcome — single or weighted-random — into a concrete
 * outcome via the roller. Random branches are picked by rolling 1-100 and
 * walking the cumulative-weight ladder.
 */
export function resolveChoiceOutcome(
  outcome: EventChoiceOutcome,
  roller: DiceRoller,
): EventOutcome {
  if ('resolution' in outcome) return outcome;
  const entries = outcome.random;
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  const roll = roller.roll('1d100').total;
  // Map d100 (1-100) into [0, total).
  const pick = ((roll - 1) % total) + 0.5;
  let cursor = 0;
  for (const e of entries) {
    cursor += e.weight;
    if (pick <= cursor) return e.outcome;
  }
  return entries[entries.length - 1].outcome;
}

/**
 * Pick a random blessing the character doesn't already carry. Returns null
 * if every blessing in the pool is already held (extremely unlikely in
 * normal play). Uses the roller for determinism.
 */
function rollNewBlessing(character: Character, roller: DiceRoller): string | null {
  const owned = new Set(character.blessings);
  const candidates = listBlessings().filter((b) => !owned.has(b.id));
  if (candidates.length === 0) return null;
  const idx = roller.roll('1d100').total % candidates.length;
  return candidates[idx].id;
}

/**
 * Compensation gold granted when `grant_quirk_reroll` would no-op because the
 * character has no bane quirk to shake. L1 characters trigger this ~67% of
 * the time (no quirks accrued yet); without compensation the reward feels
 * punishing on early picks.
 */
const QUIRK_REROLL_FALLBACK_GOLD = 5;

/**
 * Replace one bane quirk with a fresh random pick from the pool. When the
 * character carries no bane quirks the reroll no-ops and a small gold
 * compensation is granted instead (see QUIRK_REROLL_FALLBACK_GOLD).
 *
 * Returns a discriminated result so the caller can decide where to surface
 * each piece: a real reroll yields a one-line "Bane shaken" effect; a
 * fallback yields gold (merged into the existing gold line) and a flavor
 * suffix that gets appended to the resolution, not the rewards list.
 */
type RerollResult =
  | {
      kind: 'rerolled';
      character: Character;
      oldName: string;
      newName: string;
    }
  | {
      kind: 'no-marks-left';
      character: Character;
      detail: string;
    }
  | {
      kind: 'fallback-gold';
      character: Character;
      fallbackText: string;
      fallbackGold: number;
    };

function rerollOneBaneQuirk(
  character: Character,
  roller: DiceRoller,
  fallbackText?: string,
): RerollResult {
  const baneIdx = character.quirks.findIndex((qid) => {
    try {
      return getQuirk(qid).sentiment === 'bane';
    } catch {
      return false;
    }
  });
  if (baneIdx === -1) {
    const next: Character = {
      ...character,
      goldInPocket: character.goldInPocket + QUIRK_REROLL_FALLBACK_GOLD,
    };
    return {
      kind: 'fallback-gold',
      character: next,
      fallbackText: fallbackText ?? 'The gods find no bane to shake from you.',
      fallbackGold: QUIRK_REROLL_FALLBACK_GOLD,
    };
  }
  const pool = listQuirks();
  const owned = new Set(character.quirks);
  const others = pool.filter((q) => !owned.has(q.id));
  if (others.length === 0) {
    return {
      kind: 'no-marks-left',
      character,
      detail: 'The gods have no marks left to trade you.',
    };
  }
  const replacement = others[roller.roll('1d100').total % others.length];
  const nextQuirks = [...character.quirks];
  const oldId = nextQuirks[baneIdx];
  nextQuirks[baneIdx] = replacement.id;
  let oldName = oldId;
  try {
    oldName = getQuirk(oldId).name;
  } catch {
    // already fell back to id
  }
  return {
    kind: 'rerolled',
    character: { ...character, quirks: nextQuirks },
    oldName,
    newName: replacement.name,
  };
}

/**
 * Apply a resolved outcome to a character. Returns a fresh character
 * reference, the outcome's resolution flavor, a list of effect summaries,
 * and an optional ambush sentinel for the caller to honor (spawn combat
 * instead of advancing the room).
 *
 * HP changes clamp to [0, max]. Gold changes floor at 0 — a choice that
 * costs more than the player has should have been gated upstream; this is
 * a safety net.
 */
export function applyEventOutcome(
  character: Character,
  outcome: EventOutcome,
  roller: DiceRoller,
): EventOutcomeResult {
  let next: Character = { ...character };
  const effectsApplied: AppliedEffect[] = [];
  let ambush: EventOutcomeResult['ambush'];
  // Suffix flavor lines (e.g. quirk-reroll fallback) that should appear in the
  // resolution panel instead of the rewards list.
  const resolutionSuffixes: string[] = [];
  // Sum of gold added by silent paths (e.g. the no-bane fallback). Merged
  // into the rewards-list gold line at the end so the player sees one
  // total instead of duplicate lines.
  let silentGoldDelta = 0;

  for (const effect of outcome.effects) {
    switch (effect.kind) {
      case 'hp_delta': {
        const before = next.hp.current;
        const after = Math.max(0, Math.min(next.hp.max, before + effect.amount));
        next = { ...next, hp: { ...next.hp, current: after } };
        effectsApplied.push({
          kind: effect.kind,
          detail: `${effect.amount >= 0 ? '+' : ''}${after - before} HP`,
        });
        break;
      }
      case 'temp_hp': {
        // Temp HP doesn't stack — take the higher of current and granted.
        const newTemp = Math.max(next.hp.temp, effect.amount);
        next = { ...next, hp: { ...next.hp, temp: newTemp } };
        effectsApplied.push({
          kind: effect.kind,
          detail: `+${effect.amount} temp HP`,
        });
        break;
      }
      case 'gold_delta': {
        const before = next.goldInPocket;
        const after = Math.max(0, before + effect.amount);
        next = { ...next, goldInPocket: after };
        effectsApplied.push({
          kind: effect.kind,
          detail: `${effect.amount >= 0 ? '+' : ''}${after - before}g`,
        });
        break;
      }
      case 'grant_blessing': {
        const rolled = rollNewBlessing(next, roller);
        if (rolled) {
          next = { ...next, blessings: [...next.blessings, rolled] };
          effectsApplied.push({
            kind: effect.kind,
            detail: `gained ${getBlessing(rolled).name}`,
          });
        } else {
          effectsApplied.push({ kind: effect.kind, detail: 'no new blessing available' });
        }
        break;
      }
      case 'grant_blessing_id': {
        if (next.blessings.includes(effect.id)) {
          effectsApplied.push({
            kind: effect.kind,
            detail: 'blessing already held',
          });
        } else {
          let name = effect.id;
          try {
            name = getBlessing(effect.id).name;
          } catch {
            // unknown id falls back to literal
          }
          next = { ...next, blessings: [...next.blessings, effect.id] };
          effectsApplied.push({
            kind: effect.kind,
            detail: `gained ${name}`,
          });
        }
        break;
      }
      case 'grant_quirk_reroll': {
        const res = rerollOneBaneQuirk(next, roller, effect.fallbackText);
        next = res.character;
        if (res.kind === 'rerolled') {
          effectsApplied.push({
            kind: effect.kind,
            detail: `Bane shaken: ${res.oldName} → ${res.newName}`,
          });
        } else if (res.kind === 'no-marks-left') {
          effectsApplied.push({ kind: effect.kind, detail: res.detail });
        } else {
          // Fallback: surface the flavor in the resolution panel and merge
          // the consolation gold into the single rewards-list gold line.
          resolutionSuffixes.push(res.fallbackText);
          silentGoldDelta += res.fallbackGold;
        }
        break;
      }
      case 'apply_attack_bonus_run': {
        next = {
          ...next,
          delveAttackBonus: (next.delveAttackBonus ?? 0) + effect.amount,
        };
        effectsApplied.push({
          kind: effect.kind,
          detail: `+${effect.amount} attack (rest of delve)`,
        });
        break;
      }
      case 'init_bonus_run': {
        next = {
          ...next,
          delveInitBonus: (next.delveInitBonus ?? 0) + effect.amount,
        };
        effectsApplied.push({
          kind: effect.kind,
          detail: `+${effect.amount} initiative (rest of delve)`,
        });
        break;
      }
      case 'spawn_ambush': {
        ambush = { monsterDefIds: effect.monsterDefIds };
        effectsApplied.push({
          kind: effect.kind,
          detail: `ambush! (${effect.monsterDefIds.length} foe${
            effect.monsterDefIds.length === 1 ? '' : 's'
          })`,
        });
        break;
      }
      case 'reveal_boss_intel': {
        const existing = next.bossIntel ?? {};
        // Full reveal supersedes partial; never downgrade if both fire.
        const current = existing[effect.bossDefId];
        const upgraded =
          current === 'full' || effect.level === 'full' ? 'full' : 'partial';
        next = {
          ...next,
          bossIntel: { ...existing, [effect.bossDefId]: upgraded },
        };
        effectsApplied.push({
          kind: effect.kind,
          detail:
            effect.level === 'full' ? 'full intel on the boss' : 'partial intel on the boss',
        });
        break;
      }
      case 'mark_bold_approach': {
        const existing = next.boldApproachBosses ?? [];
        if (!existing.includes(effect.bossDefId)) {
          next = {
            ...next,
            boldApproachBosses: [...existing, effect.bossDefId],
          };
        }
        effectsApplied.push({
          kind: effect.kind,
          detail: '+5% gold on the boss',
        });
        break;
      }
    }
  }

  if (silentGoldDelta !== 0) {
    const existingIdx = effectsApplied.findIndex((e) => e.kind === 'gold_delta');
    if (existingIdx === -1) {
      effectsApplied.push({
        kind: 'gold_delta',
        detail: `${silentGoldDelta >= 0 ? '+' : ''}${silentGoldDelta}g`,
      });
    } else {
      const existing = effectsApplied[existingIdx];
      const match = existing.detail.match(/(-?\d+)g/);
      const prev = match ? parseInt(match[1], 10) : 0;
      const merged = prev + silentGoldDelta;
      effectsApplied[existingIdx] = {
        kind: 'gold_delta',
        detail: `${merged >= 0 ? '+' : ''}${merged}g`,
      };
    }
  }

  const resolution =
    resolutionSuffixes.length > 0
      ? `${outcome.resolution} ${resolutionSuffixes.join(' ')}`
      : outcome.resolution;

  return {
    character: next,
    resolution,
    effectsApplied,
    ambush,
  };
}
