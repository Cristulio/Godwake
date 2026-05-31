/**
 * Gear-aware endgame meta sim — the Hades gate probe.
 *
 * The standing class-viability sim (scripts/sim-class-viability.ts) models the
 * reincarnation/Grove loop but is LOOT-BLIND: it never resolves a drop, a shop
 * buy, an affix, or a legendary. That makes it a no-loot floor — it cannot see
 * the real endgame power a soul accumulates, so it cannot judge the Hades-style
 * Ch5/Ch6 gate (clear the back half only once you've banked enough renown +
 * legendary gear over many runs).
 *
 * This sim closes that gap. It runs the SAME reincarnation chain + shared
 * Auto-Battle policy, but models the COMPLETE player loop
 * ([[feedback-sims-model-full-player-experience]]):
 *   - combat / elite / boss clears roll GOLD (rollRoomGoldDrops) + a low-chance
 *     rolled affix item (rollGearDrop → rollItem), greedily equipped if it
 *     improves the loadout, + a rare LEGENDARY (rollLegendaryDrop) banked to the
 *     soul's persistent collection,
 *   - shop rooms spend gold on the rolled arms rack (rollGearStock), the
 *     reliquary legendary offer (rollLegendaryOffer), and healing potions,
 *   - the persistent legendary collection accumulates ACROSS lives; before each
 *     descent the soul attunes its best set within the ascension slot-cap and
 *     the aggregate (incl. set bonuses) is baked onto the character,
 *   - the Grove is bought greedily INCLUDING the ascension-gated endgame nodes.
 *
 * Because the engine already reads affix mods (createCombat / playerAttack /
 * monsterAttack) and legendary bonuses (derived.ts), equipping rolled gear onto
 * the sim character feeds combat with zero extra plumbing.
 *
 * The deliverable is the GATE CURVE: does a bare soul fail the back half, and
 * does a meta-progressed soul (deep Grove + legendary sets, accumulated over
 * many runs) eventually clear Ch6 — and after how many runs?
 *
 * Run:
 *   SOULS_PER_CLASS=60 MAX_LIVES=140 npx tsx scripts/sim-endgame-gear.ts
 *
 * Writes curated findings to docs/sim-findings/endgame-gear.md.
 *
 * FRAMING: absolute clear-rates are still an AI-floor read (the bot underplays a
 * real player) — but modelling loot RAISES that floor toward real play, and the
 * deliverable is the GATING DIRECTION (bare fails / geared eventually clears)
 * and the relative curve, not the magnitudes.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import {
  createDiceRoller,
  setActiveRoller,
  parseDiceExpression,
  type DiceRoller,
} from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { getItem } from '../src/content/items';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { weaponDamageDice } from '../src/engine/combat/attack/playerAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import { chooseCombatAction, applyPlannedAction } from '../src/engine/combat/actionPolicy';
import { pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
  type UnlockedUpgrades,
} from '../src/engine/character/upgrades';
import { findUpgrade } from '../src/content/upgrades';
import { buildPlayerCharacter, presetCreationInput } from '../src/engine/character/defaultCharacter';
import { rollQuirks, renownSoulMarkMultiplier } from '../src/engine/character/quirks';
import { MAX_ASCENSION, getAscensionLevel } from '../src/engine/delve/ascension';
import { computeAC } from '../src/engine/character/derived';
import { equipItem } from '../src/engine/character/equip';
import { characterAffixMods } from '../src/engine/items/affixMods';
import { rollGearDrop, rollLegendaryDrop } from '../src/engine/items/drops';
import { rollItem } from '../src/engine/items/rollItem';
import { rollRoomGoldDrops } from '../src/engine/combat/goldDrop';
import {
  legendaryDropPool,
  aggregateLegendaryEffects,
  canEquipLegendary,
} from '../src/content/legendaries';
import { rollGearStock, rollLegendaryOffer, tierForChapter } from '../src/components/delve/shopStock';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { ItemRef } from '../src/schemas/item';
import type { ClassId as SchemaClassId } from '../src/schemas/ids';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'fighter' | 'rogue' | 'wizard' | 'barbarian' | 'ranger';
const CLASSES: ClassId[] = ['fighter', 'rogue', 'wizard', 'barbarian', 'ranger'];

const SOULS_PER_CLASS = Number(process.env.SOULS_PER_CLASS ?? 60);
const MAX_LIVES = Number(process.env.MAX_LIVES ?? 140);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc1a55 >>> 0;
const MODEL_GEAR = process.env.MODEL_GEAR !== '0'; // default ON; set 0 for the no-loot floor

// Mirrors delveStore.ts constants (the faithful renown model, depth credit included).
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;
const RENOWN_PER_ROOM_REACHED = 1;
const GROVE_UNLOCK_THRESHOLD = 30;

// ─── Grove purchase priorities (flat, greedy top-down) ───────────────────────
// Survival first (HP/AC), then class damage, then the ascension-gated ENDGAME
// nodes (wellspring-depths A1, crown-of-the-returned A3) the standing sim never
// bought. Each entry caps the rank the bot will climb to.

interface GroveNode {
  id: string;
  maxAtRank: number;
}

const ENDGAME_NODES: GroveNode[] = [
  { id: 'wellspring-depths', maxAtRank: 3 }, // +30 HP, A1-gated
  { id: 'crown-of-the-returned', maxAtRank: 2 }, // +2 atk / +2 spell-atk, A3-gated
];

const SHARED_CORE: GroveNode[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },
  { id: 'mielikki-cache', maxAtRank: 4 },
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },
  { id: 'cloak-of-the-grove', maxAtRank: 3 },
  { id: 'hardier-soul', maxAtRank: 3 },
  { id: 'iron-will', maxAtRank: 1 },
  { id: 'coin-in-pocket', maxAtRank: 3 },
];

const CLASS_DAMAGE: Record<ClassId, GroveNode[]> = {
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 },
    { id: 'knife-in-the-dark', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'killers-eye', maxAtRank: 2 },
  ],
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  wizard: [
    { id: 'burning-tongue', maxAtRank: 5 },
    { id: 'arcane-focus', maxAtRank: 3 },
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },
  ],
  barbarian: [
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'killers-eye', maxAtRank: 2 },
    { id: 'fellfast-strike', maxAtRank: 3 },
    { id: 'first-cut', maxAtRank: 3 },
  ],
  ranger: [
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'bleed-out', maxAtRank: 2 },
    { id: 'killers-eye', maxAtRank: 2 },
  ],
};

function priorityFor(classId: ClassId): GroveNode[] {
  // Interleave: a defensive core node, then a class-damage node, repeating, so
  // the soul keeps survivability and offence climbing together; endgame nodes
  // last (they are dear + gated).
  const core = SHARED_CORE;
  const dmg = CLASS_DAMAGE[classId];
  const out: GroveNode[] = [core[0]]; // pilgrims-boots first (cheap, immediate)
  const n = Math.max(core.length - 1, dmg.length);
  for (let i = 0; i < n; i++) {
    if (i + 1 < core.length) out.push(core[i + 1]);
    if (i < dmg.length) out.push(dmg[i]);
  }
  out.push(...ENDGAME_NODES);
  return out;
}

function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
  ascensionUnlocked: number,
): { renown: number; unlocked: UnlockedUpgrades } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u };
  const list = priorityFor(classId);
  let bought = true;
  let safety = 0;
  while (bought && safety < 120) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      // Respect the ascension unlock gate (mirrors metaStore.purchaseUpgrade).
      if (up.unlock && ascensionUnlocked < up.unlock.ascension) continue;
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
  return { renown: r, unlocked: u };
}

/** Apply all ranks of currently-unlocked permanent upgrades to a fresh character. */
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

