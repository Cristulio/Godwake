import { useEffect, useState } from 'react';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { useGameStore } from '../../stores/gameStore';
import { getActiveRoller } from '../../engine/dice';
import {
  endTurn,
  isPlayerTurn,
  monsterAttack,
  playerAttack,
} from '../../engine/combat';
import { EnemyCard } from './EnemyCard';
import { InitiativeTracker } from './InitiativeTracker';
import { CombatLog } from './CombatLog';
import { PlayerPanel } from './PlayerPanel';
import { ActionBar } from './ActionBar';
import { Button } from '../ui/Button';

interface CombatScreenProps {
  character: Character;
  state: CombatState;
}

export function CombatScreen({ character, state }: CombatScreenProps) {
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const goToHub = useGameStore((s) => s.goToHub);
  const [selectingTarget, setSelectingTarget] = useState(false);

  // Auto-advance monster turns after a short delay
  useEffect(() => {
    if (state.status !== 'active') return;
    if (isPlayerTurn(state)) return;
    const currentId = state.initiativeOrder[state.currentTurnIndex];
    const timer = setTimeout(() => {
      const roller = getActiveRoller();
      const attacked = monsterAttack({ roller, character, state }, currentId);
      const advanced = endTurn(attacked, character);
      setCharacter({ ...character });
      setCombat(advanced);
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurnIndex, state.status]);

  function handleAttackClick() {
    const aliveMonsters = state.combatants.filter(
      (c) => c.kind === 'monster' && c.instance.hp.current > 0,
    );
    if (aliveMonsters.length === 0) return;
    if (aliveMonsters.length === 1) {
      doAttack(aliveMonsters[0].id);
    } else {
      setSelectingTarget(true);
    }
  }

  function doAttack(targetId: string) {
    const roller = getActiveRoller();
    const equippedWeaponId = character.equipped.mainHand?.itemId;
    if (!equippedWeaponId) return;
    const next = playerAttack(
      { roller, character, state },
      targetId,
      equippedWeaponId,
    );
    setSelectingTarget(false);
    setCharacter({ ...character });
    setCombat(next);
  }

  function handleEndTurn() {
    const next = endTurn(state, character);
    setCharacter({ ...character });
    setCombat(next);
  }

  function handleReturnToHub() {
    setCombat(null);
    goToHub();
  }

  const isResolved = state.status !== 'active';
  const currentTurnId = state.initiativeOrder[state.currentTurnIndex];

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col gap-4">
      <header className="flex justify-between items-baseline pb-3 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            THE IRON CELLS · Room 1
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Chapter I · Round {state.round}
          </p>
        </div>
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">
          The Mage's Cells
        </div>
      </header>

      <InitiativeTracker state={state} character={character} />

      <div className="flex flex-wrap gap-3 min-h-[180px]">
        {state.combatants
          .filter((c) => c.kind === 'monster')
          .map((c) => (
            <EnemyCard
              key={c.id}
              combatant={c as Extract<typeof c, { kind: 'monster' }>}
              isActiveTurn={currentTurnId === c.id}
              selectable={selectingTarget}
              onSelect={() => doAttack(c.id)}
            />
          ))}
      </div>

      <CombatLog entries={state.log} />

      <PlayerPanel character={character} isActiveTurn={currentTurnId === 'player'} />

      {isResolved ? (
        <div className="flex flex-col items-center gap-4 mt-2">
          <div className={`text-2xl uppercase tracking-widest ${
            state.status === 'player-victory'
              ? 'text-[var(--color-accent-amber)]'
              : 'text-[var(--color-accent-blood)]'
          }`}>
            {state.status === 'player-victory' ? 'Victory' : 'Defeat'}
          </div>
          <Button variant="primary" onClick={handleReturnToHub}>
            Return to Phandalin
          </Button>
        </div>
      ) : (
        <ActionBar
          character={character}
          state={state}
          onAttack={handleAttackClick}
          onEndTurn={handleEndTurn}
        />
      )}

      {selectingTarget && (
        <div className="text-center text-[var(--color-accent-amber)] text-xs uppercase tracking-widest animate-pulse">
          Select a target...
        </div>
      )}
    </div>
  );
}
