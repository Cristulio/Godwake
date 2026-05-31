import { create } from 'zustand';
import type { Character } from '../types/character';
import type { DelveState, RoomSpec } from '../types/delve';
import type { ItemRef, GearRarity } from '../schemas/item';
import { getActiveRoller } from '../engine/dice';
import { rollRoomGoldDrops } from '../engine/combat/goldDrop';
import { rollItem, rollGearDrop, rollLegendaryDrop } from '../engine/items';
import { getLegendary } from '../content/legendaries';
import { classStartingResources } from '../engine/character/initialize';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getRace } from '../content/races';
import { getClass } from '../content/classes';
import { longRest, withResetActionEconomy } from '../engine/character/actions';
import { rollBlessingOptions } from '../engine/character/blessings';
import {
  rollQuirks,
  characterQuirkMods,
  soulMarkMultiplier,
  renownSoulMarkMultiplier,
} from '../engine/character/quirks';
import { applyDelveStartUpgrades } from '../engine/character/upgrades';
import { hasPendingLevelUp } from '../engine/character/leveling';
import { getAscensionLevel } from '../engine/delve/ascension';
import { getItem } from '../content/items';
import { getCampBoon } from '../content/campBoons';
import { EQUIP_SLOTS } from '../engine/character/equip';
import { sellValue } from '../components/delve/shopStock';
import { useCharacterStore } from './characterStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { useMetaStore } from './metaStore';

/** Renown granted per successful delve clear (boss killed). */
export const RENOWN_PER_DELVE_CLEAR = 50;
/** Renown granted on a failed delve — small consolation for the soul. */
export const RENOWN_PER_DELVE_FAILURE = 15;
/**
 * Hades-style partial credit: bonus renown per chapter boss killed in a
 * failed delve. Dying at the Matron's door is worth more than dying to a
 * goblin in room 1.
 */
export const RENOWN_PER_CHAPTER_BOSS = 10;
/**
 * Depth credit: renown per room reached this run, paid on BOTH clear and
 * death. Rewards pushing deeper even between bosses, so dying at the Ch2 boss
 * after clearing twenty rooms pays far more than dying in room 1 — fixing the
 * old flat-failure formula where only boss kills moved the needle.
 */
export const RENOWN_PER_ROOM_REACHED = 1;
/** Renown threshold that reveals the Druid Grove on the hub. */
export const GROVE_UNLOCK_THRESHOLD = 30;
/** Renown threshold required to unlock the road to Athkatla (Chapter 2). */
export const RENOWN_FOR_CHAPTER_2 = 500;

/**
 * The level-1 HP ceiling a soul descends with: class hit die + CON mod +
 * racial per-level HP + the wizard's +1 baseline + any permanent Grove HP
 * (Mantle of the Wakened, Iron Will). `startDelve` rebuilds this on every
 * descent; `reincarnateSoul` refills to it so the between-lives screen shows
 * the SAME number the soul will descend with — not the dead life's leveled
 * max. effectiveAbilityScores reads only base + race, so run-scoped blessings
 * still on the dead character don't skew the result.
 */
function level1HpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const raceBonusHp = getRace(ch.raceId).bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  const permanentHp = ch.permanentBonuses?.hp ?? 0;
  return cls.hitDie + conMod + raceBonusHp + classBonusHp + permanentHp;
}

/**
 * Found/bought gear is INTRA-DELVE: descent (`startDelve`) and reincarnation
 * (`reincarnateSoul`) reset inventory + equipped to the class starting kit so
 * shop weapons and road drops never carry across lives.
 * Returns only the gear fields — gold and HP are owned by the callers.
 */
function gearResetToKit(
  character: Character,
): Pick<Character, 'inventory' | 'equipped'> {
  try {
    const fresh = buildPlayerCharacter(presetCreationInput(character.classId));
    return { inventory: fresh.inventory, equipped: fresh.equipped };
  } catch {
    // Non-playable class with no preset — leave gear untouched rather than
    // strip the soul bare.
    return { inventory: character.inventory, equipped: character.equipped };
  }
}

