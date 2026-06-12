/**
 * Difficulty-arc sim — does the chapter ramp invert the curve?
 *
 * Question (Workstream 1 of the difficulty-arc spec): with the base-game
 * `chapterRamp` (see src/engine/delve/chapterRamp.ts) folded into createCombat,
 * does the back half of an Ascension-0 run get HARDER than the front instead of
 * rolling over — and does Grove investment become the thing that carries a soul
 * deep? This sim runs three FIXED Grove-investment tiers and reports, per tier,
 * the per-chapter death distribution, the deepest chapter reached, and the
 * ToB (Throne of Bhaal, Ch13-14) clear rate — against a ramp-OFF baseline.
 *
 * THREE TIERS (the load-bearing comparison):
 *  - bare  — 0 renown spent (a fresh soul, no Grove permanence, no relics).
 *  - mid   — ~350R of real upgrades, greedily bought off the class priority list.
 *  - full  — ~1000R+ of upgrades PLUS a seeded attuned relic collection (the
 *            developed-save tier; gear/relic slots per unlocks.ts thresholds).
 * Every tier plays the SAME full player loop the viability sim models
 * ([[feedback-sims-model-full-player-experience]]): in-run rolled affix gear
 * (greedy-equip-if-better), gold drops, shop spends, banked legendaries attuned
 * each descent, and the camp rest-fork — so the only thing that differs between
 * tiers is the Grove investment carried in.
 *
 * TARGET BAND (read RELATIVE to the ramp-off baseline — the bot is an AI floor,
 * [[feedback-balance-from-sims]] / [[feedback-sim-is-ai-floor]]; NEVER read the
 * absolutes as game truth):
 *   - Ch1-4 metrics UNCHANGED ramp-on vs ramp-off (the early grind is a pillar).
 *   - bare-soul deaths develop a MID-GAME mode (~Ch6-9); ToB reach ≈ 0 but not
 *     mathematically impossible (a perfect bare run can still sneak through).
 *   - mid-Grove wall shifts deeper, ~Ch9-12.
 *   - full-Grove reaches ToB with a real-but-HARD clear (meaningfully below the
 *     ramp-off clear rate — the deep chapters now cost you).
 *
 * RAMP TOGGLE (the baseline):
 *   CHAPTER_RAMP=off  → ramp disabled (chapter 0 passed to createCombat) — baseline
 *   CHAPTER_RAMP=on   → ramp enabled only
 *   (unset)           → runs BOTH and prints them side by side (turnkey compare)
 *
 * Each soul is a reincarnation CHAIN of LIVES lives at Ascension 0: Grove stays
 * fixed at the tier, but the relic collection accumulates life over life
 * ([[feedback-sims-die-and-respawn]]) — that is what carries a soul past the L1
 * bare-soul floor into the mid/late chapters where the ramp actually lives, so
 * LIVES must be reasonably large for a meaningful read.
 *
 * Run (tuning pass — caffeinate it, [[feedback-caffeinate-long-lane-runs]]):
 *   SOULS=40 LIVES=80 caffeinate -dimsu npx tsx scripts/sim-difficulty-arc.ts
 *
 * THIS LANE DOES NOT TUNE OFF THIS SIM ([[feedback-agents-no-inline-sims]]). It
 * ships the seam + conservative provisional constants; a post-merge pass runs
 * this and lands the calibrated constants as its own commit. The lane only
 * smoke-runs a tiny grid (SOULS=2 LIVES=2) to prove the script executes.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, parseDiceExpression, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { getItem } from '../src/content/items';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { weaponDamageDice } from '../src/engine/combat/attack/playerAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import { chooseCombatAction, applyPlannedAction, ARCHETYPES, type Archetype } from '../src/engine/combat/actionPolicy';
import { pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
  type UnlockedUpgrades,
} from '../src/engine/character/upgrades';
import { findUpgrade } from '../src/content/upgrades';
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
import { rollQuirks } from '../src/engine/character/quirks';
import { computeAC } from '../src/engine/character/derived';
import { equipItem, slotForItem } from '../src/engine/character/equip';
import { monkFightsUnarmed } from '../src/engine/combat/monk';
import { characterAffixMods } from '../src/engine/items/affixMods';
import { rollGearDrop, rollPotionDrop, rollLegendaryDrop } from '../src/engine/items/drops';
import { buyShopConsumables } from '../src/engine/character/shopPolicy';
import { rollItem } from '../src/engine/items/rollItem';
import { rollRoomGoldDrops } from '../src/engine/combat/goldDrop';
import {
  legendaryDropPool,
  aggregateLegendaryEffects,
  canEquipLegendary,
} from '../src/content/legendaries';
import { rollGearStock, rollLegendaryOffer, tierForChapter } from '../src/components/delve/shopStock';
import { boonsForCampTier, type CampBoon, type CampBoonTier } from '../src/content/campBoons';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { ItemRef } from '../src/schemas/item';
import type { ClassId as SchemaClassId } from '../src/schemas/ids';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'fighter' | 'rogue' | 'wizard' | 'barbarian' | 'ranger' | 'druid' | 'monk' | 'bard' | 'paladin';

// Default to the two classes that actually CLEAR in bot hands (fighter/monk) —
// per the sim memory, only they climb the ladder at the AI floor, so their
// per-chapter death distribution is a meaningful read of where the wall lands.
// A bare caster dies early regardless (a bot-floor artifact) and would muddy the
// "where does the bare soul wall" signal. Override with CLASSES=fighter,wizard,…
const ALL_CLASSES: ClassId[] = ['fighter', 'rogue', 'wizard', 'barbarian', 'ranger', 'druid', 'monk', 'bard', 'paladin'];
const CLASSES: ClassId[] = (process.env.CLASSES?.split(',').map((s) => s.trim()).filter(Boolean) as ClassId[] | undefined)
  ?.filter((c) => ALL_CLASSES.includes(c)) ?? ['fighter', 'monk'];

// Tuning-scale defaults — each soul is a reincarnation chain of LIVES lives, so
// LIVES must be large enough for the relic accumulation to develop a soul past the
// L1 floor into the mid/late chapters where the ramp lives. The smoke run overrides
// both down to a 2×2 grid just to prove execution.
const SOULS = Number(process.env.SOULS ?? 40);
const LIVES = Number(process.env.LIVES ?? 60);
const ARCHETYPE: Archetype = (ARCHETYPES as readonly string[]).includes(process.env.ARCHETYPE ?? '')
  ? (process.env.ARCHETYPE as Archetype)
  : 'balanced';
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xa12c >>> 0;

// Which ramp modes to run. unset → both (turnkey compare); on/off → just that one.
const RAMP_ENV = process.env.CHAPTER_RAMP;
const RAMP_MODES: boolean[] = RAMP_ENV === 'off' ? [false] : RAMP_ENV === 'on' ? [true] : [true, false];

// ─── Grove investment tiers ──────────────────────────────────────────────────

interface Tier {
  name: string;
  /** Renown budget greedily spent on the class priority list before descending. */
  renownBudget: number;
  /** Owned relics seeded (attuned each descent) — the developed-save axis. */
  relics: number;
}
const TIERS: Tier[] = [
  { name: 'bare', renownBudget: Number(process.env.BARE_R ?? 0), relics: 0 },
  { name: 'mid', renownBudget: Number(process.env.MID_R ?? 350), relics: 0 },
  { name: 'full', renownBudget: Number(process.env.FULL_R ?? 1200), relics: Number(process.env.FULL_RELICS ?? 3) },
];

