import type { DiceRoller } from '../../dice';
import { parseDiceExpression } from '../../dice';
import type { Character } from '../../../types/character';
import type {
  AttackEvent,
  Combatant,
  CombatState,
  CombatLogEntry,
} from '../../../types/combat';
import type { Weapon } from '../../../schemas/item';
import { abilityModifier } from '../../../types/abilities';
import {
  critRange,
  computeAC,
  effectiveAbilityScores,
  characterHasMechanic,
  isRaging,
  ragedHealAmount,
  proficiencyBonus,
} from '../../character/derived';
import { rageDamageBonus } from '../../character/actions';
import {
  martialOffenseDamage,
  martialOffenseAttackBonus,
  MARTIAL_DISRUPT_STAGGER_TURNS,
} from '../martialResource';
import { APOTHEOSIS_BONUS_DAMAGE, isAscendant } from '../apotheosis';
import { monkKiSaveDC, monkFightsUnarmed, MONK_UNARMED_DAMAGE_EDGE } from '../monk';
import { getMonster } from '../../../content/monsters';
import { isRangedWeapon, rageBrokenByArmor } from '../../character/equip';
import { HUNTERS_MARK_DICE } from '../huntersMark';
import { characterQuirkMods } from '../../character/quirks';
import { characterBlessingMods } from '../../character/blessings';
import { characterCampBoonMods } from '../../character/campBoons';
import { characterAffixMods, enhancementOf } from '../../items/affixMods';
import { getItem } from '../../../content/items';
import { playerConditionMods } from '../playerConditions';
import { playSfx, swingSfxForWeapon } from '../../audio';
import {
  combatResult,
  patchActionEconomy,
  patchDelveBudgets,
  type CombatActionResult,
} from '../types';
import { appendLog, markPlayerLog } from '../log';
import { attachCombatVfx, weaponVfxKind } from '../vfx';
import { applyDamage, evaluateCombatEnd, nextLogId } from './damage';
import { t, getLocalized } from '../../../i18n';

export interface AttackContext {
  roller: DiceRoller;
  character: Character;
  state: CombatState;
}

export function sneakAttackDiceForLevel(level: number): number {
  return Math.max(1, Math.ceil(level / 2));
}

// The damage-breakdown parts are tagged with stable English labels at each
// bonus-damage source; this maps those tags onto combat.part.* keys so the
// parenthetical math reads in the active language. An unmapped label falls back
// to itself (so a new source is never silently dropped).
const PART_KEY: Record<string, string> = {
  blessing: 'blessing',
  gear: 'gear',
  enhancement: 'enhancement',
  weapon: 'weapon',
  affinity: 'affinity',
  Hangry: 'hangry',
  'first strike': 'firstStrike',
  Whetstone: 'whetstone',
  mastery: 'mastery',
  heavy: 'heavy',
  'martial arts': 'martialArts',
  ki: 'ki',
  'open hand': 'openHand',
  shadow: 'shadow',
  ascendant: 'ascendant',
  'First Cut': 'firstCut',
  'Bleed-Out': 'bleedOut',
  Fellfast: 'fellfast',
  Mountain: 'mountain',
  Rage: 'rageCap',
  Furious: 'furious',
  'heavy haft': 'heavyHaft',
  Relentless: 'relentless',
  weakened: 'weakened',
  assassinate: 'assassinate',
  'giant-killer': 'giantKiller',
  maneuver: 'maneuver',
  Shadowed: 'shadowed',
  Quarry: 'quarry',
};

function partLabel(label: string): string {
  const key = PART_KEY[label];
  return key ? t(`combat.part.${key}`) : label;
}

/** Rogue Assassinate (L4): extra Sneak Attack dice on the opening strike of the
 *  fight, on top of the auto-advantage it also grants. A once-per-combat burst. */
const ASSASSINATE_BONUS_SNEAK_DICE = 2;

/** Rogue Envenom (L8): the bleed a landed Sneak Attack leaves behind — a small
 *  damage-over-time that offsets the once-per-turn burst ceiling with sustain.
 *  Kept below the gear bleed affixes (3/turn × 3) so the kit doesn't overshadow
 *  the loot; folded max-of so it never weakens a stronger bleed already running. */
const ENVENOM_BLEED_PER_TURN = 2;
const ENVENOM_BLEED_TURNS = 2;

/**
 * Which damage dice a weapon rolls. A versatile weapon swung two-handed — i.e.
 * with the off-hand empty (no shield, no second weapon) — rolls its larger
 * `versatileDamage` die; held one-handed it rolls the base `damage`.
 */
export function weaponDamageDice(weapon: Weapon, offHandEmpty: boolean): string {
  if (offHandEmpty && weapon.properties.includes('versatile') && weapon.versatileDamage) {
    return weapon.versatileDamage;
  }
  return weapon.damage;
}

function findCombatant(state: CombatState, id: string): Combatant | undefined {
  return state.combatants.find((c) => c.id === id);
}

function displayName(c: Combatant, character: Readonly<Character>): string {
  return c.kind === 'player' ? character.name : c.instance.displayName;
}

function targetAC(target: Combatant, character: Readonly<Character>): number {
  return target.kind === 'player' ? computeAC(character) : target.instance.ac;
}

/**
 * Player attacks a target with a weapon (must be the equipped main-hand).
 * Returns CombatActionResult: callers use result.state and result.character
 * directly. Internals thread a local `nextCharacter` accumulator — no in-place
 * mutation of `ctx.character` anywhere.
 */
