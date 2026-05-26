import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onEndTurn: () => void;
}

export function ActionBar({ character, state, onAttack, onSecondWind, onEndTurn }: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const active = state.status === 'active';
  const canAttack = playersTurn && active && !character.actionEconomy.actionUsed;

  const secondWindUsable =
    character.classId === 'fighter' &&
    character.resources.secondWindAvailable === true &&
    !character.actionEconomy.bonusActionUsed &&
    character.hp.current < character.hp.max;
  const canSecondWind = playersTurn && active && secondWindUsable;

  const canEndTurn = playersTurn && active;

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button variant="primary" onClick={onAttack} disabled={!canAttack}>
        ► Attack
      </Button>
      <Button
        variant={canSecondWind ? 'primary' : 'secondary'}
        onClick={onSecondWind}
        disabled={!canSecondWind}
        title="Bonus action: heal 1d10 + level. Once per short rest."
      >
        Second Wind
      </Button>
      <Button variant="secondary" disabled>
        Spells
      </Button>
      <Button variant="secondary" disabled>
        Dodge
      </Button>
      <Button variant="secondary" disabled>
        Item
      </Button>
      <Button variant="secondary" onClick={onEndTurn} disabled={!canEndTurn}>
        End Turn
      </Button>
    </div>
  );
}