// ─── Legendary attunement (the persistent meta-power) ────────────────────────

/**
 * Every owned relic the class can equip rides into the run — legendaries are
 * effect-only with NO slot cap; class-bound relics only stick for their class
 * (canEquipLegendary). Mirrors metaStore.setActiveLegendaries.
 */
function chooseActiveLegendaries(owned: string[], classId: ClassId): string[] {
  return owned.filter((id) => canEquipLegendary(id, classId as SchemaClassId));
}

// ─── In-run affix gear: a comparative loadout score for greedy equipping ─────

function avgDice(expr: string): number {
  try {
    const { count, die, modifier } = parseDiceExpression(expr);
    return (count * (die + 1)) / 2 + modifier;
  } catch {
    return 0;
  }
}

/**
 * A consistent "effective power" score of the character's CURRENT loadout —
 * weapon damage + AC + every affix channel the engine reads. Only used to
 * COMPARE before/after equipping a candidate, so the absolute weights need only
 * be monotonic, not calibrated. This is the quality check the re-sim flagged as
 * missing (a naive equip-every-drop would downgrade a longsword to a green
 * dagger and understate loot).
 */
function loadoutScore(c: Character): number {
  let score = 0;
  const mh = c.equipped.mainHand;
  if (mh) {
    const w = getItem(mh.itemId);
    if (w.kind === 'weapon') {
      const offEmpty = !c.equipped.offHand;
      score += avgDice(weaponDamageDice(w, offEmpty)) * 1.6;
    }
  }
  // computeAC already folds armour base + affix acBonus + legendary + permanent.
  score += computeAC(c) * 2.5;
  const m = characterAffixMods(c);
  score += m.attackBonus * 2.5;
  score += m.damageBonus * 1.6;
  score += m.bleedDamage * 1.3;
  score += m.lifestealPct * 0.06;
  score += m.tempHpPerCombat * 0.35;
  score += m.critRangeBonus * 1.8;
  score += (m.rageDamageBonus + m.markDamageBonus + m.sneakDamageBonus + m.followupDamageBonus) * 0.6;
  score += m.resists.length * 1.0;
  score += m.spellDcBonus * 2.6 + m.spellDamageBonus * 1.6 + m.spellAttackBonus * 2.6 + m.bonusSpellSlotsL1 * 3;
  return score;
}

