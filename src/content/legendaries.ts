import type { AbilityName } from '../types/abilities';
import type { LegendaryBonuses } from '../types/character';

/**
 * A legendary relic: cross-delve persistent gear (Hades "Mirror for items").
 * Unlike found/bought loot, a legendary survives death and reincarnation. Each
 * grants one small, build-defining bonus folded onto the soul at run start via
 * the active-attunement set. Bonuses speak only in channels the engine already
 * reads (ability scores, AC, crit range) so nothing here is flavor-only.
 */
export interface Legendary {
  id: string;
  name: string;
  /** One-line flavor in the Forgotten Realms / BG2 voice. */
  flavor: string;
  /** Player-facing mechanical line, e.g. "+1 Armor Class". */
  effect: string;
  bonuses: LegendaryBonuses;
}

/**
 * The fixed legendary set. List order is unlock order: each delve clear grants
 * the next un-owned relic, so the collection fills in over several clears.
 * Deliberately small and modest — sims tune magnitudes later; the grind to
 * earn them stays.
 */
export const LEGENDARIES: readonly Legendary[] = [
  {
    id: 'heartwood-talisman',
    name: 'Heartwood Talisman',
    flavor: 'A knot of livewood cut from Mielikki’s grove, still warm with sap.',
    effect: '+2 Constitution — sturdier, harder to put down',
    bonuses: { abilityScores: { con: 2 } },
  },
  {
    id: 'bulwark-sigil',
    name: 'Bulwark Sigil',
    flavor: 'A warding glyph hammered into old shield-bronze, cold to the touch.',
    effect: '+1 Armor Class',
    bonuses: { ac: 1 },
  },
  {
    id: 'gauntlets-of-the-titan',
    name: 'Gauntlets of the Titan',
    flavor: 'Oversized vambraces that lend a giant’s pull to a mortal arm.',
    effect: '+2 Strength — heavier blows in melee',
    bonuses: { abilityScores: { str: 2 } },
  },
  {
    id: 'cloak-of-the-nightwind',
    name: 'Cloak of the Nightwind',
    flavor: 'Spun from shadow and a hunting cat’s quiet.',
    effect: '+2 Dexterity — sharper aim and surer footing',
    bonuses: { abilityScores: { dex: 2 } },
  },
  {
    id: 'sages-diadem',
    name: 'Sage’s Diadem',
    flavor: 'A thin circlet that hums faintly against the temples.',
    effect: '+2 Intelligence — stronger spellcraft',
    bonuses: { abilityScores: { int: 2 } },
  },
  {
    id: 'hunters-eye',
    name: 'Hunter’s Eye',
    flavor: 'A petrified raptor’s eye that never blinks at a weak point.',
    effect: 'Critical hits land on 19–20',
    bonuses: { critRange: 1 },
  },
];

/** Unlock order — the next un-owned id is the next clear's reward. */
export const LEGENDARY_ORDER: readonly string[] = LEGENDARIES.map((l) => l.id);

/** Attunement cap: how many legendaries can be active at once (mirror-style). */
export const MAX_ACTIVE_LEGENDARIES = 2;

const BY_ID = new Map(LEGENDARIES.map((l) => [l.id, l]));

export function getLegendary(id: string): Legendary | undefined {
  return BY_ID.get(id);
}

/** Sum the bonuses of the given active ids into a single aggregate. */
export function aggregateLegendaryBonuses(ids: readonly string[]): LegendaryBonuses {
  const result: LegendaryBonuses = {};
  const abilityScores: Partial<Record<AbilityName, number>> = {};
  let hasAbility = false;
  for (const id of ids) {
    const leg = BY_ID.get(id);
    if (!leg) continue;
    const b = leg.bonuses;
    if (b.ac) result.ac = (result.ac ?? 0) + b.ac;
    if (b.critRange) result.critRange = (result.critRange ?? 0) + b.critRange;
    if (b.abilityScores) {
      for (const k of Object.keys(b.abilityScores) as AbilityName[]) {
        abilityScores[k] = (abilityScores[k] ?? 0) + (b.abilityScores[k] ?? 0);
        hasAbility = true;
      }
    }
  }
  if (hasAbility) result.abilityScores = abilityScores;
  return result;
}
