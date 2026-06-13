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
import { abilityModifier, type AbilityName } from '../../../types/abilities';
import {
  critRange,
  computeAC,
  effectiveAbilityScores,
  characterHasMechanic,
  isRaging,
  isWildShaped,
  ragedHealAmount,
  proficiencyBonus,
  isFullCaster,
  spellcastingAbility,
  spellcastingMod,
} from '../../character/derived';
import {
  beastWeaponId,
  PRIMAL_STRIKE_HIT_BONUS,
  PRIMAL_STRIKE_DAMAGE_BONUS,
} from '../wildShape';
import { bardWarSongDie } from '../bard';
import { paladinSmiteOnHit, hasVowOfEnmity, vowBonusDamage } from '../paladin';
import { rageDamageBonus } from '../../character/actions';
import {
  martialOffenseDamage,
  martialOffenseAttackBonus,
  MARTIAL_DISRUPT_STAGGER_TURNS,
} from '../martialResource';
import { APOTHEOSIS_BONUS_DAMAGE, isAscendant } from '../apotheosis';
import {
  DRAGON_CLAW_ATTACKS,
  DRAGON_CLAW_DAMAGE_BONUS,
  DRAGON_CLAW_HIT_BONUS,
  DRAGON_CLAW_WEAPON_ID,
  isDragonForm,
} from '../shapeChange';
import {
  monkKiSaveDC,
  monkFightsUnarmed,
  monkKitActive,
  martialArtsWeaponId,
  MONK_UNARMED_DAMAGE_EDGE,
} from '../monk';
import { getMonster } from '../../../content/monsters';
import { isRangedWeapon, offHandWeaponRef, rageBrokenByArmor } from '../../character/equip';
import { HUNTERS_MARK_DICE } from '../huntersMark';
import { characterQuirkMods } from '../../character/quirks';
import { characterBlessingMods } from '../../character/blessings';
import { characterCampBoonMods } from '../../character/campBoons';
import { enhancementOf, swingAffixMods } from '../../items/affixMods';
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
  dragon: 'dragon',
  primal: 'primal',
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
  vow: 'vow',
  song: 'song',
  oil: 'oil',
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

/** Dual-wield off-hand ability-modifier share — the canonical 5e Two-Weapon
 *  Fighting style. The automatic off-hand follow-swing (Berserker / Battle
 *  Master / Thief) now lands its weapon die PLUS the wielder's ability modifier
 *  divided by this denominator (floored). 1 = full mod: a 1d4 off-hand roughly
 *  doubles, so dropping the shield (+2 AC, which bites through the #590
 *  effective-AC curve) becomes a real trade. 2 = half mod — the dial-back if the
 *  buff pushes a dual-wielder past the martial band in sim-class-viability. The
 *  gear edge stays halved separately (scaleExtraEdge) so loot scaling is
 *  unaffected. */
const DUAL_WIELD_OFFHAND_ABIL_MOD_DENOM = 1;

/** Two-handed off-hand ability-modifier denominator — the heavier dial for the
 *  barbarian's Twin Fury, which dual-wields TWO two-handed weapons (greatsword /
 *  greataxe), not a light off-hand blade. The 2H off-hand follow takes only HALF
 *  the ability modifier (denom 2) where a light off-hand takes the full mod
 *  (denom 1 above). */
const DUAL_WIELD_OFFHAND_2H_ABIL_MOD_DENOM = 2;

/** Two-handed off-hand follow DAMAGE scale — the damage brake on the barbarian
 *  Twin Fury's second great-weapon swing, alongside two structural brakes (the
 *  off-hand follow can't crit and doesn't lifesteal — both gated on
 *  offHandIsTwoHanded). WITHOUT any brake the off-hand lands a near-full second
 *  heavy swing: the big 2H die (2d6 / 1d12) PLUS the entire Rage stack (rage
 *  bonus, Frenzy 1d6, Furious affix, heavy-haft +2) PLUS the blessing/gear stack,
 *  roughly DOUBLING the raging barbarian's per-turn output (and its sustain) and
 *  spiking bot-clear far past the band. This scale (floored) hits the off-hand
 *  follow's weapon dice, its raging melee riders, and its flat blessing bonus, so
 *  each damage part stays an honest summand and the breakdown still sums; the
 *  per-hit gear edge is halved on top via scaleExtraEdge, the ability mod by the
 *  2H denom. SIM-TUNED FINDING (sim-class-viability, 120×120): a guaranteed extra
 *  attack a turn on the barbarian's rage base is worth ~5 clear-points of pure
 *  STRUCTURE — pure damage scaling floored at ~14.6% clear at scale 0 — so the
 *  band fit comes mostly from the no-crit + no-lifesteal gates, with this kept low
 *  (a real but secondary ~quarter-swing) for the two-greatswords feel. Curve at
 *  full bonuses: 1.0→21%, 0.5→17.5%, 0.25→15.9%, 0→14.6%; the two structural
 *  gates take off another ~1.7. Lower toward 0 if the pair climbs out of band;
 *  raise toward 0.5 for a punchier off-hand if balance allows. */