/**
 * Try to equip a rolled drop, keeping it only if it strictly improves the
 * loadout. Uses the real `equipItem` (class-gate, two-handed/shield swap, ring
 * routing, attunement cap all enforced). Returns the upgraded character or the
 * original unchanged.
 */
function tryEquipDrop(c: Character, ref: ItemRef): Character {
  const idx = c.inventory.length;
  const withItem: Character = { ...c, inventory: [...c.inventory, ref] };
  const equipped = equipItem(withItem, idx);
  if (equipped === withItem) return c; // equip refused (class-illegal / no slot) — discard
  if (loadoutScore(equipped) > loadoutScore(c) + 0.01) return equipped;
  return c; // not an upgrade — don't hoard it
}

// ─── Loot loop at a cleared combat room ──────────────────────────────────────

/** Replicates metaStore.grantLegendaryDrop without the store: a random un-owned eligible relic. */
function bankRandomLegendary(
  roller: DiceRoller,
  classId: SchemaClassId,
  owned: string[],
): string | null {
  const pool = legendaryDropPool(classId).filter((id) => !owned.includes(id));
  if (pool.length === 0) return null;
  return pool[(roller.roll('1d100').total - 1) % pool.length];
}

interface RoomLoot {
  character: Character;
  gold: number;
  newLegendaries: string[];
}

function resolveCombatLoot(
  roller: DiceRoller,
  character: Character,
  room: RoomSpec,
  ownedLegendaries: string[],
): RoomLoot {
  let c = character;
  const newLegendaries: string[] = [];
  // Gold: per-monster CR-scaled drops + any fixed room gold.
  const defIds = (room.monsters ?? []).flatMap((m) =>
    Array.from({ length: m.count }, () => m.defId),
  );
  let gold = (room.goldReward ?? 0) + rollRoomGoldDrops(roller, defIds);
  if (!MODEL_GEAR) return { character: c, gold, newLegendaries };

  // Rolled affix gear drop (greedy-equip-if-better).
  const dropRarity = rollGearDrop(roller, room.kind);
  if (dropRarity) {
    const ref = rollItem(roller, { rarity: dropRarity, classId: c.classId });
    c = tryEquipDrop(c, ref);
  }
  // Rare legendary drop → banked to the persistent collection.
  if (rollLegendaryDrop(roller, room.kind)) {
    const banked = bankRandomLegendary(roller, c.classId, [...ownedLegendaries, ...newLegendaries]);
    if (banked) newLegendaries.push(banked);
  }
  return { character: c, gold, newLegendaries };
}

