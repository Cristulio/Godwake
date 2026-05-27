import type { Character } from '../../types/character';
import type { DiceRoller } from '../dice';
import type {
  EventChoiceOutcome,
  EventEffect,
  EventOutcome,
} from '../../schemas/event';
import { listBlessings, getBlessing } from '../../content/blessings';
import { listQuirks, getQuirk } from '../../content/quirks';

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
 * Replace one bane quirk with a fresh random pick from the pool. No-op when
 * the character carries no bane quirks. The replacement may roll back to
 * the same quirk slot in rare cases — that's fine; a soul that walked out
 * the door of a god and came back with the same mark is a story.
 */
function rerollOneBaneQuirk(character: Character, roller: DiceRoller): {
  character: Character;
  detail: string;
} {
  const baneIdx = character.quirks.findIndex((qid) => {
    try {
      return getQuirk(qid).sentiment === 'bane';
    } catch {
      return false;
    }
  });
  if (baneIdx === -1) {
    return { character, detail: 'no bane quirk to re-roll' };
  }
  const pool = listQuirks();
  const owned = new Set(character.quirks);
  const others = pool.filter((q) => !owned.has(q.id));
  if (others.length === 0) {
    return { character, detail: 'no replacement quirk available' };
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
    character: { ...character, quirks: nextQuirks },
    detail: `re-rolled ${oldName} → ${replacement.name}`,
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
        const { character: rerolled, detail } = rerollOneBaneQuirk(next, roller);
        next = rerolled;
        effectsApplied.push({ kind: effect.kind, detail });
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
    }
  }

  return {
    character: next,
    resolution: outcome.resolution,
    effectsApplied,
    ambush,
  };
}