// Greedy Grove priority — defensive scaling first (HP/AC), then class damage.
// Mirrors sim-class-viability's lists closely enough for a difficulty read.
const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },
  { id: 'mielikki-cache', maxAtRank: 4 },
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },
  { id: 'cloak-of-the-grove', maxAtRank: 3 },
  { id: 'hardier-soul', maxAtRank: 3 },
  { id: 'coin-in-pocket', maxAtRank: 3 },
  { id: 'iron-will', maxAtRank: 1 },
];
const CLASS_PRIORITY: Partial<Record<ClassId, { id: string; maxAtRank: number }[]>> = {
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  monk: [
    { id: 'brimming-well', maxAtRank: 2 },
    { id: 'pressure-points', maxAtRank: 3 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'killers-eye', maxAtRank: 2 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 },
    { id: 'knife-in-the-dark', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
  ],
  wizard: [
    { id: 'wellspring-of-mysteries', maxAtRank: 2 },
    { id: 'burning-tongue', maxAtRank: 5 },
    { id: 'arcane-focus', maxAtRank: 3 },
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },
  ],
  druid: [
    { id: 'primal-reservoir', maxAtRank: 2 },
    { id: 'deep-roots', maxAtRank: 2 },
    { id: 'verdant-wrath', maxAtRank: 4 },
    { id: 'arcane-focus', maxAtRank: 3 },
  ],
  barbarian: [
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'killers-eye', maxAtRank: 2 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  ranger: [
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'bleed-out', maxAtRank: 2 },
  ],
  bard: [
    { id: 'arcane-focus', maxAtRank: 3 },
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },
    { id: 'burning-tongue', maxAtRank: 5 },
  ],
  paladin: [
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'fellfast-strike', maxAtRank: 3 },
    { id: 'arcane-focus', maxAtRank: 3 },
  ],
};

