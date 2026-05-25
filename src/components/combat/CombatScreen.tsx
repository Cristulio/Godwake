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
import { DiceRollOverlay } from './DiceRollOverlay';

interface CombatScreenProps {
  character: Character;
  state: CombatState;
  /** Called once the player has acknowledged the resolution screen. */
  onCombatResolved: (outcome: 'victory' | 'defeat') => void;
  /** Optional title shown in the header (room/dungeon name). */
  roomTitle?: string;
  roomLabel?: string;
}

export function CombatScreen({
  character,
  state,
  onCombatResolved,
  roomTitle,
  roomLabel,
}: CombatScreenProps) {
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [shake, setShake] = useState(false);

  // Mount dice overlay whenever a new attack event arrives.
  useEffect(() => {
    if (!state.lastAttack) return;
    setOverlayActive(true);
    if (state.lastAttack.crit) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 460);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastAttack?.id]);

  // Auto-advance monster turns. Wait long enough for the dice overlay to play.
  useEffect(() => {
    if (state.status !== 'active') return;
    if (isPlayerTurn(state)) return;
    const currentId = state.initiativeOrder[state.currentTurnIndex];

    const attackTimer = setTimeout(() => {
      const roller = getActiveRoller();
      const attacked = monsterAttack({ roller, character, state }, currentId);
      setCharacter({ ...character });
      setCombat(attacked);
    }, 700);

    const advanceTimer = setTimeout(() => {
      const latest = useGameStore.getState().combat;
      if (!latest || latest.status !== 'active') return;
      const advanced = endTurn(latest, character);
      setCharacter({ ...character });
      setCombat(advanced);
    }, 700 + 2300);

    return () => {
      clearTimeout(attackTimer);
      clearTimeout(advanceTimer);
    };
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

  function handleContinue() {
    onCombatResolved(state.status === 'player-victory' ? 'victory' : 'defeat');
  }

  const isResolved = state.status !== 'active';
  const currentTurnId = state.initiativeOrder[state.currentTurnIndex];

  return (
    <div className={`min-h-screen p-6 max-w-6xl mx-auto flex flex-col gap-4 ${shake ? 'animate-shake' : ''}`}>
      <header className="flex justify-between items-baseline pb-3 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            {roomTitle ?? 'Encounter'}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {roomLabel ?? `Round ${state.round}`}
          </p>
        </div>
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">
          Round {state.round}
        </div>
      </header>

      <InitiativeTracker state={state} character={character} />

      <div className="flex flex-wrap gap-3 min-h-[200px] items-start">
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
        <div className="flex flex-col items-center gap-4 mt-2 animate-fade-in">
          <div className={`text-3xl uppercase tracking-[0.4em] ${
            state.status === 'player-victory'
              ? 'text-[var(--color-accent-amber)]'
              : 'text-[var(--color-accent-blood)]'
          }`}>
            {state.status === 'player-victory' ? 'Victory' : 'You have fallen'}
          </div>
          <Button variant="primary" onClick={handleContinue}>
            {state.status === 'player-victory' ? 'Continue Deeper →' : 'Wake at the Grove'}
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

      {overlayActive && state.lastAttack && (
        <DiceRollOverlay
          key={state.lastAttack.id}
          attackerName={state.lastAttack.attackerName}
          targetName={state.lastAttack.targetName}
          weaponName={state.lastAttack.weaponName}
          attackBonus={state.lastAttack.attackBonus}
          rollNatural={state.lastAttack.natural}
          total={state.lastAttack.total}
          targetAC={state.lastAttack.targetAC}
          hit={state.lastAttack.hit}
          crit={state.lastAttack.crit}
          onDismiss={() => setOverlayActive(false)}
        />
      )}
    </div>
  );
}