const DUAL_WIELD_OFFHAND_2H_FOLLOW_SCALE = 0.25;

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
 * Which weapon id an attack action swings RIGHT NOW — the single source of
 * truth for every attack dispatch (the player's CombatScreen tap and the bot's
 * actionPolicy both resolve through here, so the two paths can never diverge).
 * A transformed body fights with its own arms, ahead of anything equipped:
 * dragon form swings the Dragon Claws, a wild-shaped druid its level-tier beast
 * claws, a bare-handed monk its Martial Arts fists. Otherwise the equipped
 * main-hand (undefined when bare-handed and none of the above applies).
 */
export function attackWeaponId(character: Readonly<Character>): string | undefined {
  if (isDragonForm(character)) return DRAGON_CLAW_WEAPON_ID;
  if (isWildShaped(character)) return beastWeaponId(character);
  if (character.classId === 'monk' && monkFightsUnarmed(character)) {
    return martialArtsWeaponId(character);
  }
  return character.equipped.mainHand?.itemId;
}

/**
 * Player attacks a target with a weapon (must be the equipped main-hand).
 * Returns CombatActionResult: callers use result.state and result.character
 * directly.
 *
 * Dual wielding (the `dual-wielder` schools — Berserker, Battle Master,
 * Thief): the turn's first Attack-action swing is followed by an automatic
 * off-hand swing — its own attack roll with the off-hand weapon's profile,
 * damage of the weapon's die PLUS the wielder's ability modifier (5e
 * Two-Weapon Fighting) and the gear edge halved (the flurry-extras guard).
 * Same target while it stands, else the
 * next live foe. Once per Attack action, so Extra Attack doesn't multiply it
 * (an Action Surge's fresh action earns a fresh follow, like everything else
 * it resets); bonus-action swings (Quick Strike) never trigger it.
 */
export function playerAttack(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
): CombatActionResult {
  const { roller, character, state } = ctx;
  // Eligibility reads the PRE-swing state: an Attack-action swing (the action
  // not yet spent — bonus swings enter with it already used) and the turn's
  // first (the per-action counter still at 0), made with the equipped
  // main-hand (a transformed body — claws, fists — fights with its own arms
  // and follows nothing), while the off-hand holds a weapon.
  const followEligible =
    characterHasMechanic(character, 'dual-wielder') &&
    character.actionEconomy.actionUsed !== true &&
    (state.playerAttacksThisTurn ?? 0) === 0 &&
    character.equipped.mainHand?.itemId === weaponItemId &&
    offHandWeaponRef(character) !== null;
  // The combat's opening attack: if the main hand whiffs it, the off-hand
  // follow inherits the opener's Sneak window — the second chance to LAND it.
  const openerWindow = !state.playerHasAttacked;

  const main = resolveSwing(ctx, targetId, weaponItemId, null);
  if (!followEligible || main.state.status !== 'active') return main;
  const offRef = offHandWeaponRef(main.character);
  if (!offRef) return main;
  const live = main.state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  const offTarget = live.find((c) => c.id === targetId) ?? live[0];
  if (!offTarget) return main;

  const mainEvent = main.state.lastAttack;
  const followed = resolveSwing(
    { roller, character: main.character, state: main.state },
    offTarget.id,
    offRef.itemId,
    { openerWindow },
  );
  // The pair commits as ONE state: lastAttack holds only the tail, so batch
  // both events the way a monster multiattack does — the sprite floats each
  // swing's number instead of losing the main hand's under the off-hand's.
  const offEvent = followed.state.lastAttack;
  if (mainEvent && offEvent && offEvent.id !== mainEvent.id) {
    return combatResult(
      { ...followed.state, attackEvents: [mainEvent, offEvent] },
      followed.character,
    );
  }
  return followed;
}

