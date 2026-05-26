import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { characterHasMechanic } from '../../engine/character/derived';
import { getItem } from '../../content/items';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onActionSurge: () => void;
  onUseItem: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  character,
  state,
  onAttack,
  onSecondWind,
  onActionSurge,
  onUseItem,
  onEndTurn,
}: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const active = state.status === 'active';
  const canAttack = playersTurn && active && !character.actionEconomy.actionUsed;

  const secondWindUsable =
    character.classId === 'fighter' &&
    character.resources.secondWindAvailable === true &&
    !character.actionEconomy.bonusActionUsed &&
    character.hp.current < character.hp.max;
  const canSecondWind = playersTurn && active && secondWindUsable;

  // Action Surge: free Action this turn — only useful AFTER you've spent
  // your action. Fighter L2+.
  const surgeRemaining = character.resources.actionSurgeRemaining ?? 0;
  const canActionSurge =
    playersTurn &&
    active &&
    character.classId === 'fighter' &&
    surgeRemaining > 0 &&
    character.actionEconomy.actionUsed;

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

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button variant="primary" onClick={onAttack} disabled={!canAttack}>
        {attackLabel}
      </Button>
      <Button
        variant={canSecondWind ? 'primary' : 'secondary'}
        onClick={onSecondWind}
        disabled={!canSecondWind}
        title="Bonus action: heal 1d10 + level. Once per short rest."
      >
        Second Wind
      </Button>
      <Button
        variant={canActionSurge ? 'primary' : 'secondary'}
        onClick={onActionSurge}
        disabled={!canActionSurge}
        title="Free Action: regain your action this turn. Once per short rest."
      >
        Action Surge{surgeRemaining > 0 && ` (${surgeRemaining})`}
      </Button>
      <Button variant="secondary" disabled>
        Dodge
      </Button>
      <Button
        variant={canUseItem ? 'primary' : 'secondary'}
        onClick={onUseItem}
        disabled={!canUseItem}
      >
        Item {consumableCount > 0 && `(${consumableCount})`}
      </Button>
      <Button variant="secondary" onClick={onEndTurn} disabled={!canEndTurn}>
        End Turn
      </Button>
    </div>
  );
}
