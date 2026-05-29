import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type {
  Combatant,
  CombatState,
  MonsterInstance,
  PlayerCombatant,
  MonsterCombatant,
} from '../../types/combat';
import type { Monster } from '../../schemas/monster';
import { characterBlessingMods } from '../character/blessings';
import { baneQuirkCount } from '../character/quirks';
import { characterCampBoonMods } from '../character/campBoons';
import { rogueCunningActionMax, barbarianRageMax } from '../character/actions';
import {
  combatResult,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { isPlayerParalyzed } from './holdPerson';
import { resolvePlayerParalyzedTurn } from './turn';
import { refreshMonsterIntents } from './attack/monsterIntent';
import { applyAscensionToMonster, ascensionDamageBonus } from '../delve/ascension';
import { bossIntelBuffFor } from '../../content/bossIntel';

/**
 * Max entries retained in CombatState.log. The renderer (CombatLog.tsx) tails
 * the last 80 for display; this cap protects engine memory and the persisted
 * save blob during long fights where hundreds of entries could accumulate.
 */
export const MAX_COMBAT_LOG = 200;

let monsterInstanceCounter = 0;

function nextMonsterInstanceId(defId: string): string {
  monsterInstanceCounter += 1;
  return `${defId}-${monsterInstanceCounter}`;
}

/** Reset the instance id counter. Useful for tests. */
export function _resetMonsterInstanceCounter(): void {
  monsterInstanceCounter = 0;
}

export function spawnMonsterInstance(def: Monster, displayName?: string): MonsterInstance {
  return {
    id: nextMonsterInstanceId(def.id),
    defId: def.id,
    displayName: displayName ?? def.name,
    hp: { current: def.maxHp, max: def.maxHp, temp: 0 },
    ac: def.ac,
    acRevealed: false,
    conditions: [],
    actionEconomy: {
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      movementRemaining: def.speed,
    },
  };
}

export interface CreateCombatInput {
  /**
   * Roller is unused by turn ordering (player always goes first), but kept on
   * the input so callers can pass a deterministic roller through to downstream
   * combat actions started in this same flow (rare; mostly tests).
   */
  roller?: DiceRoller;
  character: Character;
  monsters: Array<{ def: Monster; displayName?: string }>;
  /** Ascension level for enemy scaling (max HP + per-attack damage). Default 0 = no scaling. */
  ascension?: number;
  /** True when this is a chapter-boss encounter — applies the boss HP multiplier on top of enemyHpMult. */
  isBoss?: boolean;
}

/**
 * Initialize a combat encounter: spawn monster instances, set the turn order
 * (player first, then monsters in spawn order — no initiative rolls), log
 * the opening line. Also applies per-class start-of-combat patches to the
 * character (Rogue refreshes Cunning Action; Wizard activates passive Mage
 * Armor) and start-of-combat blessing effects (temp HP — flat, depth-scaling,
 * bane-scaling, and boss-only — plus per-combat regeneration). Returns BOTH
 * the combat state and the patched character.
 *
 * Callers (production + tests) consume `{ state, character }` — internals are
 * fully pure, so the input `character` is untouched.
 */
export function createCombat(input: CreateCombatInput): CombatActionResult {
  const { monsters } = input;
  let nextCharacter: Character = input.character;

  // Clear one-shot save advantage from any prior fight. nextAttackAdvantage
  // is cleared per-class below (only Rogue can leave one armed); save-advantage
  // can come from both Rogue (Steel Yourself) and Wizard (Misty Step), so wipe
  // it here for everyone.
  if (nextCharacter.nextSaveAdvantage) {
    nextCharacter = { ...nextCharacter, nextSaveAdvantage: false };
  }

  // Ascension scaling: HP rides on the (copied) def so spawnMonsterInstance
  // seeds the right max HP; the per-attack damage bonus is stamped on the
  // instance because monsterAttack re-derives its damage from the canonical
  // content def and never sees a transformed copy.
  const ascension = input.ascension ?? 0;
  const isBoss = input.isBoss ?? false;
  const enemyDamageBonus = ascensionDamageBonus(ascension);
  const monsterCombatants: MonsterCombatant[] = monsters.map(({ def, displayName }) => {
    const scaledDef = applyAscensionToMonster(def, ascension, isBoss);
    const instance = spawnMonsterInstance(scaledDef, displayName);
    return {
      kind: 'monster' as const,
      id: instance.id,
      instance: enemyDamageBonus > 0 ? { ...instance, bonusDamage: enemyDamageBonus } : instance,
    };
  });

  const playerCombatant: PlayerCombatant = {
    kind: 'player',
    id: 'player',
    characterId: nextCharacter.id,
  };

  const combatants: Combatant[] = [playerCombatant, ...monsterCombatants];

  // Deterministic turn order: player first, then monsters in spawn order.
  // Initiative was removed — sims (PR #105) showed it was a noise-level lever
  // and the per-combat "who rolled higher" coin-flip just hid the decisions
  // the player was actually making. Future "extra turn" mechanics (time-stop)
  // hook into endTurn(), not this list.
  const turnOrder = combatants.map((c) => c.id);

  const log = [
    {
      id: 1,
      kind: 'system' as const,
      text: 'Combat begins.',
    },
  ];

  // Rogue: refresh per-combat resources. Stale Hide from before combat is
  // dropped; Cunning Action pool refills.
  if (nextCharacter.classId === 'rogue') {
    nextCharacter = {
      ...nextCharacter,
      nextAttackAdvantage: false,
      bonusAttackAvailable: false,
    };
    nextCharacter = patchResources(nextCharacter, {
      sneakAttackUsedThisTurn: false,
      cunningActionUsesRemaining: rogueCunningActionMax(nextCharacter),
    });
  }

  // Fighter: Second Wind refreshes at the start of every combat encounter.
  // RAW it's once per short rest, but sim showed the Fighter dying at boss
  // rooms (Magistrate, Director) with one stale Second Wind that couldn't
  // close the gap on attrition fights. Per-encounter refresh mirrors the
  // Rogue's Cunning Action cadence and gives the Fighter a real clutch heal
  // in every fight. Action Surge stays on short-rest (still a "burst" button).
  if (nextCharacter.classId === 'fighter') {
    nextCharacter = patchResources(nextCharacter, {
      secondWindAvailable: true,
    });
  }

  // Barbarian: Rage refreshes at the start of every encounter (mirrors the
  // Fighter's Second Wind cadence) so the brute always opens with a rage in
  // hand. Clear any stale fury / reckless stance from the prior fight.
  if (nextCharacter.classId === 'barbarian') {
    nextCharacter = { ...nextCharacter, recklessActive: false };
    nextCharacter = patchResources(nextCharacter, {
      rageRoundsRemaining: 0,
      rageUsesRemaining: barbarianRageMax(nextCharacter),
    });
  }

  // Wizards walk into every fight already wrapped in Mage Armor (passive class
  // baseline — no slot cost, no action cost). Shield is per-combat reaction-
  // only, so clear stale state.
  if (nextCharacter.classId === 'wizard') {
    nextCharacter = patchResources(nextCharacter, {
      mageArmorActive: true,
      shieldActive: false,
      mistyStepActive: false,
      blurRoundsRemaining: 0,
      mirrorImages: 0,
    });
  }

  // Start-of-combat temp HP from blessings. Several distinct levers feed the
  // same pool: a flat grant (Lathander's Dawn / Ilmater's Crown), one scaling
  // with delve level (Lathander's Ascendance), one scaling with bane quirks
  // (Mystra's Reserve), and a boss-only gird (Helm's Bastion). Temp HP doesn't
  // stack — take the single largest source, then the higher of that and any
  // temp HP already on the sheet (RAW).
  const blessingMods = characterBlessingMods(nextCharacter);
  const tempHpGrant = Math.max(
    blessingMods.extraTempHpPerRoom ?? 0,
    (blessingMods.tempHpPerDelveLevel ?? 0) * nextCharacter.level,
    (blessingMods.tempHpPerBaneQuirk ?? 0) * baneQuirkCount(nextCharacter),
    isBoss ? (blessingMods.bossTempHp ?? 0) : 0,
  );
  if (tempHpGrant > 0) {
    const newTemp = Math.max(nextCharacter.hp.temp, tempHpGrant);
    nextCharacter = patchHp(nextCharacter, { temp: newTemp });
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${nextCharacter.name} gains ${tempHpGrant} temporary HP from a blessing.`,
    });
  }

  // Per-combat regeneration (Silvanus's Renewal flat + Ilmater's Mercy percent).
  // Real healing of current HP, capped at max — matters most in back-to-back
  // rooms where the player walks in already scratched. Both fields sum.
  const regenAmount =
    (blessingMods.regenPerCombat ?? 0) +
    Math.floor((nextCharacter.hp.max * (blessingMods.regenPctPerCombat ?? 0)) / 100);
  if (regenAmount > 0 && nextCharacter.hp.current < nextCharacter.hp.max) {
    const before = nextCharacter.hp.current;
    const after = Math.min(nextCharacter.hp.max, before + regenAmount);
    nextCharacter = patchHp(nextCharacter, { current: after });
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${nextCharacter.name} recovers ${after - before} HP from a blessing.`,
    });
  }

  // Boss-fight tactical edge readied in the pre-boss intel room. Combat-scoped
  // levers only — opening-strike advantage, advantage on the first save (the
  // held-opener counter), and a temp-HP gird — so the buff is spent in this
  // fight and never leaks into later chapters. Resolved by the boss def id.
  // Set after the per-class patches above (Rogue clears nextAttackAdvantage)
  // and before the paralyzed-on-entry resolver so a braced save applies.
  if (isBoss && monsters.length > 0) {
    const bossDefId = monsters[0].def.id;
    const tier = nextCharacter.bossIntel?.[bossDefId];
    const buff = tier ? bossIntelBuffFor(bossDefId, tier) : null;
    if (buff) {
      if (buff.firstStrikeAdvantage) {
        nextCharacter = { ...nextCharacter, nextAttackAdvantage: true };
      }
      if (buff.bracedSave) {
        nextCharacter = { ...nextCharacter, nextSaveAdvantage: true };
      }
      if (buff.tempHp > 0) {
        const newTemp = Math.max(nextCharacter.hp.temp, buff.tempHp);
        nextCharacter = patchHp(nextCharacter, { temp: newTemp });
      }
      const girdNote = buff.tempHp > 0 ? ` (+${buff.tempHp} temp HP)` : '';
      log.push({
        id: log.length + 1,
        kind: 'system' as const,
        text: `${nextCharacter.name} readies the ${buff.label}${girdNote}.`,
      });
    }
  }

  const boonMods = characterCampBoonMods(nextCharacter);
  let state: CombatState = {
    combatants,
    turnOrder,
    currentTurnIndex: 0,
    round: 1,
    log,
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: blessingMods.rerollMissesPerEncounter ?? 0,
    playerAttacksThisTurn: 0,
    bladeOfVowRerollsRemaining: boonMods.weaponDamageRerollPerCombat ?? 0,
  };

  // Player goes first. If they walk in already paralyzed (Magistrate held
  // them through the prior encounter's tail), resolve the save up-front —
  // endTurn would otherwise never see turn 0 and the player would get a
  // free action while held. Same resolver the round-trip path uses.
  if (isPlayerParalyzed(nextCharacter)) {
    const resolved = resolvePlayerParalyzedTurn(state, nextCharacter);
    state = resolved.state;
    nextCharacter = resolved.character;
  }

  // enemy-telegraph: seed each monster's round-1 intent (after the entry
  // paralyzed-save resolves, so bosses correctly telegraph their opener).
  state = refreshMonsterIntents(state, nextCharacter);

  return combatResult(state, nextCharacter);
}