function priorityFor(classId: ClassId): { id: string; maxAtRank: number }[] {
  const cls = CLASS_PRIORITY[classId] ?? [];
  const out: { id: string; maxAtRank: number }[] = [SHARED_PRIORITY[0]];
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}

/** Greedily spend a fixed renown budget on the class priority list — the tier's Grove state. */
function buyTierUpgrades(classId: ClassId, budget: number): UnlockedUpgrades {
  let r = budget;
  const u: UnlockedUpgrades = {};
  const list = priorityFor(classId);
  let bought = true;
  let safety = 0;
  while (bought && safety < 200) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const cost = up.costForRank(curRank + 1);
      if (r >= cost) {
        r -= cost;
        u[id] = curRank + 1;
        bought = true;
        break;
      }
    }
  }
  return u;
}

function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) ch = applyPermanentUpgrade(ch, id, r);
  }
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

// ─── Loot loop (faithful trim of sim-class-viability) ────────────────────────

function chooseActiveLegendaries(owned: string[], classId: ClassId): string[] {
  return owned.filter((id) => canEquipLegendary(id, classId as SchemaClassId));
}
function avgDice(expr: string): number {
  try {
    const { count, die, modifier } = parseDiceExpression(expr);
    return (count * (die + 1)) / 2 + modifier;
  } catch {
    return 0;
  }
}
function loadoutScore(c: Character): number {
  let score = 0;
  const mh = c.equipped.mainHand;
  if (mh) {
    const w = getItem(mh.itemId);
    if (w.kind === 'weapon') score += avgDice(weaponDamageDice(w, !c.equipped.offHand)) * 1.6;
  }
  score += computeAC(c) * 2.5;
  const m = characterAffixMods(c);
  score += m.attackBonus * 2.5 + m.damageBonus * 1.6 + m.bleedDamage * 1.3 + m.lifestealPct * 0.06;
  score += m.tempHpPerCombat * 0.35 + m.critRangeBonus * 1.8 + m.resists.length;
  score += (m.rageDamageBonus + m.markDamageBonus + m.sneakDamageBonus + m.followupDamageBonus) * 0.6;
  score += m.spellDcBonus * 2.6 + m.spellDamageBonus * 1.6 + m.spellAttackBonus * 2.6 + m.bonusSpellSlotsL1 * 3;
  return score;
}
function tryEquipDrop(c: Character, ref: ItemRef): Character {
  if (monkFightsUnarmed(c) && slotForItem(ref.itemId) === 'mainHand') return c;
  const withItem: Character = { ...c, inventory: [...c.inventory, ref] };
  const equipped = equipItem(withItem, c.inventory.length);
  if (equipped === withItem) return c;
  return loadoutScore(equipped) > loadoutScore(c) + 0.01 ? equipped : c;
}
function reEquipFromInventory(c: Character): Character {
  let best = c;
  for (let i = 0; i < best.inventory.length; i++) {
    const ref = best.inventory[i];
    if (monkFightsUnarmed(best) && slotForItem(ref.itemId) === 'mainHand') continue;
    const equipped = equipItem(best, i);
    if (equipped !== best && loadoutScore(equipped) > loadoutScore(best) + 0.01) best = equipped;
  }
  return best;
}
function bankRandomLegendary(roller: DiceRoller, classId: SchemaClassId, owned: string[]): string | null {
  const pool = legendaryDropPool(classId).filter((id) => !owned.includes(id));
  if (pool.length === 0) return null;
  return pool[(roller.roll('1d100').total - 1) % pool.length];
}