/**
 * Spend gold at a shop room: the reliquary legendary offer, then strictly-better
 * arms-rack gear, then healing potions with the remainder. Returns the updated
 * character, gold spent, and any banked legendary.
 */
function visitShop(
  character: Character,
  room: RoomSpec,
  lifeIdx: number,
  ownedLegendaries: string[],
): { character: Character; goldSpent: number; newLegendaries: string[] } {
  let c = character;
  let gold = c.goldInPocket;
  const newLegendaries: string[] = [];
  const tier = tierForChapter(room.chapter);
  const seed = `${room.id}:${lifeIdx}`;

  const offer = rollLegendaryOffer(seed, tier, c.classId, [...ownedLegendaries, ...newLegendaries]);
  if (offer && gold >= offer.cost) {
    newLegendaries.push(offer.legendaryId);
    gold -= offer.cost;
  }

  const stock = rollGearStock(seed, tier, c.classId)
    .slice()
    .sort((a, b) => b.cost - a.cost); // try the richest first
  for (const { ref, cost } of stock) {
    if (gold < cost) continue;
    const after = tryEquipDrop(c, ref);
    if (after !== c) {
      c = after;
      gold -= cost;
    }
  }

  // Leftover gold → healing potions (the policy drinks them in a pinch).
  const potion = getItem('potion-of-healing');
  let safety = 0;
  while (gold >= potion.cost && safety < 6) {
    c = { ...c, inventory: [...c.inventory, { itemId: 'potion-of-healing' }] };
    gold -= potion.cost;
    safety += 1;
  }

  const goldSpent = c.goldInPocket - gold;
  c = { ...c, goldInPocket: gold };
  return { character: c, goldSpent, newLegendaries };
}

// ─── Proc / combat ───────────────────────────────────────────────────────────

function runPlayerTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  for (let i = 0; i < 16; i++) {
    if (s.status !== 'active') break;
    const action = chooseCombatAction(s, ch);
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
  ascension: number,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const isBoss = room.kind === 'boss';
  const isElite = room.kind === 'elite';
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs, ascension, isBoss, isElite });
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
      const r = monsterAttack(
        { roller, character, state },
        state.turnOrder[state.currentTurnIndex],
      );
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

// ─── Soul / life ─────────────────────────────────────────────────────────────

interface SoulState {
  classId: ClassId;
  renown: number;
  unlockedUpgrades: UnlockedUpgrades;
  quirks: string[];
  ascension: number;
  ownedLegendaries: string[];
}

function freshSoul(classId: ClassId): SoulState {
  return { classId, renown: 0, unlockedUpgrades: {}, quirks: [], ascension: 0, ownedLegendaries: [] };
}