/**
 * Step the run into the node with id `nextId`: sync currentRoomIdx/Id, light it
 * up on the map's visited trail, and return to the in-room phase. `roomsCleared`
 * is passed only by the auto-step path (the node just left was cleared); a map
 * pick leaves it alone because `advanceRoom` already credited the clear.
 */
function enterRoom(
  delve: DelveState,
  nextId: string,
  roomsCleared?: number,
): DelveState {
  const idx = delve.rooms.findIndex((r) => r.id === nextId);
  if (idx < 0) return delve;
  const visited = delve.visitedRoomIds ?? [];
  return {
    ...delve,
    currentRoomIdx: idx,
    currentRoomId: nextId,
    visitedRoomIds: visited.includes(nextId) ? visited : [...visited, nextId],
    phase: 'in-room',
    // The campfire fork lock is per-camp: clear it on every room entry so the
    // next camp offers a fresh pick (boons stay tier-keyed in `campBoons`).
    campChoice: undefined,
    // The elite fight/gold gate is per-node: reset so each elite re-prompts.
    eliteEngaged: undefined,
    ...(roomsCleared !== undefined ? { roomsCleared } : {}),
  };
}

function applyDelveStartQuirks(character: Character): Character {
  const mods = characterQuirkMods(character);
  const bonusGold = mods.startBonusGold ?? 0;
  return {
    ...character,
    goldInPocket: character.goldInPocket + bonusGold,
    delveBudgets: {
      quirkRerollMissesRemaining: mods.rerollMissesPerDelve ?? 0,
      stabilisesUsed: 0,
    },
  };
}

/**
 * Roll the next life's quirks, guaranteeing at least two distinct ids. `carry`
 * holds quirks that survive the turn (Wheelturner keeps the first). The bounded
 * retry tops up one at a time and is capped so a small or exhausted quirk pool
 * can never spin forever.
 */
