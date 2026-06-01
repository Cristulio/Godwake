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
import { characterAffixMods } from '../items/affixMods';
import { rogueCunningActionMax } from '../character/actions';
import { characterHasMechanic } from '../character/derived';
import {
  combatResult,
  patchHp,
  patchResources,
  type CombatActionResult,
} from './types';
import { isPlayerParalyzed } from './holdPerson';
import { resolvePlayerParalyzedTurn, applyCursedGroundChip } from './turn';
import { refreshMonsterIntents } from './attack/monsterIntent';
import { playerAttack } from './attack/playerAttack';
import { wieldsRangedWeapon, wearsHeavierThanLight } from '../character/equip';
import { getActiveRoller } from '../dice';
import {
  applyAscensionToMonster,
  ascensionBossExtraPhase,
  ascensionDamageBonus,
} from '../delve/ascension';
import { getTwist, twistCombatEffect } from '../delve/twists';
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
  /** True for an elite encounter — grants the primary foe a smaller legendary-resistance pool. */
  isElite?: boolean;
  /**
   * Ascension dungeon twist riding this room (id into engine/delve/twists). Only
   * set at Ascension >= 4; resolved here into combat effects (chip damage, first-
   * strike disadvantage, +enemy damage, sealed blessings, enemy-first initiative).
   */
  twistId?: string;
}

