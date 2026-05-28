import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getActiveRoller } from '../../engine/dice';
import {
  endTurn,
  isPlayerTurn,
  monsterAttack,
  playerAttack,
  useSecondWind,
  useActionSurge,
  useCunningAction,
  type CunningActionChoice,
  useConsumable,
  castSpell,
} from '../../engine/combat';
import { getSpell } from '../../content/spells';
import { ItemPicker } from './ItemPicker';
import { CombatLog } from './CombatLog';
import { ActionBar } from './ActionBar';
import { CunningActionPicker } from './CunningActionPicker';
import { SpellPicker } from './SpellPicker';
import { CombatHUD } from './CombatHUD';
import { Button } from '../ui/Button';
import { DiceRollOverlay } from './DiceRollOverlay';
import { Battlefield, type BattlefieldDecoration } from './Battlefield';
import { InitiativeTracker } from './InitiativeTracker';
import { playMusic, stopMusic, playSfx, type MusicId } from '../../engine/audio';

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
  const speed = useSettingsStore((s) => s.speedMultiplier);
  const setSpeed = useSettingsStore((s) => s.setSpeed);
  const autoEndTurnDelayMs = useSettingsStore((s) => s.autoEndTurnDelayMs);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [shake, setShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState<'player-crit' | 'enemy-crit' | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [autoEndNotice, setAutoEndNotice] = useState(false);
  const [pickingItem, setPickingItem] = useState(false);
  const [pickingCunning, setPickingCunning] = useState(false);
  const [pickingSpell, setPickingSpell] = useState(false);
  const [castingSpellId, setCastingSpellId] = useState<string | null>(null);
  const bedChoiceRef = useRef<MusicId | null>(null);

  // Mount dice overlay whenever a new attack event arrives
  useEffect(() => {
    if (!state.lastAttack) return;
    setOverlayActive(true);
    if (state.lastAttack.crit) {
      setShake(true);
      const flashKind: 'player-crit' | 'enemy-crit' =
        state.lastAttack.attackerKind === 'player' ? 'player-crit' : 'enemy-crit';
      setScreenFlash(flashKind);
      const tShake = setTimeout(() => setShake(false), 460);
      const tFlash = setTimeout(() => setScreenFlash(null), 220);
      return () => {
        clearTimeout(tShake);
        clearTimeout(tFlash);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastAttack?.id]);

  // Combat music bed: boss rooms get the bossly bed after a 3s intro sting;
  // normal rooms randomize between the two ambient beds the first time the
  // combat goes active and stick to that choice for the rest of the fight.
  useEffect(() => {
    if (state.status !== 'active') {
      stopMusic();
      return () => {
        stopMusic();
      };
    }

    if (scene === 'boss') {
      bedChoiceRef.current = 'combat_bed_bossly';
      playSfx('boss_intro');
      const introTimer = setTimeout(() => {
        playMusic('combat_bed_bossly');
      }, 2800);
      return () => {
        clearTimeout(introTimer);
        stopMusic();
      };
    }

    if (!bedChoiceRef.current) {
      bedChoiceRef.current =
        Math.random() < 0.5 ? 'combat_bed' : 'combat_bed_tense';
    }
    playMusic(bedChoiceRef.current);
    return () => {
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, scene]);

  // Victory / death sting on combat resolution.
  useEffect(() => {
    if (state.status === 'player-victory') {
      playSfx('victory_sting');
    } else if (state.status === 'player-defeat') {
      playSfx('death_sting');
    }
  }, [state.status]);

  // Monster turns auto-advance with timing that respects speed multiplier
  useEffect(() => {
    if (state.status !== 'active') return;
    if (isPlayerTurn(state)) return;
    const currentId = state.initiativeOrder[state.currentTurnIndex];

    const attackTimer = setTimeout(() => {
      const roller = getActiveRoller();
      const result = monsterAttack({ roller, character, state }, currentId);
      setCharacter(result.character);
      setCombat(result.state);
    }, 700 / speed);

    const advanceTimer = setTimeout(() => {
      const latest = useGameStore.getState().combat;
      if (!latest || latest.status !== 'active') return;
      const result = endTurn(latest, character);
      setCharacter(result.character);
      setCombat(result.state);
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
      (character.resources.secondWindAvailable === true ||
        (character.resources.secondWindBonusRemaining ?? 0) > 0) &&
      !character.actionEconomy.bonusActionUsed &&
      character.hp.current < character.hp.max;
    const hasUsableActionSurge =
      character.classId === 'fighter' &&
      (character.resources.actionSurgeRemaining ?? 0) > 0;
    const hasUsableCunningAction =
      character.classId === 'rogue' &&
      (character.resources.cunningActionUsesRemaining ?? 0) > 0 &&
      !character.actionEconomy.bonusActionUsed;
    if (hasUsableBonus || hasUsableActionSurge || hasUsableCunningAction) return;
    // Don't auto-end mid-spell-pick — the player may have a cantrip queued
    // even after a slot-spell. The Spells modal flow short-circuits this.
    if (pickingSpell || castingSpellId) return;

    setAutoEndNotice(true);
    const t = setTimeout(() => {
      setAutoEndNotice(false);
      const latest = useGameStore.getState().combat;
      if (!latest) return;
      const result = endTurn(latest, character);
      setCharacter(result.character);
      setCombat(result.state);
    }, autoEndTurnDelayMs / speed);

    return () => {
      clearTimeout(t);
      setAutoEndNotice(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character.actionEconomy.actionUsed,
    character.actionEconomy.bonusActionUsed,
    character.resources.secondWindAvailable,
    character.resources.secondWindBonusRemaining,
    character.resources.actionSurgeRemaining,
    character.resources.cunningActionUsesRemaining,
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
    // If we're mid-spell selection, route to spell cast instead.
    if (castingSpellId) {
      doCastSpell(castingSpellId, targetId);
      return;
    }
    const roller = getActiveRoller();
    const equippedWeaponId = character.equipped.mainHand?.itemId;
    if (!equippedWeaponId) return;
    const result = playerAttack(
      { roller, character, state },
      targetId,
      equippedWeaponId,
    );
    setSelectingTarget(false);
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleSpellPicked(spellId: string) {
    const spell = getSpell(spellId);
    setPickingSpell(false);
    const aliveMonsters = state.combatants.filter(
      (c) => c.kind === 'monster' && c.instance.hp.current > 0,
    );
    if (spell.target === 'single' && aliveMonsters.length > 1) {
      // Need a target pick.
      setCastingSpellId(spellId);
      setSelectingTarget(true);
      return;
    }
    const targetId =
      spell.target !== 'self' && aliveMonsters[0]
        ? aliveMonsters[0].id
        : undefined;
    doCastSpell(spellId, targetId);
  }

  function doCastSpell(spellId: string, targetId?: string) {
    const roller = getActiveRoller();
    const result = castSpell({ roller, character, state, spellId, targetId });
    setCastingSpellId(null);
    setSelectingTarget(false);
    setCharacter(result.character);
    if (result.cast) setCombat(result.state);
  }

  function handleEndTurn() {
    const result = endTurn(state, character);
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleSecondWind() {
    const roller = getActiveRoller();
    const result = useSecondWind({ roller, character, state });
    playSfx('heal_chime');
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleActionSurge() {
    const result = useActionSurge({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleCunningAction(choice: CunningActionChoice) {
    const result = useCunningAction({ character, state, choice });
    setPickingCunning(false);
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleUseItem(inventoryIndex: number) {
    const roller = getActiveRoller();
    const result = useConsumable({ roller, character, state }, inventoryIndex);
    playSfx('heal_chime');
    setPickingItem(false);
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleContinue() {
    onCombatResolved(state.status === 'player-victory' ? 'victory' : 'defeat');
  }

  const isResolved = state.status !== 'active';

  return (
    <div
      className={`min-h-screen flex flex-col gap-3 mx-auto p-4 md:p-6 relative animate-room-enter ${shake ? 'animate-shake' : ''}`}
      style={{ width: '1000px', maxWidth: '100%' }}
    >
      {/* Screen flash for crits */}
      {screenFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-30 animate-screen-flash"
          style={{
            backgroundColor:
              screenFlash === 'player-crit'
                ? 'rgba(244, 167, 66, 0.65)'
                : 'rgba(200, 51, 46, 0.75)',
          }}
        />
      )}
      <header className="flex justify-between items-baseline pb-3 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-lg md:text-xl text-[var(--color-accent-amber)] tracking-[0.1em]"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.85), 0 0 14px rgba(244,167,66,0.3)' }}
          >
            {roomTitle ?? 'Encounter'}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.25em] mt-1">
            {roomLabel ?? `Round ${state.round}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            className={`btn-chunky px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors
              ${speed === 2
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'}
            `}
            title={speed === 2 ? 'Slow down' : 'Speed up'}
          >
            {speed === 2 ? '▶▶ 2×' : '▶ 1×'}
          </button>
          {onAbandon && (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              className="btn-chunky px-3 py-1.5 border-2 bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-deep-blood)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest font-bold transition-colors"
            >
              ⚑ Abandon
            </button>
          )}
        </div>
      </header>

      <InitiativeTracker state={state} character={character} />

      <div
        className="flex gap-3 items-stretch shrink-0"
        style={{ height: '420px' }}
      >
        <div style={{ width: '824px', flexShrink: 0 }}>
          <Battlefield
            character={character}
            state={state}
            scene={scene}
            decoration={decoration}
            selectingTarget={selectingTarget}
            onSelectTarget={(id) => doAttack(id)}
          />
        </div>

        <aside
          className="relative bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-dim)] flex flex-col items-center justify-center p-1.5"
          style={{ width: '140px', flexShrink: 0, height: '420px' }}
        >
          {overlayActive && state.lastAttack ? (
            <DiceRollOverlay
              key={state.lastAttack.id}
              attackerName={state.lastAttack.attackerName}
              targetName={state.lastAttack.targetName}
              attackerKind={state.lastAttack.attackerKind}
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
        <div className="flex flex-col items-center gap-5 mt-2 animate-pop-in">
          <div
            className={`font-display text-3xl md:text-4xl uppercase tracking-[0.4em] ${
              state.status === 'player-victory'
                ? 'text-[var(--color-accent-amber)]'
                : 'text-[var(--color-accent-blood)]'
            }`}
            style={{
              textShadow:
                state.status === 'player-victory'
                  ? '0 0 24px rgba(244,167,66,0.6), 4px 4px 0 rgba(0,0,0,0.9)'
                  : '0 0 24px rgba(200,51,46,0.6), 4px 4px 0 rgba(0,0,0,0.9)',
            }}
          >
            {state.status === 'player-victory' ? '◆ Victory ◆' : '✗ You have fallen ✗'}
          </div>
          <Button variant="primary" size="lg" onClick={handleContinue}>
            {state.status === 'player-victory' ? '▸ Continue Deeper' : '↻ Wake at the Grove'}
          </Button>
        </div>
      ) : (
        <>
          {selectingTarget && (
            <div className="text-center text-[var(--color-accent-amber)] text-xs uppercase tracking-widest animate-pulse">
              ► Select a target
            </div>
          )}
          {character.conditions.some((c) => c.name === 'paralyzed') && (
            <div className="text-center text-[var(--color-accent-blood)] text-xs uppercase tracking-[0.3em] font-bold animate-pulse">
              ✦ Paralyzed — attacks against you have advantage
            </div>
          )}
          {autoEndNotice && (
            <div className="text-center text-[var(--color-text-secondary)] text-xs uppercase tracking-widest italic">
              Ending turn — no actions remain.
            </div>
          )}
          <CombatHUD character={character} state={state} />
          <ActionBar
            character={character}
            state={state}
            onAttack={handleAttackClick}
            onSecondWind={handleSecondWind}
            onActionSurge={handleActionSurge}
            onCunningAction={() => setPickingCunning(true)}
            onSpells={() => setPickingSpell(true)}
            onUseItem={() => setPickingItem(true)}
            onEndTurn={handleEndTurn}
          />
        </>
      )}

      <CombatLog entries={state.log} />

      {pickingItem && (
        <ItemPicker
          character={character}
          onPick={handleUseItem}
          onCancel={() => setPickingItem(false)}
        />
      )}

      {pickingCunning && (
        <CunningActionPicker
          onPick={handleCunningAction}
          onCancel={() => setPickingCunning(false)}
        />
      )}

      {pickingSpell && (
        <SpellPicker
          character={character}
          onPick={handleSpellPicked}
          onCancel={() => setPickingSpell(false)}
        />
      )}

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
