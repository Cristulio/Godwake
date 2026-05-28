import { create } from 'zustand';
import type { Character } from '../types/character';
import type { DelveState, RoomSpec } from '../types/delve';
import { getActiveRoller } from '../engine/dice';
import { rollRoomGoldDrops } from '../engine/combat/goldDrop';
import { classStartingResources } from '../engine/character/initialize';
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
import { getItem } from '../content/items';
import { getCampBoon } from '../content/campBoons';
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
/** Renown threshold that reveals the Druid Grove on the hub. */
export const GROVE_UNLOCK_THRESHOLD = 30;
/** Renown threshold required to unlock the road to Athkatla (Chapter 2). */
export const RENOWN_FOR_CHAPTER_2 = 500;

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

  return {
    ...character,
    level: 1,
    xp: 0,
    quirks: newQuirks,
    blessings: [],
    campBoons: [],
    conditions: [],
    delveAttackBonus: 0,
    delveSpellAttackBonus: 0,
    bossIntel: {},
    boldApproachBosses: [],
  };
}

/**
 * The active run: delve state + the cross-cutting orchestrators that mutate
 * delve, character, combat, screen, and meta together. Session-only — never
 * persisted (delve drops on reload).
 */
interface DelveStoreState {
  delve: DelveState | null;

  setDelve: (delve: DelveState | null) => void;
  startDelve: (delve: DelveState) => void;
  advanceRoom: () => void;
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
  /** Resolve a camp choice. Returns the granted blessing id for 'prayer', else null. */
  pickCampChoice: (choice: 'rest' | 'sharpen' | 'prayer') => string | null;
  /**
   * Resolve the current camp's boon picker. `boonId === null` means the player
   * explicitly skipped the panel. The same camp tier cannot be resolved twice.
   */
  pickCampBoon: (tier: number, boonId: string | null) => void;
  /** Clear the Eyes-of-the-Lich preview flag once the player has read the stat block. */
  consumeLichEyes: () => void;
  purchaseFromMerchant: (itemId: string) => { ok: boolean; reason?: string };
}

export const useDelveStore = create<DelveStoreState>()((set, get) => ({
  delve: null,

  setDelve: (delve) => set({ delve }),

  startDelve: (delve) => {
    const charSlice = useCharacterStore.getState();
    const ch = charSlice.character;
    if (!ch) return;
    const meta = useMetaStore.getState();
    // Hades-style fresh run: level, xp, gold all reset to baseline.
    // Renown + Grove upgrades + quirks survived the wheel.
    const cls = getClass(ch.classId);
    const conMod = abilityModifier(effectiveAbilityScores(ch).con);
    const race = getRace(ch.raceId);
    const bonusHp = race.bonusHpPerLevel ?? 0;
    // Wizard +1/level baseline must be rebuilt on every descent — initialize.ts
    // bakes it into hp.max at character creation, but startDelve recomputes
    // baseHpMax and would otherwise strip it. Same for Grove HP bonuses
    // (Mantle of the Wakened, Iron Will), which live on permanentBonuses.hp.
    const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
    const permanentHpBonus = ch.permanentBonuses?.hp ?? 0;
    const baseHpMax = cls.hitDie + conMod + bonusHp + classBonusHp + permanentHpBonus;
    // Coin in the Pocket seeds gold from a permanent bonus on the soul, not
    // a delve-start mutation, so we add it after the run-scoped reset to 0.
    const startingGold = ch.permanentBonuses?.startingGold ?? 0;
    const freshlyDescended: Character = {
      ...ch,
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
    useScreenStore.getState().setScreen('delve');
  },

  advanceRoom: () =>
    set((s) => {
      if (!s.delve) return s;
      const wasLast = s.delve.currentRoomIdx >= s.delve.rooms.length - 1;
      const next: DelveState = {
        ...s.delve,
        currentRoomIdx: wasLast ? s.delve.currentRoomIdx : s.delve.currentRoomIdx + 1,
        phase: wasLast ? 'completed' : 'in-room',
        roomsCleared: s.delve.roomsCleared + 1,
      };
      useCombatStore.getState().setCombat(null);
      return { delve: next };
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
    const isRegularCombat = room.kind === 'combat' || isBossRoom;
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
      if (goldDrop || xpDrop) get().addDelveReward(goldDrop, xpDrop);
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
    // Chained Godwake delve: Ilyich is the Ch1 boss at room-10, not the final.
    // Flag the kill so the chapter1Cleared flip survives a death deeper in the
    // run. Also the reveal beat — the Voice steps forward with a name.
    if (room.id === 'room-10' && s.delve.chapterId === 'godwake') {
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
    const renownBase = wonBoss
      ? RENOWN_PER_DELVE_CLEAR
      : RENOWN_PER_DELVE_FAILURE + RENOWN_PER_CHAPTER_BOSS * bossesKilled;
    // Soul-mark multiplier reads the quirks the soul carried THIS run, so
    // settle renown BEFORE the wheel turns.
    const renownGain = Math.floor(renownBase * renownSoulMarkMultiplier(character));
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
    let grantedBlessingId: string | null = null;
    if (choice === 'rest') {
      nextCharacter = longRest(character);
    } else if (choice === 'sharpen') {
      // Class-aware Sharpen: wizards bump spell attack rolls (Whet the Mind);
      // martials bump weapon attack rolls (Sharpen the Blade). Same magnitude,
      // class-appropriate lever — see CampRoom.tsx for the labels.
      nextCharacter =
        character.classId === 'wizard'
          ? {
              ...character,
              delveSpellAttackBonus: (character.delveSpellAttackBonus ?? 0) + 1,
            }
          : {
              ...character,
              delveAttackBonus: (character.delveAttackBonus ?? 0) + 1,
            };
    } else if (choice === 'prayer') {
      // Class-aware roll, matching the shrine/merchant rolls. Single source of
      // truth — the view just reads back the granted id to name the god.
      const [rolled] = rollBlessingOptions(getActiveRoller(), 1, character.classId);
      if (rolled) {
        grantedBlessingId = rolled;
        nextCharacter = {
          ...character,
          blessings: [...character.blessings, rolled],
        };
      }
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
      } else if (boon.id === 'eyes-of-the-lich') {
        nextDelve = { ...nextDelve, lichEyesAvailable: true };
      }
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: nextDelve });
  },

  consumeLichEyes: () =>
    set((s) =>
      s.delve ? { delve: { ...s.delve, lichEyesAvailable: false } } : s,
    ),

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
}));
