import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { maxAttacksPerAction } from '../../engine/combat/attack/playerAttack';
import { characterHasMechanic, isFullCaster, isWildShaped } from '../../engine/character/derived';
import { RAGE_ROUNDS, isRageUnlimited } from '../../engine/character/actions';
import { rageBrokenByArmor } from '../../engine/character/equip';
import {
  martialFlavor,
  martialPointsLeft,
  martialOffenseDamage,
  martialOffenseAttackBonus,
  martialDefenseReduction,
  martialOffenseCost,
  martialDisruptCost,
  MARTIAL_DEFENSE_COST,
} from '../../engine/combat/martialResource';
import { getItem } from '../../content/items';
import { slotsAt, canCastSpell } from '../../engine/combat/spells';

/** Entangling Roots is surfaced as its own dedicated bonus-action button (below)
 *  and pulled from the generic Spells list, so the id is referenced in both
 *  gates. */
const ENTANGLE_SPELL_ID = 'entangling-roots';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onActionSurge: () => void;
  onMartialOffense: () => void;
  onMartialDefense: () => void;
  onMartialDisrupt: () => void;
  onCunningAction: () => void;
  onRage: () => void;
  onRecklessAttack: () => void;
  onFlurry: () => void;
  onPatientDefense: () => void;
  onStunningStrike: () => void;
  onHuntersMark: () => void;
  onEntangle: () => void;
  onWildShape: () => void;
  onSpells: () => void;
  onUseItem: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  character,
  state,
  onAttack,
  onSecondWind,
  onActionSurge,
  onMartialOffense,
  onMartialDefense,
  onMartialDisrupt,
  onCunningAction,
  onRage,
  onRecklessAttack,
  onFlurry,
  onPatientDefense,
  onStunningStrike,
  onHuntersMark,
  onEntangle,
  onWildShape,
  onSpells,
  onUseItem,
  onEndTurn,
}: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const active = state.status === 'active';
  // Cunning Action: Dash queues a free swing the player can fire even after
  // the Action is spent.
  const hasBonusAttack = character.bonusAttackAvailable === true;
  // Monk: a queued Flurry of Blows lets the monk keep striking after the Attack
  // action is spent.
  const hasFlurryStrike = (character.flurryStrikesRemaining ?? 0) > 0;
  const canAttack =
    playersTurn &&
    active &&
    (!character.actionEconomy.actionUsed || hasBonusAttack || hasFlurryStrike);

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  // Manual spell UI is surfaced for every full caster (Wizard + Druid), not the
  // Wizard alone — the engine (canCastSpell/castSpell, WIS- or INT-based DC, the
  // shared slot ladder) already drives both; this is purely the UI gate.
  const isFullCasterClass = isFullCaster(character.classId);
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';
  const isMonk = character.classId === 'monk';
  const isDruid = character.classId === 'druid';

  // Multiattack commitment: once a character with Extra Attack has begun their
  // Attack action (a swing down, the action not yet fully spent), every OTHER
  // action is locked until the remaining swing(s) land — no interleaving.
  const hasExtraAttack = characterHasMechanic(character, 'extra-attack');
  const attacksThisTurn = state.playerAttacksThisTurn ?? 0;
  const midMultiattack =
    hasExtraAttack && !character.actionEconomy.actionUsed && attacksThisTurn > 0;

  const secondWindBonus = character.resources.secondWindBonusRemaining ?? 0;
  const secondWindHasCharge =
    character.resources.secondWindAvailable === true || secondWindBonus > 0;
  const secondWindUsable =
    isFighter &&
    secondWindHasCharge &&
    !character.actionEconomy.bonusActionUsed &&
    character.hp.current < character.hp.max;
  const canSecondWind = playersTurn && active && secondWindUsable && !midMultiattack;
  const secondWindCount =
    (character.resources.secondWindAvailable === true ? 1 : 0) + secondWindBonus;

  // Action Surge: free Action this turn — only useful AFTER you've spent
  // your action. Fighter L2+.
  const surgeRemaining = character.resources.actionSurgeRemaining ?? 0;
  const canActionSurge =
    playersTurn &&
    active &&
    isFighter &&
    surgeRemaining > 0 &&
    character.actionEconomy.actionUsed;

  // Martial resource pool (Fighter Resolve / Barbarian Fury / Ranger Focus):
  // the shared OFFENSE / DEFENSE / DISRUPT spends. At most one point's-worth a
  // turn (martialSpentThisTurn). The flavor strings drive the in-world labels.
  const martial = martialFlavor(character);
  const martialPoints = martialPointsLeft(character);
  const offenseCost = martialOffenseCost(character);
  const disruptCost = martialDisruptCost(character);
  const martialSpent = character.martialSpentThisTurn === true;
  const offenseUp = character.martialOffenseActive === true;
  const disruptArmed = character.martialDisruptActive === true;
  const hasMartialOffense = martial != null && characterHasMechanic(character, 'martial-offense');
  const hasMartialDefense = martial != null && characterHasMechanic(character, 'martial-defense');
  const hasMartialDisrupt = martial != null && characterHasMechanic(character, 'martial-disrupt');
  // OFFENSE / DISRUPT are declared before the swing (gate on the action);
  // DEFENSE only needs to land before the enemy turn, so it stays open until the
  // multiattack chain is done.
  const canMartialOffense =
    playersTurn &&
    active &&
    hasMartialOffense &&
    !martialSpent &&
    !offenseUp &&
    martialPoints >= offenseCost &&
    !character.actionEconomy.actionUsed;
  const canMartialDefense =
    playersTurn &&
    active &&
    hasMartialDefense &&
    !martialSpent &&
    martialPoints >= MARTIAL_DEFENSE_COST &&
    !midMultiattack;
  const canMartialDisrupt =
    playersTurn &&
    active &&
    hasMartialDisrupt &&
    !martialSpent &&
    !disruptArmed &&
    martialPoints >= disruptCost &&
    !character.actionEconomy.actionUsed;

  const cunningRemaining = character.resources.cunningActionUsesRemaining ?? 0;
  const canCunningAction =
    playersTurn &&
    active &&
    isRogue &&
    cunningRemaining > 0 &&
    !character.actionEconomy.bonusActionUsed;

  // Barbarian Rage (bonus action) — a rationed charge now: disabled while raging,
  // while the bonus is spent, and when no charges remain (until a rest refills).
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const rageUnlimited = isRageUnlimited(character);
  const rageCharges = character.resources.rageChargesRemaining ?? 0;
  const hasRageCharge = rageUnlimited || rageCharges > 0;
  // Heavy plate smothers the fury — Rage can't take hold while it's worn.
  const rageBlockedByArmor = rageBrokenByArmor(character);
  const canRage =
    playersTurn &&
    active &&
    isBarbarian &&
    !raging &&
    !rageBlockedByArmor &&
    hasRageCharge &&
    !character.actionEconomy.bonusActionUsed;

  // Barbarian Reckless Attack — a free stance declared before the swing.
  const hasReckless = isBarbarian && characterHasMechanic(character, 'reckless-attack');
  const reckless = character.recklessActive === true;
  const canReckless =
    playersTurn && active && hasReckless && !reckless && !character.actionEconomy.actionUsed;

  // Ranger Hunter's Mark (bonus action) — brand or re-brand a quarry.
  const isMarkLive =
    state.huntersMarkTargetId != null &&
    state.combatants.some(
      (c) =>
        c.kind === 'monster' &&
        c.id === state.huntersMarkTargetId &&
        c.instance.hp.current > 0,
    );
  // Re-marking is a no-op when the mark already rides the only living foe —
  // there's nowhere to move it. Mirror the AUTO bot's markOnLiveTarget check
  // (CombatScreen:253) so the button is disabled in that case.
  const hasOtherMarkableTarget = state.combatants.some(
    (c) =>
      c.kind === 'monster' &&
      c.instance.hp.current > 0 &&
      c.id !== state.huntersMarkTargetId,
  );
  const canHuntersMark =
    playersTurn &&
    active &&
    isRanger &&
    characterHasMechanic(character, 'hunters-mark') &&
    !character.actionEconomy.bonusActionUsed &&
    (!isMarkLive || hasOtherMarkableTarget);

  // Monk Ki actions. Flurry of Blows / Patient Defense are bonus-action Ki
  // spends; Stunning Strike is a free stance armed before the swing. All gate on
  // a Ki point in the well.
  const ki = character.resources.kiPointsRemaining ?? 0;
  const hasFlurry = isMonk && characterHasMechanic(character, 'flurry-of-blows');
  const flurryQueued = hasFlurryStrike;
  const canFlurry =
    playersTurn &&
    active &&
    hasFlurry &&
    ki > 0 &&
    !flurryQueued &&
    !character.actionEconomy.bonusActionUsed &&
    !midMultiattack;
  const hasPatientDefense = isMonk && characterHasMechanic(character, 'patient-defense');
  const patientActive = character.patientDefenseActive === true;
  const canPatientDefense =
    playersTurn &&
    active &&
    hasPatientDefense &&
    ki > 0 &&
    !patientActive &&
    !character.actionEconomy.bonusActionUsed &&
    !midMultiattack;
  const hasStunningStrike = isMonk && characterHasMechanic(character, 'stunning-strike');
  const stunningArmed = character.stunningStrikeActive === true;
  const canStunningStrike =
    playersTurn &&
    active &&
    hasStunningStrike &&
    ki >= 2 &&
    !stunningArmed &&
    !character.actionEconomy.actionUsed;

  const knownSpells = character.resources.knownSpells ?? [];

  // Druid Entangling Roots: a dedicated bonus-action button (like the monk's
  // Ki buttons), so the druid doesn't dig it out of the Spells list. Auto-known
  // from L1; enabled once a 2nd-level slot is up and the bonus action is free.
  // canCastSpell carries the exact slot + bonus-action gate the engine enforces.
  const hasEntangle = isDruid && knownSpells.includes(ENTANGLE_SPELL_ID);
  const entangleSlots = slotsAt(character, 2);
  const canEntangle =
    playersTurn && active && hasEntangle && canCastSpell(character, ENTANGLE_SPELL_ID).ok;

  // Druid Wild Shape: a dedicated bonus-action button (the bot already shifts
  // automatically; this gives a human druid the same lever). Mirrors the engine
  // gates in useWildShape — druid + the mechanic, a change still in the well, not
  // already shaped, and a free bonus action.
  const hasWildShape = isDruid && characterHasMechanic(character, 'wild-shape');
  const wildShapeUses = character.resources.wildShapeUsesRemaining ?? 0;
  const isShaped = isWildShaped(character);
  const canWildShape =
    playersTurn &&
    active &&
    hasWildShape &&
    !isShaped &&
    wildShapeUses > 0 &&
    !character.actionEconomy.bonusActionUsed;

  const totalSlots =
    slotsAt(character, 1) + slotsAt(character, 2) + slotsAt(character, 3);
  // Button stays open as long as at least one known spell (action, bonus, or
  // reaction) can be cast right now — SpellPicker greys out individual entries.
  // Entangling Roots is excluded: it has its own dedicated button and is pulled
  // from the Spells list, so it must not be what keeps this one lit.
  const canSpells =
    playersTurn &&
    active &&
    isFullCasterClass &&
    knownSpells.some((id) => id !== ENTANGLE_SPELL_ID && canCastSpell(character, id).ok);

  const consumableCount = character.inventory.filter((ref) => {
    try {
      return getItem(ref.itemId).kind === 'consumable';
    } catch {
      return false;
    }
  }).length;
  // Gate on action economy by the consumable's own cost. Draughts/charms are
  // bonus-action items, so once the bonus action is spent (e.g. after Hunter's
  // Mark) the button must grey out — useConsumable silently no-ops otherwise.
  const hasUsableConsumable = character.inventory.some((ref) => {
    let item;
    try {
      item = getItem(ref.itemId);
    } catch {
      return false;
    }
    if (item.kind !== 'consumable') return false;
    // Rage locks out healing — a raging barbarian can't drink a draught.
    if (raging && item.effect === 'heal') return false;
    return item.actionCost === 'bonus'
      ? !character.actionEconomy.bonusActionUsed
      : !character.actionEconomy.actionUsed;
  });
  const canUseItem = playersTurn && active && hasUsableConsumable && !midMultiattack;

  const canEndTurn = playersTurn && active && !midMultiattack;

  // Extra Attack progress on the button so the player knows another swing is
  // queued. Use the REAL swing count — Extra Attack is 2 at L5 but climbs to 3
  // (Relentless Assault, L11) and 4 (Unstoppable, L20), and a loading weapon
  // caps it back to 1 — so mirror maxAttacksPerAction rather than hardcoding /2.
  const dashSwingPending = hasBonusAttack && character.actionEconomy.actionUsed;
  const flurrySwingPending = hasFlurryStrike && character.actionEconomy.actionUsed;
  const maxAttacks = maxAttacksPerAction(character);
  const attackLabel = flurrySwingPending
    ? `► Strike (Flurry ${character.flurryStrikesRemaining})`
    : dashSwingPending
      ? '► Attack (Dash)'
      : maxAttacks > 1
        ? `► Attack (${Math.min(attacksThisTurn + 1, maxAttacks)}/${maxAttacks})`
        : '► Attack';

  // Two-row layout. Row 1 = the heavy hitters (Attack + class-specific
  // actions + Spells when applicable). Row 2 = universal utility (Item /
  // End Turn). Flex with flex-1 so a 2-button row stretches as evenly as a
  // 3-button one — avoids empty grid cells when a class has fewer actions.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={onAttack}
          disabled={!canAttack}
          data-tutorial="attack"
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          {attackLabel}
        </Button>

        {isFighter && (
          <Button
            variant={canSecondWind ? 'primary' : 'secondary'}
            onClick={onSecondWind}
            disabled={!canSecondWind}
            data-tutorial="abilities"
            title="Bonus action: heal 1d10 + level. Once per short rest."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Second Wind{secondWindCount > 1 ? ` (${secondWindCount})` : ''}
          </Button>
        )}
        {isFighter && (
          <Button
            variant={canActionSurge ? 'primary' : 'secondary'}
            onClick={onActionSurge}
            disabled={!canActionSurge}
            title="Free Action: regain your action this turn. Once per short rest."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Action Surge{surgeRemaining > 0 && ` (${surgeRemaining})`}
          </Button>
        )}
        {hasMartialOffense && martial && (
          <Button
            variant={canMartialOffense ? 'primary' : 'secondary'}
            onClick={onMartialOffense}
            disabled={!canMartialOffense}
            title={`Costs ${offenseCost} ${martial.pool}: this turn's strikes ${character.classId === 'fighter' ? `land surer (+${martialOffenseAttackBonus(character)} to hit) and bite for +${martialOffenseDamage(character)} damage` : `land for +${martialOffenseDamage(character)} damage`}${character.classId === 'barbarian' ? ', and cleave into a second foe' : ''}.`}
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {offenseUp ? `${martial.offense} ✓` : `${martial.offense} (${offenseCost})`}
          </Button>
        )}
        {hasMartialDefense && martial && (
          <Button
            variant={canMartialDefense ? 'primary' : 'secondary'}
            onClick={onMartialDefense}
            disabled={!canMartialDefense}
            title={`Costs ${MARTIAL_DEFENSE_COST} ${martial.pool}: blunt the next hit you take by ${martialDefenseReduction(character)}. Hold it for a blow you can see coming.`}
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {`${martial.defense} (${MARTIAL_DEFENSE_COST})`}
          </Button>
        )}
        {hasMartialDisrupt && martial && (
          <Button
            variant={canMartialDisrupt ? 'primary' : 'secondary'}
            onClick={onMartialDisrupt}
            disabled={!canMartialDisrupt}
            title={`Costs ${disruptCost} ${martial.pool}: arm a staggering strike — the next hit fells its target and costs it its next turn.`}
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {disruptArmed ? `${martial.disrupt} ✓` : `${martial.disrupt} (${disruptCost})`}
          </Button>
        )}

        {isRogue && (
          <Button
            variant={canCunningAction ? 'primary' : 'secondary'}
            onClick={onCunningAction}
            disabled={!canCunningAction}
            title="Bonus action: Hide (advantage on next attack), Dash (a quick second strike this turn), or Disengage (2 damage reduction on next incoming hit)."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Cunning Action{cunningRemaining > 0 && ` (${cunningRemaining})`}
          </Button>
        )}

        {isBarbarian && (
          <Button
            variant={canRage ? 'primary' : 'secondary'}
            onClick={onRage}
            disabled={!canRage}
            data-tutorial="abilities"
            title={
              rageBlockedByArmor
                ? 'Heavy armor smothers your Rage — remove the plate to call the fury.'
                : !raging && !hasRageCharge
                  ? 'Out of Rage charges — rest at a camp to refill them.'
                  : `Bonus action: enter a ${RAGE_ROUNDS}-round battle-fury — physical damage halved, melee hits deal bonus damage, but healing is locked out until the fury ends. Spends one Rage charge; charges refill only at a rest.`
            }
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {raging
              ? `Raging (${rageRounds})`
              : rageUnlimited
                ? 'Rage (∞)'
                : `Rage (${rageCharges})`}
          </Button>
        )}
        {hasReckless && (
          <Button
            variant={canReckless ? 'primary' : 'secondary'}
            onClick={onRecklessAttack}
            disabled={!canReckless}
            title="Free: your melee attacks this turn roll with advantage, but attacks against you have advantage until your next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {reckless ? 'Reckless ✓' : 'Reckless'}
          </Button>
        )}
        {isRanger && (
          <Button
            variant={canHuntersMark ? 'primary' : 'secondary'}
            onClick={onHuntersMark}
            disabled={!canHuntersMark}
            data-tutorial="abilities"
            title="Bonus action: brand a target as your quarry — every hit on it deals extra damage. Re-cast to move the mark."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {isMarkLive ? 'Re-mark' : "Hunter's Mark"}
          </Button>
        )}

        {hasFlurry && (
          <Button
            variant={canFlurry ? 'primary' : 'secondary'}
            onClick={onFlurry}
            disabled={!canFlurry}
            title="Bonus action, 1 Ki: rain extra unarmed strikes this turn — keep hitting after your Attack action is spent."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {flurryQueued ? `Flurry ✓ (${character.flurryStrikesRemaining})` : `Flurry (${ki} Ki)`}
          </Button>
        )}
        {hasPatientDefense && (
          <Button
            variant={canPatientDefense ? 'primary' : 'secondary'}
            onClick={onPatientDefense}
            disabled={!canPatientDefense}
            title="Bonus action, 1 Ki: flow into a yielding guard — attacks against you roll at disadvantage until your next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {patientActive ? 'Patient ✓' : 'Patient Defense'}
          </Button>
        )}
        {hasStunningStrike && (
          <Button
            variant={canStunningStrike ? 'primary' : 'secondary'}
            onClick={onStunningStrike}
            disabled={!canStunningStrike}
            title="Free, 2 Ki: arm a staggering blow — your next unarmed hit forces a save or the target loses its next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {stunningArmed ? 'Stunning ✓' : 'Stunning Strike'}
          </Button>
        )}

        {hasWildShape && (
          <Button
            variant={canWildShape ? 'primary' : 'secondary'}
            onClick={onWildShape}
            disabled={!canWildShape}
            title={
              isShaped
                ? 'Already wearing the beast — claws out until the form spends out or fades.'
                : wildShapeUses <= 0
                  ? 'No Wild Shape changes left this combat — they refresh next fight.'
                  : "Bonus action: shed the body for a beast's shape — gain its vitality as temporary HP and rend with claws for several rounds. Once or twice per combat."
            }
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {isShaped ? 'Beast Form ✓' : `Wild Shape (${wildShapeUses})`}
          </Button>
        )}

        {hasEntangle && (
          <Button
            variant={canEntangle ? 'primary' : 'secondary'}
            onClick={onEntangle}
            data-tutorial="abilities"
            disabled={!canEntangle}
            title="Bonus action, costs a 2nd-level slot: grasping roots sweep the floor — every enemy makes a Strength save or is rooted, losing its next turn. Root the room and still strike the same turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            ✦ Entangling Roots ({entangleSlots})
          </Button>
        )}

        {isFullCasterClass && (
          <Button
            variant={canSpells ? 'primary' : 'secondary'}
            onClick={onSpells}
            disabled={!canSpells}
            title="Action: pick a prepared spell."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            ✦ Spells ({totalSlots})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={canUseItem ? 'primary' : 'secondary'}
          onClick={onUseItem}
          disabled={!canUseItem}
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          Item {consumableCount > 0 && `(${consumableCount})`}
        </Button>
        <Button
          variant="secondary"
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          End Turn
        </Button>
      </div>
    </div>
  );
}