/**
 * One weapon swing, resolved end to end. `offHand` marks the automatic
 * dual-wield follow-up: it swings the OFF-hand weapon (its own enhancement
 * and affixes — never the resting main-hand's), keeps the ability modifier on
 * damage (5e Two-Weapon Fighting, scaled by the dual-wield denom), halves the
 * per-hit gear edge via the flurry guard, and spends
 * no action economy (it rides the action already paid for). Internals thread
 * a local `nextCharacter` accumulator — no in-place mutation of
 * `ctx.character` anywhere.
 */
function resolveSwing(
  ctx: AttackContext,
  targetId: string,
  weaponItemId: string,
  offHand: { openerWindow: boolean } | null,
): CombatActionResult {
  const { roller, character, state } = ctx;
  const isOffHandSwing = offHand !== null;
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
  // Barbarian Twin Fury's TWO-HANDED off-hand follow — the trailing great swing.
  // It is reined in three ways vs a main swing / a light off-hand: it cannot land
  // a crit (a committed trailing swing, not an aimed one — no Brutal Critical
  // spike), its weapon dice + raging riders are damage-scaled (scale2hFollow
  // below), and its ability modifier is halved (the 2H denom). The crit brake is
  // the structural lever: a guaranteed extra attack a turn on the barbarian's
  // rage-boosted base is strong even at low per-hit damage, and the doubled-dice
  // crit chance was the largest part of that edge (sim-class-viability).
  const offHandIsTwoHanded = isOffHandSwing && w.properties.includes('two-handed');
  const isFinesse = w.properties.includes('finesse');
  // Ranged weapons (bows, crossbows) are flagged by the `ammunition` property.
  // Thrown daggers stay in the finesse branch — they're melee that can fly.
  const isRanged = isRangedWeapon(w);
  // Caster-weapons (`casterWeapon` flag): attack AND damage scale off the
  // wielder's spellcasting modifier instead of STR/DEX. The Bard's War Lute
  // (CHA) is the armed case; the SHAPESHIFT natural weapons ride the same read —
  // a wild-shaped druid's beast claws strike off WIS, a Shape-Changed wizard's
  // dragon claws off INT. The transformed body fights with the caster's grown
  // stat, never the sheet's dumped STR/DEX (the to-hit fix behind the forms
  // playing as martial beasts). Only a spellcasting class earns the read; a
  // non-caster swinging one falls back to the ordinary STR/DEX branch.
  const isCasterWeapon = w.casterWeapon === true && isFullCaster(nextCharacter.classId);
  const attackAbility: AbilityName = isCasterWeapon
    ? spellcastingAbility(nextCharacter)
    : isRanged
      ? 'dex'
      : isFinesse
        ? (abilityModifier(scores.dex) >= abilityModifier(scores.str) ? 'dex' : 'str')
        : 'str';
  const abilMod = isCasterWeapon
    ? spellcastingMod(nextCharacter)
    : abilityModifier(scores[attackAbility]);
  const profBonus = proficiencyBonus(nextCharacter.level);

  // The monk's two gates. TRULY bare-handed earns the Martial Arts die + the
  // unarmed damage edge. The Ki kit (Flurry, Stunning Strike, and the Ki-flavoured
  // per-hit riders below) also fires with a themed monk weapon in hand — the
  // weapon swings its own die/affixes/enhancement but the forms keep flowing. An
  // ordinary weapon stills both: a plain swing.
  const monkUnarmedStrike = monkFightsUnarmed(nextCharacter);
  const monkKitOn = monkKitActive(nextCharacter);

  const quirkMods = characterQuirkMods(nextCharacter);
  // Sealed Wards twist: blessings are inert this fight — every blessing-sourced
  // to-hit/damage/advantage line below reads off a neutral (empty) mod set.
  const blessingMods = state.blessingsSealed ? {} : characterBlessingMods(nextCharacter);
  const boonMods = characterCampBoonMods(nextCharacter);
  // Per-SWING affix view: while dual wielding, each weapon's affixes ride its
  // own swings only — the resting hand's blade contributes nothing here.
  const affixMods = swingAffixMods(nextCharacter, isOffHandSwing ? 'offHand' : 'mainHand');
  const isFirstAttack = !state.playerHasAttacked;
  const targetWounded =
    target.kind === 'monster' &&
    target.instance.hp.current > 0 &&
    target.instance.hp.current <= target.instance.hp.max / 2;
  const targetFullHp =
    target.kind === 'monster' && target.instance.hp.current >= target.instance.hp.max;
  const playerWounded = nextCharacter.hp.current <= nextCharacter.hp.max / 2;
  // Swashbuckler Rakish Duelist (L11): in a true 1-on-1 the duelist reads the
  // sole foe cold — +2 to hit and a guaranteed Sneak (folded into the triggers).
  const soleLiveFoe =
    state.combatants.filter((c) => c.kind === 'monster' && c.instance.hp.current > 0).length === 1;
  const rakishSoleFoe = soleLiveFoe && characterHasMechanic(nextCharacter, 'rakish-duelist');

  let attackBonus = abilMod + profBonus;
  attackBonus += nextCharacter.permanentBonuses?.attack ?? 0;
  attackBonus += nextCharacter.delveAttackBonus ?? 0;
  attackBonus += boonMods.attackBonus ?? 0;
  // Honed weapon affix: flat +to-hit.
  attackBonus += affixMods.attackBonus;
  // Weapon enhancement (+N): a flat axis on the swung weapon's own slot,
  // separate from affixes — adds to the attack roll here and to damage in the
  // hit block. The off-hand follow reads its own blade's +N, never the main's.
  const weaponEnhancement = enhancementOf(
    isOffHandSwing ? nextCharacter.equipped.offHand : nextCharacter.equipped.mainHand,
  );
  attackBonus += weaponEnhancement;
  // Weapon accuracy lever: the shortbow's inherent +to-hit, traded for a smaller die.
  attackBonus += w.attackMod ?? 0;
  // Oil of Sharpness: the anointed weapon bites surer for the rest of this
  // combat (damage half lands in the hit block). Cleared in combat resolution.
  attackBonus += nextCharacter.attackBonusEncounter ?? 0;
  // Class affinity: a weapon that fits the wielder's hands. The edge is applied
  // as bonus damage in the hit block below (accuracy is the tradeoff lever's job).
  const hasAffinity = w.affinity === nextCharacter.classId;
  // Ranger Fighting Style: Archery — +2 to attack rolls with ranged weapons.
  if (isRanged && characterHasMechanic(nextCharacter, 'archery')) attackBonus += 2;
  // Fighter Weapon Mastery (L9): a flat +1 DAMAGE edge (applied in the damage
  // block below). The old +1 to-hit was dropped — across 2–3 attacks/turn the
  // accuracy bonus compounded into the fighter's mid-late dominance.
  // Swashbuckler Rakish Duelist (L11): the 1-on-1 edge.
  if (rakishSoleFoe) attackBonus += 2;
  // Shape Change (dragon form): the dragon's claws strike like a +3 enchanted
  // weapon — flat to-hit here, flat damage in the hit block.
  if (isDragonForm(nextCharacter)) attackBonus += DRAGON_CLAW_HIT_BONUS;
  // Druid Primal Strike (L6): the shapeshifted beast's claws bite past hide and
  // ward — a flat to-hit edge on every form attack (damage half in the hit block).
  if (isWildShaped(nextCharacter) && characterHasMechanic(nextCharacter, 'primal-strike')) {
    attackBonus += PRIMAL_STRIKE_HIT_BONUS;
  }
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
  // lands with advantage. A Ki rider: it flows bare-handed or with a monk weapon.
  const shadowOpener =
    isFirstAttack && monkKitOn && characterHasMechanic(nextCharacter, 'shadow-strike');
  // Rogue Assassinate (L4): the killer opens from the blind side — the first
  // strike of the fight lands with advantage (and extra Sneak dice, below).
  const assassinateOpener =
    isFirstAttack && characterHasMechanic(nextCharacter, 'assassinate');
  // Paladin Oath of Vengeance — Vow of Enmity: a blow against the sworn quarry
  // (the deadliest foe, marked at combat start; re-marked on a kill at L10) lands
  // with advantage and for bonus damage (folded in below). The advantage is the
  // larger half of the edge — more crits means more Divine Smite fuel.
  const vowStrike = state.vowedTargetId === targetId && hasVowOfEnmity(nextCharacter);
  const hasAdvantage =
    (isFirstAttack && !!blessingMods.firstAttackAdvantage) ||
    hideAdvantage ||
    recklessAdvantage ||
    shadowOpener ||
    assassinateOpener ||
    vowStrike;
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
  // Assassin Mortal Strike (L11): the opening strike of the fight on a full-HP
  // foe is an automatic critical — front-load the kill before it can guard.
  const mortalStrikeOpener =
    isFirstAttack && targetFullHp && characterHasMechanic(nextCharacter, 'mortal-strike');
  // The 2H off-hand follow never crits (see offHandIsTwoHanded) — the structural
  // brake on Twin Fury. Every other swing crits on its range as usual.
  let crit =
    !offHandIsTwoHanded &&
    (mortalStrikeOpener || critRange(nextCharacter).includes(toHit.rolls[0]));
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
    text: isOffHandSwing
      ? t('combat.log.offhandRoll', {
          name: nextCharacter.name,
          target: displayName(target, nextCharacter),
          weapon: weaponName,
          mod: signed(attackBonus),
          total: toHit.total,
          ac,
          result: rollResult(crit, hit),
        })
      : t('combat.log.attackRoll', {
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
  // per-encounter budget (Tyche's Coin) before the per-delve one (Tyche's Eye).
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
      crit = !offHandIsTwoHanded && critRange(nextCharacter).includes(toHit.rolls[0]);
      hit = crit || (toHit.total >= ac && !toHit.natural1);
      const sourceLabel = source === 'encounter' ? "Tyche's Coin" : "Tyche's Eye";
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

    // Barbarian Twin Fury's two-handed off-hand follow: a glancing second great
    // swing. Scale its weapon dice (and, below, its raging melee riders) by the
    // follow-scale knob so the second heavy swing doesn't roughly double the
    // raging barbarian's output. Each scaled part stays an honest summand in the
    // breakdown. A light off-hand and every main swing are untouched.
    // (offHandIsTwoHanded is hoisted above for the no-crit brake.)
    const scale2hFollow = (v: number): number =>
      offHandIsTwoHanded ? Math.floor(v * DUAL_WIELD_OFFHAND_2H_FOLLOW_SCALE) : v;
    if (offHandIsTwoHanded) {
      damageRoll.total = Math.max(1, scale2hFollow(damageRoll.total));
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

    // Extra-strike compounding guard. A Flurry strike fires AFTER the Attack
    // action is spent (a bonus-action extra), so on entry the action is already
    // used — that's the signal this swing is an extra kit strike, not a primary
    // one. Those extras take only HALF the per-hit Grove edge (Whetstone) and
    // gear damage (affixes + the swung weapon's enhancement), so Flurry ×
    // per-hit-edge no longer COMPOUNDS up the ascension ladder (where Grove
    // tiers + affixes are biggest, and the Monk — alone — was topping Asc 6).
    // The intrinsic Martial Arts kit (unarmed edge, Ki, Open Hand, Shadow)
    // still rides every strike in full — the kit fires; only the stacked
    // external edge is rationed on the extra strikes. A dual-wielder's
    // automatic off-hand follow is the same shape of extra swing and takes the
    // same ration — per-hit gear edge never multiplies across swing count.
    const diminishedExtraEdge =
      (monkKitOn && nextCharacter.actionEconomy.actionUsed === true) || isOffHandSwing;
    const scaleExtraEdge = (v: number): number =>
      diminishedExtraEdge ? Math.floor(v / 2) : v;

    const flatBonus = scale2hFollow(blessingMods.damageBonus ?? 0);
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
    // roll now lands on damage. Gear edge, so a monk's Flurry extras take half —
    // a +3 monk weapon must not multiply by strike count any more than affixes do.
    if (weaponEnhancement > 0) {
      const enh = scaleExtraEdge(weaponEnhancement);
      if (enh > 0) {
        bonusDamage += enh;
        onTypeParts.push({ amount: enh, label: 'enhancement' });
      }
    }
    // Weapon damage lever: the longbow's inherent +damage, paid for in accuracy.
    if (w.damageMod) {
      bonusDamage += w.damageMod;
      onTypeParts.push({ amount: w.damageMod, label: 'weapon' });
    }
    // Oil of Sharpness: the anointed edge bites deeper every strike this combat.
    // Full on every swing (a one-fight paid effect, not stacked gear edge — the
    // Flurry halving is for permanent per-hit edges that compound by level).
    if (nextCharacter.damageBonusEncounter) {
      bonusDamage += nextCharacter.damageBonusEncounter;
      onTypeParts.push({ amount: nextCharacter.damageBonusEncounter, label: 'oil' });
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
    // Monk Ki-Empowered Strikes (L6): channelled Ki rides every kit-bearing blow.
    if (monkKitOn && characterHasMechanic(nextCharacter, 'ki-empowered')) {
      bonusDamage += 1;
      onTypeParts.push({ amount: 1, label: 'ki' });
    }
    // Monk (Open Hand): a flurry batters the guard open — extra bite on the
    // strikes that fall while a flurry is still pouring out.
    if (
      monkKitOn &&
      characterHasMechanic(nextCharacter, 'open-hand-technique') &&
      (nextCharacter.flurryStrikesRemaining ?? 0) > 0
    ) {
      // Open Hand Ki Focus (L10) deepens the flurry bite from +2 to +4.
      const openHand = 2 + (characterHasMechanic(nextCharacter, 'ki-focus') ? 2 : 0);
      bonusDamage += openHand;
      onTypeParts.push({ amount: openHand, label: 'open hand' });
    }
    // Monk (Shadow): the unseen opener drives extra Ki-charged damage home.
    // Cloak of Shadows (L10) deepens the opener from +3 to +6.
    if (isFirstAttack && monkKitOn && characterHasMechanic(nextCharacter, 'shadow-strike')) {
      const shadow = 3 + (characterHasMechanic(nextCharacter, 'cloak-of-shadows') ? 3 : 0);
      bonusDamage += shadow;
      onTypeParts.push({ amount: shadow, label: 'shadow' });
    }
    // Bard — the Valor War-Song: while any music plays, EVERY weapon hit carries
    // the song die as bonus damage, automatically — no banking, no bonus action.
    // The war-skald's blade keeps time with whatever is playing.
    const warSongDie = bardWarSongDie(nextCharacter);
    if (warSongDie !== 0) {
      const song = roller.roll({ count: 1, die: warSongDie, modifier: 0 });
      bonusDamage += song.total;
      onTypeParts.push({ amount: song.total, label: 'song' });
    }
    // Apotheosis: the ascendant caster's every blow bites for far more.
    if (isAscendant(nextCharacter)) {
      bonusDamage += APOTHEOSIS_BONUS_DAMAGE;
      onTypeParts.push({ amount: APOTHEOSIS_BONUS_DAMAGE, label: 'ascendant' });
    }
    // Shape Change (dragon form): each claw bites for the +3 enchanted edge.
    if (isDragonForm(nextCharacter)) {
      bonusDamage += DRAGON_CLAW_DAMAGE_BONUS;
      onTypeParts.push({ amount: DRAGON_CLAW_DAMAGE_BONUS, label: 'dragon' });
    }
    // Druid Primal Strike (L6): each claw bites deeper — nothing shrugs off the predator.
    if (isWildShaped(nextCharacter) && characterHasMechanic(nextCharacter, 'primal-strike')) {
      bonusDamage += PRIMAL_STRIKE_DAMAGE_BONUS;
      onTypeParts.push({ amount: PRIMAL_STRIKE_DAMAGE_BONUS, label: 'primal' });
    }
    // Paladin Divine Smite: an armed smite (or a Bulwark Smite of the Crusader on
    // a crit) sears the landing hit with radiant damage, spending the cheapest
    // spell slot. The dice scale with the slot tier and the oath's smite
    // milestones, and double on a crit like every weapon-hit die. Off-type radiant
    // — its own headline segment, never folded into the weapon type.
    const smite = paladinSmiteOnHit(nextCharacter, crit, roller);
    if (smite) {
      nextCharacter = smite.character;
      if (smite.total > 0) {
        bonusDamage += smite.total;
        offTypeDamage += smite.total;
        offTypeParts.push({ amount: smite.total, type: 'radiant' });
      }
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
      // The fury rides both great weapons, but its full weight is behind the
      // lead blade: Twin Fury's trailing 2H off-hand takes the raging riders at
      // the follow scale (the brake that keeps the double-rage-swing in band).
      const rd = scale2hFollow(rageDamageBonus(nextCharacter));
      if (rd > 0) {
        bonusDamage += rd;
        onTypeParts.push({ amount: rd, label: 'Rage' });
      }
      // Furious weapon affix: extra melee damage while the fury burns.
      if (affixMods.rageDamageBonus > 0) {
        const furious = scale2hFollow(affixMods.rageDamageBonus);
        if (furious > 0) {
          bonusDamage += furious;
          onTypeParts.push({ amount: furious, label: 'Furious' });
        }
      }
      // Heavy two-handed synergy: a great weapon swung in a rage hits harder.
      if (w.properties.includes('heavy') && w.properties.includes('two-handed')) {
        const heavyHaft = scale2hFollow(2);
        if (heavyHaft > 0) {
          bonusDamage += heavyHaft;
          onTypeParts.push({ amount: heavyHaft, label: 'heavy haft' });
        }
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
    const swashbucklerSneak = characterHasMechanic(nextCharacter, 'swashbuckler');
    const assassinSneak = characterHasMechanic(nextCharacter, 'assassin') && targetFullHp;
    // Opening strike: the first attack of each combat always finds the gap —
    // the rogue steps from shadow even without setting up Hide first. The
    // dual-wield follow of the OPENING pair inherits the window: a whiffed
    // main hand hands the gap to the second knife (the once-per-turn flag
    // above still blocks a second payout when the main hand already landed it).
    const openingStrike = isFirstAttack || offHand?.openerWindow === true;
    // Feint guarantees the gap with no setup at all (Cunning Action above).
    const sneakTriggers =
      advantage === 'advantage' ||
      targetWounded ||
      wieldsDagger ||
      swashbucklerSneak ||
      assassinSneak ||
      rakishSoleFoe ||
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

    // Paladin Oath of Vengeance — Vow of Enmity: a flat bite on every blow against
    // the sworn quarry (the advantage rode the attack roll above). Deeper once
    // Relentless Avenger (L10) is online (vowBonusDamage reads the milestone). On-
    // type, so it sums into the weapon-type breakdown like the Quarry affix.
    if (vowStrike) {
      const vow = vowBonusDamage(nextCharacter);
      if (vow > 0) {
        bonusDamage += vow;
        onTypeParts.push({ amount: vow, label: 'vow' });
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
      // Hunter Deeper Wound (L10): the Colossus Slayer bonus rolls two dice.
      const colossusDice = characterHasMechanic(nextCharacter, 'deeper-wound') ? 2 : 1;
      const colossusRoll = roller.roll({ count: (crit ? 2 : 1) * colossusDice, die: 8, modifier: 0 });
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
      // Giant Killer Giantsbane (L10): the bane against the room's great threat
      // drives two dice home instead of one.
      const gkDice = characterHasMechanic(nextCharacter, 'giantsbane') ? 2 : 1;
      const gkRoll = roller.roll({ count: (crit ? 2 : 1) * gkDice, die: 10, modifier: 0 });
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
    // The off-hand follow lands the weapon's die PLUS the wielder's ability
    // modifier (5e Two-Weapon Fighting), divided by the dual-wield denom so the
    // share is tunable. A light off-hand keeps the full mod (denom 1); the
    // barbarian Twin Fury's TWO-HANDED off-hand takes only half (the 2H denom).
    // The weapon dice + raging riders are scaled separately (scale2hFollow), and
    // the gear edge is halved via scaleExtraEdge, so each axis is reined in.
    const damageAbilMod = isOffHandSwing
      ? Math.floor(
          abilMod /
            (offHandIsTwoHanded
              ? DUAL_WIELD_OFFHAND_2H_ABIL_MOD_DENOM
              : DUAL_WIELD_OFFHAND_ABIL_MOD_DENOM),
        )
      : abilMod;
    const totalDamage = Math.max(
      1,
      damageRoll.total + damageAbilMod + damageExpr.modifier + bonusDamage,
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
    pushPart(damageAbilMod, t(`combat.abil.${attackAbility}`));
    pushPart(damageExpr.modifier, t('combat.part.magic'));
    if (sneakDamage > 0) pushPart(sneakDamage, t('combat.part.sneak', { dice: `${sneakDice}d6` }));
    if (markDamage > 0) pushPart(markDamage, t('combat.part.mark', { dice: HUNTERS_MARK_DICE }));
    if (colossusDamage > 0)
      pushPart(
        colossusDamage,
        t('combat.part.colossus', {
          dice: characterHasMechanic(nextCharacter, 'deeper-wound') ? '2d8' : '1d8',
        }),
      );
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
    // plain swing on the strike that triggered it. A monk's Flurry extras (the
    // same actionUsed signal as the diminished-edge guard above) read as the
    // rapid double-jab rather than the single straight punch. Whiffs skip the
    // bus — the attacker's lunge already reads as a miss.
    const baseVfxKind = weaponVfxKind(w);
    const vfxKind = colossusFiredFlag
      ? 'colossus'
      : baseVfxKind === 'unarmed' && diminishedExtraEdge
        ? 'unarmed-flurry'
        : baseVfxKind;
    nextState = attachCombatVfx(nextState, vfxKind, 'player', targetId);

    // Lifesteal (Vampiric weapon affix, Leeching accessory, Heartwood Talisman
    // legendary, etc.): heal for a fraction of the damage dealt, capped at max
    // HP. Rage halves the drink (rounded up), it no longer shuts it off. The
    // barbarian Twin Fury's 2H off-hand follow draws no essence — a second
    // raging drink a turn roughly doubled the sustain and was the largest driver
    // of the dual-wield clear-rate spike (sim-class-viability); the lead blade
    // does the drinking.
    if (
      affixMods.lifestealPct > 0 &&
      !offHandIsTwoHanded &&
      nextCharacter.hp.current < nextCharacter.hp.max
    ) {
      const healed = ragedHealAmount(
        nextCharacter,
        // A tiny pct on a small hit floors to 0 — a vampiric weapon always drinks at least 1.
        Math.max(1, Math.floor((totalDamage * affixMods.lifestealPct) / 100)),
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
      // Whirling Hunter (L10): the carrying shot glances into up to TWO further
      // foes instead of one. Targets are selected off the pre-splash board, so an
      // early kill in the loop doesn't reshuffle the picks.
      const extraTargets = characterHasMechanic(nextCharacter, 'whirling-hunter') ? 2 : 1;
      const others = nextState.combatants
        .filter((c) => c.kind === 'monster' && c.id !== targetId && c.instance.hp.current > 0)
        .slice(0, extraTargets);
      for (const other of others) {
        if (other.kind !== 'monster') continue;
        const splashRoll = roller.roll({
          count: damageExpr.count,
          die: damageExpr.die,
          modifier: 0,
        });
        const splashDamage = Math.max(1, splashRoll.total + (affixMods.damageBonus ?? 0));
        const splashed = applyDamage(nextState, other.id, splashDamage, nextCharacter);
        nextState = splashed.state;
        nextCharacter = splashed.character;
        nextState = appendLog(nextState, {
          id: nextLogId(nextState),
          kind: 'damage',
          text: t('combat.log.shotCarries', {
            name: nextCharacter.name,
            target: other.instance.displayName,
            dmg: splashDamage,
            type: t(`combat.dmg.${weapon.damageType}`),
          }),
        });
        nextState = attachCombatVfx(nextState, weaponVfxKind(w), 'player', other.id);
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
        // The fell is the story of this strike — the slam-and-topple replaces
        // the plain swing VFX (one event slot; the later attach wins).
        nextState = attachCombatVfx(nextState, 'knockdown-burst', 'player', targetId);
      }
    }

    // Monk Stunning Strike: an armed kit blow (bare-handed or a monk weapon) that
    // lands forces a CON save — on a fail the target is staggered (loses its next
    // turn). Boss/elite foes roll the save with advantage (resolute will) rather
    // than being immune. The Ki was already spent to arm the stance; it clears
    // once a blow connects (a clean miss leaves it armed for the next swing).
    if (nextCharacter.stunningStrikeActive === true && monkKitOn && target.kind === 'monster') {
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
          // The stun is the story of this blow — the palm-flash + dizzy-star
          // spin replaces the plain jab VFX (one event slot; later attach wins).
          nextState = attachCombatVfx(nextState, 'stun-burst', 'player', targetId);
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

  // Mark action used for the player. The off-hand follow spends nothing — it
  // rides the Attack action the main hand already paid for (and must not tick
  // the per-action swing counter or burn a queued bonus swing).
  if (!isOffHandSwing) {
    const markResult = markPlayerActionUsed(nextState, nextCharacter);
    nextState = markResult.state;
    nextCharacter = markResult.character;
  }
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
  // Shape Change (dragon form): three claw strikes per Attack, ahead of any
  // class extra-attack check — the form's own multiattack.
  if (isDragonForm(character)) return DRAGON_CLAW_ATTACKS;
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
