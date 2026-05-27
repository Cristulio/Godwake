import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { characterHasMechanic } from '../../engine/character/derived';
import { getItem } from '../../content/items';
import { slotsAt } from '../../engine/combat/spells';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onActionSurge: () => void;
  onCunningAction: () => void;
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
  onSpells,
  onUseItem,
  onEndTurn,
}: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const active = state.status === 'active';
  const canAttack = playersTurn && active && !character.actionEconomy.actionUsed;

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';

  const secondWindBonus = character.resources.secondWindBonusRemaining ?? 0;
  const secondWindHasCharge =
    character.resources.secondWindAvailable === true || secondWindBonus > 0;
  const secondWindUsable =
    isFighter &&
    secondWindHasCharge &&
    !character.actionEconomy.bonusActionUsed &&
    character.hp.current < character.hp.max;
  const canSecondWind = playersTurn && active && secondWindUsable;
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
  const canUseItem =
    playersTurn && active && !character.actionEconomy.actionUsed && consumableCount > 0;

  const canEndTurn = playersTurn && active;

  // Fighter L5 Extra Attack: two swings per Action. Show progress on the
  // button so the player knows the second swing is queued.
  const hasExtraAttack = characterHasMechanic(character, 'extra-attack');
  const attacksThisTurn = state.playerAttacksThisTurn ?? 0;
  const attackLabel = hasExtraAttack
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
            title="Bonus action: Dash, Disengage, or Hide. Hide grants advantage on your next attack."
            className="flex-1"
          >
            Cunning Action{cunningRemaining > 0 && ` (${cunningRemaining})`}
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