interface RoomLoot {
  character: Character;
  gold: number;
  newLegendaries: string[];
}
function resolveCombatLoot(roller: DiceRoller, character: Character, room: RoomSpec, owned: string[]): RoomLoot {
  let c = character;
  const newLegendaries: string[] = [];
  const defIds = (room.monsters ?? []).flatMap((m) => Array.from({ length: m.count }, () => m.defId));
  const gold = (room.goldReward ?? 0) + rollRoomGoldDrops(roller, defIds);
  const dropRarity = rollGearDrop(roller, room.kind);
  if (dropRarity) c = tryEquipDrop(c, rollItem(roller, { rarity: dropRarity, classId: c.classId }));
  // Healing-draught side channel — rung pool tiers with the room's chapter,
  // mirroring delveStore.resolveRoomVictory.
  const potionId = rollPotionDrop(roller, room.kind, room.chapter ?? 1);
  if (potionId) c = { ...c, inventory: [...c.inventory, { itemId: potionId }] };
  if (rollLegendaryDrop(roller, room.kind)) {
    const banked = bankRandomLegendary(roller, c.classId, [...owned, ...newLegendaries]);
    if (banked) newLegendaries.push(banked);
  }
  return { character: c, gold, newLegendaries };
}
function visitShop(character: Character, room: RoomSpec, lifeIdx: number, owned: string[]): { character: Character; newLegendaries: string[] } {
  let c = character;
  let gold = c.goldInPocket;
  const newLegendaries: string[] = [];
  const tier = tierForChapter(room.chapter);
  const seed = `${room.id}:${lifeIdx}`;
  const offer = rollLegendaryOffer(seed, tier, c.classId, [...owned, ...newLegendaries]);
  if (offer && gold >= offer.cost) {
    newLegendaries.push(offer.legendaryId);
    gold -= offer.cost;
  }
  const stock = rollGearStock(seed, tier, c.classId).slice().sort((a, b) => b.cost - a.cost);
  for (const { ref, cost } of stock) {
    if (gold < cost) continue;
    const after = tryEquipDrop(c, ref);
    if (after !== c) {
      c = after;
      gold -= cost;
    }
  }
  // Tier-aware consumable buys (shared engine policy): the dearest legal heal
  // rungs first, then one Elixir of Iron / Oil of Sharpness at depth.
  c = buyShopConsumables({ ...c, goldInPocket: gold }, room.chapter);
  return { character: c, newLegendaries };
}
function chapterClearGoldFor(c: Character): number {
  return (c.chapterClearGoldBonus ?? 0) + (c.permanentBonuses?.chapterClearGold ?? 0);
}

// ─── Camp rest-fork (Rest / Attune / Tempt the Dark) ─────────────────────────