/** Build the L1 vessel that descends, mirroring delveStore.startDelve + gear. */
function descend(roller: DiceRoller, soul: SoulState): Character {
  let c = buildPlayerCharacter(presetCreationInput(soul.classId));
  c = applyPermanentUpgrades(c, soul.unlockedUpgrades);
  c = applyDelveStartUpgrades(c, soul.unlockedUpgrades);
  c = { ...c, quirks: rollQuirks(roller, 2) };
  // Equip every owned relic the class can wield (no slot cap); bake the effects.
  const active = MODEL_GEAR ? chooseActiveLegendaries(soul.ownedLegendaries, soul.classId) : [];
  c = { ...c, legendaryEffects: aggregateLegendaryEffects(active) };
  // Seed the purse (Coin in Pocket × ascension gold mult).
  const goldMult = getAscensionLevel(soul.ascension).startingGoldMult;
  const startingGold = Math.round((c.permanentBonuses?.startingGold ?? 0) * goldMult);
  c = { ...c, goldInPocket: startingGold, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

interface LifeOutcome {
  cleared: boolean;
  finalRoomIdx: number;
  maxChapter: number;
  finalLevel: number;
  bossesKilled: number;
  ascension: number;
  renownEarned: number;
  deathRoomLabel: string | null;
  // Meta state AT DESCENT (for the gate buckets).
  legendariesOwnedAtDescent: number;
  activeLegendariesAtDescent: number;
  groveRanksAtDescent: number;
  reachedCh5: boolean;
  reachedCh6: boolean;
  clearedCh5Boss: boolean; // hollow-dawn down (5th chapter boss)
}

function chapterClearGoldFor(c: Character): number {
  return (c.chapterClearGoldBonus ?? 0) + (c.permanentBonuses?.chapterClearGold ?? 0);
}

function liveOneLife(
  roller: DiceRoller,
  soul: SoulState,
  lifeIdx: number,
  seedBase: number,
): { outcome: LifeOutcome; newLegendaries: string[] } {
  let character = descend(roller, soul);
  const delveSeed = ((seedBase + lifeIdx * 7919) ^ (soul.classId.charCodeAt(0) * 1009)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed, ascension: soul.ascension });
  const groveRanks = Object.values(soul.unlockedUpgrades).reduce((a, b) => a + b, 0);
  const activeCount = MODEL_GEAR
    ? chooseActiveLegendaries(soul.ownedLegendaries, soul.classId).length
    : 0;

  let bossesKilled = 0;
  let finalRoomIdx = 0;
  let maxChapter = 1;
  let deathRoomLabel: string | null = null;
  let died = false;
  const newLegendaries: string[] = [];

  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const isBranching = delve.rooms.some((r) => (r.next?.length ?? 0) > 0);
  let curId: string | undefined = delve.rooms[0]?.id;
  const guard = new Set<string>();

  while (curId && !guard.has(curId)) {
    guard.add(curId);
    const room = byId.get(curId);
    if (!room) break;
    finalRoomIdx += 1;
    maxChapter = Math.max(maxChapter, room.chapter ?? maxChapter);

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
    } else if (room.kind === 'camp') {
      character = longRest(character);
    } else if (room.kind === 'shrine') {
      character = pickBlessingAtShrine(roller, character);
    } else if (room.kind === 'shop') {
      if (MODEL_GEAR) {
        const shop = visitShop(character, room, lifeIdx, [...soul.ownedLegendaries, ...newLegendaries]);
        character = shop.character;
        newLegendaries.push(...shop.newLegendaries);
      }
    } else if (room.kind === 'treasure') {
      character = { ...character, goldInPocket: character.goldInPocket + (room.goldReward ?? 0) };
    } else if (room.kind === 'event') {
      // sim skips events
    } else {
      const isBoss = room.kind === 'boss';
      const result = runCombatRoom(roller, character, room, soul.ascension);
      character = result.character;
      if (!result.victory) {
        died = true;
        deathRoomLabel = `${room.id} (ch${room.chapter ?? '?'})`;
        break;
      }
      if (isBoss) bossesKilled += 1;
      // Loot: gold + gear + legendary, then chapter-clear gold + XP.
      const loot = resolveCombatLoot(roller, character, room, [...soul.ownedLegendaries, ...newLegendaries]);
      character = { ...loot.character, goldInPocket: loot.character.goldInPocket + loot.gold };
      newLegendaries.push(...loot.newLegendaries);
      if (isBoss) {
        character = { ...character, goldInPocket: character.goldInPocket + chapterClearGoldFor(character) };
      }
      const rXp = room.xpReward ?? 0;
      if (rXp > 0) {
        character = { ...character, xp: character.xp + rXp };
        while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
          character = simulateLevelUp(character);
        }
      }
    }

    const nexts = room.next ?? [];
    if (nexts.length >= 1) {
      const idx =
        nexts.length === 1 ? 0 : roller.roll({ count: 1, die: 20, modifier: 0 }).total % nexts.length;
      curId = nexts[idx];
    } else if (isBranching || room.kind === 'boss') {
      break;
    } else {
      const ni = delve.rooms.findIndex((r) => r.id === curId) + 1;
      curId = ni > 0 && ni < delve.rooms.length ? delve.rooms[ni].id : undefined;
    }
  }

  const cleared = !died;
  const asc = getAscensionLevel(soul.ascension);
  const roomsReached = Math.max(0, finalRoomIdx - 1);
  const renownBase =
    (cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_CHAPTER_BOSS * bossesKilled +
    RENOWN_PER_ROOM_REACHED * roomsReached;
  const renownEarned = Math.floor(renownBase * asc.renownMult * renownSoulMarkMultiplier(character));

  return {
    outcome: {
      cleared,
      finalRoomIdx,
      maxChapter,
      finalLevel: character.level,
      bossesKilled,
      ascension: soul.ascension,
      renownEarned,
      deathRoomLabel,
      legendariesOwnedAtDescent: soul.ownedLegendaries.length,
      activeLegendariesAtDescent: activeCount,
      groveRanksAtDescent: groveRanks,
      reachedCh5: maxChapter >= 5,
      reachedCh6: maxChapter >= 6,
      clearedCh5Boss: bossesKilled >= 5,
    },
    newLegendaries,
  };
}

