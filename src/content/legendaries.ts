import type { AbilityName } from '../types/abilities';
import type { LegendaryBonuses } from '../types/character';
import type { ClassId } from '../schemas/ids';
import { computeSetBonuses, mergeLegendaryBonuses } from './sets';

/**
 * A legendary relic: cross-delve persistent gear (Hades "Mirror for items").
 * Unlike found/bought loot, a legendary survives death and reincarnation. Each
 * grants one small, build-defining bonus folded onto the soul at run start via
 * the active-attunement set. Bonuses speak only in channels the engine already
 * reads (ability scores, AC, crit range) so nothing here is flavor-only.
 *
 * Relics with a `setId` belong to a legendary SET — attuning multiple pieces
 * grants partial bonuses on top (see content/sets.ts).
 */
export interface Legendary {
  id: string;
  name: string;
  /** One-line flavor in the Forgotten Realms / BG2 voice. */
  flavor: string;
  /** Player-facing mechanical line, e.g. "+1 Armor Class". */
  effect: string;
  bonuses: LegendaryBonuses;
  /** Set this relic belongs to, if any (content/sets.ts). */
  setId?: string;
  /**
   * A class-specific relic only DROPS for this class; omit for class-agnostic.
   * Any owned relic can be attuned by any class — the gate is on the drop.
   */
  classGate?: ClassId;
}

/**
 * The legendary collection. The first six are standalone Wave-1 relics; the
 * rest are Wave-2 set pieces. Deliberately modest — sims tune magnitudes later;
 * the grind to earn them (rare drops) stays.
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

  // --- Set: Aegis of the Vigil (class-agnostic, 3 pieces) -------------------
  {
    id: 'vigil-helm',
    name: 'Vigil Helm',
    flavor: 'A warden’s greathelm, dented by blows that never reached the soul.',
    effect: '+1 Armor Class',
    bonuses: { ac: 1 },
    setId: 'vigil',
  },
  {
    id: 'vigil-mantle',
    name: 'Vigil Mantle',
    flavor: 'A heavy cloak stitched with the sigils of the wall-watch.',
    effect: '+1 Armor Class',
    bonuses: { ac: 1 },
    setId: 'vigil',
  },
  {
    id: 'vigil-heart',
    name: 'Vigil Heart',
    flavor: 'A locket of clouded amber that steadies a failing pulse.',
    effect: '+2 Constitution',
    bonuses: { abilityScores: { con: 2 } },
    setId: 'vigil',
  },

  // --- Set: Warsong Panoply (Fighter-specific, 2 pieces) --------------------
  {
    id: 'warsong-gauntlet',
    name: 'Warsong Gauntlet',
    flavor: 'A war-leader’s gauntlet, its knuckles scarred from a hundred charges.',
    effect: '+2 Strength',
    bonuses: { abilityScores: { str: 2 } },
    setId: 'warsong',
    classGate: 'fighter',
  },
  {
    id: 'warsong-crest',
    name: 'Warsong Crest',
    flavor: 'A crested helm that turns a battle-cry into something men follow.',
    effect: '+1 Armor Class',
    bonuses: { ac: 1 },
    setId: 'warsong',
    classGate: 'fighter',
  },
];

/** Unlock order — kept for the legacy deterministic grant + stable iteration. */
export const LEGENDARY_ORDER: readonly string[] = LEGENDARIES.map((l) => l.id);

/**
 * BASE number of legendaries that can be attuned at once. The live cap grows
 * with ascension via `legendarySlotCap` — more slots make full sets reachable.
 */
export const MAX_ACTIVE_LEGENDARIES = 2;

/** Hard ceiling on attunement slots, regardless of ascension. */
export const MAX_LEGENDARY_SLOT_CAP = 5;

/**
 * Active-legendary slot cap for a given highest-unlocked ascension. Starts at
 * the base (2) and gains a slot every two ascension rungs, so a 3-piece set
 * becomes reachable a couple of clears in and the slots themselves are a meta
 * reward. Clamped to MAX_LEGENDARY_SLOT_CAP.
 */
export function legendarySlotCap(ascensionUnlocked: number): number {
  const grown = MAX_ACTIVE_LEGENDARIES + Math.floor(Math.max(0, ascensionUnlocked) / 2);
  return Math.min(grown, MAX_LEGENDARY_SLOT_CAP);
}

const BY_ID = new Map(LEGENDARIES.map((l) => [l.id, l]));

export function getLegendary(id: string): Legendary | undefined {
  return BY_ID.get(id);
}

/**
 * The relic ids eligible to drop for a class: every class-agnostic relic plus
 * that class's own gated relics. The drop/bank path picks an un-owned id from
 * this pool.
 */
export function legendaryDropPool(classId: ClassId): string[] {
  return LEGENDARIES.filter((l) => !l.classGate || l.classGate === classId).map((l) => l.id);
}

/**
 * Sum the bonuses of the given active ids into a single aggregate, INCLUDING
 * any completed-set partial bonuses. This is the one place the engine reads —
 * `metaStore.setActiveLegendaries` bakes the result onto the character.
 */
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
  // Fold the completed-set partial bonuses on top.
  mergeLegendaryBonuses(result, computeSetBonuses(ids));
  return result;
}