/** Legendary-resistance pools (auto-succeeded player control saves per fight). */
const BOSS_LEGENDARY_RESISTANCES = 3;
const ELITE_LEGENDARY_RESISTANCES = 1;

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
  const isElite = input.isElite ?? false;
  // Only the primary foe of a boss/elite room legendary-resists control — its
  // adds stay lockable.
  const primaryLegendaryResistances = isBoss
    ? BOSS_LEGENDARY_RESISTANCES
    : isElite
      ? ELITE_LEGENDARY_RESISTANCES
      : 0;
  // Ascension dungeon twist for this room (Asc >= 4 only). Resolved up-front so
  // its knobs feed the spawn (Bloodscent enemy damage) and the combat state
  // (Cursed Ground chip, Gloom first-strike, Sealed Wards, Quickening order).
  const twist = twistCombatEffect(input.twistId);
  const enemyDamageBonus = ascensionDamageBonus(ascension) + (twist.enemyDamageBonus ?? 0);
  // Ascension extra-phase arms only the primary foe of a boss room (idx 0).
  const bossExtraPhase = isBoss && ascensionBossExtraPhase(ascension);
  const monsterCombatants: MonsterCombatant[] = monsters.map(({ def, displayName }, idx) => {
    const scaledDef = applyAscensionToMonster(def, ascension, isBoss);
    const instance = spawnMonsterInstance(scaledDef, displayName);
    const legendaryResistances = idx === 0 ? primaryLegendaryResistances : 0;
    return {
      kind: 'monster' as const,
      id: instance.id,
      instance: {
        ...instance,
        ...(enemyDamageBonus > 0 ? { bonusDamage: enemyDamageBonus } : {}),
        ...(legendaryResistances > 0 ? { legendaryResistances } : {}),
        ...(bossExtraPhase && idx === 0 ? { bossExtraPhaseArmed: true } : {}),
      },
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
  //
  // Quickening twist: the dwellers win initiative — monsters take the order
  // first, the player last. The monster-turn auto-driver fires off the opening
  // currentTurnIndex (0), so seeding the index at the first monster makes the
  // enemy act before the hero.
  const enemiesActFirst = twist.enemiesActFirst === true && monsterCombatants.length > 0;
  const turnOrder = enemiesActFirst
    ? [...monsterCombatants.map((c) => c.id), playerCombatant.id]
    : combatants.map((c) => c.id);

  const log = [
    {
      id: 1,
      kind: 'system' as const,
      text: 'Combat begins.',
    },
  ];

  // Telegraph the twist into the combat log opener so it never lies — the omen
  // the player read on the door is named again as the fight begins.
  const activeTwist = getTwist(input.twistId);
  if (activeTwist) {
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${activeTwist.name}. ${activeTwist.telegraph}`,
    });
  }

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
      cunningActionUsesRemaining: wearsHeavierThanLight(nextCharacter) ? 0 : rogueCunningActionMax(nextCharacter),
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

  // Barbarian: clear stale fury and reckless stance from the prior fight.
  if (nextCharacter.classId === 'barbarian') {
    nextCharacter = { ...nextCharacter, recklessActive: false };
    nextCharacter = patchResources(nextCharacter, { rageRoundsRemaining: 0 });
  }

  // Wizards walk into every fight already wrapped in Mage Armor (passive class
  // baseline — no slot cost, no action cost). Shield is per-combat reaction-
  // only, so clear stale state.
  if (nextCharacter.classId === 'wizard') {
    // School of Illusion: walk in already veiled — Blur for the whole fight and
    // one Mirror Image to soak the first blow (rewards an evasive build). Other
    // wizards open with these cleared and must spend a slot to raise them.
    const illusionist = characterHasMechanic(nextCharacter, 'illusionist');
    nextCharacter = patchResources(nextCharacter, {
      mageArmorActive: true,
      shieldActive: false,
      mistyStepActive: false,
      blurRoundsRemaining: illusionist ? 99 : 0,
      mirrorImages: illusionist ? 1 : 0,
    });
  }

  // Start-of-combat temp HP from blessings. Several distinct levers feed the
  // same pool: a flat grant (Lathander's Dawn / Ilmater's Crown), one scaling
  // with delve level (Lathander's Ascendance), one scaling with bane quirks
  // (Mystra's Reserve), and a boss-only gird (Helm's Bastion). Temp HP doesn't
  // stack — take the single largest source, then the higher of that and any
  // temp HP already on the sheet (RAW).
  // Sealed Wards twist: blessing modifiers are inert this fight — fall back to a
  // neutral (empty) mod set so the start-of-combat gird/regen/reroll never seed.
  const blessingMods = twist.suppressBlessings ? {} : characterBlessingMods(nextCharacter);
  // Stoneblood armour affix folds into the same pool (temp HP doesn't stack —
  // the single largest source wins, RAW).
  const affixMods = characterAffixMods(nextCharacter);
  // Abjurer's Arcane Ward + Totem (Bear) endurance: a per-combat temp-HP layer
  // scaling with level (2 + level). Temp HP doesn't stack — it joins the same
  // single-largest-source pool below.
  const archetypeWardTempHp = characterHasMechanic(nextCharacter, 'defender')
    ? 3 + nextCharacter.level
    : characterHasMechanic(nextCharacter, 'abjurer') ||
        characterHasMechanic(nextCharacter, 'totem-warrior')
      ? 2 + nextCharacter.level
      : 0;
  const tempHpGrant = Math.max(
    blessingMods.extraTempHpPerRoom ?? 0,
    (blessingMods.tempHpPerDelveLevel ?? 0) * nextCharacter.level,
    (blessingMods.tempHpPerBaneQuirk ?? 0) * baneQuirkCount(nextCharacter),
    isBoss ? (blessingMods.bossTempHp ?? 0) : 0,
    affixMods.tempHpPerCombat,
    archetypeWardTempHp,
  );
  if (tempHpGrant > 0) {
    const newTemp = Math.max(nextCharacter.hp.temp, tempHpGrant);
    nextCharacter = patchHp(nextCharacter, { temp: newTemp });
    log.push({
      id: log.length + 1,
      kind: 'system' as const,
      text: `${nextCharacter.name} braces with ${tempHpGrant} temporary HP.`,
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
    const buff = tier ? bossIntelBuffFor(bossDefId, tier, nextCharacter.classId) : null;
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
    // Ranged "kept at range": the first enemy swing comes at disadvantage while
    // a bow is in hand and the Ranger isn't encumbered by medium/heavy armor.
    // Consumed by the first enemy attack (monsterAttack).
    rangedEvasionRemaining:
      wieldsRangedWeapon(nextCharacter) && !wearsHeavierThanLight(nextCharacter) ? 1 : 0,
    // Ascension dungeon twist state — neutral fields are omitted so untwisted
    // fights (and every fight below Asc 4) carry no extra combat-state weight.
    ...(twist.cursedGroundChip ? { cursedGroundChip: twist.cursedGroundChip } : {}),
    ...(twist.firstAttackDisadvantage ? { gloomActive: true } : {}),
    ...(twist.suppressBlessings ? { blessingsSealed: true } : {}),
  };

  // The entry player-turn resolutions below assume the hero acts first. Under
  // Quickening the dwellers take the order, so the player's first turn arrives
  // through endTurn instead — skip the up-front paralyzed-save, opening volley
  // and turn-0 chip here and let the round-trip path own them.
  if (!enemiesActFirst) {
    // Player goes first. If they walk in already paralyzed (Magistrate held
    // them through the prior encounter's tail), resolve the save up-front —
    // endTurn would otherwise never see turn 0 and the player would get a
    // free action while held. Same resolver the round-trip path uses.
    if (isPlayerParalyzed(nextCharacter)) {
      const resolved = resolvePlayerParalyzedTurn(state, nextCharacter);
      state = resolved.state;
      nextCharacter = resolved.character;
    }

    // Cursed Ground twist: the hero takes the chip at the start of THIS turn
    // too — turn 0 never travels through endTurn, so apply it here once.
    {
      const cursed = applyCursedGroundChip(state, nextCharacter);
      state = cursed.state;
      nextCharacter = cursed.character;
    }

    // Ranged opening volley: a bow-wielder looses a free shot before the enemy
    // can close the distance. Resolved here (after the entry paralyzed-save, so
    // a held player can't fire) and before intents are seeded, so a kill is
    // already reflected when the survivors telegraph.
    if (state.status === 'active') {
      const volley = resolveRangedOpeningVolley(state, nextCharacter, input.roller);
      state = volley.state;
      nextCharacter = volley.character;
    }
  }

  // enemy-telegraph: seed each monster's round-1 intent (after the entry
  // paralyzed-save resolves, so bosses correctly telegraph their opener).
  state = refreshMonsterIntents(state, nextCharacter);

  return combatResult(state, nextCharacter);
}

/**
 * Resolve the ranged opening volley: one free attack with the equipped bow
 * against the first living monster, before the player's real turn. Routed
 * through the full {@link playerAttack} pipeline so every bow affix and
 * fighting style applies (making ranged gear desirable), but it must NOT spend
 * the first-turn action — the entry action economy is restored afterward, and
 * the per-turn strike counters are cleared so the real turn opens clean.
 * `playerHasAttacked` stays set (the volley WAS the first attack), so
 * first-strike bonuses don't double-dip.
 */
function resolveRangedOpeningVolley(
  state: CombatState,
  character: Character,
  roller?: DiceRoller,
): { state: CombatState; character: Character } {
  if (state.status !== 'active') return { state, character };
  if (isPlayerParalyzed(character)) return { state, character };
  if (!wieldsRangedWeapon(character)) return { state, character };
  // Heavier armor suppresses agile perks — no free shot in half plate.
  if (wearsHeavierThanLight(character)) return { state, character };
  const mainHand = character.equipped.mainHand;
  if (!mainHand) return { state, character };
  const target = state.combatants.find(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (!target) return { state, character };

  const opened: CombatState = {
    ...state,
    log: [
      ...state.log,
      {
        id: state.log.length + 1,
        kind: 'system' as const,
        text: `${character.name} looses an opening volley before the enemy can close.`,
      },
    ],
  };
  const result = playerAttack(
    { roller: roller ?? getActiveRoller(), character, state: opened },
    target.id,
    mainHand.itemId,
  );
  return {
    state: {
      ...result.state,
      playerAttacksThisTurn: 0,
      sneakAttackUsedThisTurn: false,
      colossusSlayerUsedThisTurn: false,
    },
    character: { ...result.character, actionEconomy: character.actionEconomy },
  };
}