interface SoulResult {
  classId: ClassId;
  lives: LifeOutcome[];
  firstA0ClearLife: number | null;
  firstAnyClearLife: number | null;
  highestCleared: number;
  toppedLadder: boolean;
  legendariesAtEnd: number;
}

function runSoul(classId: ClassId, seedBase: number): SoulResult {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  let soul = freshSoul(classId);
  const lives: LifeOutcome[] = [];
  let firstA0ClearLife: number | null = null;
  let firstAnyClearLife: number | null = null;
  let highestCleared = -1;
  let toppedLadder = false;

  for (let life = 0; life < MAX_LIVES; life++) {
    const { outcome, newLegendaries } = liveOneLife(roller, soul, life, seedBase);
    lives.push(outcome);

    soul = {
      ...soul,
      renown: soul.renown + outcome.renownEarned,
      ownedLegendaries: [...soul.ownedLegendaries, ...newLegendaries],
    };

    if (outcome.cleared) {
      if (firstAnyClearLife === null) firstAnyClearLife = life + 1;
      if (outcome.ascension === 0 && firstA0ClearLife === null) firstA0ClearLife = life + 1;
      highestCleared = Math.max(highestCleared, outcome.ascension);
      if (soul.ascension >= MAX_ASCENSION) {
        toppedLadder = true;
        break;
      }
      soul = { ...soul, ascension: soul.ascension + 1 };
    }

    const buy = buyUpgrades(classId, soul.renown, soul.unlockedUpgrades, soul.ascension);
    soul = { ...soul, renown: buy.renown, unlockedUpgrades: buy.unlocked };
  }

  return {
    classId,
    lives,
    firstA0ClearLife,
    firstAnyClearLife,
    highestCleared,
    toppedLadder,
    legendariesAtEnd: soul.ownedLegendaries.length,
  };
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

interface LegendaryBucket {
  label: string;
  test: (l: LifeOutcome) => boolean;
}

// The gate is asked at Ascension 0 (the base game): does owning more legendaries
// move a soul from "fails the back half" to "clears Ch6"?
const LEG_BUCKETS: LegendaryBucket[] = [
  { label: '0 (bare)', test: (l) => l.legendariesOwnedAtDescent === 0 },
  { label: '1-2', test: (l) => l.legendariesOwnedAtDescent >= 1 && l.legendariesOwnedAtDescent <= 2 },
  { label: '3-4', test: (l) => l.legendariesOwnedAtDescent >= 3 && l.legendariesOwnedAtDescent <= 4 },
  { label: '5-7', test: (l) => l.legendariesOwnedAtDescent >= 5 && l.legendariesOwnedAtDescent <= 7 },
  { label: '8+', test: (l) => l.legendariesOwnedAtDescent >= 8 },
];

interface ClassAggregate {
  classId: ClassId;
  souls: number;
  totalLives: number;
  livesPerSoul: number;
  everClearedA0Rate: number;
  firstA0ClearLifeMean: number | null;
  firstA0ClearLifeMedian: number | null;
  toppedLadderRate: number;
  meanHighestCleared: number;
  meanDepthRooms: number;
  meanFinalLevel: number;
  meanLegendariesAtEnd: number;
  // Gate cross-cut at A0, bucketed by owned legendaries.
  gate: Record<string, { n: number; ch5: number; ch6: number; ch6clear: number }>;
  // Bare-soul (no grove, no legendary) back-half gate.
  bareN: number;
  bareCh5: number;
  bareCh6: number;
  bareClear: number;
}

function aggregate(classId: ClassId, souls: SoulResult[]): ClassAggregate {
  const allLives = souls.flatMap((s) => s.lives);
  const a0Lives = allLives.filter((l) => l.ascension === 0);

  const gate: ClassAggregate['gate'] = {};
  for (const b of LEG_BUCKETS) {
    const cell = a0Lives.filter(b.test);
    gate[b.label] = {
      n: cell.length,
      ch5: cell.filter((l) => l.reachedCh5).length,
      ch6: cell.filter((l) => l.reachedCh6).length,
      ch6clear: cell.filter((l) => l.cleared).length,
    };
  }

  const bare = allLives.filter((l) => l.groveRanksAtDescent === 0 && l.legendariesOwnedAtDescent === 0);
  const firstClears = souls.map((s) => s.firstA0ClearLife).filter((x): x is number => x !== null);

  return {
    classId,
    souls: souls.length,
    totalLives: allLives.length,
    livesPerSoul: allLives.length / Math.max(1, souls.length),
    everClearedA0Rate: firstClears.length / Math.max(1, souls.length),
    firstA0ClearLifeMean: firstClears.length ? mean(firstClears) : null,
    firstA0ClearLifeMedian: firstClears.length ? median(firstClears) : null,
    toppedLadderRate: souls.filter((s) => s.toppedLadder).length / Math.max(1, souls.length),
    meanHighestCleared: mean(souls.map((s) => (s.highestCleared >= 0 ? s.highestCleared : 0))),
    meanDepthRooms: mean(allLives.map((l) => l.finalRoomIdx)),
    meanFinalLevel: mean(allLives.map((l) => l.finalLevel)),
    meanLegendariesAtEnd: mean(souls.map((s) => s.legendariesAtEnd)),
    gate,
    bareN: bare.length,
    bareCh5: bare.filter((l) => l.reachedCh5).length,
    bareCh6: bare.filter((l) => l.reachedCh6).length,
    bareClear: bare.filter((l) => l.cleared).length,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderHeadline(aggs: ClassAggregate[]): string {
  const lines = [
    '| Class | Souls | Lives/soul | Ever cleared A0 | First A0-clear life (mean / median) | Topped A6 | Mean asc cleared | Avg depth | Avg final lvl | Legendaries banked/soul |',
    '|------|------:|----------:|---------------:|:----------------------------------:|--------:|----------------:|---------:|-------------:|----------------------:|',
  ];
  for (const a of aggs) {
    const fa = a.firstA0ClearLifeMean === null ? '—' : num(a.firstA0ClearLifeMean, 1);
    const fm = a.firstA0ClearLifeMedian === null ? '—' : num(a.firstA0ClearLifeMedian, 0);
    lines.push(
      `| ${a.classId} | ${a.souls} | ${num(a.livesPerSoul, 1)} | ${pct(a.everClearedA0Rate)} | ${fa} / ${fm} | ${pct(a.toppedLadderRate)} | ${num(a.meanHighestCleared)} | ${num(a.meanDepthRooms, 1)} | ${num(a.meanFinalLevel, 2)} | ${num(a.meanLegendariesAtEnd, 1)} |`,
    );
  }
  return lines.join('\n');
}

function renderGate(aggs: ClassAggregate[]): string {
  const lines: string[] = [];
  for (const a of aggs) {
    lines.push(`\n**${a.classId}** — Ascension-0 lives, bucketed by legendaries owned at descent:\n`);
    lines.push('| Legendaries | Lives | Reached Ch5 | Reached Ch6 | Cleared Ch6 (full clear) |');
    lines.push('|------------|------:|-----------:|-----------:|------------------------:|');
    for (const b of LEG_BUCKETS) {
      const g = a.gate[b.label];
      if (!g || g.n === 0) {
        lines.push(`| ${b.label} | 0 | — | — | — |`);
        continue;
      }
      lines.push(
        `| ${b.label} | ${g.n} | ${pct(g.ch5 / g.n)} | ${pct(g.ch6 / g.n)} | ${pct(g.ch6clear / g.n)} |`,
      );
    }
  }
  return lines.join('\n');
}

function renderBareGate(aggs: ClassAggregate[]): string {
  const lines = [
    '| Class | Bare lives | Reached Ch5 | Reached Ch6 | Cleared the run |',
    '|------|----------:|-----------:|-----------:|---------------:|',
  ];
  for (const a of aggs) {
    const n = Math.max(1, a.bareN);
    lines.push(
      `| ${a.classId} | ${a.bareN} | ${pct(a.bareCh5 / n)} | ${pct(a.bareCh6 / n)} | ${pct(a.bareClear / n)} |`,
    );
  }
  return lines.join('\n');
}

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Endgame gear sim — ${CLASSES.length} classes × ${SOULS_PER_CLASS} souls, MAX_LIVES=${MAX_LIVES}, MODEL_GEAR=${MODEL_GEAR ? 'on' : 'OFF'}\n`,
  );

  const aggs: ClassAggregate[] = [];
  for (const classId of CLASSES) {
    const t0 = Date.now();
    const souls: SoulResult[] = [];
    for (let i = 0; i < SOULS_PER_CLASS; i++) {
      const seed = (SEED_BASE ^ (classId.charCodeAt(0) * 7919) ^ (i * 104729)) >>> 0;
      souls.push(runSoul(classId, seed));
    }
    const a = aggregate(classId, souls);
    aggs.push(a);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const fa = a.firstA0ClearLifeMean === null ? '—' : num(a.firstA0ClearLifeMean, 1);
    console.log(
      `${classId.padEnd(10)} A0clr ${pct(a.everClearedA0Rate).padStart(6)}  1stA0life ${fa.padStart(5)}  topA6 ${pct(a.toppedLadderRate).padStart(6)}  depth ${num(a.meanDepthRooms, 1).padStart(5)}  leg/soul ${num(a.meanLegendariesAtEnd, 1).padStart(4)}  bareClr ${pct(a.bareN ? a.bareClear / a.bareN : 0).padStart(5)}  ${dt}s`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/sim-findings/endgame-gear.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote findings → ${outPath}  (${dtTotal}s wall)`);
}

function renderDoc(aggs: ClassAggregate[], wallSec: string): string {
  return `# Gear-aware endgame meta sim — the Hades gate (auto-generated tables)

> Auto-generated by \`scripts/sim-endgame-gear.ts\`. Re-run with
> \`SOULS_PER_CLASS=${SOULS_PER_CLASS} MAX_LIVES=${MAX_LIVES} npx tsx scripts/sim-endgame-gear.ts\`.
> Curated reading lives in the lane memory + the orchestrator's summary.

**Souls/class:** ${SOULS_PER_CLASS}. **Max lives/soul:** ${MAX_LIVES}.
**Gear modelled:** ${MODEL_GEAR ? 'YES (drops + shop + legendaries + sets + greedy-equip)' : 'NO (floor)'}.
**Wall clock:** ${wallSec}s.

## What this models that the no-loot floor doesn't

The full player loot/economy loop ([[feedback-sims-model-full-player-experience]]):
combat/elite/boss clears roll gold + a low-chance rolled affix item (greedily
equipped if it improves the loadout) + a rare legendary banked to the persistent
collection; shop rooms spend gold on rolled gear, the reliquary legendary offer,
and healing potions; the persistent legendary collection accumulates across
lives and is attuned (within the ascension slot-cap, set bonuses applied) before
each descent; the Grove is bought greedily including the ascension-gated endgame
nodes. Affix + legendary bonuses feed combat through the same channels the live
engine reads.

> ⚠️ Absolute clear-rates remain an AI-floor read (the bot underplays a real
> player). Modelling loot RAISES the floor toward real play; the deliverable is
> the GATING DIRECTION + the relative curve.

## Headline

${renderHeadline(aggs)}

- **First A0-clear life** = runs-to-first-Ch6-clear (the Hades milestone): the
  life index at which a soul first clears the base six-chapter chain (terminal
  boss = the-unmade). "—" = never cleared within ${MAX_LIVES} lives.

## The gate — does meta-power open Ch5/Ch6? (Ascension 0)

Each class's A0 lives bucketed by how many legendaries the soul had banked at
descent. The Hades target: the **0 (bare)** row fails the back half, and
Ch6-clear% climbs as legendaries accumulate.

${renderGate(aggs)}

## Bare-soul gate (no Grove, no legendaries)

The strictest read of "a bare/early soul must fail the back half": lives with
ZERO Grove ranks AND ZERO legendaries.

${renderBareGate(aggs)}
`;
}

main();
