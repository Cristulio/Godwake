import { create } from 'zustand';
import type { Character } from '../types/character';
import type { DelveState } from '../types/delve';
import { getActiveRoller } from '../engine/dice';
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
  finishDelve: () => void;
  failDelve: () => void;
  abandonDelve: () => void;
  markChapter1BossKilled: () => void;
  creditChapterClearGold: () => void;
  concludeDelveAtCamp: () => void;
  pickCampChoice: (choice: 'rest' | 'sharpen' | 'prayer') => void;
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
      delveInitBonus: 0,
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
      const rolled = rollBlessingOptions(getActiveRoller(), pilgrimRank);
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
    const renownGain = Math.floor(renownBase * renownSoulMarkMultiplier(character));
    const settled: Character = {
      ...character,
      renown: character.renown + renownGain,
      blessings: [],
      campBoons: [],
      delveAttackBonus: 0,
      delveInitBonus: 0,
      bossIntel: {},
      boldApproachBosses: [],
    };
    const ch1Killed = s.delve.chapter1BossKilled === true;
    charSlice.setCharacter(settled);
    set({ delve: null });
    useCombatStore.getState().setCombat(null);
    useScreenStore.getState().setScreen('hub');
    if (!meta.chapter1Cleared && (wonBoss || ch1Killed)) {
      meta.setChapter1Cleared(true);
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
    // Reincarnation: re-roll quirks for the next life. Class/level/XP persist.
    // Blessings and conditions wipe — they were on the falling life, not the soul.
    // Wheelturner: the first existing quirk survives the turn; only the rest reroll.
    const oldQuirks = character.quirks;
    const carry =
      character.wheelturnerUnlocked && oldQuirks.length > 0
        ? [oldQuirks[0]]
        : [];
    const rolledCount = Math.max(0, 2 - carry.length);
    const fresh = rolledCount > 0 ? rollQuirks(getActiveRoller(), rolledCount) : [];
    const newQuirks = [...carry, ...fresh.filter((id) => !carry.includes(id))];
    while (newQuirks.length < 2 && rolledCount > 0) {
      const more = rollQuirks(getActiveRoller(), 1);
      for (const id of more) {
        if (!newQuirks.includes(id)) newQuirks.push(id);
      }
      if (newQuirks.length >= 2) break;
      if (more.length === 0) break;
    }
    set({ delve: { ...s.delve, phase: 'failed' } });
    charSlice.setCharacter({
      ...character,
      quirks: newQuirks,
      blessings: [],
      campBoons: [],
      conditions: [],
      delveAttackBonus: 0,
      delveInitBonus: 0,
      bossIntel: {},
      boldApproachBosses: [],
    });
    useMetaStore.getState().setHasReincarnated(true);
    // First death = Imoen reveal beat. She's whispered through the falling,
    // the panic, the bleeding-out — by the time the soul wakes again she's
    // earned her name in the player's head. One-time-per-soul.
    useMetaStore.getState().markNpcKnown('imoen');
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
        delveInitBonus: 0,
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
    if (!character || !s.delve) return;
    if (s.delve.campChoice) return;

    let nextCharacter = character;
    if (choice === 'rest') {
      nextCharacter = longRest(character);
    } else if (choice === 'sharpen') {
      nextCharacter = {
        ...character,
        delveAttackBonus: (character.delveAttackBonus ?? 0) + 1,
      };
    } else if (choice === 'prayer') {
      const [rolled] = rollBlessingOptions(getActiveRoller(), 1);
      if (rolled) {
        nextCharacter = {
          ...character,
          blessings: [...character.blessings, rolled],
        };
      }
    }

    charSlice.setCharacter(nextCharacter);
    set({ delve: { ...s.delve, campChoice: choice } });
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
