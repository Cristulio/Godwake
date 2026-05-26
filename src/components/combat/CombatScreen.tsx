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
  useSecondWind,
} from '../../engine/combat';
import { CombatLog } from './CombatLog';
import { ActionBar } from './ActionBar';
import { Button } from '../ui/Button';
import { DiceRollOverlay } from './DiceRollOverlay';
import { Battlefield, type BattlefieldDecoration } from './Battlefield';
import { InitiativeTracker } from './InitiativeTracker';

interface CombatScreenProps {
  character: Character;
  state: CombatState;
  onCombatResolved: (outcome: 'victory' | 'defeat') => void;
  onAbandon?: () => void;
  roomTitle?: string;
  roomLabel?: string;
  scene?: 'combat' | 'boss';
  decoration?: BattlefieldDecoration;
}

export function CombatScreen({
  character,
  state,
  onCombatResolved,
  onAbandon,
  roomTitle,
  roomLabel,
  scene = 'combat',
  decoration = 'generic',
}: CombatScreenProps) {
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const speed = useGameStore((s) => s.speedMultiplier);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [autoEndNotice, setAutoEndNotice] = useState(false);

  // Mount dice overlay whenever a new attack event arrives
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

  // Monster turns auto-advance with timing that respects speed multiplier
  useEffect(() => {
    if (state.status !== 'active') return;
    if (isPlayerTurn(state)) return;
    const currentId = state.initiativeOrder[state.currentTurnIndex];

    const attackTimer = setTimeout(() => {
      const roller = getActiveRoller();
      const attacked = monsterAttack({ roller, character, state }, currentId);
      setCharacter({ ...character });
      setCombat(attacked);
    }, 700 / speed);

    const advanceTimer = setTimeout(() => {
      const latest = useGameStore.getState().combat;
      if (!latest || latest.status !== 'active') return;
      const advanced = endTurn(latest, character);
      setCharacter({ ...character });
      setCombat(advanced);
    }, (700 + 1500) / speed);

    return () => {
      clearTimeout(attackTimer);
      clearTimeout(advanceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurnIndex, state.status]);

  // Auto-end the player's turn when their action and any usable bonus are spent.
  useEffect(() => {
    if (state.status !== 'active') return;
    if (!isPlayerTurn(state)) return;
    if (overlayActive) return;
    if (!character.actionEconomy.actionUsed) return;

    const hasUsableBonus =
      character.classId === 'fighter' &&
      character.resources.secondWindAvailable === true &&
      !character.actionEconomy.bonusActionUsed &&
      character.hp.current < character.hp.max;
    if (hasUsableBonus) return;

    setAutoEndNotice(true);
    const t = setTimeout(() => {
      setAutoEndNotice(false);
      const latest = useGameStore.getState().combat;
      if (!latest) return;
      const next = endTurn(latest, character);
      setCharacter({ ...character });
      setCombat(next);
    }, 1100 / speed);

    return () => {
      clearTimeout(t);
      setAutoEndNotice(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character.actionEconomy.actionUsed,
    character.actionEconomy.bonusActionUsed,
    character.resources.secondWindAvailable,
    character.hp.current,
    state.currentTurnIndex,
    overlayActive,
  ]);

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

  function handleSecondWind() {
    const roller = getActiveRoller();
    const next = useSecondWind({ roller, character, state });
    setCharacter({ ...character });
    setCombat(next);
  }

  function handleContinue() {
    onCombatResolved(state.status === 'player-victory' ? 'victory' : 'defeat');
  }

  const isResolved = state.status !== 'active';

  return (
    <div className={`min-h-screen flex flex-col gap-3 max-w-6xl mx-auto p-4 md:p-6 ${shake ? 'animate-shake' : ''}`}>
      <header className="flex justify-between items-baseline pb-2 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-lg md:text-xl text-[var(--color-accent-amber)] tracking-wider">
            {roomTitle ?? 'Encounter'}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest">
            {roomLabel ?? `Round ${state.round}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            className={`
              px-2 py-1 border-2 text-[10px] uppercase tracking-widest font-bold
              ${speed === 2
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-amber)]'
                : 'border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)]'}
            `}
          >
            {speed === 2 ? '▶▶ 2×' : '▶ 1×'}
          </button>
          {onAbandon && (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              className="px-2 py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-blood)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest font-bold"
            >
              Abandon
            </button>
          )}
        </div>
      </header>

      <InitiativeTracker state={state} character={character} />

      <div className="grid grid-cols-[1fr_140px] gap-3 items-stretch">
        <Battlefield
          character={character}
          state={state}
          scene={scene}
          decoration={decoration}
          selectingTarget={selectingTarget}
          onSelectTarget={(id) => doAttack(id)}
        />

        <aside className="relative bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-dim)] min-h-[360px] flex flex-col items-center justify-center p-1.5">
          {overlayActive && state.lastAttack ? (
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
          ) : (
            <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.3em] text-center px-2">
              Dice Pool
              <div className="opacity-50 mt-1">awaiting roll</div>
            </div>
          )}
        </aside>
      </div>

      {isResolved ? (
        <div className="flex flex-col items-center gap-4 mt-2 animate-fade-in">
          <div className={`text-2xl md:text-3xl uppercase tracking-[0.4em] ${
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
        <>
          {selectingTarget && (
            <div className="text-center text-[var(--color-accent-amber)] text-xs uppercase tracking-widest animate-pulse">
              ► Select a target
            </div>
          )}
          {autoEndNotice && (
            <div className="text-center text-[var(--color-text-secondary)] text-xs uppercase tracking-widest italic">
              Ending turn — no actions remain.
            </div>
          )}
          <ActionBar
            character={character}
            state={state}
            onAttack={handleAttackClick}
            onSecondWind={handleSecondWind}
            onEndTurn={handleEndTurn}
          />
        </>
      )}

      <CombatLog entries={state.log} />

      {confirmAbandon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-base)]/80">
          <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-6 max-w-sm">
            <div className="text-[var(--color-accent-amber)] text-sm uppercase tracking-widest mb-2">
              Abandon the delve?
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              Flee back to Phandalin. You keep your hide, but the gold and the glory stay buried.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>
                Stay
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmAbandon(false);
                  onAbandon?.();
                }}
              >
                Abandon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
