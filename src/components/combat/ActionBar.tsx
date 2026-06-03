import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { characterHasMechanic } from '../../engine/character/derived';
import { RAGE_ROUNDS } from '../../engine/character/actions';
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
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';
  const isMonk = character.classId === 'monk';

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

  // Barbarian Rage (bonus action) — available every combat; disabled while already raging.
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const canRage =
    playersTurn &&
    active &&
    isBarbarian &&
    !raging &&
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
    ki > 0 &&
    !stunningArmed &&
    !character.actionEconomy.actionUsed;

  const totalSlots =
    slotsAt(character, 1) + slotsAt(character, 2) + slotsAt(character, 3);
  const knownSpells = character.resources.knownSpells ?? [];
  // Button stays open as long as at least one known spell (action, bonus, or
  // reaction) can be cast right now — SpellPicker greys out individual entries.
  const canSpells =
    playersTurn &&
    active &&
    isWizard &&
    knownSpells.some((id) => canCastSpell(character, id).ok);

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

  // Fighter L5 Extra Attack: two swings per Action. Show progress on the
  // button so the player knows the second swing is queued.
  const dashSwingPending = hasBonusAttack && character.actionEconomy.actionUsed;
  const flurrySwingPending = hasFlurryStrike && character.actionEconomy.actionUsed;
  const attackLabel = flurrySwingPending
    ? `► Strike (Flurry ${character.flurryStrikesRemaining})`
    : dashSwingPending
      ? '► Attack (Dash)'
      : hasExtraAttack
        ? `► Attack (${Math.min(attacksThisTurn + 1, 2)}/2)`
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
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          {attackLabel}
        </Button>

        {isFighter && (
          <Button
            variant={canSecondWind ? 'primary' : 'secondary'}
            onClick={onSecondWind}
            disabled={!canSecondWind}
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
            title={`Bonus action: enter a ${RAGE_ROUNDS}-round battle-fury — physical damage halved, melee hits deal bonus damage, but healing is locked out until the fury ends.`}
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {raging ? `Raging (${rageRounds})` : 'Rage'}
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
            title="Free, 1 Ki: arm a staggering blow — your next unarmed hit forces a save or the target loses its next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {stunningArmed ? 'Stunning ✓' : 'Stunning Strike'}
          </Button>
        )}

        {isWizard && (
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
