import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
import type { Character, SpellSlotLevel } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { abilityModifier } from '../../types/abilities';
import { getSpell } from '../../content/spells';
import {
  effectiveAbilityScores,
  characterHasMechanic,
  isRaging,
  isWildShaped,
  spellcastingMod,
} from '../character/derived';
import { baneQuirkCount } from '../character/quirks';
import { isNonStackingBlessing, blessingSignature } from '../character/blessings';
import { getMonster } from '../../content/monsters';
import { getItem } from '../../content/items';
import { getBlessing } from '../../content/blessings';
import type { Blessing, BlessingModifiers } from '../../schemas/blessing';
import { playerAttack } from './attack';
import { castSpell, slotsAt } from './spells';
import { spellDamageMultiplier } from './spells/scaling';
import { useConsumable } from './useItem';
import { useSecondWind } from './secondWind';
import { useActionSurge } from './actionSurge';
import {
  useMartialOffense,
  useMartialDefense,
  useMartialDisrupt,
  isMartialClass,
  martialPointsLeft,
  martialPoolMax,
  martialOffenseCost,
  martialDisruptCost,
  MARTIAL_DEFENSE_COST,
} from './martialResource';
import { useCunningAction, type CunningActionChoice } from './cunningAction';
import { useRage, useRecklessAttack } from './rage';
import { useHuntersMark } from './huntersMark';
import { useWildShape, beastWeaponId } from './wildShape';
import {
  useFlurryOfBlows,
  usePatientDefense,
  useStunningStrike,
  martialArtsWeaponId,
  monkFightsUnarmed,
} from './monk';

/**
 * A single structured combat decision. Callers map it onto the real engine
 * entry points via {@link applyPlannedAction}. The policy returns ONE action
 * per call; callers loop (re-calling {@link chooseCombatAction} after each
 * dispatch) so the bonus action + action + reaction economy is spent across
 * successive calls until `end-turn` is returned.
 */
export type PlannedAction =
  | { kind: 'attack'; targetId: string }
  | { kind: 'cast'; spellId: string; targetId?: string }
  | { kind: 'item'; inventoryIndex: number }
  | { kind: 'second-wind' }
  | { kind: 'action-surge' }
  | { kind: 'cunning-action'; choice: CunningActionChoice }
  | { kind: 'rage' }
  | { kind: 'reckless-attack' }
  | { kind: 'martial-offense' }
  | { kind: 'martial-defense' }
  | { kind: 'martial-disrupt' }
  | { kind: 'hunters-mark'; targetId: string }
  | { kind: 'wild-shape' }
  | { kind: 'flurry-of-blows' }
  | { kind: 'patient-defense' }
  | { kind: 'stunning-strike' }
  | { kind: 'end-turn' };

// ---- Tunables --------------------------------------------------------------
//
// Two kinds of constant live here. The block below is MECHANICAL: damage
// breakpoints and slot-tiering keyed to the actual numbers of the kit (a Magic
// Missile's floor, how beefy "boss" is). Those don't vary by how a player feels
// about risk. The risk/aggression dials — the HP% at which the bot heals,
// retreats, goes reckless, or trades control for burst — live in
// {@link ArchetypeProfile} instead, so a suite can sweep them.

/** Magic Missile guaranteed minimum (3 darts × min 1d4+1 = 6). A target at or
 *  below this dies for certain — no attack roll, no save. */
const MAGIC_MISSILE_MIN = 6;
/** Scorching Ray is worth a 2nd-level slot only on a target too beefy to fall
 *  to a cantrip / single Magic Missile. ~3 rays × 2d6 ≈ 21 average. */
const SCORCHING_RAY_WORTH_HP = 22;
/** Hold Person only on a target too tanky to simply burst this turn. */
const HOLD_PERSON_MIN_HP = 25;
/** A single target this beefy (a boss / heavy elite) is worth dropping the
 *  biggest slot on — Fireball/Lightning single-target CLOSES the fight instead
 *  of plinking it down with a cantrip (the "deep but never finishes" gap). */
const BOSS_NUKE_HP = 40;
/** A single target this beefy is a TRUE boss — worth an 8th/9th-level capstone
 *  slot. Below it a beefy elite gets a mid-tier focused nuke, so the capstone is
 *  saved for the fight that actually needs it. */
const CAPSTONE_NUKE_HP = 90;
/** A boss at/above this HP is worth a 7th-level hard lock (Soul Snare's 3-round
 *  paralyze) over the cheaper Hold Person. */
const SOUL_SNARE_HP = 70;

// ---- Playstyle archetypes --------------------------------------------------

/**
 * Real players don't all play one way, so a single policy line under-represents
 * the spread of outcomes. An archetype is a set of risk/aggression DIALS on the
 * same heuristics — not a different bot. `balanced` is the baseline (the
 * behaviour the in-game Auto runs and the existing tests pin); `cautious` and
 * `aggressive` move every dial in one coherent direction.
 */
export type Archetype = 'cautious' | 'balanced' | 'aggressive';

export const ARCHETYPES: readonly Archetype[] = ['cautious', 'balanced', 'aggressive'] as const;

export interface ArchetypeProfile {
  /** HP fraction at/below which we reach for a (finite) potion. */
  emergencyHp: number;
  /** HP fraction at/below which a Fighter spends Second Wind (renewable). */
  secondWindHp: number;
  /** Fighter Action Surge fires when still hurt at/below this (or outnumbered).
   *  Higher = spend the charge more freely. */
  surgeHp: number;
  /** Barbarian goes Reckless only while ABOVE this HP fraction — it hands
   *  enemies advantage back, so the bar is "healthy enough to wear the blows".
   *  Lower = press recklessly even while hurt. */
  recklessHp: number;
  /** HP fraction at/below which the wizard smears itself defensively
   *  (Blur / Mirror Image). */
  wizardDefensiveHp: number;
  /** HP fraction at/below which the wizard prefers a life-drain over a bare
   *  nuke, trading slots into staying power. */
  wizardDrainHp: number;
  /** Per-attack average damage at/above which a foe is worth a control slot
   *  (Hold Person) instead of pure burst. Higher = trade less for control. */
  holdPersonThreat: number;
}

/** `balanced` reproduces the pre-archetype constants verbatim — the contract is
 *  that an unparameterised call behaves exactly as before. */
const BALANCED: ArchetypeProfile = {
  emergencyHp: 0.35,
  secondWindHp: 0.5,
  surgeHp: 0.7,
  recklessHp: 0.5,
  wizardDefensiveHp: 0.5,
  wizardDrainHp: 0.6,
  holdPersonThreat: 8,
};