function rollReincarnationQuirks(carry: string[]): string[] {
  const roller = getActiveRoller();
  const result = [...carry];
  for (const id of rollQuirks(roller, Math.max(2 - result.length, 1))) {
    if (!result.includes(id)) result.push(id);
  }
  for (let attempt = 0; result.length < 2 && attempt < 32; attempt++) {
    const [id] = rollQuirks(roller, 1);
    if (id && !result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * Turn the wheel: the soul reincarnates into a fresh life. Quirks reroll (the
 * Wheelturner upgrade carries the first one forward), level/xp reset to the
 * baseline, and everything that belonged to the life just ended — blessings,
 * camp boons, conditions, delve buffs, boss intel — is left behind.
 *
 * This is the single reincarnation routine shared by BOTH death (`failDelve`)
 * and clear (`finishDelve`): winning and dying differ only in the renown tier
 * and lore beat, never in whether the soul turns the wheel. A future endless
 * mode would simply skip this call to keep a build across clears.
 *
 * Returns the reincarnated character; also fires the one-time meta side effects
 * (reincarnation flag + first-life NPC reveal).
 */
function reincarnateSoul(character: Character): Character {
  const oldQuirks = character.quirks;
  const carry =
    character.wheelturnerUnlocked && oldQuirks.length > 0 ? [oldQuirks[0]] : [];
  const newQuirks = rollReincarnationQuirks(carry);

  const meta = useMetaStore.getState();
  meta.setHasReincarnated(true);
  // First turn of the wheel = Imoen reveal beat. Whispered through the falling
  // (or the triumph), by the time the soul wakes again she has a name.
  // Idempotent — only the first life triggers it.
  meta.markNpcKnown('imoen');

  // Refill the body to the LEVEL-1 ceiling the soul will actually descend with,
  // not the dead life's leveled max. This is the same number startDelve rebuilds
  // on descent, so the between-lives screen no longer shows e.g. 46/46 and then
  // snaps to 16 on Descend. runAsiGains is cleared so in-run ASI gains do not
  // compound into the next life.
  const hpMax = level1HpMax({ ...character, runAsiGains: undefined });
  return {
    ...character,
    ...gearResetToKit(character),
    runAsiGains: undefined,
    level: 1,
    xp: 0,
    quirks: newQuirks,
    blessings: [],
    campBoons: [],
    conditions: [],
    hp: { current: hpMax, max: hpMax, temp: 0 },
    delveAttackBonus: 0,
    delveSpellAttackBonus: 0,
    bossIntel: {},
    boldApproachBosses: [],
  };
}

/** The post-fight reward tally shown by the loot pane after a combat clear. */
export interface LootSummary {
  gold: number;
  xp: number;
  items: Array<{ name: string; rarity: GearRarity }>;
  /** Name of a legendary relic banked to the reliquary this fight, if any. */
  bankedLegendary?: string;
}

/**
 * The active run: delve state + the cross-cutting orchestrators that mutate
 * delve, character, combat, screen, and meta together. Session-only — never
 * persisted (delve drops on reload).
 */
interface DelveStoreState {
  delve: DelveState | null;
  /**
   * Everything the most recent fight dropped — surfaced by the post-fight loot
   * pane. Session-only; set on a combat-room clear, cleared on dismiss or the
   * next fight. Gathers gold + xp + each rolled item, plus a `bankedLegendary`
   * name when an elite coughs up a relic (which goes to the reliquary, not the
   * pack — the pane tells the player to attune it at the hub).
   */
  lastLoot: LootSummary | null;

  setDelve: (delve: DelveState | null) => void;
  startDelve: (delve: DelveState) => void;
  /**
   * Finish the current node: reveal the route map at a branch, walk straight
   * through a forced step, or complete the run at the final boss.
   */
  advanceRoom: () => void;
  /** Step the run into a chosen reachable next node from the route map. */
  chooseRoom: (nextId: string) => void;
  addDelveReward: (gold: number, xp: number) => void;
  /** Credit gold from a non-combat source (e.g. Shrine Tithe) to purse + ledger. */
  grantTitheGold: (amount: number) => void;
  /**
   * Settle a cleared combat/boss room: gold drops, room advance, first-blood /
   * boss taunts, chapter-boss + NPC-reveal bookkeeping. The view just dispatches.
   */
  resolveRoomVictory: (room: RoomSpec) => void;
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: () => void;
  concludeDelveAtCamp: () => void;
  /** Resolve a camp choice. Returns null (rest grants no blessing). */
  pickCampChoice: (choice: 'rest') => string | null;
  /**
   * Resolve the elite node's risk/reward decision. 'fight' engages the encounter
   * (the spawn-on-enter effect builds it; a win may yield a legendary relic);
   * 'gold' takes the safe purse and advances past the node with no fight, no loot,
   * and no relic.
   */
  pickEliteChoice: (choice: 'fight' | 'gold') => void;
  /**
   * Resolve the current camp's boon picker. `boonId === null` means the player
   * explicitly skipped the panel. The same camp tier cannot be resolved twice.
   */
  pickCampBoon: (tier: number, boonId: string | null) => void;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };
  /** Buy a pre-rolled shop item (carries its rolled payload) at the given price. */
  purchaseRolledGear: (ref: ItemRef, cost: number) => { ok: boolean; reason?: string };
  /**
   * Buy a legendary relic from the shop "reliquary": deducts gold and BANKS it to
   * the persistent collection (it does not enter the pack and isn't equipped this
   * run). Caller removes the offer from stock on success.
   */
  purchaseLegendary: (legendaryId: string, cost: number) => { ok: boolean; reason?: string };
  /**
   * Sell a carried (non-equipped) item to a merchant: removes it from the pack
   * and credits a fraction of its value. Returns the gold paid on success.
   */
  sellItem: (inventoryIdx: number) => { ok: boolean; reason?: string; gold?: number };
  /** Dismiss the loot pane. */
  clearLastLoot: () => void;
}

export const useDelveStore = create<DelveStoreState>()((set, get) => ({
  delve: null,
  lastLoot: null,

  setDelve: (delve) => set({ delve }),

  startDelve: (delve) => {
    const charSlice = useCharacterStore.getState();
    const ch = charSlice.character;
    if (!ch) return;
    const meta = useMetaStore.getState();
    // Hades-style fresh run: level, xp, gold all reset to baseline.
    // Renown + Grove upgrades + quirks survived the wheel.
    const cls = getClass(ch.classId);
    // Level-1 ceiling, rebuilt every descent (see level1HpMax): hit die + CON +
    // race HP + wizard's +1 baseline + permanent Grove HP. reincarnateSoul
    // refills to the same value so the wait-screen matches the descent.
    // runAsiGains is cleared so in-run ASI gains never carry into the next run
    // (covers the abandon path that bypasses reincarnateSoul).
    const baseHpMax = level1HpMax({ ...ch, runAsiGains: undefined });
    // Coin in the Pocket seeds gold from a permanent bonus on the soul, not
    // a delve-start mutation, so we add it after the run-scoped reset to 0.
    // Higher ascension levels tighten the purse (startingGoldMult < 1).
    const ascension = getAscensionLevel(delve.ascensionLevel ?? 0);
    const startingGold = Math.floor(
      (ch.permanentBonuses?.startingGold ?? 0) * ascension.startingGoldMult,
    );
    const freshlyDescended: Character = {
      ...ch,
      ...gearResetToKit(ch),
      runAsiGains: undefined,
      level: 1,
      xp: 0,
      goldInPocket: startingGold,
      hp: { current: baseHpMax, max: baseHpMax, temp: 0 },
      hitDice: { current: 1, max: 1, die: cls.hitDie },
      resources: classStartingResources(ch.classId),
      blessings: [],
      campBoons: [],
      delveAttackBonus: 0,
      delveSpellAttackBonus: 0,
      nextAttackAdvantage: false,
      poisonImmuneEncounter: false,
      conditions: [],
      bossIntel: {},
      boldApproachBosses: [],
    };
    const unlocked = meta.unlockedUpgrades;
    const withUpgrades = applyDelveStartUpgrades(
      withResetActionEconomy(freshlyDescended),
      unlocked,
    );
    let withQuirkBudgets = applyDelveStartQuirks(withUpgrades);

    // Pilgrim's Step: seed N random blessings at delve start. Done here
    // because the upgrade's apply() is pure and can't reach the active
    // dice roller — this is the natural seam.
    const pilgrimRank = unlocked['pilgrims-step'] ?? 0;
    if (pilgrimRank > 0) {
      const rolled = rollBlessingOptions(
        getActiveRoller(),
        pilgrimRank,
        withQuirkBudgets.classId,
      );
      withQuirkBudgets = {
        ...withQuirkBudgets,
        blessings: [...withQuirkBudgets.blessings, ...rolled],
      };
    }

    set({ delve });
    useCombatStore.getState().setCombat(null);
    charSlice.setCharacter(withQuirkBudgets);
    // Account-level: every descent is one delve started. Drives the
    // progressive-unlock ladder (engine/progression/unlocks.ts).
    meta.incrementDelveCount();
    useScreenStore.getState().setScreen('delve');
  },

  advanceRoom: () =>
    set((s) => {
      if (!s.delve) return s;
      const d = s.delve;
      const cur = d.rooms[d.currentRoomIdx];
      useCombatStore.getState().setCombat(null);
      const roomsCleared = d.roomsCleared + 1;

      // Legacy linear delve (no graph edges): step the array index, as before.
      if (d.currentRoomId === undefined) {
        const wasLast = d.currentRoomIdx >= d.rooms.length - 1;
        return {
          delve: {
            ...d,
            currentRoomIdx: wasLast ? d.currentRoomIdx : d.currentRoomIdx + 1,
            phase: wasLast ? 'completed' : 'in-room',
            roomsCleared,
            campChoice: undefined,
            eliteEngaged: undefined,
          },
        };
      }

      const nextIds = cur?.next ?? [];
      // Terminal node (the final boss) — the chain has fallen.
      if (nextIds.length === 0) {
        return { delve: { ...d, phase: 'completed', roomsCleared } };
      }
      // A forced single step (intel→boss, boss→camp, camp→next entry): walk
      // straight through. Only a real fork opens the route map.
      if (nextIds.length === 1) {
        return { delve: enterRoom(d, nextIds[0], roomsCleared) };
      }
      return { delve: { ...d, phase: 'between-rooms', roomsCleared } };
    }),

  chooseRoom: (nextId) =>
    set((s) => {
      if (!s.delve) return s;
      const cur = s.delve.rooms[s.delve.currentRoomIdx];
      // Only step to a node actually reachable from where we stand.
      if (cur?.next && !cur.next.includes(nextId)) return s;
      useCombatStore.getState().setCombat(null);
      return { delve: enterRoom(s.delve, nextId) };
    }),

  addDelveReward: (gold, xp) => {
    const s = get();
    if (!s.delve) return;
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    // Bargain Hunter / Pinchpurse scale gold; Soul-mark scales gold AND xp
    // (each bane quirk = +20%). Both stack multiplicatively.
    const goldMul = character
      ? (characterQuirkMods(character).goldMultiplier ?? 1) *
        soulMarkMultiplier(character)
      : 1;
    const xpMul = character ? soulMarkMultiplier(character) : 1;
    const finalGold = Math.floor(gold * goldMul);
    const finalXp = Math.floor(xp * xpMul);
    set({
      delve: {
        ...s.delve,
        goldEarned: s.delve.goldEarned + finalGold,
        xpEarned: s.delve.xpEarned + finalXp,
      },
    });
    if (!character) return;
    // goldEarned is the run-aggregate ledger; goldInPocket is the spendable
    // purse the shop reads from. Both must update or boss/treasure gold never
    // reaches the player.
    const nextChar: Character = {
      ...character,
      goldInPocket: character.goldInPocket + finalGold,
      xp: (character.xp ?? 0) + finalXp,
    };
    charSlice.setCharacter(nextChar);
    if (hasPendingLevelUp(nextChar)) {
      useScreenStore.getState().setScreen('level-up');
    }
  },

  grantTitheGold: (amount) => {
    if (amount <= 0) return;
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return;
    // Mirror the addDelveReward split: spendable purse + run-aggregate ledger.
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket + amount,
    });
    if (s.delve) {
      set({ delve: { ...s.delve, goldEarned: s.delve.goldEarned + amount } });
    }
  },

  resolveRoomVictory: (room) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    const isBossRoom = room.kind === 'boss';
    const isRegularCombat = room.kind === 'combat' || room.kind === 'elite' || isBossRoom;
    if (isRegularCombat) {
      const roomGold = room.goldReward ?? 0;
      const xpDrop = room.xpReward ?? 0;
      // Per-monster CR-scaled gold drops, on top of any fixed room-level
      // goldReward. Each instance drops independently.
      const monsterDefIds = (room.monsters ?? []).flatMap((m) =>
        Array.from({ length: m.count }, () => m.defId),
      );
      const mobGold = rollRoomGoldDrops(getActiveRoller(), monsterDefIds);
      let goldDrop = roomGold + mobGold;
      // Boss intel "walk past" reward: +5% gold from that specific boss.
      if (isBossRoom) {
        const bossDefId = room.monsters?.[0]?.defId;
        if (bossDefId && character.boldApproachBosses?.includes(bossDefId)) {
          goldDrop = Math.floor(goldDrop * 1.05);
        }
      }
      const goldBefore = character.goldInPocket;
      const xpBefore = character.xp ?? 0;
      if (goldDrop || xpDrop) get().addDelveReward(goldDrop, xpDrop);
      // Gear drop: a low-chance rolled item from the combat-room clear (the loot
      // source). Re-read the character so the new item layers onto the gold/xp
      // the reward just credited, not the stale pre-reward snapshot.
      const droppedItems: LootSummary['items'] = [];
      const dropRarity = rollGearDrop(getActiveRoller(), room.kind);
      if (dropRarity) {
        const cur = useCharacterStore.getState().character;
        if (cur) {
          const ref = rollItem(getActiveRoller(), { rarity: dropRarity, classId: cur.classId });
          useCharacterStore.getState().setCharacter({
            ...cur,
            inventory: [...cur.inventory, ref],
          });
          if (ref.rolled) {
            droppedItems.push({ name: ref.rolled.name, rarity: ref.rolled.rarity });
          }
        }
      }
      // Rare legendary relic drop: very low chance from any combat source. It is
      // BANKED to the persistent collection — it does NOT equip this run; the
      // player attunes it at the hub for a future descent.
      let bankedLegendary: string | undefined;
      if (rollLegendaryDrop(getActiveRoller(), room.kind)) {
        const bankedId = useMetaStore.getState().grantLegendaryDrop();
        if (bankedId) bankedLegendary = getLegendary(bankedId)?.name ?? 'Legendary relic';
      }
      // Tally the fight's rewards into the post-fight loot pane (gold/xp deltas
      // reflect quirk multipliers and level-feed applied by addDelveReward).
      const after = useCharacterStore.getState().character;
      const goldGained = (after?.goldInPocket ?? goldBefore) - goldBefore;
      const xpGained = (after?.xp ?? xpBefore) - xpBefore;
      if (goldGained > 0 || xpGained > 0 || droppedItems.length > 0 || bankedLegendary) {
        set({
          lastLoot: { gold: goldGained, xp: xpGained, items: droppedItems, bankedLegendary },
        });
      }
    }
    useCombatStore.getState().setCombat(null);
    get().advanceRoom();
    // Imoen whispers on the FIRST cleared room of the run.
    const d = get().delve;
    if (d && d.roomsCleared === 0) {
      useScreenStore.getState().showTaunt('imoen', 'first-blood');
    }
    // Irenicus taunts after a boss clear. Delay so the victory beat lands
    // before the overlay steals the moment. The chapter just cleared is the
    // count of boss rooms up to and including this one (rooms run in chapter
    // order in the chained delve) — metaStore.chaptersCleared is only the prior
    // high-water mark until finishDelve, so it can't name the current chapter.
    if (isBossRoom) {
      const bossIdx = s.delve.rooms.findIndex((r) => r.id === room.id);
      const clearedChapter = s.delve.rooms
        .slice(0, bossIdx + 1)
        .filter((r) => r.kind === 'boss').length;
      setTimeout(() => {
        useScreenStore.getState().showTaunt('irenicus', 'chapter-clear', clearedChapter);
      }, 1500);
      get().creditChapterClearGold();
    }
    // Chained Godwake delve: Ilyich is the Ch1 boss, not the final. Flag the
    // kill (by boss identity, not a hard-coded room id — the branching map
    // numbers nodes differently) so the chapter1Cleared flip survives a death
    // deeper in the run. Also the reveal beat — the Voice steps forward with a name.
    if (
      isBossRoom &&
      room.monsters?.[0]?.defId === 'duergar-ilyich' &&
      s.delve.chapterId === 'godwake'
    ) {
      get().markChapter1BossKilled();
      useMetaStore.getState().markNpcKnown('irenicus');
    }
  },

  finishDelve: () => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    const meta = useMetaStore.getState();
    if (!character) return;
    if (!s.delve) {
      useScreenStore.getState().setScreen('hub');
      useCombatStore.getState().setCombat(null);
      return;
    }
    const wonBoss = s.delve.phase === 'completed';
    const bossLimitIdx = wonBoss
      ? s.delve.currentRoomIdx + 1
      : s.delve.currentRoomIdx;
    const bossesKilled = s.delve.rooms
      .slice(0, bossLimitIdx)
      .filter((r) => r.kind === 'boss').length;
    // Depth credit pays per room ACTUALLY VISITED on BOTH paths; the boss stack
    // rides on top. Counts the route the soul walked (visitedRoomIds, lit by
    // enterRoom as it routes), not the flat currentRoomIdx — the branching map's
    // flat index runs past the parallel nodes a route skips, so the old formula
    // over-credited depth. The entry node is seeded free, so the credit is the
    // count beyond it; legacy linear delves keep no trail and fall back to the
    // index. A clear walks its whole route and fells every boss, so it still
    // tops even the deepest death by construction (clear > deep > shallow holds).
    const roomsVisited = s.delve.visitedRoomIds?.length;
    const roomsReached =
      roomsVisited !== undefined
        ? Math.max(0, roomsVisited - 1)
        : s.delve.currentRoomIdx;
    const depthRenown = RENOWN_PER_ROOM_REACHED * roomsReached;
    const renownBase =
      (wonBoss ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
      RENOWN_PER_CHAPTER_BOSS * bossesKilled +
      depthRenown;
    // Ascension reward multiplier composes MULTIPLICATIVELY with the soul-mark
    // (audit flagged multiplier-stacking as a past bug-class — both apply here).
    // Soul-mark reads the quirks the soul carried THIS run, so settle renown
    // BEFORE the wheel turns.
    const ascensionLevel = s.delve.ascensionLevel ?? 0;
    const ascensionMult = getAscensionLevel(ascensionLevel).renownMult;
    const renownGain = Math.floor(
      renownBase * renownSoulMarkMultiplier(character) * ascensionMult,
    );
    const withRenown: Character = {
      ...character,
      renown: character.renown + renownGain,
    };
    // A clear turns the wheel here; a death already reincarnated in failDelve,
    // so on the death path we only wipe run-scoped fields (this also covers
    // direct finishDelve() calls in tests that never went through failDelve).
    const settled: Character = wonBoss
      ? reincarnateSoul(withRenown)
      : {
          ...withRenown,
          blessings: [],
          campBoons: [],
          delveAttackBonus: 0,
          delveSpellAttackBonus: 0,
          bossIntel: {},
          boldApproachBosses: [],
        };
    const ch1Killed = s.delve.chapter1BossKilled === true;
    // Beating the final boss = the whole chain fell. Mid-run deaths credit the
    // chapter bosses actually killed. The room-10 flag is a belt-and-braces
    // floor for chapter 1 (it's set the instant Ilyich dies).
    const chaptersThisRun = wonBoss
      ? Math.max(bossesKilled, 1)
      : Math.max(bossesKilled, ch1Killed ? 1 : 0);
    charSlice.setCharacter(settled);
    set({ delve: null });
    useCombatStore.getState().setCombat(null);
    useScreenStore.getState().setScreen('hub');
    if (chaptersThisRun > 0) {
      meta.recordChapterCleared(chaptersThisRun);
    }
    // A clear of the full chain advances the world: clearing at the current
    // highest unlocked ascension opens the next rung. Replaying a lower level
    // unlocks nothing new (Spire-style).
    if (wonBoss) {
      meta.unlockNextAscension(ascensionLevel);
      // Legendaries are no longer a guaranteed per-clear grant (Wave 2): they
      // drop rarely from any combat source mid-run and bank to the collection
      // (see resolveRoomVictory). Clearing the chain only advances ascension.
    }
    if (!meta.druidGroveUnlocked && settled.renown >= GROVE_UNLOCK_THRESHOLD) {
      meta.setDruidGroveUnlocked(true);
    }
  },

  failDelve: () => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    // Death turns the wheel. Renown is settled by the finishDelve() call the
    // reincarnation reveal makes on the way back to the hub.
    set({ delve: { ...s.delve, phase: 'failed' } });
    charSlice.setCharacter(reincarnateSoul(character));
  },

  abandonDelve: () => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return;
    charSlice.setCharacter(
      longRest({
        ...character,
        blessings: [],
        campBoons: [],
        delveAttackBonus: 0,
        bossIntel: {},
        boldApproachBosses: [],
      }),
    );
    set({ delve: null });
    useCombatStore.getState().setCombat(null);
    useScreenStore.getState().setScreen('hub');
  },

  markChapter1BossKilled: () =>
    set((s) => (s.delve ? { delve: { ...s.delve, chapter1BossKilled: true } } : s)),

  creditChapterClearGold: () => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!s.delve || !character) return;
    // Two sources stack: Quartermaster's Stipend (delveStart, top-level) and
    // Coin in the Pocket's per-clear payout (permanent, permanentBonuses).
    const bonus =
      (character.chapterClearGoldBonus ?? 0) +
      (character.permanentBonuses?.chapterClearGold ?? 0);
    if (bonus <= 0) return;
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket + bonus,
    });
    set({ delve: { ...s.delve, goldEarned: s.delve.goldEarned + bonus } });
  },

  concludeDelveAtCamp: () =>
    set((s) => (s.delve ? { delve: { ...s.delve, phase: 'completed' } } : s)),

  pickCampChoice: (choice) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return null;
    if (s.delve.campChoice) return null;

    let nextCharacter = character;
    const grantedBlessingId: string | null = null;
    if (choice === 'rest') {
      nextCharacter = longRest(character);
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: { ...s.delve, campChoice: choice } });
    return grantedBlessingId;
  },

  pickCampBoon: (tier, boonId) => {
    const s = get();
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character || !s.delve) return;
    const existing = s.delve.campBoons ?? [];
    if (existing.some((e) => e.tier === tier)) return;

    let nextCharacter: Character = character;
    let nextDelve: DelveState = {
      ...s.delve,
      campBoons: [...existing, { tier, boonId }],
    };

    if (boonId) {
      // Mirror onto the character so derived/combat reads stay simple.
      nextCharacter = {
        ...nextCharacter,
        campBoons: [...(nextCharacter.campBoons ?? []), boonId],
      };

      // Pick-time side effects — HP bumps, stabilise budget, Lich's Eyes flag.
      const boon = getCampBoon(boonId);
      if (boon.id === 'vigor-of-the-road') {
        const bump = Math.max(1, Math.floor(nextCharacter.hp.max * 0.05));
        nextCharacter = {
          ...nextCharacter,
          hp: {
            ...nextCharacter.hp,
            max: nextCharacter.hp.max + bump,
            current: nextCharacter.hp.current + bump,
          },
        };
      } else if (boon.id === 'mantle-of-the-slain') {
        const bump = nextCharacter.level;
        nextCharacter = {
          ...nextCharacter,
          hp: {
            ...nextCharacter.hp,
            max: nextCharacter.hp.max + bump,
            current: nextCharacter.hp.current + bump,
          },
        };
      } else if (boon.id === 'patience-of-ilmater') {
        nextCharacter = {
          ...nextCharacter,
          delveStabiliseBonus: (nextCharacter.delveStabiliseBonus ?? 0) + 1,
        };
      }
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: nextDelve });
  },

  pickEliteChoice: (choice) => {
    const s = get();
    if (!s.delve || s.delve.eliteEngaged) return;
    if (choice === 'fight') {
      // Engage: the DelveScreen spawn-on-enter effect builds the encounter once
      // this flips. A win rolls the elite-only legendary drop in resolveRoomVictory.
      set({ delve: { ...s.delve, eliteEngaged: true } });
      return;
    }
    // 'gold': the safe payout — take the bounty the elite guarded and move on.
    // No fight, no loot, no relic.
    const room = s.delve.rooms[s.delve.currentRoomIdx];
    const bounty = room?.goldReward ?? 0;
    if (bounty > 0) get().addDelveReward(bounty, 0);
    get().advanceRoom();
  },

  purchaseFromMerchant: (itemId) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    let item;
    try {
      item = getItem(itemId);
    } catch {
      return { ok: false, reason: 'Unknown item.' };
    }
    if (character.goldInPocket < item.cost) {
      return { ok: false, reason: 'Not enough gold.' };
    }
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - item.cost,
      inventory: [...character.inventory, { itemId }],
    });
    return { ok: true };
  },

  purchaseRolledGear: (ref, cost) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    if (character.goldInPocket < cost) {
      return { ok: false, reason: 'Not enough gold.' };
    }
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - cost,
      inventory: [...character.inventory, ref],
    });
    return { ok: true };
  },

  purchaseLegendary: (legendaryId, cost) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    if (character.goldInPocket < cost) return { ok: false, reason: 'Not enough gold.' };
    // Bank first so we never charge for a relic that can't be added.
    const banked = useMetaStore.getState().bankLegendary(legendaryId);
    if (!banked) return { ok: false, reason: 'Already in your reliquary.' };
    charSlice.setCharacter({
      ...character,
      goldInPocket: character.goldInPocket - cost,
    });
    return { ok: true };
  },

  sellItem: (inventoryIdx) => {
    const charSlice = useCharacterStore.getState();
    const character = charSlice.character;
    if (!character) return { ok: false, reason: 'No character.' };
    const ref = character.inventory[inventoryIdx];
    if (!ref) return { ok: false, reason: 'No such item.' };
    // Worn gear can't be sold out from under you — unequip it first.
    if (EQUIP_SLOTS.some((slot) => character.equipped[slot] === ref)) {
      return { ok: false, reason: 'Unequip it first.' };
    }
    const gold = sellValue(ref);
    charSlice.setCharacter({
      ...character,
      inventory: character.inventory.filter((_, i) => i !== inventoryIdx),
      goldInPocket: character.goldInPocket + gold,
    });
    return { ok: true, gold };
  },

  clearLastLoot: () => set({ lastLoot: null }),
}));
