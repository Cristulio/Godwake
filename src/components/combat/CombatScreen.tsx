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
  useMartialOffense,
  useMartialDefense,
  useMartialDisrupt,
  useCunningAction,
  type CunningActionChoice,
  useRage,
  useHuntersMark,
  useFlurryOfBlows,
  usePatientDefense,
  useStunningStrike,
  useWildShape,
  hasRemainingTurnPlay,
  martialArtsWeaponId,
  monkFightsUnarmed,
  useConsumable,
  castSpell,
  chooseCombatAction,
  applyPlannedAction,
} from '../../engine/combat';
import { buildPostmortem } from '../../engine/combat/postmortem';
import { DRAGON_CLAW_WEAPON_ID, isDragonForm } from '../../engine/combat/shapeChange';
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
import {
  playMusic,
  stopMusic,
  playSfx,
  pickCombatMusic,
  type MusicId,
} from '../../engine/audio';
import { useBlockingModalOpen } from '../ui/useInputBlock';
import { CombatCoach, combatIntroEligible, type CoachStep } from './CombatCoach';
import { useMetaStore } from '../../stores/metaStore';
import { COMBAT_INTRO_TUTORIAL_ID } from '../../content/tutorials';
import { useT } from '../../i18n/useT';

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
  const { t } = useT();
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const speed = useSettingsStore((s) => s.speedMultiplier);
  const setSpeed = useSettingsStore((s) => s.setSpeed);
  const autoEndTurnDelayMs = useSettingsStore((s) => s.autoEndTurnDelayMs);
  const autoBattle = useSettingsStore((s) => s.autoBattle);
  const setAutoBattle = useSettingsStore((s) => s.setAutoBattle);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  // A blocking reveal/notice (IrenicusTaunt, UnlockTutorialCard, etc.) is up —
  // freeze every auto-advance timer behind it so the fight doesn't auto-play.
  const blockingModalOpen = useBlockingModalOpen();
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

  // First-combat coach: a one-time spotlight onboarding for a brand-new soul's
  // very first fight (see CombatCoach). Eligibility is locked in on mount — the
  // overlay writes the seen-flag on dismiss, which would otherwise flip the gate
  // mid-fight. 'done' = inactive/finished; the overlay never renders then.
  const [coachActive] = useState(() =>
    combatIntroEligible({
      hasReincarnated: useMetaStore.getState().hasReincarnated,
      seenTutorials: useMetaStore.getState().seenTutorials,
      classId: character.classId,
      scene,
    }),
  );
  const [coachStep, setCoachStep] = useState<CoachStep | 'done'>('attack');
  // The Wizard opens its first lesson on SPELLS (cast Burning Hands), not Attack —
  // a single focused step that completes the moment it acts. Every other class
  // keeps the Attack → target → abilities flow.
  const castFirst = character.classId === 'wizard';
  function finishCoach() {
    setCoachStep('done');
    useMetaStore.getState().markTutorialSeen(COMBAT_INTRO_TUTORIAL_ID);
  }

  // The coach teaches the core loop ONCE per soul. Write the seen-flag the
  // moment it's active for this first fight — NOT only on explicit Skip/Dismiss
  // (finishCoach). A player who just plays the fight through (taps Attack, wins)
  // without dismissing would otherwise never set it, so the coach re-appeared on
  // every later fight. coachActive is frozen by the useState initializer above,
  // so marking seen here does not drop THIS fight's coach; later fights read the
  // now-set flag and stay ineligible.
  useEffect(() => {
    if (coachActive) {
      useMetaStore.getState().markTutorialSeen(COMBAT_INTRO_TUTORIAL_ID);
    }
  }, [coachActive]);

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

  // Combat music: the theme is picked from the lead foe's id so different
  // creatures feel different, never repeating the previous fight's track, and
  // is locked in for the rest of the fight. Boss rooms draw from the boss pool
  // after a 3s intro sting.
  useEffect(() => {
    if (state.status !== 'active') {
      stopMusic();
      return () => {
        stopMusic();
      };
    }

    if (!bedChoiceRef.current) {
      const lead = state.combatants.find((c) => c.kind === 'monster');
      const signal = lead?.instance.defId ?? roomTitle ?? 'combat';
      bedChoiceRef.current = pickCombatMusic(signal, { boss: scene === 'boss' });
    }
    const theme = bedChoiceRef.current;

    if (scene === 'boss') {
      playSfx('boss_intro');
      const introTimer = setTimeout(() => {
        playMusic(theme);
      }, 2800);
      return () => {
        clearTimeout(introTimer);
        stopMusic();
      };
    }

    playMusic(theme);
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
    if (blockingModalOpen) return;
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
  }, [state.currentTurnIndex, state.status, blockingModalOpen]);

  // Auto-end the player's turn when their action and any usable bonus are spent.
  // Disabled while Auto-Battle drives the turn — that loop ends the turn itself.
  // Pulled out of the dep array below (a plain value the exhaustive-deps check
  // can track): 2nd-level slots gate the druid's bonus-action Entangle hold.
  const secondLevelSlots = character.resources.spellSlots?.[2];
  useEffect(() => {
    if (autoBattle) return;
    if (state.status !== 'active') return;
    if (!isPlayerTurn(state)) return;
    if (overlayActive) return;
    if (blockingModalOpen) return;
    // Still something to spend — an unused action, or a class bonus/resource
    // worth holding for (Second Wind, Action Surge, Cunning Action, Rage,
    // Hunter's Mark, a Monk's queued Flurry / usable Ki)? Hold the turn. Every
    // class's hold lives in this one predicate.
    if (hasRemainingTurnPlay(character, state)) return;
    // Don't auto-end mid-spell-pick — the player may have a cantrip queued
    // even after a slot-spell. The Spells modal flow short-circuits this.
    if (pickingSpell || castingSpellId) return;
    // The first-combat coach's informational 'abilities' step must NOT strand a
    // player who has nothing left to do — e.g. a mage that has spent its one
    // action. Finish the coach (marks it seen, clears the step) so it stops
    // holding the turn, then let the next pass auto-end rather than waiting on a
    // manual "Got it". (The coach only reaches this point on 'abilities' — an
    // unused action returns above via hasRemainingTurnPlay.)
    if (coachActive && coachStep === 'abilities') {
      finishCoach();
      return;
    }

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
    character.resources.kiPointsRemaining,
    // 2nd-level slots gate the druid's bonus-action Entangle hold below; re-run
    // when one is spent so the turn auto-ends once Roots is no longer castable.
    secondLevelSlots,
    character.flurryStrikesRemaining,
    character.hp.current,
    state.currentTurnIndex,
    overlayActive,
    blockingModalOpen,
    autoBattle,
    // Re-run when the spell flow opens/closes so the mid-spell-pick guard above
    // actually cancels a pending auto-end instead of letting it fire under the
    // open picker.
    pickingSpell,
    castingSpellId,
    // Re-run when the coach reaches/leaves its informational step so the hold
    // above engages and releases.
    coachActive,
    coachStep,
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
    if (blockingModalOpen) return;
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
    blockingModalOpen,
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
    // Ranger with a live mark: lock to the quarry — no target-picker.
    if (character.classId === 'ranger' && state.huntersMarkTargetId != null) {
      const quarryAlive = aliveMonsters.some((c) => c.id === state.huntersMarkTargetId);
      if (quarryAlive) {
        doAttack(state.huntersMarkTargetId);
        return;
      }
    }
    if (aliveMonsters.length === 1) {
      doAttack(aliveMonsters[0].id);
    } else {
      // Coach: tapping Attack with multiple foes opens target-selection. (The
      // Wizard's lesson is to CAST, not swing — its coach doesn't ride this path.)
      if (coachActive && coachStep === 'attack' && !castFirst) setCoachStep('target');
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
    // A monk fighting unarmed-style (bare hands or a monk weapon) strikes with
    // its level-scaled Martial Arts die; a monk who took up an ordinary weapon
    // swings that weapon plainly, kit dark.
    const weaponId = isDragonForm(character)
      ? DRAGON_CLAW_WEAPON_ID
      : character.classId === 'monk' && monkFightsUnarmed(character)
        ? martialArtsWeaponId(character)
        : character.equipped.mainHand?.itemId;
    if (!weaponId) return;
    const result = playerAttack(
      { roller, character, state },
      targetId,
      weaponId,
    );
    setSelectingTarget(false);
    setCharacter(result.character);
    setCombat(result.state);
    // Coach: the swing has landed — point the player at their class actions. The
    // Wizard's lesson was to cast, so a weapon swing instead just completes it.
    if (coachActive && (coachStep === 'attack' || coachStep === 'target')) {
      if (castFirst) finishCoach();
      else setCoachStep('abilities');
    }
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
    // Coach: the Wizard's first lesson is to cast — once a spell lands, it's done.
    if (result.cast && coachActive && castFirst && coachStep === 'attack') finishCoach();
  }

  // Druid Wild Shape: a one-tap bonus-action shift into the beast form (temp-HP
  // cushion + claws) straight from the ActionBar. Self-targeted, so it clears any
  // in-progress target pick like the other self actions.
  function handleWildShape() {
    cancelTargeting();
    const result = useWildShape({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
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

  function handleMartialOffense() {
    cancelTargeting();
    const result = useMartialOffense({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleMartialDefense() {
    cancelTargeting();
    const result = useMartialDefense({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleRage() {
    cancelTargeting();
    const result = useRage({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleMartialDisrupt() {
    cancelTargeting();
    const result = useMartialDisrupt({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleFlurry() {
    cancelTargeting();
    const result = useFlurryOfBlows({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handlePatientDefense() {
    cancelTargeting();
    const result = usePatientDefense({ character, state });
    setCharacter(result.character);
    setCombat(result.state);
  }

  function handleStunningStrike() {
    cancelTargeting();
    const result = useStunningStrike({ character, state });
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

  function handleToggleShieldAutoFire() {
    const current = character.resources.shieldAutoFire !== false;
    setCharacter({ ...character, resources: { ...character.resources, shieldAutoFire: !current } });
  }

  function handleContinue() {
    onCombatResolved(state.status === 'player-victory' ? 'victory' : 'defeat');
  }

  const isResolved = state.status !== 'active';
  // The dice readout is a fixed side panel on desktop. On a phone an idle
  // "awaiting roll" panel is dead space and a per-attack one shifts the layout,
  // so below `lg` it only appears — as a compact overlay pinned to the
  // battlefield's top-right — while a roll is actually resolving.
  const diceRolling = overlayActive && state.lastAttack != null;

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
            {roomTitle ?? t('combat.screen.encounter')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.25em] mt-1">
            {roomLabel ?? t('combat.screen.round', { n: state.round })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
            className={`btn-chunky px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors
              ${speed > 1
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'}
            `}
            title={speed === 4 ? t('combat.screen.slowDown') : t('combat.screen.speedUp')}
          >
            {speed === 4 ? '▶▶▶ 4×' : speed === 2 ? '▶▶ 2×' : '▶ 1×'}
          </button>
          <button
            type="button"
            onClick={() => setAutoBattle(!autoBattle)}
            className={`btn-chunky px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors
              ${autoBattle
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'}
            `}
            title={autoBattle ? t('combat.screen.autoOn') : t('combat.screen.autoOff')}
          >
            ⚙ {t('combat.screen.auto')}
          </button>
          {onAbandon && (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              className="btn-chunky px-3 py-1.5 border-2 bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-deep-blood)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest font-bold transition-colors"
            >
              ⚑ {t('combat.screen.abandon')}
            </button>
          )}
        </div>
      </header>

      <TurnOrderTracker state={state} character={character} />

      <div className="relative flex flex-col lg:flex-row gap-3 lg:items-stretch shrink-0">
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
          className={`bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-dim)] flex-col items-center justify-center p-1.5 absolute top-1 right-1 w-32 z-20 pointer-events-none lg:relative lg:top-auto lg:right-auto lg:w-[140px] lg:shrink-0 lg:h-[420px] lg:min-h-[72px] lg:z-auto lg:pointer-events-auto ${
            diceRolling ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {diceRolling && state.lastAttack ? (
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
              {t('combat.screen.dicePool')}
              <div className="opacity-50 mt-1">{t('combat.screen.awaitingRoll')}</div>
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
            {state.status === 'player-victory' ? t('combat.screen.victory') : t('combat.screen.fallen')}
          </div>
          <Button variant="primary" size="lg" onClick={handleContinue}>
            {state.status === 'player-victory' ? t('combat.screen.continueDeeper') : t('combat.screen.wakeAtGrove')}
          </Button>
        </div>
      ) : (
        <>
          {selectingTarget && (
            <div className="text-center text-[var(--color-accent-amber)] text-xs uppercase tracking-widest animate-pulse">
              {markingTarget ? t('combat.screen.selectQuarry') : t('combat.screen.selectTarget')}
            </div>
          )}
          {character.conditions.some((c) => c.name === 'paralyzed') && (
            <div className="text-center text-[var(--color-accent-blood)] text-xs uppercase tracking-[0.3em] font-bold animate-pulse">
              {t('combat.screen.paralyzedBanner')}
            </div>
          )}
          {autoEndNotice && (
            <div className="text-center text-[var(--color-text-secondary)] text-xs uppercase tracking-widest italic">
              {t('combat.screen.autoEndNotice')}
            </div>
          )}
          <CombatHUD
            character={character}
            state={state}
            onToggleShieldAutoFire={handleToggleShieldAutoFire}
          />
          <ActionBar
            character={character}
            state={state}
            onAttack={handleAttackClick}
            onSecondWind={handleSecondWind}
            onActionSurge={handleActionSurge}
            onMartialOffense={handleMartialOffense}
            onMartialDefense={handleMartialDefense}
            onMartialDisrupt={handleMartialDisrupt}
            onCunningAction={() => setPickingCunning(true)}
            onRage={handleRage}
            onFlurry={handleFlurry}
            onPatientDefense={handlePatientDefense}
            onStunningStrike={handleStunningStrike}
            onHuntersMark={handleHuntersMarkClick}
            onWildShape={handleWildShape}
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
              {t('combat.screen.abandonTitle')}
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              {t('combat.screen.abandonBody')}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>
                {t('combat.screen.stay')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmAbandon(false);
                  onAbandon?.();
                }}
              >
                {t('combat.screen.abandonConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* First-combat coach (one-time, brand-new soul). The attack step waits
          for the player's turn so it never spotlights a disabled control while
          the enemy is acting. Held behind any blocking dialogue (lore beat /
          taunt) so the coach never co-renders with one — the real sequencing
          (DelveScreen holds the fight behind a dialogue) means combat usually
          isn't even built yet, but this is the backstop. */}
      {coachActive &&
        coachStep !== 'done' &&
        !isResolved &&
        !blockingModalOpen &&
        !pickingSpell &&
        (coachStep !== 'attack' || isPlayerTurn(state)) && (
          <CombatCoach
            step={coachStep}
            castFirst={castFirst}
            onSkip={finishCoach}
            onDismiss={finishCoach}
          />
        )}
    </div>
  );
}