export const PROFILES: Record<Archetype, ArchetypeProfile> = {
  cautious: {
    emergencyHp: 0.5,
    secondWindHp: 0.7,
    surgeHp: 0.5,
    recklessHp: 0.7,
    wizardDefensiveHp: 0.65,
    wizardDrainHp: 0.75,
    holdPersonThreat: 6,
  },
  balanced: BALANCED,
  aggressive: {
    emergencyHp: 0.2,
    secondWindHp: 0.35,
    surgeHp: 1,
    recklessHp: 0.25,
    wizardDefensiveHp: 0.35,
    wizardDrainHp: 0.45,
    holdPersonThreat: 12,
  },
};

// ---- Battlefield reads -----------------------------------------------------

export function liveMonstersOf(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
}

function avgOfExpr(expr: string): number {
  const { count, die, modifier } = parseDiceExpression(expr);
  return count * ((die + 1) / 2) + modifier;
}

/** Best (highest-average-damage) single attack this monster can land, per swing. */
function monsterThreat(m: MonsterCombatant): number {
  const def = getMonster(m.instance.defId);
  const bonus = m.instance.bonusDamage ?? 0;
  let best = 0;
  for (const a of def.actions) {
    if (a.kind !== 'attack') continue;
    const avg = avgOfExpr(a.damage) + bonus;
    if (avg > best) best = avg;
  }
  return best;
}

function isMonsterParalyzed(m: MonsterCombatant): boolean {
  return m.instance.conditions.some((c) => c.name === 'paralyzed');
}

/** True when the Ranger's Hunter's Mark is set and still riding a living enemy. */
function markIsOnLiveTarget(state: CombatState, live: MonsterCombatant[]): boolean {
  const id = state.huntersMarkTargetId;
  if (!id) return false;
  return live.some((m) => m.id === id);
}

/** Focus-fire target: lowest current HP (fastest removal), ties to higher threat. */
function lowestHpTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => {
    const hp = a.instance.hp.current - b.instance.hp.current;
    if (hp !== 0) return hp;
    return monsterThreat(b) - monsterThreat(a);
  })[0];
}

/** The single most dangerous living enemy. */
function highestThreatTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => monsterThreat(b) - monsterThreat(a))[0];
}

/**
 * The add currently WARDING a gated boss: a living boss whose `gate.whileAddAlive`
 * names a living add (Matron's handmaiden, the Unmade's anchor-mote, the Hollow
 * Pretender's mirror-double, Yaga-Shura's heart). While that add lives the boss
 * shrugs off most/all damage, so the bot must drop the ward FIRST — returns the
 * lowest-HP warding add to focus. Without this the bot reads a gated boss as a
 * near-invulnerable wall and pours wasted damage into it.
 */
function wardingAddTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  for (const boss of live) {
    const gate = getMonster(boss.instance.defId).gate;
    if (!gate) continue;
    const adds = live.filter((m) => m.instance.defId === gate.whileAddAlive);
    if (adds.length === 0) continue;
    return adds.sort((a, b) => a.instance.hp.current - b.instance.hp.current)[0];
  }
  return undefined;
}

/** The toughest living enemy by current HP — the one a fight stalls on. */
function highestHpTarget(live: MonsterCombatant[]): MonsterCombatant | undefined {
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => b.instance.hp.current - a.instance.hp.current)[0];
}

/** True only when every living enemy resists OR is immune to this damage type —
 *  i.e. the AoE would be wasted. */
function aoeWasted(live: MonsterCombatant[], type: 'fire' | 'lightning'): boolean {
  return live.every((m) => {
    const def = getMonster(m.instance.defId);
    return (def.immunities ?? []).includes(type) || (def.resistances ?? []).includes(type);
  });
}

function knows(character: Character, spellId: string): boolean {
  return (character.resources.knownSpells ?? []).includes(spellId);
}

/**
 * First spell in the ranked list the wizard both knows and can pay for right now
 * (a free slot at its tier). Used to reach for the biggest affordable working —
 * the highest AoE for a crowd, the heaviest nuke for a boss — before falling
 * back to the cap-8 kit.
 */
function bestAffordable(character: Character, ids: readonly string[]): string | null {
  for (const id of ids) {
    if (!knows(character, id)) continue;
    const lvl = getSpell(id).level;
    if (lvl === 0 || slotsAt(character, lvl as SpellSlotLevel) > 0) return id;
  }
  return null;
}

/** AoE blasts that hit EVERY enemy, biggest dice first — the crowd-clear pool.
 *  Lightning Bolt is deliberately absent: it only forks to one extra foe, so it
 *  is a focused nuke, not a pack-clear. */
const HIGH_AOE_PRIORITY = [
  'cataclysm',
  'stormcrash',
  'sunfire-burst',
  'glacial-cone',
  'rime-blast',
] as const;

/** Single-target capstones (8th/6th), biggest first — reserved for a genuine
 *  boss; never spent on a mere elite. */
const CAPSTONE_NUKE_PRIORITY = ['wither', 'dissolution'] as const;

/** Mid-tier focused nukes (≤5th), biggest first — the right slot for a beefy
 *  elite that doesn't merit a capstone. Lightning Bolt (full + one half-fork)
 *  belongs here, not with the AoE. */
const MID_NUKE_PRIORITY = ['void-ray', 'force-lance', 'lightning-bolt'] as const;

/** Life-drains, CHEAPEST first — when hurt, the lowest slot that still heals
 *  banks the deeper slots for damage. */
const DRAIN_PRIORITY = ['vampiric-touch', 'exsanguinate'] as const;

/** Druid AoE blasts that hit EVERY enemy, biggest dice first — the crowd-clear
 *  pool. Call Lightning is absent (it forks to just one extra foe — a focused
 *  nuke, not a pack-clear), as is Spirit Beast (now a single-target companion). */
const DRUID_AOE_PRIORITY = [
  'wrath-of-silvanus',
  'fire-storm',
  'avalanche',
  'ice-storm',
  'wildfire',
] as const;

