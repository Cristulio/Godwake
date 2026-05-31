import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { characterHasMechanic } from '../../engine/character/derived';
import { RAGE_ROUNDS } from '../../engine/character/actions';
import { getItem } from '../../content/items';
import { slotsAt } from '../../engine/combat/spells';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onActionSurge: () => void;
  onCunningAction: () => void;
  onRage: () => void;
  onRecklessAttack: () => void;
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
  onCunningAction,
  onRage,
  onRecklessAttack,
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
  const canAttack =
    playersTurn && active && (!character.actionEconomy.actionUsed || hasBonusAttack);

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';

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

  const cunningRemaining = character.resources.cunningActionUsesRemaining ?? 0;
  const canCunningAction =
    playersTurn &&
    active &&
    isRogue &&
    cunningRemaining > 0 &&
    !character.actionEconomy.bonusActionUsed;

  // Barbarian Rage (bonus action) — renewable each combat. Disabled once raging
  // or out of charges.
  const rageUses = character.resources.rageUsesRemaining ?? 0;
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const canRage =
    playersTurn &&
    active &&
    isBarbarian &&
    rageUses > 0 &&
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
  const canHuntersMark =
    playersTurn &&
    active &&
    isRanger &&
    characterHasMechanic(character, 'hunters-mark') &&
    !character.actionEconomy.bonusActionUsed;

  const totalSlots =
    slotsAt(character, 1) + slotsAt(character, 2) + slotsAt(character, 3);
  const knownSpellCount = (character.resources.knownSpells ?? []).length;
  // Wizards always have at least one cantrip on the list, so as long as the
  // book isn't empty the button stays available — SpellPicker gates each
  // entry per slot.
  const canSpells =
    playersTurn &&
    active &&
    isWizard &&
    knownSpellCount > 0 &&
    !character.actionEconomy.actionUsed;

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
  const attackLabel = dashSwingPending
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
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={onAttack}
          disabled={!canAttack}
          className="flex-1"
        >
          {attackLabel}
        </Button>

        {isFighter && (
          <Button
            variant={canSecondWind ? 'primary' : 'secondary'}
            onClick={onSecondWind}
            disabled={!canSecondWind}
            title="Bonus action: heal 1d10 + level. Once per short rest."
            className="flex-1"
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
            className="flex-1"
          >
            Action Surge{surgeRemaining > 0 && ` (${surgeRemaining})`}
          </Button>
        )}

        {isRogue && (
          <Button
            variant={canCunningAction ? 'primary' : 'secondary'}
            onClick={onCunningAction}
            disabled={!canCunningAction}
            title="Bonus action: Hide (advantage on next attack), Dash (a quick second strike this turn), or Disengage (2 damage reduction on next incoming hit)."
            className="flex-1"
          >
            Cunning Action{cunningRemaining > 0 && ` (${cunningRemaining})`}
          </Button>
        )}

        {isBarbarian && (
          <Button
            variant={canRage ? 'primary' : 'secondary'}
            onClick={onRage}
            disabled={!canRage}
            title={`Bonus action: enter a ${RAGE_ROUNDS}-round battle-fury — physical damage halved, melee hits deal bonus damage, but healing is locked out until the fury ends. ${rageUses} charge${rageUses === 1 ? '' : 's'} left — refills at campfire and rest rooms.`}
            className="flex-1"
          >
            {raging ? `Raging (${rageRounds})` : `Rage${rageUses > 0 ? ` (${rageUses})` : ''}`}
          </Button>
        )}
        {hasReckless && (
          <Button
            variant={canReckless ? 'primary' : 'secondary'}
            onClick={onRecklessAttack}
            disabled={!canReckless}
            title="Free: your melee attacks this turn roll with advantage, but attacks against you have advantage until your next turn."
            className="flex-1"
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
            className="flex-1"
          >
            {isMarkLive ? 'Re-mark' : "Hunter's Mark"}
          </Button>
        )}

        {isWizard && (
          <Button
            variant={canSpells ? 'primary' : 'secondary'}
            onClick={onSpells}
            disabled={!canSpells}
            title="Action: pick a prepared spell."
            className="flex-1"
          >
            ✦ Spells ({totalSlots})
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={canUseItem ? 'primary' : 'secondary'}
          onClick={onUseItem}
          disabled={!canUseItem}
          className="flex-1"
        >
          Item {consumableCount > 0 && `(${consumableCount})`}
        </Button>
        <Button
          variant="secondary"
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="flex-1"
        >
          End Turn
        </Button>
      </div>
    </div>
  );
}