function applyCampBoon(character: Character, boon: CampBoon): Character {
  let c: Character = { ...character, campBoons: [...(character.campBoons ?? []), boon.id] };
  if (boon.id === 'vigor-of-the-road') {
    const bump = Math.max(1, Math.floor(c.hp.max * 0.05));
    c = { ...c, hp: { ...c.hp, max: c.hp.max + bump, current: c.hp.current + bump } };
  } else if (boon.id === 'mantle-of-the-slain') {
    c = { ...c, hp: { ...c.hp, max: c.hp.max + c.level, current: c.hp.current + c.level } };
  } else if (boon.id === 'patience-of-ilmater') {
    c = { ...c, delveStabiliseBonus: (c.delveStabiliseBonus ?? 0) + 1 };
  }
  return c;
}
function temptTheDark(roller: DiceRoller, character: Character, tier: number): Character {
  const roll = roller.roll('1d20').total;
  if (roll >= 11) {
    const [blessingId] = rollBlessingOptions(roller, 1, character.classId, character.blessings);
    const gold = blessingId ? 15 * tier : 50 * tier;
    let c = character;
    if (blessingId) c = { ...c, blessings: [...c.blessings, blessingId] };
    return { ...c, goldInPocket: c.goldInPocket + gold };
  }
  const dmg = Math.max(1, Math.floor(character.hp.max * 0.25));
  return { ...character, hp: { ...character.hp, current: Math.max(1, character.hp.current - dmg) } };
}
function resolveCamp(roller: DiceRoller, character: Character, classId: ClassId, campCount: number): Character {
  const hpFrac = character.hp.max > 0 ? character.hp.current / character.hp.max : 1;
  const validTier = campCount >= 1 && campCount <= 3;
  const boonOptions = validTier ? boonsForCampTier(campCount as CampBoonTier, classId as SchemaClassId) : [];
  const riskTier = validTier ? campCount : 1;
  if (hpFrac < 0.6) return longRest(character);
  if (hpFrac > 0.8 && roller.roll('1d6').total <= 2) return temptTheDark(roller, character, riskTier);
  if (boonOptions.length > 0) return applyCampBoon(character, boonOptions[1] ?? boonOptions[0]);
  return longRest(character);
}

// ─── Combat (shared action policy, ramp toggled) ─────────────────────────────

function runPlayerTurn(roller: DiceRoller, state: CombatState, character: Character): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  for (let i = 0; i < 16; i++) {
    if (s.status !== 'active') break;
    const action = chooseCombatAction(s, ch, ARCHETYPE);
    if (action.kind === 'end-turn') break;
    const r = applyPlannedAction({ roller, state: s, character: ch }, action);
    if (r.state === s && r.character === ch) break;
    s = r.state;
    ch = r.character;
  }
  return { state: s, character: ch };
}

function runCombatRoom(
  roller: DiceRoller,
  characterIn: Character,
  room: RoomSpec,
  rampOn: boolean,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix, statMult: rm.statMult }));
  });
  const init = createCombat({
    roller,
    character: characterIn,
    monsters: monsterRefs,
    // The toggle: ramp on → pass the real chapter; ramp off (baseline) → chapter 0.
    chapter: rampOn ? (room.chapter ?? 0) : 0,
    isBoss: room.kind === 'boss',
    isElite: room.kind === 'elite',
    twistId: room.twistId,
  });
  let state: CombatState = init.state;
  let character: Character = init.character;
  let turns = 0;
  while (state.status === 'active' && turns < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const turn = runPlayerTurn(roller, state, character);
      state = turn.state;
      character = turn.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    } else {
      const r = monsterAttack({ roller, character, state }, state.turnOrder[state.currentTurnIndex]);
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    }
    turns += 1;
  }
  return { character, victory: state.status === 'player-victory' };
}

// ─── One vessel (fixed Grove tier, one routed life at Ascension 0) ────────────

interface LifeResult {
  cleared: boolean;
  deepestChapter: number;
  deathChapter: number | null;
}

