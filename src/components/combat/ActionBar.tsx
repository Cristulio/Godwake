import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onEndTurn: () => void;
}

export function ActionBar({ character, state, onAttack, onEndTurn }: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const canAct = playersTurn && !character.actionEconomy.actionUsed && state.status === 'active';

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button variant="primary" onClick={onAttack} disabled={!canAct}>
        Attack
      </Button>
      <Button variant="secondary" disabled>
        Spells
      </Button>
      <Button variant="secondary" disabled>
        Dodge
      </Button>
      <Button variant="secondary" disabled>
        Dash
      </Button>
      <Button variant="secondary" disabled>
        Item
      </Button>
      <Button variant="secondary" onClick={onEndTurn} disabled={!playersTurn || state.status !== 'active'}>
        End Turn
      </Button>
    </div>
  );
}
