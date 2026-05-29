import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getActiveRoller } from '../../engine/dice';
import { getEvent } from '../../content/events';
import { EventMotif } from './EventMotif';
import {
  applyEventOutcome,
  canTakeChoice,
  resolveChoiceOutcome,
  rollChoiceCheck,
  type AppliedEffect,
  type EventOutcomeResult,
} from '../../engine/delve';
import type { Character } from '../../types/character';
import { playSfx } from '../../engine/audio';
import type { EventChoice } from '../../schemas/event';

interface EventRoomProps {
  room: RoomSpec;
  onContinue: () => void;
  /** Called when an outcome demands a combat encounter (spawn_ambush). */
  onAmbush: (monsterDefIds: string[]) => void;
}

interface ResolvedTurn {
  choiceLabel: string;
  result: EventOutcomeResult;
}

export function EventRoom({ room, onContinue, onAmbush }: EventRoomProps) {
  const character = useGameStore((s) => s.character);
  const setCharacter = useGameStore((s) => s.setCharacter);

  const template = useMemo(() => {
    if (!room.eventTemplateId) return null;
    try {
      return getEvent(room.eventTemplateId);
    } catch {
      return null;
    }
  }, [room.eventTemplateId]);

  const [resolved, setResolved] = useState<ResolvedTurn | null>(null);

  if (!character) return null;

  if (!template) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-4 animate-fade-in">
        <Panel>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Nothing of note here. The corridor goes on.
          </p>
        </Panel>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onContinue}>
            Continue Deeper →
          </Button>
        </div>
      </div>
    );
  }

  function handlePick(choice: EventChoice) {
    if (!character) return;
    const roller = getActiveRoller();
    const checked = rollChoiceCheck(choice, roller);
    const outcome = resolveChoiceOutcome(checked.outcome, roller);
    const result = applyEventOutcome(character, outcome, roller);
    setCharacter(result.character);
    setResolved({ choiceLabel: choice.label, result });
    playSfx('ui_click');
  }

  function handleContinue() {
    if (!resolved) {
      onContinue();
      return;
    }
    if (resolved.result.ambush) {
      onAmbush(resolved.result.ambush.monsterDefIds);
      return;
    }
    onContinue();
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(212,176,98,0.07),transparent_55%)]">
      <EventMotif type={template.eventType} />
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            {template.title.toUpperCase()}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Event · The road pauses
          </p>
        </div>
        <div data-testid="gold-balance" className="shrink-0 text-right">
          <div className="text-[var(--color-accent-gold)] text-lg font-bold tracking-wider">
            {character.goldInPocket}g
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
            in pocket
          </div>
        </div>
      </header>

      <Panel tone="warm" className="bg-gradient-to-br from-[#2d2418] to-[#221a14]">
        <p className="text-[var(--color-text-primary)] text-base italic leading-7">
          {template.flavor}
        </p>
      </Panel>

      {!resolved ? (
        <>
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.3em] text-center">
            ► Choose your road
          </div>
          <div className="flex flex-col gap-3">
            {template.choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                character={character}
                onPick={() => handlePick(choice)}
              />
            ))}
          </div>
        </>
      ) : (
        <ResolutionPanel
          choiceLabel={resolved.choiceLabel}
          result={resolved.result}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}

interface ChoiceButtonProps {
  choice: EventChoice;
  character: Character;
  onPick: () => void;
}