export function playerAttack(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  // Snapshot the log before the swing so every roll/damage line it appends can
  // be stamped as the player's own (markPlayerLog) for the log's emphasis.
  const beforeLog = new Set(state.log);
  let nextCharacter: Character = character;
  const target = findCombatant(state, targetId);
  if (!target) return combatResult(state, nextCharacter);
  if (target.kind !== 'monster') return combatResult(state, nextCharacter);

  const weapon = getItem(weaponItemId);
  if (weapon.kind !== 'weapon') return combatResult(state, nextCharacter);
  playSfx(swingSfxForWeapon(weapon));

  const scores = effectiveAbilityScores(nextCharacter);
  const w = weapon as Weapon;
  const isFinesse = w.properties.includes('finesse');
  // Ranged weapons (bows, crossbows) are flagged by the `ammunition` property.
  // Thrown daggers stay in the finesse branch — they're melee that can fly.
  const isRanged = isRangedWeapon(w);
  const attackAbility: 'str' | 'dex' = isRanged
    ? 'dex'
    : isFinesse
      ? (abilityModifier(scores.dex) >= abilityModifier(scores.str) ? 'dex' : 'str')
      : 'str';
  const abilMod = abilityModifier(scores[attackAbility]);
  const profBonus = proficiencyBonus(nextCharacter.level);

  // A monk earns the Martial Arts kit (and the unarmed damage edge below) only
  // when striking truly bare-handed — no weapon equipped. ANY weapon in hand,
  // even a themed "monk weapon", turns it all off: a plain swing.
  const monkUnarmedStrike = monkFightsUnarmed(nextCharacter);

  const quirkMods = characterQuirkMods(nextCharacter);
  // Sealed Wards twist: blessings are inert this fight — every blessing-sourced
  // to-hit/damage/advantage line below reads off a neutral (empty) mod set.
  const blessingMods = state.blessingsSealed ? {} : characterBlessingMods(nextCharacter);
  const boonMods = characterCampBoonMods(nextCharacter);
  const affixMods = characterAffixMods(nextCharacter);
  const isFirstAttack = !state.playerHasAttacked;
  const targetWounded =
    target.kind === 'monster' &&
    target.instance.hp.current > 0 &&
    target.instance.hp.current <= target.instance.hp.max / 2;
  const playerWounded = nextCharacter.hp.current <= nextCharacter.hp.max / 2;

  let attackBonus = abilMod + profBonus;
  attackBonus += nextCharacter.permanentBonuses?.attack ?? 0;
  attackBonus += nextCharacter.delveAttackBonus ?? 0;
  attackBonus += boonMods.attackBonus ?? 0;
  // Honed weapon affix: flat +to-hit.
  attackBonus += affixMods.attackBonus;
  // Weapon enhancement (+N): a flat axis on the swung main-hand, separate from
  // affixes — adds to the attack roll here and to damage in the hit block.
  const weaponEnhancement = enhancementOf(nextCharacter.equipped.mainHand);
  attackBonus += weaponEnhancement;
  // Weapon accuracy lever: the shortbow's inherent +to-hit, traded for a smaller die.
  attackBonus += w.attackMod ?? 0;
  // Class affinity: a weapon that fits the wielder's hands. The edge is applied
  // as bonus damage in the hit block below (accuracy is the tradeoff lever's job).
  const hasAffinity = w.affinity === nextCharacter.classId;
  // Ranger Fighting Style: Archery — +2 to attack rolls with ranged weapons.
  if (isRanged && characterHasMechanic(nextCharacter, 'archery')) attackBonus += 2;
  // Fighter Weapon Mastery (L9): +1 to hit on every weapon strike.
  if (characterHasMechanic(nextCharacter, 'weapon-mastery')) attackBonus += 1;
  // Martial OFFENSE: a heavy/aimed strike. For the Barbarian (Savage Cleave) and
  // Ranger (Aimed Shot) it lands for flat bonus damage only (applied in the hit
  // block), no accuracy cost. The Fighter's Power Attack also SHARPENS the swing
  // — +2 to hit — so a class that misses often lands surer, not just harder.
  const offenseStrike = nextCharacter.martialOffenseActive === true;
  if (offenseStrike) attackBonus += martialOffenseAttackBonus(nextCharacter);
  if (isFirstAttack) {
    attackBonus += quirkMods.firstTurnAttackBonus ?? 0;
    attackBonus += quirkMods.firstAttackPenalty ?? 0;
  }
  if (targetWounded) attackBonus += quirkMods.woundedAttackBonus ?? 0;
  if (isFirstAttack && blessingMods.firstAttackBonus) {
    attackBonus += blessingMods.firstAttackBonus;
  }
  // One-shot flat-to-hit bonus consumed by the next attack roll (reserved
  // hook — Dash now grants a bonus swing instead of accuracy).
  const nextBonus = nextCharacter.nextAttackBonus ?? 0;
  attackBonus += nextBonus;

  const ac = targetAC(target, nextCharacter);
  const hideAdvantage = nextCharacter.nextAttackAdvantage === true;
  // Cunning Action: Feint — a one-shot flag that forces Sneak Attack onto this
  // strike regardless of advantage / wound / dagger / opener (read in the Sneak
  // block below). Captured here so it survives the field being consumed.
  const forceSneak = nextCharacter.nextAttackForceSneak === true;
  // Monster debuffs (poisoned/frightened/blinded/restrained) impose
  // disadvantage on the player's attacks. Advantage comes from Hide, a
  // first-strike blessing, or a Barbarian's Reckless Attack (melee only).
  // Advantage + disadvantage cancel to a straight roll (5e).
  const condMods = playerConditionMods(nextCharacter);
  const recklessAdvantage = nextCharacter.recklessActive === true && !isRanged;
  // Monk (Way of Shadow): the unseen opener — the first strike of the fight
  // lands with advantage.
  const shadowOpener =
    isFirstAttack && monkUnarmedStrike && characterHasMechanic(nextCharacter, 'shadow-strike');
  // Rogue Assassinate (L4): the killer opens from the blind side — the first
  // strike of the fight lands with advantage (and extra Sneak dice, below).
  const assassinateOpener =
    isFirstAttack && characterHasMechanic(nextCharacter, 'assassinate');
  const hasAdvantage =
    (isFirstAttack && !!blessingMods.firstAttackAdvantage) ||
    hideAdvantage ||
    recklessAdvantage ||
    shadowOpener ||
    assassinateOpener;
  // Gloom twist: the first attack of the fight rolls at disadvantage (one-shot —
  // gated on isFirstAttack, which flips off once the player has swung).
  const gloomDisadvantage = isFirstAttack && state.gloomActive === true;
  const hasDisadvantage = condMods.attackDisadvantage || gloomDisadvantage;
  const advantage: 'normal' | 'advantage' | 'disadvantage' =
    hasAdvantage === hasDisadvantage ? 'normal' : hasAdvantage ? 'advantage' : 'disadvantage';
  // One-shot: consume Hide and any pending flat-to-hit bonus on the actual
  // attack roll, hit or miss.
  if (hideAdvantage) nextCharacter = { ...nextCharacter, nextAttackAdvantage: false };
  if (forceSneak) nextCharacter = { ...nextCharacter, nextAttackForceSneak: false };
  if (nextBonus > 0) nextCharacter = { ...nextCharacter, nextAttackBonus: 0 };
  let toHit = roller.d20(advantage, attackBonus);
  let crit = critRange(nextCharacter).includes(toHit.rolls[0]);
  let hit = crit || (toHit.total >= ac && !toHit.natural1);

  const logEntries: CombatLogEntry[] = [];
  const newLogId = nextLogId(state);
  const weaponName = getLocalized('items', weapon.id, 'name', weapon.name);
  const rollResult = (c: boolean, h: boolean): string =>
    `— ${c ? t('combat.f.resCrit') : h ? t('combat.f.resHit') : t('combat.f.resMiss')}`;
  const signed = (n: number): string => `${n >= 0 ? '+' : ''}${n}`;
  logEntries.push({
    id: newLogId,
    kind: 'roll',
    text: t('combat.log.attackRoll', {
      name: nextCharacter.name,
      verb: isRanged ? t('combat.log.verbFires') : t('combat.log.verbAttacks'),
      target: displayName(target, nextCharacter),
      weapon: weaponName,
      mod: signed(attackBonus),
      total: toHit.total,
      ac,
      result: rollResult(crit, hit),
    }),
  });

  // Auto-reroll a miss if a reroll budget is available. Prefer the
  // per-encounter budget (Tymora's Coin) before the per-delve one (Tymora's Eye).
  let usedEncounterReroll = 0;
  let usedDelveReroll = 0;
  if (!hit) {
    let source: 'encounter' | 'delve' | null = null;
    if (state.rerollMissesEncounterRemaining > 0) source = 'encounter';
    else if ((nextCharacter.delveBudgets?.quirkRerollMissesRemaining ?? 0) > 0) source = 'delve';
    if (source) {
      if (source === 'encounter') usedEncounterReroll = 1;
      else usedDelveReroll = 1;
      toHit = roller.d20(advantage, attackBonus);
      crit = critRange(nextCharacter).includes(toHit.rolls[0]);
      hit = crit || (toHit.total >= ac && !toHit.natural1);
      const sourceLabel = source === 'encounter' ? "Tymora's Coin" : "Tymora's Eye";
      logEntries.push({
        id: newLogId + 1,
        kind: 'roll',
        text: t('combat.log.reroll', {
          source: sourceLabel,
          mod: signed(attackBonus),
          total: toHit.total,
          ac,
          result: rollResult(crit, hit),
        }),
      });
    }
  }

  const attackEvent: AttackEvent = {
    id: state.attackEventCounter + 1,
    attackerName: nextCharacter.name,
    targetName: displayName(target, nextCharacter),
    attackerKind: 'player',
    weaponName: weapon.name,
    attackBonus,
    natural: toHit.rolls[0],
    total: toHit.total,
    targetAC: ac,
    hit,
    crit,
  };

  let nextState: CombatState = appendLog(
    {
      ...state,
      // The player has now made an attack roll against this monster, so its AC
      // becomes "known" — UI can reveal it.
      combatants: state.combatants.map((c) => {
        if (c.kind !== 'monster' || c.id !== targetId) return c;
        if (c.instance.acRevealed) return c;
        return { ...c, instance: { ...c.instance, acRevealed: true } };
      }),
      lastAttack: attackEvent,
      attackEventCounter: attackEvent.id,
    },
    ...logEntries,
  );

  let sneakAttackFiredFlag = false;
  let colossusFiredFlag = false;
  let bladeOfVowUsed = false;
  if (hit) {
    const offHandEmpty = !nextCharacter.equipped.offHand;
    const damageExpr = parseDiceExpression(weaponDamageDice(w, offHandEmpty));
    // On crit, double the dice (not the modifier).
    // Barbarian Brutal Critical (L9): a critical strike rolls one extra weapon
    // die on top of the doubled dice — the savage spike on top of the crit.
    const brutalCritDie =
      crit && characterHasMechanic(nextCharacter, 'brutal-critical') ? 1 : 0;
    const damageRoll = roller.roll(
      {
        count: damageExpr.count * (crit ? 2 : 1) + brutalCritDie,
        die: damageExpr.die,
        modifier: 0,
      },
    );

    // Blade of the Vow (camp boon): once per combat, reroll the lowest weapon
    // damage die and keep the higher result. Consumed on the first damaging
    // strike where the boon budget is still > 0.
    let bladeOfVowDelta = 0;
    if (
      (nextState.bladeOfVowRerollsRemaining ?? 0) > 0 &&
      damageRoll.rolls.length > 0
    ) {
      let lowestIdx = 0;
      for (let i = 1; i < damageRoll.rolls.length; i++) {
        if (damageRoll.rolls[i] < damageRoll.rolls[lowestIdx]) lowestIdx = i;
      }
      const original = damageRoll.rolls[lowestIdx];
      const reroll = roller.roll({ count: 1, die: damageExpr.die, modifier: 0 });
      if (reroll.rolls[0] > original) {
        damageRoll.rolls[lowestIdx] = reroll.rolls[0];
        damageRoll.total = damageRoll.total - original + reroll.rolls[0];
        bladeOfVowDelta = reroll.rolls[0] - original;
      }
      bladeOfVowUsed = true;
    }

    let bonusDamage = 0;
    let sneakDamage = 0;
    let sneakDice = 0;
    let offTypeDamage = 0;
    // On-type flat bonuses are summands in the weapon-type breakdown so the
    // parenthetical math adds up. Off-type bonuses (radiant) get their own
    // headline segment — never folded into / mislabeled as the weapon type.
    const onTypeParts: { amount: number; label: string }[] = [];
    const offTypeParts: { amount: number; type: string }[] = [];
    const damageNotes: string[] = [];

    // Monk Flurry compounding guard. A Flurry strike fires AFTER the Attack
    // action is spent (a bonus-action extra), so on entry the action is already
    // used — that's the signal this swing is an extra unarmed strike, not a
    // primary one. Those extras take only HALF the per-hit Grove edge (Whetstone)
    // and gear damage affixes, so Flurry × per-hit-edge no longer COMPOUNDS up the
    // ascension ladder (where Grove tiers + affixes are biggest, and the Monk —
    // alone — was topping Asc 6). The intrinsic Martial Arts kit (unarmed edge,
    // Ki, Open Hand, Shadow) still rides every strike in full — the kit fires;
    // only the stacked external edge is rationed on the extra strikes.
    const diminishedExtraEdge =
      monkUnarmedStrike && nextCharacter.actionEconomy.actionUsed === true;
    const scaleExtraEdge = (v: number): number =>
      diminishedExtraEdge ? Math.floor(v / 2) : v;

    const flatBonus = blessingMods.damageBonus ?? 0;
    if (flatBonus) {
      bonusDamage += flatBonus;
      onTypeParts.push({ amount: flatBonus, label: 'blessing' });
    }
    // Weapon affixes: flat damage bonus (Cruel). Bleed is a DOT applied below.
    // Halved on a Monk's Flurry extras so the gear edge doesn't multiply per strike.
    if (affixMods.damageBonus) {
      const gear = scaleExtraEdge(affixMods.damageBonus);
      if (gear > 0) {
        bonusDamage += gear;
        onTypeParts.push({ amount: gear, label: 'gear' });
      }
    }
    // Weapon enhancement (+N): the same flat bonus already added to the attack
    // roll now lands on damage.
    if (weaponEnhancement > 0) {
      bonusDamage += weaponEnhancement;
      onTypeParts.push({ amount: weaponEnhancement, label: 'enhancement' });
    }
    // Weapon damage lever: the longbow's inherent +damage, paid for in accuracy.
    if (w.damageMod) {
      bonusDamage += w.damageMod;
      onTypeParts.push({ amount: w.damageMod, label: 'weapon' });
    }
    // Class affinity: the matched weapon bites a little deeper in its owner's hands.
    if (hasAffinity) {
      bonusDamage += 1;
      onTypeParts.push({ amount: 1, label: 'affinity' });
    }
    const holyBonus = blessingMods.holyDamageBonus ?? 0;
    if (holyBonus) {
      bonusDamage += holyBonus;
      offTypeDamage += holyBonus;
      offTypeParts.push({ amount: holyBonus, type: 'radiant' });
    }
    if (playerWounded && quirkMods.hangryDamageBonus) {
      bonusDamage += quirkMods.hangryDamageBonus;
      onTypeParts.push({ amount: quirkMods.hangryDamageBonus, label: 'Hangry' });
    }
    if (isFirstAttack && blessingMods.firstAttackDamage) {
      bonusDamage += blessingMods.firstAttackDamage;
      onTypeParts.push({ amount: blessingMods.firstAttackDamage, label: 'first strike' });
    }
    // Grove upgrades — permanent damage bonuses baked into the soul. Halved on a
    // Monk's Flurry extras so the per-hit Grove edge doesn't compound per strike.
    const whetstone = scaleExtraEdge(nextCharacter.permanentBonuses?.damage ?? 0);
    if (whetstone) {
      bonusDamage += whetstone;
      onTypeParts.push({ amount: whetstone, label: 'Whetstone' });
    }
    // Fighter Weapon Mastery (L9): a flat edge on every weapon strike.
    if (characterHasMechanic(nextCharacter, 'weapon-mastery')) {
      bonusDamage += 1;
      onTypeParts.push({ amount: 1, label: 'mastery' });
    }
    // Martial OFFENSE: the flat spike on each strike this turn, paid for by the
    // martial point spent to set the stance (no accuracy cost).
    if (offenseStrike) {
      const spike = martialOffenseDamage(nextCharacter);
      bonusDamage += spike;
      onTypeParts.push({ amount: spike, label: 'heavy' });
    }
    // Monk unarmed damage edge — the reward for going weaponless. Rides every
    // bare-handed strike (each Flurry strike included); dark with ANY weapon in
    // hand.
    if (monkUnarmedStrike) {
      bonusDamage += MONK_UNARMED_DAMAGE_EDGE;
      onTypeParts.push({ amount: MONK_UNARMED_DAMAGE_EDGE, label: 'martial arts' });
    }
    // Monk Ki-Empowered Strikes (L6): channelled Ki rides every unarmed blow.
    if (monkUnarmedStrike && characterHasMechanic(nextCharacter, 'ki-empowered')) {
      bonusDamage += 1;
      onTypeParts.push({ amount: 1, label: 'ki' });
    }
    // Monk (Open Hand): a flurry batters the guard open — extra bite on the
    // strikes that fall while a flurry is still pouring out.
    if (
      monkUnarmedStrike &&
      characterHasMechanic(nextCharacter, 'open-hand-technique') &&
      (nextCharacter.flurryStrikesRemaining ?? 0) > 0
    ) {
      bonusDamage += 2;
      onTypeParts.push({ amount: 2, label: 'open hand' });
    }
    // Monk (Shadow): the unseen opener drives extra Ki-charged damage home.
    if (isFirstAttack && monkUnarmedStrike && characterHasMechanic(nextCharacter, 'shadow-strike')) {
      bonusDamage += 3;
      onTypeParts.push({ amount: 3, label: 'shadow' });
    }
    // Apotheosis: the ascendant caster's every blow bites for far more.
    if (isAscendant(nextCharacter)) {
      bonusDamage += APOTHEOSIS_BONUS_DAMAGE;
      onTypeParts.push({ amount: APOTHEOSIS_BONUS_DAMAGE, label: 'ascendant' });
    }
    if (isFirstAttack && (nextCharacter.permanentFirstAttackDamage ?? 0) > 0) {
      const fc = nextCharacter.permanentFirstAttackDamage ?? 0;
      bonusDamage += fc;
      onTypeParts.push({ amount: fc, label: 'First Cut' });
    }
    if (targetWounded && (nextCharacter.permanentWoundedTargetDamage ?? 0) > 0) {
      const bo = nextCharacter.permanentWoundedTargetDamage ?? 0;
      bonusDamage += bo;
      onTypeParts.push({ amount: bo, label: 'Bleed-Out' });
    }
    if (crit && (nextCharacter.permanentCritDamageBonus ?? 0) > 0) {
      const cd = nextCharacter.permanentCritDamageBonus ?? 0;
      bonusDamage += cd;
      onTypeParts.push({ amount: cd, label: 'Fellfast' });
    }
    // Might of the Mountain (camp boon): +1 flat damage on every weapon hit.
    const mountainBonus = boonMods.damageBonus ?? 0;
    if (mountainBonus) {
      bonusDamage += mountainBonus;
      onTypeParts.push({ amount: mountainBonus, label: 'Mountain' });
    }
    // Barbarian Rage: bonus damage on melee hits while the fury burns
    // (Berserker's Frenzy folds its extra into rageDamageBonus). Heavy armour
    // smothers the fury — no bonus rides plate (defense-in-depth: rage also
    // ends on donning heavy and can't be entered while worn).
    if (isRaging(nextCharacter) && !isRanged && !rageBrokenByArmor(nextCharacter)) {
      const rd = rageDamageBonus(nextCharacter);
      if (rd > 0) {
        bonusDamage += rd;
        onTypeParts.push({ amount: rd, label: 'Rage' });
      }
      // Furious weapon affix: extra melee damage while the fury burns.
      if (affixMods.rageDamageBonus > 0) {
        bonusDamage += affixMods.rageDamageBonus;
        onTypeParts.push({ amount: affixMods.rageDamageBonus, label: 'Furious' });
      }
      // Heavy two-handed synergy: a great weapon swung in a rage hits harder.
      if (w.properties.includes('heavy') && w.properties.includes('two-handed')) {
        bonusDamage += 2;
        onTypeParts.push({ amount: 2, label: 'heavy haft' });
      }
    }
    // Relentless fighter affix: extra damage on each follow-up swing of a
    // multiattack (the second-and-later strikes of an Extra Attack action).
    // playerAttacksThisTurn counts strikes already made this turn, so a non-zero
    // value means this is a follow-up.
    if (affixMods.followupDamageBonus > 0 && (state.playerAttacksThisTurn ?? 0) >= 1) {
      bonusDamage += affixMods.followupDamageBonus;
      onTypeParts.push({ amount: affixMods.followupDamageBonus, label: 'Relentless' });
    }
    // Vow reroll is already baked into the dice total — a note, not a summand,
    // or the breakdown would double-count it.
    if (bladeOfVowUsed && bladeOfVowDelta > 0) {
      damageNotes.push(t('combat.part.vowReroll', { n: bladeOfVowDelta }));
    }

    // Rogue Sneak Attack: once per turn, when the strike has the angle —
    // either rolled with advantage, or the target is already bloodied
    // (HP at half or less). Engine substitute for 5e's "ally adjacent"
    // clause: there are no allies here, but a wounded foe is leaning.
    const sneakAlreadyUsed = state.sneakAttackUsedThisTurn === true;
    const isRogue = nextCharacter.classId === 'rogue';
    // Dagger synergy: a Rogue's quick blade always finds the gap — Sneak Attack
    // can fire with a dagger even without advantage or a wounded mark.
    const wieldsDagger = w.id === 'dagger';
    // Roguish archetypes loosen the Sneak Attack trigger:
    //  - Swashbuckler needs no setup at all — the gap is always there (rewards
    //    steady, consistent flat-damage gear).
    //  - Assassin finds it against any foe still at full health — the opener
    //    (rewards burst / first-strike gear).
    const targetFullHp =
      target.kind === 'monster' && target.instance.hp.current >= target.instance.hp.max;
    const swashbucklerSneak = characterHasMechanic(nextCharacter, 'swashbuckler');
    const assassinSneak = characterHasMechanic(nextCharacter, 'assassin') && targetFullHp;
    // Opening strike: the first attack of each combat always finds the gap —
    // the rogue steps from shadow even without setting up Hide first.
    const openingStrike = isFirstAttack;
    // Feint guarantees the gap with no setup at all (Cunning Action above).
    const sneakTriggers =
      advantage === 'advantage' ||
      targetWounded ||
      wieldsDagger ||
      swashbucklerSneak ||
      assassinSneak ||
      openingStrike ||
      forceSneak;
    if (isRogue && !sneakAlreadyUsed && sneakTriggers) {
      sneakDice =
        sneakAttackDiceForLevel(nextCharacter.level) +
        (nextCharacter.permanentBonuses?.sneakAttackDice ?? 0) +
        (characterHasMechanic(nextCharacter, 'death-strike') ? 2 : 0) +
        // Assassinate front-loads extra dice into the opening strike.
        (assassinateOpener ? ASSASSINATE_BONUS_SNEAK_DICE : 0);
      const sneakRoll = roller.roll({
        count: sneakDice * (crit ? 2 : 1),
        die: 6,
        modifier: 0,
      });
      sneakDamage = sneakRoll.total;
      bonusDamage += sneakDamage;
      sneakAttackFiredFlag = true;
      // Shadowed weapon affix: extra damage on the strike Sneak Attack lands.
      if (affixMods.sneakDamageBonus > 0) {
        bonusDamage += affixMods.sneakDamageBonus;
        onTypeParts.push({ amount: affixMods.sneakDamageBonus, label: 'Shadowed' });
      }
    }

    // Ranger Hunter's Mark: extra dice on every hit against the branded quarry.
    let markDamage = 0;
    if (
      state.huntersMarkTargetId === targetId &&
      characterHasMechanic(nextCharacter, 'hunters-mark')
    ) {
      const markExpr = parseDiceExpression(HUNTERS_MARK_DICE);
      // Ranger Improved Mark (L11) / Foe Slayer (L20): the brand bites for extra dice.
      const markBonusDice =
        (characterHasMechanic(nextCharacter, 'improved-mark') ? 1 : 0) +
        (characterHasMechanic(nextCharacter, 'foe-slayer') ? 2 : 0);
      const markRoll = roller.roll({
        count: (markExpr.count + markBonusDice) * (crit ? 2 : 1),
        die: markExpr.die,
        modifier: 0,
      });
      markDamage = markRoll.total;
      bonusDamage += markDamage;
      // "of the Quarry" weapon affix: extra flat damage against the marked foe.
      if (affixMods.markDamageBonus > 0) {
        bonusDamage += affixMods.markDamageBonus;
        onTypeParts.push({ amount: affixMods.markDamageBonus, label: 'Quarry' });
      }
    }

    // Ranger (Hunter) Colossus Slayer: once per turn, a hit on a foe already
    // below its full health drives an extra 1d8 home.
    let colossusDamage = 0;
    const targetBelowMax =
      target.kind === 'monster' &&
      target.instance.hp.current > 0 &&
      target.instance.hp.current < target.instance.hp.max;
    if (
      characterHasMechanic(nextCharacter, 'colossus-slayer') &&
      state.colossusSlayerUsedThisTurn !== true &&
      targetBelowMax
    ) {
      const colossusRoll = roller.roll({ count: crit ? 2 : 1, die: 8, modifier: 0 });
      colossusDamage = colossusRoll.total;
      bonusDamage += colossusDamage;
      colossusFiredFlag = true;
    }

    // Rogue (Assassin): the opening strike on a full-health foe drives an extra
    // 2d6 home — burst that front-loads the kill before the target can act.
    let assassinDamage;
    if (
      characterHasMechanic(nextCharacter, 'assassin') &&
      target.kind === 'monster' &&
      target.instance.hp.current >= target.instance.hp.max
    ) {
      const assassinRoll = roller.roll({ count: 2 * (crit ? 2 : 1), die: 6, modifier: 0 });
      assassinDamage = assassinRoll.total;
      bonusDamage += assassinDamage;
      onTypeParts.push({ amount: assassinDamage, label: 'assassinate' });
    }

    // Ranger (Giant Killer): bigger quarry bleeds harder. The primary foe of a
    // boss/elite room carries a legendary-resistance pool — a stable "this is
    // the room's giant" flag for a ranger, who casts no control to spend it.
    let giantKillerDamage;
    if (
      characterHasMechanic(nextCharacter, 'giant-killer') &&
      target.kind === 'monster' &&
      (target.instance.legendaryResistances ?? 0) > 0
    ) {
      const gkRoll = roller.roll({ count: crit ? 2 : 1, die: 10, modifier: 0 });
      giantKillerDamage = gkRoll.total;
      bonusDamage += giantKillerDamage;
      onTypeParts.push({ amount: giantKillerDamage, label: 'giant-killer' });
    }

    // Fighter (Battle Master): the first strike of the fight becomes a measured
    // maneuver — bonus weapon dice now, plus a bleeding wound applied below.
    let maneuverDamage;
    const battleMasterManeuver =
      characterHasMechanic(nextCharacter, 'battle-master') && isFirstAttack;
    if (battleMasterManeuver) {
      const maneuverRoll = roller.roll({
        count: damageExpr.count * (crit ? 2 : 1),
        die: damageExpr.die,
        modifier: 0,
      });
      maneuverDamage = maneuverRoll.total;
      bonusDamage += maneuverDamage;
      onTypeParts.push({ amount: maneuverDamage, label: 'maneuver' });
    }

    // Weakened: a flat reduction to outgoing weapon damage. Folded into the
    // breakdown as a negative part; a landed hit still grazes for at least 1.
    if (condMods.outgoingDamagePenalty > 0) {
      bonusDamage -= condMods.outgoingDamagePenalty;
      onTypeParts.push({ amount: -condMods.outgoingDamagePenalty, label: 'weakened' });
    }
    const totalDamage = Math.max(
      1,
      damageRoll.total + abilMod + damageExpr.modifier + bonusDamage,
    );
    const weaponTypeDamage = totalDamage - offTypeDamage;

    const damaged = applyDamage(nextState, targetId, totalDamage, nextCharacter);
    nextState = damaged.state;
    nextCharacter = damaged.character;
    // Surface the full pre-clamp damage on the attack event so the floating
    // combat number reads true even when the hit overkills the target's HP.
    if (nextState.lastAttack && nextState.lastAttack.id === attackEvent.id) {
      nextState = {
        ...nextState,
        lastAttack: {
          ...nextState.lastAttack,
          damageDealt: totalDamage,
          damageType: weapon.damageType,
        },
      };
    }

    const breakdown: string[] = [`${damageRoll.total} ${t('combat.part.dice')}`];
    const pushPart = (val: number, label: string) => {
      if (val === 0) return;
      breakdown.push(val > 0 ? `+ ${val} ${label}` : `- ${Math.abs(val)} ${label}`);
    };
    pushPart(abilMod, t(`combat.abil.${attackAbility}`));
    pushPart(damageExpr.modifier, t('combat.part.magic'));
    if (sneakDamage > 0) pushPart(sneakDamage, t('combat.part.sneak', { dice: `${sneakDice}d6` }));
    if (markDamage > 0) pushPart(markDamage, t('combat.part.mark', { dice: HUNTERS_MARK_DICE }));
    if (colossusDamage > 0) pushPart(colossusDamage, t('combat.part.colossus'));
    for (const p of onTypeParts) pushPart(p.amount, partLabel(p.label));
    // Headline splits by damage type: the weapon-type subtotal (which the
    // parenthetical sums to) plus any off-type segments shown by their own type.
    const headline =
      offTypeParts.length > 0
        ? `${weaponTypeDamage} ${t(`combat.dmg.${weapon.damageType}`)}` +
          offTypeParts.map((p) => ` + ${p.amount} ${t(`combat.dmg.${p.type}`)}`).join('')
        : `${totalDamage} ${t(`combat.dmg.${weapon.damageType}`)}`;
    const noteSuffix = damageNotes.length > 0 ? ` [${damageNotes.join(', ')}]` : '';
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'damage',
      text: t('combat.log.damageLine', {
        headline,
        breakdown: breakdown.join(' '),
        note: noteSuffix,
      }),
    });

    // Weapon-swing VFX on a connecting hit. Colossus Slayer is a once-per-turn
    // signature blow, so it shows its own heavy-cleave effect instead of the
    // plain swing on the strike that triggered it. Whiffs skip the bus — the
    // attacker's lunge already reads as a miss.
    const vfxKind = colossusFiredFlag ? 'colossus' : weaponVfxKind(w);
    nextState = attachCombatVfx(nextState, vfxKind, 'player', targetId);

    // Lifesteal (Vampiric weapon affix, Leeching accessory, Heartwood Talisman
    // legendary, etc.): heal for a fraction of the damage dealt, capped at max
    // HP. Rage halves the drink (rounded up), it no longer shuts it off.
    if (affixMods.lifestealPct > 0 && nextCharacter.hp.current < nextCharacter.hp.max) {
      const healed = ragedHealAmount(
        nextCharacter,
        Math.floor((totalDamage * affixMods.lifestealPct) / 100),
      );
      if (healed > 0) {
        const before = nextCharacter.hp.current;
        const after = Math.min(nextCharacter.hp.max, before + healed);
        nextCharacter = { ...nextCharacter, hp: { ...nextCharacter.hp, current: after } };
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'system',
          text: t('combat.log.lifesteal', { name: nextCharacter.name, amount: after - before }),
        });
      }
    }

    // "of Mending" weapon affix: on every hit, refresh the regen clock to 3
    // turns. The actual healing ticks in turn.ts at the start of the player's
    // turn (Rage halves the tick there, it no longer suppresses the clock).
    if (affixMods.regenPerTurn > 0) {
      nextState = { ...nextState, playerRegenStacks: 3 };
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'system',
        text: t('combat.log.mendKindled', { name: nextCharacter.name, n: affixMods.regenPerTurn }),
      });
    }

    // "of Bloodletting" weapon affix (+ Gauntlets of the Titan legendary):
    // apply a bleed DOT to the target. Each stack refreshes to 3 turns — the
    // damage ticks at the start of the player's next turn in turn.ts.
    if (affixMods.bleedDamage > 0 && target.kind === 'monster') {
      nextState = {
        ...nextState,
        combatants: nextState.combatants.map((c) => {
          if (c.kind !== 'monster' || c.id !== targetId) return c;
          return {
            ...c,
            instance: {
              ...c.instance,
              bleedDamagePerTurn: affixMods.bleedDamage,
              bleedTurnsRemaining: 3,
            },
          };
        }),
      };
      nextState = appendLog(nextState, {
        id: nextLogId(nextState),
        kind: 'system',
        text: t('combat.log.bleedBegin', { target: displayName(target, nextCharacter), n: affixMods.bleedDamage }),
      });
    }

    // Rogue Envenom (L8): a landed Sneak Attack leaves a bleeding/poisoned wound
    // — sustained damage that ticks across the next turns (turn.ts), offsetting
    // the once-per-turn Sneak ceiling. Folded max-of so it never weakens a
    // stronger gear bleed already running on the target.
    if (
      sneakAttackFiredFlag &&
      characterHasMechanic(nextCharacter, 'envenom') &&
      target.kind === 'monster'
    ) {
      const stillAlive = nextState.combatants.some(
        (c) => c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
      );
      if (stillAlive) {
        nextState = {
          ...nextState,
          combatants: nextState.combatants.map((c) => {
            if (c.kind !== 'monster' || c.id !== targetId) return c;
            return {
              ...c,
              instance: {
                ...c.instance,
                bleedDamagePerTurn: Math.max(
                  c.instance.bleedDamagePerTurn ?? 0,
                  ENVENOM_BLEED_PER_TURN,
                ),
                bleedTurnsRemaining: Math.max(
                  c.instance.bleedTurnsRemaining ?? 0,
                  ENVENOM_BLEED_TURNS,
                ),
              },
            };
          }),
        };
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'system',
          text: t('combat.log.envenom', { target: displayName(target, nextCharacter), n: ENVENOM_BLEED_PER_TURN }),
        });
      }
    }

    // Fighter (Battle Master): the maneuver also opens a bleeding wound — 3
    // damage a turn for 3 turns — if the target still stands after the strike.
    if (battleMasterManeuver && target.kind === 'monster') {
      const stillAlive = nextState.combatants.some(
        (c) => c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
      );
      if (stillAlive) {
        nextState = {
          ...nextState,
          combatants: nextState.combatants.map((c) => {
            if (c.kind !== 'monster' || c.id !== targetId) return c;
            return {
              ...c,
              instance: { ...c.instance, bleedDamagePerTurn: 3, bleedTurnsRemaining: 3 },
            };
          }),
        };
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'system',
          text: t('combat.log.maneuverWound', { target: displayName(target, nextCharacter) }),
        });
      }
    }

    // Ranger (Horde Breaker): once each turn, the shot carries into a second
    // foe — a glancing strike of weapon dice plus flat damage bonuses (no
    // ability mod, no crit). playerAttacksThisTurn is 0 on the turn's first
    // swing, so the splash fires once per turn even with Extra Attack.
    if (
      characterHasMechanic(nextCharacter, 'horde-breaker') &&
      (state.playerAttacksThisTurn ?? 0) === 0
    ) {
      const second = nextState.combatants.find(
        (c) => c.kind === 'monster' && c.id !== targetId && c.instance.hp.current > 0,
      );
      if (second && second.kind === 'monster') {
        const splashRoll = roller.roll({
          count: damageExpr.count,
          die: damageExpr.die,
          modifier: 0,
        });
        const splashDamage = Math.max(1, splashRoll.total + (affixMods.damageBonus ?? 0));
        const splashed = applyDamage(nextState, second.id, splashDamage, nextCharacter);
        nextState = splashed.state;
        nextCharacter = splashed.character;
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'damage',
          text: t('combat.log.shotCarries', {
            name: nextCharacter.name,
            target: second.instance.displayName,
            dmg: splashDamage,
            type: t(`combat.dmg.${weapon.damageType}`),
          }),
        });
        nextState = attachCombatVfx(nextState, weaponVfxKind(w), 'player', second.id);
      }
    }

    // Barbarian Savage Cleave: the OFFENSE spend's signature — the turn's first
    // melee swing spills a glancing blow into a second foe (weapon dice plus
    // flat bonuses, no ability mod, no crit — the same shape as Horde Breaker).
    // Once per turn: playerAttacksThisTurn is 0 on the opening swing, so Extra
    // Attack doesn't multiply it.
    if (
      nextCharacter.martialOffenseActive === true &&
      nextCharacter.classId === 'barbarian' &&
      !isRanged &&
      (state.playerAttacksThisTurn ?? 0) === 0
    ) {
      const second = nextState.combatants.find(
        (c) => c.kind === 'monster' && c.id !== targetId && c.instance.hp.current > 0,
      );
      if (second && second.kind === 'monster') {
        const cleaveRoll = roller.roll({
          count: damageExpr.count,
          die: damageExpr.die,
          modifier: 0,
        });
        const cleaveDamage = Math.max(1, cleaveRoll.total + (affixMods.damageBonus ?? 0));
        const cleaved = applyDamage(nextState, second.id, cleaveDamage, nextCharacter);
        nextState = cleaved.state;
        nextCharacter = cleaved.character;
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'damage',
          text: t('combat.log.cleave', {
            name: nextCharacter.name,
            target: second.instance.displayName,
            dmg: cleaveDamage,
            type: t(`combat.dmg.${weapon.damageType}`),
          }),
        });
        nextState = attachCombatVfx(nextState, weaponVfxKind(w), 'player', second.id);
      }
    }

    // Martial DISRUPT: an armed staggering strike fells the target — it loses
    // its next turn. The martial point was already spent on declaration; the
    // stance clears here, on the blow that lands on a foe still standing. A
    // kill leaves it armed for the next swing — an overkill blow still landed,
    // so the shot isn't wasted. A clean MISS is the gamble: it burns both the
    // stagger and the spent point (cleared in the miss branch below).
    if (nextCharacter.martialDisruptActive === true && target.kind === 'monster') {
      const stillStanding = nextState.combatants.some(
        (c) => c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
      );
      if (stillStanding) {
        nextState = {
          ...nextState,
          combatants: nextState.combatants.map((c) => {
            if (c.kind !== 'monster' || c.id !== targetId) return c;
            return {
              ...c,
              instance: { ...c.instance, staggeredTurns: MARTIAL_DISRUPT_STAGGER_TURNS },
            };
          }),
        };
        nextCharacter = { ...nextCharacter, martialDisruptActive: false };
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'system',
          text: t('combat.log.staggered', { target: displayName(target, nextCharacter) }),
        });
      }
    }

    // Monk Stunning Strike: an armed unarmed blow that lands forces a CON save —
    // on a fail the target is staggered (loses its next turn). Boss/elite foes
    // roll the save with advantage (resolute will) rather than being immune. The
    // Ki was already spent to arm the stance; it clears once a blow connects (a
    // clean miss leaves it armed for the next swing).
    if (nextCharacter.stunningStrikeActive === true && monkUnarmedStrike && target.kind === 'monster') {
      const stillStanding = nextState.combatants.some(
        (c) => c.kind === 'monster' && c.id === targetId && c.instance.hp.current > 0,
      );
      if (stillStanding) {
        const dc = monkKiSaveDC(nextCharacter);
        const def = getMonster(target.instance.defId);
        const conMod = abilityModifier(def.abilityScores.con ?? 10);
        const resoluteWill = (target.instance.legendaryResistances ?? 0) > 0;
        const save = roller.d20(resoluteWill ? 'advantage' : 'normal', conMod);
        const success = save.total >= dc;
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'roll',
          text: t('combat.log.stunSaveRoll', {
            target: displayName(target, nextCharacter),
            resolute: resoluteWill ? t('combat.f.resoluteAdv') : '',
            mod: signed(conMod),
            total: save.total,
            dc,
            result: success ? t('combat.f.success') : t('combat.f.fail'),
          }),
        });
        if (!success) {
          nextState = {
            ...nextState,
            combatants: nextState.combatants.map((c) => {
              if (c.kind !== 'monster' || c.id !== targetId) return c;
              return { ...c, instance: { ...c.instance, staggeredTurns: 1 } };
            }),
          };
          nextState = appendLog(nextState, {
            id: nextLogId(nextState),
            kind: 'system',
            text: t('combat.log.stunned', { target: displayName(target, nextCharacter) }),
          });
        }
        nextCharacter = { ...nextCharacter, stunningStrikeActive: false };
      }
    }
  } else if (nextCharacter.martialDisruptActive === true) {
    // Missed DISRUPT: the staggering strike must connect. A clean whiff burns
    // both the stagger and the martial point spent to arm it — the stance does
    // not carry to the next swing (a landing hit clears it above; only a miss
    // spends it for nothing).
    nextCharacter = { ...nextCharacter, martialDisruptActive: false };
    nextState = appendLog(nextState, {
      id: nextLogId(nextState),
      kind: 'system',
      text: t('combat.log.disruptWide', { name: nextCharacter.name }),
    });
  }

  // Mark action used for the player
  const markResult = markPlayerActionUsed(nextState, nextCharacter);
  nextState = markResult.state;
  nextCharacter = markResult.character;
  nextState = {
    ...nextState,
    playerHasAttacked: true,
    rerollMissesEncounterRemaining:
      nextState.rerollMissesEncounterRemaining - usedEncounterReroll,
    bladeOfVowRerollsRemaining: bladeOfVowUsed
      ? Math.max(0, (nextState.bladeOfVowRerollsRemaining ?? 0) - 1)
      : nextState.bladeOfVowRerollsRemaining,
  };
  if (hit && sneakAttackFiredFlag) {
    nextState = { ...nextState, sneakAttackUsedThisTurn: true };
  }
  if (hit && colossusFiredFlag) {
    nextState = { ...nextState, colossusSlayerUsedThisTurn: true };
  }
  if (usedDelveReroll > 0 && nextCharacter.delveBudgets) {
    nextCharacter = patchDelveBudgets(nextCharacter, {
      quirkRerollMissesRemaining:
        (nextCharacter.delveBudgets.quirkRerollMissesRemaining ?? 0) - usedDelveReroll,
    });
  }

  const ended = evaluateCombatEnd(nextState, nextCharacter);
  return combatResult(markPlayerLog(ended.state, beforeLog), ended.character);
}

