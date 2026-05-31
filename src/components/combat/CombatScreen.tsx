import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  useRage,
  useRecklessAttack,
  useHuntersMark,
  useConsumable,
  castSpell,
  chooseCombatAction,
  applyPlannedAction,
} from '../../engine/combat';
import { buildPostmortem } from '../../engine/combat/postmortem';
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
import { TurnOrderTracker } from './TurnOrderTracker';
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

const BATTLEFIELD_W = 824;
const BATTLEFIELD_H = 420;

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
  const autoBattle = useSettingsStore((s) => s.autoBattle);
  const setAutoBattle = useSettingsStore((s) => s.setAutoBattle);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [shake, setShake] = useState<'hard' | 'soft' | null>(null);
  const [screenFlash, setScreenFlash] = useState<'player-crit' | 'enemy-crit' | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [autoEndNotice, setAutoEndNotice] = useState(false);
  const [pickingItem, setPickingItem] = useState(false);
  const [pickingCunning, setPickingCunning] = useState(false);
  const [markingTarget, setMarkingTarget] = useState(false);
  const [pickingSpell, setPickingSpell] = useState(false);
  const [castingSpellId, setCastingSpellId] = useState<string | null>(null);
  const bedChoiceRef = useRef<MusicId | null>(null);

  // The battlefield is an absolutely-positioned, fixed-geometry stage
  // (BATTLEFIELD_W × BATTLEFIELD_H). On desktop its column is pinned to the
  // natural width so it renders 1:1; on a phone the column is full-width, so we
  // scale the whole stage down to fit instead of clipping the right-side
  // enemies (which would make them untappable under body{overflow-x:hidden}).
  const stageRef = useRef<HTMLDivElement>(null);
  const [bfScale, setBfScale] = useState(1);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const avail = el.clientWidth;
      if (avail > 0) setBfScale(Math.min(1, avail / BATTLEFIELD_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mount dice overlay whenever a new attack event arrives
  useEffect(() => {
    if (!state.lastAttack) return;
    setOverlayActive(true);
    const attack = state.lastAttack;
    // Crits shake hard + flash the screen; a plain-but-heavy blow gets a softer
    // shake so big damage still lands with weight.
    const heavyHit = (attack.damageDealt ?? 0) >= 12;
    if (attack.crit) {
      setShake('hard');
      const flashKind: 'player-crit' | 'enemy-crit' =
        attack.attackerKind === 'player' ? 'player-crit' : 'enemy-crit';
      setScreenFlash(flashKind);
      const tShake = setTimeout(() => setShake(null), 460);
      const tFlash = setTimeout(() => setScreenFlash(null), 220);
      return () => {
        clearTimeout(tShake);
        clearTimeout(tFlash);
      };
    }
    if (heavyHit) {
      setShake('soft');
      const tShake = setTimeout(() => setShake(null), 300);
      return () => clearTimeout(tShake);
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
      // Snapshot the moment of death for the postmortem screen. Has to run
      // BEFORE the DelveScreen tears combat down via failDelve(); doing it
      // here in CombatScreen guarantees lastAttack/lastSave are still live.
      const delve = useGameStore.getState().delve;
      const snapshot = buildPostmortem(state, character, delve);
      useGameStore.getState().setPostmortem(snapshot);
      if (snapshot.killerDefId) {
        useGameStore
          .getState()
          .recordPlayerKilledBy(snapshot.killerDefId, snapshot.attackName);
      }
    }
  }, [state.status]);

  // Monster turns auto-advance with timing that respects speed multiplier
  useEffect(() => {
    if (state.status !== 'active') return;
    if (isPlayerTurn(state)) return;
    const currentId = state.turnOrder[state.currentTurnIndex];

    const attackTimer = setTimeout(() => {
      const roller = getActiveRoller();
      // Read latest character from the store — the closure-captured `character`
      // is from when the effect last fired (currentTurnIndex change), which is
      // stale if anything updated character between effect-fire and this timer.
      const latestChar = useGameStore.getState().character;
      const latestState = useGameStore.getState().combat;
      if (!latestChar || !latestState) return;
      const result = monsterAttack({ roller, character: latestChar, state: latestState }, currentId);
      setCharacter(result.character);
      setCombat(result.state);
    }, 700 / speed);

    const advanceTimer = setTimeout(() => {
      const latest = useGameStore.getState().combat;
      if (!latest || latest.status !== 'active') return;
      // Same stale-closure trap as attackTimer — the attack we just fired
      // updated character.hp, so we must read fresh here or we'll overwrite
      // the damaged character with the pre-damage closure copy.
      const latestChar = useGameStore.getState().character;
      if (!latestChar) return;
      const result = endTurn(latest, latestChar);
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
  // Disabled while Auto-Battle drives the turn — that loop ends the turn itself.
  useEffect(() => {
    if (autoBattle) return;
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
    const hasUsableRage =
      character.classId === 'barbarian' &&
      (character.resources.rageRoundsRemaining ?? 0) <= 0 &&
      !character.actionEconomy.bonusActionUsed;
    // Worth waiting on only if the mark isn't already riding a live quarry —
    // otherwise re-marking is pointless and the turn should auto-end.
    const markOnLiveTarget =
      state.huntersMarkTargetId != null &&
      state.combatants.some(
        (c) =>
          c.kind === 'monster' &&
          c.id === state.huntersMarkTargetId &&
          c.instance.hp.current > 0,
      );
    const hasUsableHuntersMark =
      character.classId === 'ranger' &&
      !character.actionEconomy.bonusActionUsed &&
      !markOnLiveTarget;
    if (
      hasUsableBonus ||
      hasUsableActionSurge ||
      hasUsableCunningAction ||
      hasUsableRage ||
      hasUsableHuntersMark
    )
      return;
    // Don't auto-end mid-spell-pick — the player may have a cantrip queued
    // even after a slot-spell. The Spells modal flow short-circuits this.
    if (pickingSpell || castingSpellId) return;

    setAutoEndNotice(true);
    const t = setTimeout(() => {
      setAutoEndNotice(false);
      const latest = useGameStore.getState().combat;
      if (!latest) return;
      const latestChar = useGameStore.getState().character;
      if (!latestChar) return;
      const result = endTurn(latest, latestChar);
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
    character.resources.rageRoundsRemaining,
    character.hp.current,
    state.currentTurnIndex,
    overlayActive,
    autoBattle,
  ]);

  // Auto-Battle: when on, the shared action policy plays the player's turn one
  // timed step at a time (paced by the speed multiplier so 2× + AUTO fast-
  // forwards). The player can toggle it off any turn to resume manual control.
  // Reads fresh state/character from the store inside the timer so it never
  // dispatches against a stale closure, and bails on any open picker/overlay
  // so manual flows aren't interrupted.
  useEffect(() => {
    if (!autoBattle) return;
    if (state.status !== 'active') return;
    if (!isPlayerTurn(state)) return;
    if (overlayActive) return;
    if (
      selectingTarget ||
      markingTarget ||
      pickingItem ||
      pickingCunning ||
      pickingSpell ||
      castingSpellId ||
      confirmAbandon
    ) {
      return;
    }

    const stepDelay = 600 / speed;
    const t = setTimeout(() => {
      if (!useSettingsStore.getState().autoBattle) return;
      const latestState = useGameStore.getState().combat;
      const latestChar = useGameStore.getState().character;
      if (!latestState || !latestChar) return;
      if (latestState.status !== 'active' || !isPlayerTurn(latestState)) return;

      const action = chooseCombatAction(latestState, latestChar);
      if (action.kind === 'end-turn') {
        const r = endTurn(latestState, latestChar);
        setCharacter(r.character);
        setCombat(r.state);
        return;
      }
      const roller = getActiveRoller();
      const r = applyPlannedAction(
        { roller, state: latestState, character: latestChar },
        action,
      );
      // Engine refused the action (no-op) — end the turn rather than stall.
      if (r.state === latestState && r.character === latestChar) {
        const e = endTurn(latestState, latestChar);
        setCharacter(e.character);
        setCombat(e.state);
        return;
      }
      if (action.kind === 'item' || action.kind === 'second-wind') {
        playSfx('heal_chime');
      }
      setCharacter(r.character);
      setCombat(r.state);
    }, stepDelay);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoBattle,
    state,
    character,
    overlayActive,
    selectingTarget,
    markingTarget,
    pickingItem,
    pickingCunning,
    pickingSpell,
    castingSpellId,
    confirmAbandon,
    speed,
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
    // If we're picking a Hunter's Mark target, brand instead of swing.
    if (markingTarget) {
      doHuntersMark(targetId);
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

  // Self-only actions (Rage, Second Wind, etc.) resolve on the caster, so they
  // must clear any in-progress target pick. Activating one while the "Select a
  // target" prompt is up would otherwise leave the battlefield stuck in
  // targeting mode.
  function cancelTargeting() {
    setSelectingTarget(false);
    setMarkingTarget(false);
    setCastingSpellId(null);
  }

  function handleSecondWind() {
    cancelTargeting();
    const roller = getActiveRoller();
    const result = useSecondWind({ roller, character, state });
    playSfx('heal_chime');
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleActionSurge() {
    cancelTargeting();
    const result = useActionSurge({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleCunningAction(choice: CunningActionChoice) {
    cancelTargeting();
    const result = useCunningAction({ character, state, choice });
    setPickingCunning(false);
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleRage() {
    cancelTargeting();
    const result = useRage({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleRecklessAttack() {
    cancelTargeting();
    const result = useRecklessAttack({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleHuntersMarkClick() {
    const aliveMonsters = state.combatants.filter(
      (c) => c.kind === 'monster' && c.instance.hp.current > 0,
    );
    if (aliveMonsters.length === 0) return;
    if (aliveMonsters.length === 1) {
      doHuntersMark(aliveMonsters[0].id);
    } else {
      setMarkingTarget(true);
      setSelectingTarget(true);
    }
  }

  function doHuntersMark(targetId: string) {
    const result = useHuntersMark({ character, state, targetId });
    setMarkingTarget(false);
    setSelectingTarget(false);
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
      className={`min-h-screen flex flex-col gap-3 mx-auto p-4 md:p-6 relative animate-room-enter ${shake === 'hard' ? 'animate-shake' : shake === 'soft' ? 'animate-shake-soft' : ''}`}
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
      <header className="flex flex-wrap gap-2 justify-between items-baseline pb-3 border-b border-[var(--color-border-warm)]">
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
          <button
            type="button"
            onClick={() => setAutoBattle(!autoBattle)}
            className={`btn-chunky px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors
              ${autoBattle
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'}
            `}
            title={autoBattle ? 'Turn off Auto-Battle' : 'Auto-Battle: let the tactics engine play your turns'}
          >
            ⚙ AUTO
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

      <TurnOrderTracker state={state} character={character} />

      <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch shrink-0">
        <div
          ref={stageRef}
          className="w-full lg:w-[824px] lg:shrink-0 overflow-hidden"
          style={{ height: BATTLEFIELD_H * bfScale }}
        >
          <div
            style={{
              width: BATTLEFIELD_W,
              height: BATTLEFIELD_H,
              transform: `scale(${bfScale})`,
              transformOrigin: 'top left',
            }}
          >
            <Battlefield
              character={character}
              state={state}
              scene={scene}
              decoration={decoration}
              selectingTarget={selectingTarget}
              onSelectTarget={(id) => doAttack(id)}
            />
          </div>
        </div>

        <aside
          className="relative bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-dim)] flex flex-col items-center justify-center p-1.5 w-full min-h-[72px] lg:w-[140px] lg:shrink-0 lg:h-[420px]"
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
              {markingTarget ? '► Select a quarry to mark' : '► Select a target'}
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
            onRage={handleRage}
            onRecklessAttack={handleRecklessAttack}
            onHuntersMark={handleHuntersMarkClick}
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