function ChoiceButton({ choice, character, onPick }: ChoiceButtonProps) {
  const availability = canTakeChoice(character, choice);
  const disabled = !availability.ok;
  const disabledReason = !availability.ok ? availability.reason : null;
  const chaTag =
    choice.requiresCha !== undefined
      ? `CHA +${choice.requiresCha}`
      : null;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={`
        text-left p-4 border-2 transition-all
        ${disabled
          ? 'border-[var(--color-border-dim)] bg-[var(--color-bg-panel)]/40 cursor-not-allowed opacity-60'
          : 'panel-etched-warm border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)] cursor-pointer'}
      `}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold">
          {choice.label}
        </div>
        <div className="flex items-baseline gap-2 shrink-0">
          {choice.successChance !== undefined && (
            <div
              data-testid="chance-badge"
              className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest border border-[var(--color-border-warm)] px-1.5 py-0.5"
            >
              {Math.round(choice.successChance * 100)}%
            </div>
          )}
          {chaTag && (
            <div
              data-testid="cha-badge"
              className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest border border-[var(--color-accent-amber)]/60 px-1.5 py-0.5"
            >
              {chaTag}
            </div>
          )}
          {choice.requiresGold !== undefined && (
            <div className="text-[var(--color-accent-gold)] text-xs uppercase tracking-widest">
              {choice.requiresGold}g
            </div>
          )}
        </div>
      </div>
      {choice.hint && (
        <div className="text-[var(--color-text-secondary)] text-xs italic mt-1">
          {choice.hint}
        </div>
      )}
      {disabled && (
        <div className="text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest mt-2">
          ✕ {disabledReason}
        </div>
      )}
    </button>
  );
}

interface ResolutionPanelProps {
  choiceLabel: string;
  result: EventOutcomeResult;
  onContinue: () => void;
}

function ResolutionPanel({ choiceLabel, result, onContinue }: ResolutionPanelProps) {
  const continueLabel = result.ambush ? 'Draw steel →' : 'Continue Deeper →';
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        you chose · {choiceLabel}
      </div>
      <Panel tone="warm">
        <p className="text-[var(--color-text-primary)] text-sm leading-relaxed">
          {result.resolution}
        </p>
        {result.effectsApplied.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-[var(--color-border-dim)] flex flex-col gap-2">
            {result.effectsApplied.map((eff, idx) =>
              eff.intel ? (
                <li key={`${eff.kind}-${idx}`} className="list-none">
                  <BossIntelReveal intel={eff.intel} />
                </li>
              ) : (
                <li
                  key={`${eff.kind}-${idx}`}
                  className={`text-xs uppercase tracking-widest font-mono ${toneForEffect(eff)}`}
                >
                  · {eff.detail}
                </li>
              ),
            )}
          </ul>
        )}
      </Panel>
      <div className="flex justify-center">
        <Button variant="primary" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

function BossIntelReveal({ intel }: { intel: NonNullable<AppliedEffect['intel']> }) {
  return (
    <div
      data-testid="boss-intel-reveal"
      className="border border-[var(--color-accent-amber)]/50 bg-[var(--color-bg-panel)]/60 p-3"
    >
      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
        {intel.level === 'full' ? "The scout's report" : 'The omens speak'}
      </div>
      <div className="text-[var(--color-accent-amber)] text-sm font-bold tracking-wider mt-0.5">
        {intel.bossName}
      </div>
      <ul className="mt-2 flex flex-col gap-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
        {intel.lines.map((line, i) => (
          <li key={i} className="leading-snug">
            · {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function toneForEffect(eff: AppliedEffect): string {
  switch (eff.kind) {
    case 'hp_delta':
      return eff.detail.includes('+')
        ? 'text-[var(--color-status-poison)]'
        : 'text-[var(--color-accent-blood)]';
    case 'temp_hp':
      return 'text-[var(--color-accent-amber)]';
    case 'gold_delta':
      return eff.detail.includes('+')
        ? 'text-[var(--color-accent-gold)]'
        : 'text-[var(--color-accent-blood)]';
    case 'cha_scaled_gold':
      return 'text-[var(--color-accent-gold)]';
    case 'grant_item':
      return 'text-[var(--color-accent-amber)]';
    case 'grant_blessing':
    case 'grant_blessing_id':
      return 'text-[var(--color-accent-amber)]';
    case 'grant_quirk_reroll':
      return 'text-[var(--color-text-secondary)]';
    case 'apply_attack_bonus_run':
      return 'text-[var(--color-accent-amber)]';
    case 'spawn_ambush':
      return 'text-[var(--color-accent-blood)]';
    case 'reveal_boss_intel':
      return 'text-[var(--color-accent-amber)]';
    case 'mark_bold_approach':
      return 'text-[var(--color-accent-gold)]';
    default:
      return 'text-[var(--color-text-secondary)]';
  }
}