/** Index of the strongest healing consumable in inventory, or -1. */
function bestHealPotionIdx(character: Character): number {
  let bestIdx = -1;
  let bestHeal = 0;
  character.inventory.forEach((ref, idx) => {
    let item;
    try {
      item = getItem(ref.itemId);
    } catch {
      return;
    }
    if (item.kind !== 'consumable' || item.effect !== 'heal' || !item.healDice) return;
    const heal = avgOfExpr(item.healDice);
    if (heal > bestHeal) {
      bestHeal = heal;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

function fireBoltFullAvg(character: Character): number {
  const intMod = abilityModifier(effectiveAbilityScores(character).int);
  // Track Fire Bolt's parametric scaling so the bot keeps choosing cantrip vs
  // slot accurately as the cantrip grows. Ignores the half-on-save downside (an upper estimate).
  return 5.5 * spellDamageMultiplier(character, 0) + intMod;
}

// ---- Martial resource reads ------------------------------------------------

/**
 * How much damage a foe is TELEGRAPHING this turn (the value the bot reads off
 * the intent badge — the same telegraph the player sees). A multiattack's
 * per-hit range is multiplied by the hit count; control intents carry no damage
 * (their danger is handled by {@link telegraphsControl}). Falls back to the
 * def-derived threat when no intent is seeded (a freshly summoned add).
 */
function telegraphedDamage(m: MonsterCombatant): number {
  const it = m.instance.intent;
  if (!it) return monsterThreat(m);
  if (it.kind === 'attack' || it.kind === 'drain') return it.damageMax ?? monsterThreat(m);
  if (it.kind === 'multiattack') return (it.damageMax ?? monsterThreat(m)) * (it.hits ?? 1);
  return 0;
}

/** True when a foe is telegraphing a non-damage but dangerous action worth
 *  denying outright — a paralyze, a summon, or an inflicted debuff. */
function telegraphsControl(m: MonsterCombatant): boolean {
  const it = m.instance.intent;
  return !!it && (it.kind === 'paralyze' || it.kind === 'summon' || it.kind === 'debuff');
}

/** A telegraphed hit of at least this much is "big" — worth spending a martial
 *  DEFENSE (or denying with DISRUPT) over taking it on the chin. */
const MARTIAL_THREAT_MIN = 12;

/** Minimum target HP before the bot spends OFFENSE: the spike shouldn't be
 *  wasted as overkill on a near-dead foe. Cautious hoards for real threats,
 *  aggressive spends freely. */
const OFFENSE_MIN_TARGET_HP: Record<Archetype, number> = {
  cautious: 30,
  balanced: 22,
  aggressive: 12,
};

/** A DISRUPT only pays off on a foe meaty enough to still be standing to act —
 *  staggering something we'd kill outright wastes the point. */
const DISRUPT_MIN_TARGET_HP = 15;

// ---- The policy ------------------------------------------------------------

/**
 * Pick the single best combat action right now. PURE — reads state/character,
 * rolls no dice, mutates nothing. Designed to be called repeatedly within a
 * turn: each call commits the next slice of the action economy (a bonus-action
 * setup, then the main action, then a post-action surge) until it returns
 * `end-turn`.
 *
 * Used by both the player-facing Auto-Battle loop and the sim bots, so the AI a
 * player watches is exactly the AI the balance sims run.
 */
export function chooseCombatAction(
  state: CombatState,
  character: Character,
  archetype: Archetype = 'balanced',
): PlannedAction {
  const profile = PROFILES[archetype];
  if (state.status !== 'active') return { kind: 'end-turn' };
  const live = liveMonstersOf(state);
  if (live.length === 0) return { kind: 'end-turn' };

  const actionFree = !character.actionEconomy.actionUsed;
  const bonusFree = !character.actionEconomy.bonusActionUsed;
  const hpPct = character.hp.current / character.hp.max;
  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';
  const isDruid = character.classId === 'druid';
  const isMonk = character.classId === 'monk';
  // The monk's Ki kit (Flurry / Patient Defense / Stunning Strike) only fires
  // when fighting unarmed-style; an ordinary weapon in hand turns it dark.
  const monkKit = isMonk && monkFightsUnarmed(character);

  // Gate-aware focus: a boss warded by a live add shrugs off blows until the add
  // dies, so prioritize the warding add as the focus target (drop the ward, then
  // burst the boss). Falls back to ordinary lowest-HP focus-fire when ungated.
  const primary = wardingAddTarget(live) ?? lowestHpTarget(live);
  const threat = highestThreatTarget(live);

  // === Bonus action: survival + rogue setup ===============================
  if (bonusFree) {
    // Fighter Second Wind first — it refreshes every combat, so spend it before
    // burning a finite potion.
    const secondWindCharge =
      character.resources.secondWindAvailable === true ||
      (character.resources.secondWindBonusRemaining ?? 0) > 0;
    if (
      isFighter &&
      secondWindCharge &&
      character.hp.current < character.hp.max &&
      hpPct <= profile.secondWindHp
    ) {
      return { kind: 'second-wind' };
    }

    // Barbarian Rage: open every fight in a fury — available every combat.
    if (isBarbarian && !isRaging(character) && characterHasMechanic(character, 'rage')) {
      return { kind: 'rage' };
    }

    // Ranger Hunter's Mark: brand the focus target so every swing bites deeper;
    // re-brand once the quarry falls (the mark no longer rides a live enemy).
    if (
      isRanger &&
      characterHasMechanic(character, 'hunters-mark') &&
      primary &&
      !markIsOnLiveTarget(state, live)
    ) {
      return { kind: 'hunters-mark', targetId: primary.id };
    }

    // Druid Wild Shape: shed into a beast form for a temp-HP cushion + claws.
    // Commit to it either as a survival button (hurt) or when the offensive
    // book is spent down to cantrips (the claw out-damages plinking, and the
    // vitality buys turns). Skip if already shaped or out of changes.
    if (
      isDruid &&
      characterHasMechanic(character, 'wild-shape') &&
      !isWildShaped(character) &&
      (character.resources.wildShapeUsesRemaining ?? 0) > 0 &&
      (hpPct <= profile.wizardDefensiveHp || !druidHasOffensiveSlot(character))
    ) {
      return { kind: 'wild-shape' };
    }

    // Emergency potion (bonus action) for anyone genuinely low. Rage locks out
    // healing, so a raging barbarian can't reach for it — keep swinging instead.
    if (hpPct <= profile.emergencyHp && !isRaging(character)) {
      const healIdx = bestHealPotionIdx(character);
      if (healIdx >= 0) return { kind: 'item', inventoryIndex: healIdx };
    }

    // Druid Entangling Roots — the signature AoE soft-control, now a BONUS
    // action: grasping roots sweep the floor and everything that fails its save
    // loses its next turn, AND the druid still takes its main-action attack/cast
    // the same turn (the tempo win the cast-cost rework unlocks). Reach for it
    // when the room is crowded (2+ foes) and something meaty still stands, and
    // nothing is rooted yet (don't waste the slot re-rooting a held pack or on
    // near-dead trash). Out of beast form only — a wild-shaped druid is a pure
    // clawer (see the main block). Slot-bounded, so it can't become a free
    // every-turn room-wide lock.
    if (
      isDruid &&
      !isWildShaped(character) &&
      knows(character, 'entangling-roots') &&
      slotsAt(character, 2) > 0 &&
      live.length >= 2 &&
      threat &&
      threat.instance.hp.current > HOLD_PERSON_MIN_HP &&
      !live.some((m) => m.instance.conditions.some((c) => c.name === 'restrained'))
    ) {
      return { kind: 'cast', spellId: 'entangling-roots', targetId: threat.id };
    }

    // Monk: spend the bonus action and a Ki point on tempo. Patient Defense when
    // hurt enough to want the flowing guard (a turn to be weathered); otherwise
    // pour a Flurry of Blows into the strikes to come — the signature deluge.
    if (monkKit && (character.resources.kiPointsRemaining ?? 0) > 0) {
      if (
        characterHasMechanic(character, 'patient-defense') &&
        character.patientDefenseActive !== true &&
        hpPct <= profile.wizardDefensiveHp
      ) {
        return { kind: 'patient-defense' };
      }
      if (
        characterHasMechanic(character, 'flurry-of-blows') &&
        (character.flurryStrikesRemaining ?? 0) === 0 &&
        primary
      ) {
        return { kind: 'flurry-of-blows' };
      }
    }

    // Rogue Cunning Action: Hide → next attack lands with advantage → Sneak
    // Attack. Only worth the scarce charge when it actually enables Sneak this
    // turn: skip if the action is already spent (nothing to set up) or the
    // focus target is already bloodied (Sneak fires off the wound anyway).
    if (
      isRogue &&
      actionFree &&
      (character.resources.cunningActionUsesRemaining ?? 0) > 0 &&
      character.nextAttackAdvantage !== true &&
      primary &&
      primary.instance.hp.current > primary.instance.hp.max / 2
    ) {
      return { kind: 'cunning-action', choice: 'hide' };
    }

    // Wizard panic button: about to die, no potion left, Misty Step for +2 AC
    // and save advantage is better than nothing.
    if (
      isWizard &&
      hpPct <= profile.emergencyHp &&
      knows(character, 'misty-step') &&
      slotsAt(character, 2) > 0 &&
      bestHealPotionIdx(character) < 0
    ) {
      return { kind: 'cast', spellId: 'misty-step' };
    }
  }

  // === Main action ========================================================
  // The monk keeps swinging while a flurry is queued, even after the Attack
  // action is spent (each swing burns one queued strike in playerAttack).
  const canAct =
    actionFree ||
    (isRogue && character.bonusAttackAvailable === true) ||
    (isMonk && (character.flurryStrikesRemaining ?? 0) > 0);
  if (canAct) {
    if (isWizard) {
      const wizardAction = chooseWizardAction(state, character, live, primary, threat, profile);
      if (wizardAction) return wizardAction;
    }
    if (isDruid) {
      // In beast form the druid fights with claws — the attack dispatch swaps in
      // the natural weapon. Out of beast form it casts the nature book.
      if (isWildShaped(character) && primary) {
        return { kind: 'attack', targetId: primary.id };
      }
      const druidAction = chooseDruidAction(character, live, primary, threat, profile);
      if (druidAction) return druidAction;
    }
    // Barbarian Reckless Attack: declare it before swinging while healthy
    // enough to eat the return blows. Free stance — costs no action — so it
    // resolves, then the same turn proceeds to the attack.
    if (
      isBarbarian &&
      actionFree &&
      character.recklessActive !== true &&
      characterHasMechanic(character, 'reckless-attack') &&
      hpPct > profile.recklessHp &&
      primary
    ) {
      return { kind: 'reckless-attack' };
    }
    // Martial resource (Fighter / Barbarian / Ranger): read the enemy telegraph
    // and spend the pool WELL — deny a dangerous wind-up, brace a big incoming
    // hit, or spike a worthwhile target. Declared free before the swing, so the
    // same turn proceeds to the attack.
    if (isMartialClass(character)) {
      const martial = chooseMartialAction(character, live, primary, threat, profile, archetype);
      if (martial) return martial;
    }
    // Monk Stunning Strike: arm a staggering blow against the most dangerous foe
    // when Ki is flush enough to still afford a flurry. A free stance, so the
    // same turn proceeds to the swing that carries it.
    if (
      monkKit &&
      actionFree &&
      character.stunningStrikeActive !== true &&
      characterHasMechanic(character, 'stunning-strike') &&
      (character.resources.kiPointsRemaining ?? 0) >= 3 &&
      primary &&
      threat &&
      primary.id === threat.id &&
      monsterThreat(threat) >= profile.holdPersonThreat
    ) {
      return { kind: 'stunning-strike' };
    }
    // Weapon classes (and a wizard with no castable option) swing at the
    // focus-fire target.
    if (primary && character.equipped.mainHand) {
      return { kind: 'attack', targetId: primary.id };
    }
  }

  // === Post-action bonus: Fighter Action Surge ============================
  // Only after the action is spent and a target survived — and only when it
  // actually matters (outnumbered or still hurt). Saves the charge otherwise.
  if (
    isFighter &&
    character.actionEconomy.actionUsed &&
    (character.resources.actionSurgeRemaining ?? 0) > 0 &&
    (live.length >= 2 || hpPct <= profile.surgeHp)
  ) {
    return { kind: 'action-surge' };
  }

  return { kind: 'end-turn' };
}

/**
 * Spend the martial resource pool strategically (Fighter Resolve / Barbarian
 * Fury / Ranger Focus). Reads the enemy telegraph the same way the player does
 * and picks at most ONE spend per turn:
 *
 *  - DISRUPT the focus foe when IT is the scariest threat and is telegraphing
 *    something nasty (a heavy hit or a control) — staggering denies the whole
 *    turn — provided it is meaty enough to survive the blow (else a clean kill
 *    is the better use of the swing).
 *  - DEFENSE when a big hit is telegraphed and we aren't denying it outright.
 *  - OFFENSE when nothing needs defending and a worthwhile target stands (meaty,
 *    or an elite/boss) — so the points aren't hoarded into oblivion.
 *  - Otherwise conserve (return null → a plain swing).
 *
 * Returns null on a non-spend so the caller falls through to the attack.
 */
function chooseMartialAction(
  character: Character,
  live: MonsterCombatant[],
  primary: MonsterCombatant | undefined,
  threat: MonsterCombatant | undefined,
  profile: ArchetypeProfile,
  archetype: Archetype,
): PlannedAction | null {
  if (character.martialSpentThisTurn === true) return null;
  if (character.actionEconomy.actionUsed) return null;
  if (!primary || !character.equipped.mainHand) return null;
  const points = martialPointsLeft(character);
  if (points <= 0) return null;

  const hasOffense = characterHasMechanic(character, 'martial-offense');
  const hasDefense = characterHasMechanic(character, 'martial-defense');
  const hasDisrupt = characterHasMechanic(character, 'martial-disrupt');
  const offenseCost = martialOffenseCost(character);
  const disruptCost = martialDisruptCost(character);

  const poolFull = points >= martialPoolMax(character);
  const controlTelegraphed = live.some(telegraphsControl);
  // A worthwhile OFFENSE target: meaty enough that the spike isn't overkill, or a
  // legendary-resisting elite/boss (a long fight where the burst really tells).
  const targetWorthSpike =
    primary.instance.hp.current >= OFFENSE_MIN_TARGET_HP[archetype] ||
    (primary.instance.legendaryResistances ?? 0) > 0 ||
    (threat ? (threat.instance.legendaryResistances ?? 0) > 0 : false);

  // DISRUPT — deny the focus foe its telegraphed turn. Only when the foe we are
  // about to hit IS the scariest one (so the stagger lands where it matters) and
  // it is meaty enough to survive the blow (staggering a corpse wastes the point).
  if (
    hasDisrupt &&
    points >= disruptCost &&
    character.martialDisruptActive !== true &&
    threat &&
    primary.id === threat.id &&
    primary.instance.hp.current >= DISRUPT_MIN_TARGET_HP &&
    (telegraphedDamage(primary) >= MARTIAL_THREAT_MIN || telegraphsControl(primary))
  ) {
    return { kind: 'martial-disrupt' };
  }

  // OFFENSE (don't hoard) — when the well is at the cap, its regen is wasted if
  // the points just sit there. With a worthwhile target standing and nothing
  // telegraphing a deny-worthy control, commit the heavy spike NOW instead of
  // banking points that can't grow. This is what makes the 2-point OFFENSE a real
  // recurring choice (with the mid-fight regen the pool brims often) rather than
  // a near-inert button the bot never reaches.
  if (
    hasOffense &&
    poolFull &&
    points >= offenseCost &&
    character.martialOffenseActive !== true &&
    targetWorthSpike &&
    !controlTelegraphed
  ) {
    return { kind: 'martial-offense' };
  }

  // DEFENSE — a big hit is telegraphed somewhere on the field and we didn't deny
  // it; brace before it lands. Skip if we're so low the bonus-action heal/potion
  // is the real answer (handled earlier in the turn).
  const incomingHeavy = live.reduce((mx, m) => Math.max(mx, telegraphedDamage(m)), 0);
  const hpPct = character.hp.current / character.hp.max;
  if (
    hasDefense &&
    points >= MARTIAL_DEFENSE_COST &&
    hpPct > profile.emergencyHp &&
    incomingHeavy >= MARTIAL_THREAT_MIN
  ) {
    return { kind: 'martial-defense' };
  }

  // OFFENSE (fallback) — nothing pressing to defend and the pool isn't full;
  // still spike a worthwhile target rather than hoard the points into oblivion.
  if (
    hasOffense &&
    points >= offenseCost &&
    character.martialOffenseActive !== true &&
    targetWorthSpike
  ) {
    return { kind: 'martial-offense' };
  }

  return null;
}

/**
 * Wizard spell selection: smear-to-survive when hurt, AoE for groups, control to
 * deny the scariest foe a turn, then ASSEMBLE BURST to actually close the fight —
 * a beefy boss eats the biggest slot instead of being plinked with a cantrip.
 * A level-1 slot is kept in reserve so the Shield reaction can still fire.
 */
function chooseWizardAction(
  state: CombatState,
  character: Character,
  live: MonsterCombatant[],
  primary: MonsterCombatant | undefined,
  threat: MonsterCombatant | undefined,
  profile: ArchetypeProfile,
): PlannedAction | null {
  const enemyCount = live.length;
  const anchor = threat?.id ?? primary?.id;
  const hpPct = character.hp.current / character.hp.max;
  const actionFree = !character.actionEconomy.actionUsed;
  const beefy = highestHpTarget(live);

  // Life-drain when hurt: a necrotic drain removes a foe AND knits the caster's
  // own wounds — strictly better than a bare nuke or a one-off smear when we're
  // bleeding. Hit the beefiest target (the heal is half the damage ROLLED, so
  // overkill wastes nothing, and a healthy target wastes no damage) with the
  // CHEAPEST affordable drain, banking deeper slots. A real pack is better
  // thinned by AoE, so only drain when not facing a crowd.
  if (actionFree && hpPct <= profile.wizardDrainHp && enemyCount <= 2) {
    const drain = bestAffordable(character, DRAIN_PRIORITY);
    if (drain && beefy) return { kind: 'cast', spellId: drain, targetId: beefy.id };
  }

  // Defensive smear when genuinely hurt: Blur (sustained) or Mirror Image, once,
  // if nothing already shields us. Surviving to keep casting beats one cantrip.
  if (
    actionFree &&
    hpPct <= profile.wizardDefensiveHp &&
    (character.resources.blurRoundsRemaining ?? 0) === 0 &&
    (character.resources.mirrorImages ?? 0) === 0 &&
    slotsAt(character, 2) > 0
  ) {
    if (knows(character, 'blur')) return { kind: 'cast', spellId: 'blur' };
    if (knows(character, 'mirror-image')) return { kind: 'cast', spellId: 'mirror-image' };
  }

  // Boss finisher: against a genuinely beefy single threat, reach for the
  // deepest working — but MATCH the slot tier to how big the target really is. A
  // true boss (huge HP) merits the 9th/8th-level capstones (transform, unmake,
  // or the biggest single-target nuke); a mere elite gets a mid-tier focused
  // nuke, keeping the capstone for the fight that needs it. This both closes
  // fights (the "deep but never finishes" gap) and stops the bot dumping a
  // 9th-level slot on trash.
  if (beefy && beefy.instance.hp.current >= BOSS_NUKE_HP) {
    if (beefy.instance.hp.current >= CAPSTONE_NUKE_HP) {
      if (
        actionFree &&
        knows(character, 'apotheosis') &&
        slotsAt(character, 9) > 0 &&
        (character.resources.ascendantRoundsRemaining ?? 0) === 0
      ) {
        return { kind: 'cast', spellId: 'apotheosis' };
      }
      if (knows(character, 'unmake') && slotsAt(character, 9) > 0) {
        return { kind: 'cast', spellId: 'unmake', targetId: beefy.id };
      }
      const capstone = bestAffordable(character, CAPSTONE_NUKE_PRIORITY);
      if (capstone) return { kind: 'cast', spellId: capstone, targetId: beefy.id };
    }
    const nuke = bestAffordable(character, MID_NUKE_PRIORITY);
    if (nuke) return { kind: 'cast', spellId: nuke, targetId: beefy.id };
  }

  // AoE when the room is crowded — Fireball, then a higher-tier blast once the
  // 3rd-level slots are spent. Every spell here hits the whole pack.
  if (enemyCount >= 3) {
    if (knows(character, 'fireball') && slotsAt(character, 3) > 0 && !aoeWasted(live, 'fire')) {
      return { kind: 'cast', spellId: 'fireball', targetId: anchor };
    }
    const aoe = bestAffordable(character, HIGH_AOE_PRIORITY);
    if (aoe) return { kind: 'cast', spellId: aoe, targetId: anchor };
  }

  // A beefy PAIR: Lightning Bolt strikes the tougher in full and forks to the
  // other for half — more total damage than Fireball on exactly two, and it
  // concentrates the kill. Only when the pair is tanky enough to merit the slot.
  if (
    enemyCount === 2 &&
    knows(character, 'lightning-bolt') &&
    slotsAt(character, 3) > 0 &&
    !aoeWasted(live, 'lightning') &&
    beefy &&
    beefy.instance.hp.current >= SCORCHING_RAY_WORTH_HP
  ) {
    return { kind: 'cast', spellId: 'lightning-bolt', targetId: beefy.id };
  }

  if (
    enemyCount >= 2 &&
    knows(character, 'burning-hands') &&
    slotsAt(character, 1) > 0 &&
    !aoeWasted(live, 'fire')
  ) {
    return { kind: 'cast', spellId: 'burning-hands', targetId: anchor };
  }

  // Control: deny the scariest live foe its turn — worth it on a lone boss too
  // (its whole turn vanishes while we assemble the kill), not just a crowd. A
  // true boss is worth a 7th-level hard lock (Soul Snare's 3-round paralyze);
  // a lesser dangerous foe gets the cheaper Hold Person.
  if (
    threat &&
    !isMonsterParalyzed(threat) &&
    monsterThreat(threat) >= profile.holdPersonThreat &&
    threat.instance.hp.current > HOLD_PERSON_MIN_HP
  ) {
    if (
      knows(character, 'soul-snare') &&
      slotsAt(character, 7) > 0 &&
      threat.instance.hp.current >= SOUL_SNARE_HP
    ) {
      return { kind: 'cast', spellId: 'soul-snare', targetId: threat.id };
    }
    if (knows(character, 'hold-person') && slotsAt(character, 2) > 0) {
      return { kind: 'cast', spellId: 'hold-person', targetId: threat.id };
    }
  }

  // Guaranteed finish: Magic Missile auto-hits, so a low target dies for sure —
  // worth even the last slot, since removing a foe is also defense.
  if (
    knows(character, 'magic-missile') &&
    slotsAt(character, 1) > 0 &&
    primary &&
    primary.instance.hp.current <= MAGIC_MISSILE_MIN
  ) {
    return { kind: 'cast', spellId: 'magic-missile', targetId: primary.id };
  }

  // Burst a beefy single threat with Scorching Ray.
  if (
    enemyCount <= 2 &&
    knows(character, 'scorching-ray') &&
    slotsAt(character, 2) > 0 &&
    threat &&
    threat.instance.hp.current >= SCORCHING_RAY_WORTH_HP
  ) {
    return { kind: 'cast', spellId: 'scorching-ray', targetId: threat.id };
  }

  // Mage Armor opener: a squishy (unarmored) wizard pre-buffs +3 AC for the rest
  // of the fight — but only on the opening turn of a sustained fight (a real
  // boss present) and only when nothing more urgent fired above. At low levels,
  // with no big nuke yet, this durable AC is exactly what carries the early-game
  // caster past the fights it currently dies in. Keep a slot back for Shield.
  const reserveForShield = knows(character, 'shield') ? 1 : 0;
  if (
    actionFree &&
    state.round === 1 &&
    knows(character, 'mage-armor') &&
    character.resources.mageArmorActive !== true &&
    !character.equipped.armor &&
    beefy &&
    beefy.instance.hp.current >= BOSS_NUKE_HP &&
    enemyCount <= 2 &&
    slotsAt(character, 1) > reserveForShield
  ) {
    return { kind: 'cast', spellId: 'mage-armor' };
  }

  // Spend a level-1 slot (Magic Missile) when a cantrip is too weak to matter —
  // but keep one slot back for the Shield reaction (it negates a killing blow).
  if (
    knows(character, 'magic-missile') &&
    slotsAt(character, 1) > reserveForShield &&
    primary &&
    primary.instance.hp.current > fireBoltFullAvg(character)
  ) {
    return { kind: 'cast', spellId: 'magic-missile', targetId: primary.id };
  }

  // Cantrip — trivial target, or out of slots.
  if (knows(character, 'fire-bolt') && primary) {
    return { kind: 'cast', spellId: 'fire-bolt', targetId: primary.id };
  }

  return null;
}

/** True while the druid still holds any spell slot — i.e. has a real working to
 *  spend rather than only the at-will cantrip. Drives the "beast-form when the
 *  book is empty" read. */
function druidHasOffensiveSlot(character: Character): boolean {
  for (let lvl = 1 as SpellSlotLevel; lvl <= 9; lvl = (lvl + 1) as SpellSlotLevel) {
    if (slotsAt(character, lvl) > 0) return true;
  }
  return false;
}

function produceFlameFullAvg(character: Character): number {
  return 5.5 * spellDamageMultiplier(character, 0) + spellcastingMod(character);
}

/**
 * Druid spell selection — the Wisdom-caster mirror of {@link chooseWizardAction}.
 * The defensive lever is Wild Shape (handled in the bonus-action block), so this
 * is pure offense: a self-buff capstone for a true boss, AoE for a crowd, a
 * focused fork for a pair, control to deny the scariest foe, then assemble burst
 * down to the at-will cantrip.
 */
function chooseDruidAction(
  character: Character,
  live: MonsterCombatant[],
  primary: MonsterCombatant | undefined,
  threat: MonsterCombatant | undefined,
  profile: ArchetypeProfile,
): PlannedAction | null {
  const enemyCount = live.length;
  const anchor = threat?.id ?? primary?.id;
  const beefy = highestHpTarget(live);
  const hpPct = character.hp.current / character.hp.max;

  // Regrowth: the Druid's one true sustain. When bloodied and the renewal isn't
  // already running, knit wounds with a 2nd-level slot — the heal-over-time pays
  // back across the next turns, which beats plinking a cantrip while bleeding.
  if (
    hpPct <= profile.wizardDrainHp &&
    (character.resources.regrowthTurnsRemaining ?? 0) === 0 &&
    knows(character, 'regrowth') &&
    slotsAt(character, 2) > 0
  ) {
    return { kind: 'cast', spellId: 'regrowth' };
  }

  // Boss finisher: against a true boss, blaze into the Avatar of the Wilds
  // (the 9th-level self-buff) — temp HP, +AC, and far harder strikes for the
  // assembled kill. Only when not already transformed.
  if (
    beefy &&
    beefy.instance.hp.current >= CAPSTONE_NUKE_HP &&
    knows(character, 'avatar-of-the-wilds') &&
    slotsAt(character, 9) > 0 &&
    (character.resources.ascendantRoundsRemaining ?? 0) === 0
  ) {
    return { kind: 'cast', spellId: 'avatar-of-the-wilds' };
  }

  // Spirit Beast: bind a primal companion to a real, sustained threat. Call it
  // EARLY (the moment a beefy boss/elite stands) so its per-turn maulings stack
  // across the fight, and only when one isn't already at your side. The 7th-level
  // slot pays off over the duration, not in one burst.
  if (
    beefy &&
    beefy.instance.hp.current >= BOSS_NUKE_HP &&
    knows(character, 'spirit-beast') &&
    slotsAt(character, 7) > 0 &&
    (character.resources.spiritBeastTurnsRemaining ?? 0) === 0
  ) {
    return { kind: 'cast', spellId: 'spirit-beast', targetId: beefy.id };
  }

  // AoE when the room is crowded — biggest affordable blast that hits the pack.
  if (enemyCount >= 3) {
    const aoe = bestAffordable(character, DRUID_AOE_PRIORITY);
    if (aoe && !aoeWastedAny(live, aoe)) {
      return { kind: 'cast', spellId: aoe, targetId: anchor };
    }
  }

  // A beefy pair / single boss: Call Lightning strikes one in full and forks to a
  // second for half — the focused nuke that actually closes the fight.
  if (
    beefy &&
    beefy.instance.hp.current >= BOSS_NUKE_HP &&
    enemyCount <= 2 &&
    knows(character, 'call-lightning') &&
    slotsAt(character, 3) > 0
  ) {
    return { kind: 'cast', spellId: 'call-lightning', targetId: beefy.id };
  }

  // (Entangling Roots is no longer a main-action cast — it's a BONUS action now,
  // chosen in the bonus-action block of chooseCombatAction so the druid roots the
  // room AND still spends its main action here.)

  // Guaranteed finish: Thornlash auto-hits, so a low target dies for sure.
  if (
    knows(character, 'thornlash') &&
    slotsAt(character, 1) > 0 &&
    primary &&
    primary.instance.hp.current <= MAGIC_MISSILE_MIN
  ) {
    return { kind: 'cast', spellId: 'thornlash', targetId: primary.id };
  }

  // Spend a level-1 slot (Thornlash) when the cantrip is too weak to matter.
  if (
    knows(character, 'thornlash') &&
    slotsAt(character, 1) > 0 &&
    primary &&
    primary.instance.hp.current > produceFlameFullAvg(character)
  ) {
    return { kind: 'cast', spellId: 'thornlash', targetId: primary.id };
  }

  // Cantrip — trivial target, or out of slots.
  if (knows(character, 'produce-flame') && primary) {
    return { kind: 'cast', spellId: 'produce-flame', targetId: primary.id };
  }

  return null;
}

/** AoE-waste guard for the druid pool: only fire/lightning/cold blasts can be
 *  fully resisted by the whole room. Reads the spell's damage type and reuses
 *  the shared resist check for the two types {@link aoeWasted} knows. */
function aoeWastedAny(live: MonsterCombatant[], spellId: string): boolean {
  const type = getSpell(spellId).damageType;
  if (type === 'fire' || type === 'lightning') return aoeWasted(live, type);
  return false;
}

// ---- Dispatch --------------------------------------------------------------

export interface ApplyActionContext {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
}

/**
 * Execute a {@link PlannedAction} through the real combat engine entry points.
 * Returns the fresh `{ state, character }`. On an invalid/no-op action the
 * underlying engine returns the same references unchanged, which callers use
 * to detect "nothing happened" and stop looping.
 */
export function applyPlannedAction(
  ctx: ApplyActionContext,
  action: PlannedAction,
): { state: CombatState; character: Character } {
  const { roller, state, character } = ctx;
  switch (action.kind) {
    case 'attack': {
      // A wild-shaped druid strikes with its beast profile (claws/bite); a monk
      // always strikes unarmed with its level-scaled Martial Arts die — neither
      // swings the weapon hanging at its side.
      const weaponId = isWildShaped(character)
        ? beastWeaponId(character)
        : character.classId === 'monk' && monkFightsUnarmed(character)
          ? martialArtsWeaponId(character)
          : (character.equipped.mainHand?.itemId ?? 'dagger');
      const r = playerAttack({ roller, character, state }, action.targetId, weaponId);
      return { state: r.state, character: r.character };
    }
    case 'cast': {
      const r = castSpell({
        roller,
        character,
        state,
        spellId: action.spellId,
        targetId: action.targetId,
      });
      return { state: r.state, character: r.character };
    }
    case 'item': {
      const r = useConsumable({ roller, character, state }, action.inventoryIndex);
      return { state: r.state, character: r.character };
    }
    case 'second-wind': {
      const r = useSecondWind({ roller, character, state });
      return { state: r.state, character: r.character };
    }
    case 'action-surge': {
      const r = useActionSurge({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'martial-offense': {
      const r = useMartialOffense({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'martial-defense': {
      const r = useMartialDefense({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'martial-disrupt': {
      const r = useMartialDisrupt({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'cunning-action': {
      const r = useCunningAction({ character, state, choice: action.choice });
      return { state: r.state, character: r.character };
    }
    case 'rage': {
      const r = useRage({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'reckless-attack': {
      const r = useRecklessAttack({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'hunters-mark': {
      const r = useHuntersMark({ character, state, targetId: action.targetId });
      return { state: r.state, character: r.character };
    }
    case 'wild-shape': {
      const r = useWildShape({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'flurry-of-blows': {
      const r = useFlurryOfBlows({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'patient-defense': {
      const r = usePatientDefense({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'stunning-strike': {
      const r = useStunningStrike({ character, state });
      return { state: r.state, character: r.character };
    }
    case 'end-turn':
      return { state, character };
  }
}

/**
 * Drive a full player turn with the policy: repeatedly pick + dispatch actions
 * until the turn is spent, combat ends, or no progress is made. Does NOT call
 * `endTurn` — the caller advances the turn. Used by the sim bots; the UI runs
 * the same loop one timed step at a time so the player can watch (and bail).
 */
export function runAutoTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
  archetype: Archetype = 'balanced',
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  for (let i = 0; i < 16; i++) {
    if (s.status !== 'active') break;
    const action = chooseCombatAction(s, ch, archetype);
    if (action.kind === 'end-turn') break;
    const r = applyPlannedAction({ roller, state: s, character: ch }, action);
    if (r.state === s && r.character === ch) break; // engine refused — stop
    s = r.state;
    ch = r.character;
  }
  return { state: s, character: ch };
}

// ---- Shrine blessing policy ------------------------------------------------

/**
 * Per-combat temp HP a blessing's temp-HP family would grant, mirroring the
 * `Math.max` fold in {@link createCombat}. Delve-level scaling reads
 * `character.level` — the exact value the engine multiplies by — so the score
 * tracks the real grant. Boss-only temp HP is excluded here (most rooms aren't
 * bosses); it's credited separately, discounted.
 */
function blessingTempHpGrant(m: BlessingModifiers, character: Character, banes: number): number {
  return Math.max(
    m.extraTempHpPerRoom ?? 0,
    (m.tempHpPerDelveLevel ?? 0) * character.level,
    (m.tempHpPerBaneQuirk ?? 0) * banes,
  );
}

/**
 * Score a single offered blessing for THIS build, in a shared "value" unit so
 * survival, offense, and synergy levers compare on one scale. Higher = better.
 *
 * The weights are calibrated to rank picks the way a careful player would, not
 * to predict exact win-rate (the sims measure the real lift). Three rules shape
 * them:
 *
 *  - **Defensive levers are renewable** (they fire every combat), so a point of
 *    AC / temp HP / regen is worth real value; a free death-save (stabilise
 *    charge) is worth the most of all.
 *  - **Offensive levers scale with how often they fire** — flat damage / crit
 *    range multiply by attacks-per-round (Fighter Extra Attack = ×2), while
 *    first-attack-only tricks are credited once. They're worth ~nothing to a
 *    Wizard, whose spells save-for-half or auto-hit (PR #105), so the whole
 *    offense block is gated to weapon classes.
 *  - **Synergy levers** (`*PerBaneQuirk`, `tempHpPerDelveLevel`) are scored at
 *    the soul's ACTUAL bane count / level, so a bare soul doesn't overvalue a
 *    card that needs curses it doesn't carry.
 *
 * A purely non-stacking lever the soul already owns folds with `Math.max`/OR in
 * {@link aggregateBlessingModifiers}, so a duplicate is a dead pick — scored
 * below "take nothing". The temp-HP family also doesn't stack, so only the
 * MARGINAL temp HP over the best source already held is credited.
 */
export function scoreBlessing(blessingId: string, character: Character): number {
  let b: Blessing;
  try {
    b = getBlessing(blessingId);
  } catch {
    return -1;
  }

  // A non-stacking lever already owned adds nothing — dead pick.
  if (isNonStackingBlessing(b)) {
    const sig = blessingSignature(b);
    const dup = character.blessings.some((id) => {
      try {
        return blessingSignature(getBlessing(id)) === sig;
      } catch {
        return false;
      }
    });
    if (dup) return -1;
  }

  const m = b.modifiers ?? {};
  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const weaponClass =
    isFighter ||
    isRogue ||
    character.classId === 'barbarian' ||
    character.classId === 'ranger' ||
    character.classId === 'monk';
  const banes = baneQuirkCount(character);
  const attacks = characterHasMechanic(character, 'extra-attack') ? 2 : 1;

  let s = 0;

  // --- Survival (all classes) ---
  if (m.acBonus) s += m.acBonus * 7;
  if (m.acBonusWhileFull) s += m.acBonusWhileFull * 4; // you open every combat full
  if (m.acBonusWhileBloodied) s += m.acBonusWhileBloodied * 4; // clutch exactly when low
  if (m.acBonusPerBaneQuirk) s += m.acBonusPerBaneQuirk * banes * 6;

  // Temp-HP family is max-of (doesn't stack) — credit the marginal gain only.
  const candTempHp = blessingTempHpGrant(m, character, banes);
  if (candTempHp > 0) {
    let ownedTempHp = 0;
    for (const id of character.blessings) {
      try {
        ownedTempHp = Math.max(
          ownedTempHp,
          blessingTempHpGrant(getBlessing(id).modifiers ?? {}, character, banes),
        );
      } catch {
        /* unknown id — ignore */
      }
    }
    s += Math.max(0, candTempHp - ownedTempHp) * 2.5;
  }
  if (m.bossTempHp) s += m.bossTempHp * 1; // boss-only gird, discounted

  if (m.regenPerCombat) s += m.regenPerCombat * 3;
  if (m.regenPctPerCombat) s += (m.regenPctPerCombat / 100) * character.hp.max * 3;
  if (m.extraStabiliseCharges) s += m.extraStabiliseCharges * 12; // a free "don't die"

  // --- Offense (weapon classes only; inert for the wizard's save/auto-hit kit) ---
  if (weaponClass) {
    if (m.damageBonus) s += m.damageBonus * attacks * 4;
    if (m.holyDamageBonus) s += m.holyDamageBonus * attacks * 3.5;
    if (m.firstAttackDamage) s += m.firstAttackDamage * 2;
    if (m.firstAttackBonus) s += m.firstAttackBonus * 2;
    if (m.firstAttackAdvantage) s += isRogue ? 8 : 5; // rogue: reliably enables Sneak Attack
    if (m.critRangeBonus) s += m.critRangeBonus * 6;
    if (m.critRangeBonusWhileFull) s += m.critRangeBonusWhileFull * 4;
    if (m.critRangeBonusWhileBloodied) s += m.critRangeBonusWhileBloodied * 3;
    if (m.rerollMissesPerEncounter) s += m.rerollMissesPerEncounter * 3;
  }

  return s;
}

/**
 * Pick the best blessing from a shrine offer for this build. PURE — reads
 * `character`, mutates nothing. Returns the chosen id, or `undefined` for an
 * empty offer. Used by the sim bots (so balance data reflects a player who
 * actually takes shrine buffs) and available to the in-game Auto path.
 */
export function chooseBlessing(offer: string[], character: Character): string | undefined {
  if (offer.length === 0) return undefined;
  let best = offer[0];
  let bestScore = scoreBlessing(best, character);
  for (const id of offer.slice(1)) {
    const sc = scoreBlessing(id, character);
    if (sc > bestScore) {
      bestScore = sc;
      best = id;
    }
  }
  return best;
}