function markPlayerActionUsed(
  state: CombatState,
  character: Readonly<Character>,
): { state: CombatState; character: Character } {
  // Cunning Action: Dash — if the Action is already spent, this swing is the
  // bonus one. Burn the flag, don't tick the per-Action attack counter.
  if (character.actionEconomy.actionUsed && character.bonusAttackAvailable) {
    return { state, character: { ...character, bonusAttackAvailable: false } };
  }
  // Monk Flurry of Blows: a queued flurry strike fires after the Attack action
  // is spent — burn one queued strike, don't tick the per-Action counter.
  if (character.actionEconomy.actionUsed && (character.flurryStrikesRemaining ?? 0) > 0) {
    return {
      state,
      character: {
        ...character,
        flurryStrikesRemaining: (character.flurryStrikesRemaining ?? 0) - 1,
      },
    };
  }
  const attacksMade = (state.playerAttacksThisTurn ?? 0) + 1;
  const maxAttacks = maxAttacksPerAction(character);
  if (attacksMade < maxAttacks) {
    return {
      state: { ...state, playerAttacksThisTurn: attacksMade },
      character,
    };
  }
  return {
    state: { ...state, playerAttacksThisTurn: attacksMade },
    character: patchActionEconomy(character, { actionUsed: true }),
  };
}

/**
 * Attacks per Attack action. Extra Attack (L5) grants 2; the Fighter's later
 * martial milestones push it to 3 (Relentless Assault, L11) and 4 (Unstoppable,
 * L20). Loading weapons cap at 1 regardless — the reload is the bottleneck.
 */
export function maxAttacksPerAction(character: Readonly<Character>): number {
  if (!characterHasMechanic(character, 'extra-attack')) return 1;
  const mainHand = character.equipped.mainHand;
  if (mainHand) {
    const item = getItem(mainHand.itemId);
    if (item.kind === 'weapon' && item.properties.includes('loading')) return 1;
  }
  if (characterHasMechanic(character, 'extra-attack-3')) return 4;
  if (characterHasMechanic(character, 'extra-attack-2')) return 3;
  return 2;
}