function descend(roller: DiceRoller, classId: ClassId, unlocked: UnlockedUpgrades, ownedLegendaries: string[]): Character {
  let c = buildPlayerCharacter(presetCreationInput(classId));
  c = applyPermanentUpgrades(c, unlocked);
  c = applyDelveStartUpgrades(c, unlocked);
  c = { ...c, quirks: rollQuirks(roller, 2) };
  const active = chooseActiveLegendaries(ownedLegendaries, classId);
  c = { ...c, legendaryEffects: aggregateLegendaryEffects(active) };
  const startingGold = Math.round(c.permanentBonuses?.startingGold ?? 0);
  c = { ...c, goldInPocket: startingGold, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

function liveOneLife(
  roller: DiceRoller,
  classId: ClassId,
  unlocked: UnlockedUpgrades,
  ownedLegendaries: string[],
  seed: number,
  rampOn: boolean,
): { result: LifeResult; newLegendaries: string[] } {
  let character = descend(roller, classId, unlocked, ownedLegendaries);
  const delve = createGodwakeDelve({ seed, ascension: 0, fullChain: true });
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const isBranching = delve.rooms.some((r) => (r.next?.length ?? 0) > 0);
  let curId: string | undefined = delve.rooms[0]?.id;
  const guard = new Set<string>();
  let deepestChapter = 1;
  let deathChapter: number | null = null;
  const localOwned = [...ownedLegendaries];
  const newLegendaries: string[] = [];
  let campCount = 0;

  while (curId && !guard.has(curId)) {
    guard.add(curId);
    const room = byId.get(curId);
    if (!room) break;
    deepestChapter = Math.max(deepestChapter, room.chapter ?? deepestChapter);

    if (room.kind === 'rest') {
      const heal = Math.floor(character.hp.max * 0.7);
      character = { ...character, hp: { ...character.hp, current: Math.min(character.hp.max, character.hp.current + heal) } };
    } else if (room.kind === 'camp') {
      campCount += 1;
      character = resolveCamp(roller, character, classId, campCount);
    } else if (room.kind === 'shrine') {
      character = pickBlessingAtShrine(roller, character);
    } else if (room.kind === 'shop') {
      const shop = visitShop(character, room, seed, localOwned);
      character = shop.character;
      localOwned.push(...shop.newLegendaries);
      newLegendaries.push(...shop.newLegendaries);
    } else if (room.kind === 'treasure') {
      character = { ...character, goldInPocket: character.goldInPocket + (room.goldReward ?? 0) };
    } else if (room.kind === 'event') {
      // sim skips events
    } else {
      const isBoss = room.kind === 'boss';
      const result = runCombatRoom(roller, character, room, rampOn);
      character = result.character;
      if (!result.victory) {
        deathChapter = room.chapter ?? deepestChapter;
        break;
      }
      const loot = resolveCombatLoot(roller, character, room, localOwned);
      character = { ...loot.character, goldInPocket: loot.character.goldInPocket + loot.gold };
      localOwned.push(...loot.newLegendaries);
      newLegendaries.push(...loot.newLegendaries);
      if (isBoss) character = { ...character, goldInPocket: character.goldInPocket + chapterClearGoldFor(character) };
      const rXp = room.xpReward ?? 0;
      if (rXp > 0) {
        character = { ...character, xp: character.xp + rXp };
        while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
          character = simulateLevelUp(character);
        }
        character = reEquipFromInventory(character);
      }
    }

    const nexts = room.next ?? [];
    if (nexts.length >= 1) {
      curId = nexts.length === 1 ? nexts[0] : nexts[roller.roll('1d20').total % nexts.length];
    } else if (isBranching || room.kind === 'boss') {
      break;
    } else {
      const ni = delve.rooms.findIndex((r) => r.id === curId) + 1;
      curId = ni > 0 && ni < delve.rooms.length ? delve.rooms[ni].id : undefined;
    }
  }

  return {
    result: { cleared: deathChapter === null, deepestChapter, deathChapter },
    newLegendaries,
  };
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

interface TierResult {
  tier: string;
  rampOn: boolean;
  classId: ClassId;
  lives: number;
  clears: number;
  tobReaches: number; // lives that entered Ch13+
  tobClears: number; // lives that cleared the full chain (Ch14 boss)
  meanDeepest: number;
  maxDeepest: number; // high-water mark — the deepest any life reached (the tail)
  deathByChapter: number[]; // index = chapter (1..14)
}

function runTier(classId: ClassId, tier: Tier, rampOn: boolean): TierResult {
  // Grove is FIXED at the tier's investment for the whole chain (the comparison
  // axis). What DEVELOPS across lives is the relic collection: each soul is a
  // reincarnation chain at Ascension 0, banking legendaries life after life
  // ([[feedback-sims-die-and-respawn]]). That accumulation is what lifts a soul
  // past the L1 bare-soul floor over a long run, so a big pass actually reaches
  // the mid/late chapters where the ramp lives — a single fresh L1 life never
  // would. The tuning read is RELATIVE (ramp-on vs off, and tier vs tier).
  const unlocked = buyTierUpgrades(classId, tier.renownBudget);
  const deathByChapter = Array.from({ length: 15 }, () => 0);
  let clears = 0;
  let tobReaches = 0;
  let tobClears = 0;
  let deepestSum = 0;
  let maxDeepest = 1;
  let lives = 0;

  for (let s = 0; s < SOULS; s++) {
    const soulSeed = (SEED_BASE ^ (classId.charCodeAt(0) * 7919) ^ (tier.name.charCodeAt(0) * 1009) ^ (s * 104729)) >>> 0;
    const roller = createDiceRoller(soulSeed);
    setActiveRoller(soulSeed);
    // Seed the tier's relic head-start, then let the chain accumulate more.
    const ownedLegendaries: string[] = [];
    for (let i = 0; i < tier.relics; i++) {
      const banked = bankRandomLegendary(roller, classId as SchemaClassId, ownedLegendaries);
      if (banked) ownedLegendaries.push(banked);
    }
    for (let l = 0; l < LIVES; l++) {
      const lifeSeed = (soulSeed + l * 2654435761) >>> 0;
      const { result: res, newLegendaries } = liveOneLife(roller, classId, unlocked, ownedLegendaries, lifeSeed, rampOn);
      ownedLegendaries.push(...newLegendaries);
      lives += 1;
      deepestSum += res.deepestChapter;
      maxDeepest = Math.max(maxDeepest, res.deepestChapter);
      if (res.cleared) clears += 1;
      if (res.deepestChapter >= 13) tobReaches += 1;
      if (res.cleared && res.deepestChapter >= 14) tobClears += 1;
      if (res.deathChapter !== null) deathByChapter[Math.min(14, Math.max(1, res.deathChapter))] += 1;
    }
  }

  return {
    tier: tier.name,
    rampOn,
    classId,
    lives,
    clears,
    tobReaches,
    tobClears,
    meanDeepest: deepestSum / Math.max(1, lives),
    maxDeepest,
    deathByChapter,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(1)}%`;

function renderTable(rows: TierResult[]): string {
  const lines: string[] = [];
  lines.push('| Class | Tier | Ramp | Lives | Clear% | ToB reach% | ToB clear% | Mean deepest | Max deepest | Death by chapter (1→14) |');
  lines.push('|------|-----|-----|------:|------:|----------:|----------:|------------:|-----------:|----------------------|');
  for (const r of rows) {
    const deaths = r.deathByChapter
      .map((n, ch) => ({ n, ch }))
      .filter((x) => x.ch >= 1 && x.n > 0)
      .map((x) => `${x.ch}:${x.n}`)
      .join(' ');
    lines.push(
      `| ${r.classId} | ${r.tier} | ${r.rampOn ? 'ON' : 'off'} | ${r.lives} | ${pct(r.clears, r.lives)} | ${pct(r.tobReaches, r.lives)} | ${pct(r.tobClears, r.lives)} | ${r.meanDeepest.toFixed(1)} | ${r.maxDeepest} | ${deaths || '—'} |`,
    );
  }
  return lines.join('\n');
}

function renderDoc(rows: TierResult[], wallSec: string): string {
  return `# Difficulty-arc sim findings (chapter ramp, Ascension 0)

> Auto-generated by \`scripts/sim-difficulty-arc.ts\`. Re-run with
> \`SOULS=${SOULS} LIVES=${LIVES} npx tsx scripts/sim-difficulty-arc.ts\`.
> Classes: ${CLASSES.join(', ')}. Wall clock: ${wallSec}s.

## What this measures

Three FIXED Grove-investment tiers (bare 0R / mid ~${TIERS[1].renownBudget}R / full
~${TIERS[2].renownBudget}R + ${TIERS[2].relics} relics), each playing the full player loop
(rolled gear, gold, shop, attuned relics, camp rest-fork) at Ascension 0 over the
full 14-chapter chain, with the chapter ramp ON vs the ramp-OFF baseline.

> ⚠️ **Read RELATIVE, not absolute** — the bot is an AI floor. Compare ramp-ON vs
> ramp-off, and tier vs tier; never read an absolute clear% as game truth.
>
> ⚠️ **The L1 floor dominates the MEAN.** A fresh L1 vessel mostly dies in the
> opening Ch1 gauntlet in bot hands (no healing between the first back-to-back
> combats), so \`mean deepest\` is pinned near Ch1 and is NOT the signal. The
> deep-chapter reach lives in the long TAIL of developed lives (relics
> accumulated over the chain) — read the **death-by-chapter histogram** and
> **max deepest**, and run LARGE (SOULS≥40, LIVES≥80) so the tail populates.
> If the deep tail is still too thin to separate the tier walls, the ramp is
> better probed with a per-chapter drop-in harness (calibrate a vessel to the
> level/gear a real player has on arrival at chapter C and measure survival there,
> bypassing the L1 floor) — flagged for the tuning pass.

**Target band:** Ch1-4 metrics UNCHANGED ramp-on vs off; bare-soul deaths develop
a mid-game mode (~Ch6-9), ToB reach ≈ 0 (not impossible); mid-Grove wall ~Ch9-12;
full-Grove reaches ToB with a real-but-hard clear (well below the ramp-off rate).

## Results

${renderTable(rows)}

- **ToB reach%** — share of lives that entered Ch13+.
- **ToB clear%** — share of lives that cleared the Ch14 final boss (Melissan).
- **Death by chapter** — \`chapter:count\` of where lives ended (the wall's shape).
`;
}

function main(): void {
  const t0 = Date.now();
  console.log(
    `Difficulty-arc sim — classes=${CLASSES.join(',')} tiers=${TIERS.map((t) => t.name).join('/')} ` +
      `SOULS=${SOULS} LIVES=${LIVES} ramp=${RAMP_MODES.map((m) => (m ? 'on' : 'off')).join('+')}\n`,
  );
  const rows: TierResult[] = [];
  for (const classId of CLASSES) {
    for (const tier of TIERS) {
      for (const rampOn of RAMP_MODES) {
        const r = runTier(classId, tier, rampOn);
        rows.push(r);
        console.log(
          `${classId.padEnd(9)} ${tier.name.padEnd(5)} ramp=${(rampOn ? 'ON' : 'off').padEnd(3)}  ` +
            `clr ${pct(r.clears, r.lives).padStart(6)}  ToBreach ${pct(r.tobReaches, r.lives).padStart(6)}  ` +
            `ToBclr ${pct(r.tobClears, r.lives).padStart(6)}  deepest ${r.meanDeepest.toFixed(1)}`,
        );
      }
    }
  }
  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  const outPath = resolve(process.cwd(), 'docs/sim-findings/difficulty-arc.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderDoc(rows, wall), 'utf8');
  console.log(`\nWrote findings → ${outPath}  (${wall}s wall)`);
}

main();
