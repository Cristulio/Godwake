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
import { skillBonus, type SkillCheckResult } from '../../engine/character/skillCheck';
import { SKILL_TO_ABILITY } from '../../types/skills';
import { ABILITY_FULL_NAMES } from '../../types/abilities';
import type { SkillName } from '../../types/skills';
import type { Character } from '../../types/character';
import { playSfx } from '../../engine/audio';
import type { EventChoice } from '../../schemas/event';
import { isFeatureUnlocked } from '../../engine/progression/unlocks';

function skillLabel(skill: SkillName): string {
  return skill
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface EventRoomProps {
  room: RoomSpec;
  onContinue: () => void;
  /** Called when an outcome demands a combat encounter (spawn_ambush). */
  onAmbush: (monsterDefIds: string[]) => void;
}

interface ResolvedTurn {
  choiceLabel: string;
  result: EventOutcomeResult;
  /** Present when the chosen option resolved via a skill check. */
  check?: SkillCheckResult;
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
  const delveCount = useGameStore((s) => s.delveCount);
  const chaptersCleared = useGameStore((s) => s.chaptersCleared);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const progressionMeta = { delveCount, chaptersCleared, druidGroveUnlocked };
  const bossIntelUnlocked = isFeatureUnlocked('boss-intel', progressionMeta);

  if (!character) return null;

  // Boss-intel rooms are event-kind rooms whose template id starts with
  // "boss-intel-". Before the feature unlocks, the preparation choices are
  // hidden: the player just walks past with a locked-room notice.
  const isBossIntelRoom =
    room.eventTemplateId != null && room.eventTemplateId.startsWith('boss-intel-');
  if (isBossIntelRoom && !bossIntelUnlocked) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-4 animate-fade-in">
        <Panel>
          <p className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-2">
            ⚿ Sealed
          </p>
          <h2 className="font-display text-[var(--color-accent-amber)] text-lg uppercase tracking-wider mb-3">
            {room.title}
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed font-narrative italic">
            {room.flavorText}
          </p>
          <p className="text-[var(--color-text-dim)] text-xs mt-4 italic">
            The signs are here, but the art of reading them is not yet yours. Descend deeper into the dark to learn it.
          </p>
        </Panel>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onContinue}>
            Press On →
          </Button>
        </div>
      </div>
    );
  }

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
    const checked = rollChoiceCheck(choice, roller, character);
    const outcome = resolveChoiceOutcome(checked.outcome, roller);
    const result = applyEventOutcome(character, outcome, roller);
    setCharacter(result.character);
    setResolved({ choiceLabel: choice.label, result, check: checked.skillCheck });
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
          check={resolved.check}
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
  let skillTag: { skill: SkillName; dc: number; bonus: number; proficient: boolean } | null = null;
  if (choice.skillCheck) {
    const bonus = skillBonus(character, choice.skillCheck.skill);
    skillTag = {
      skill: choice.skillCheck.skill,
      dc: choice.skillCheck.dc,
      bonus,
      proficient:
        character.expertSkills.includes(choice.skillCheck.skill) ||
        character.skillProficiencies.includes(choice.skillCheck.skill),
    };
  }

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
          {skillTag && (
            <div
              data-testid="skillcheck-badge"
              title={`${skillLabel(skillTag.skill)} (${ABILITY_FULL_NAMES[SKILL_TO_ABILITY[skillTag.skill]]}) check — your bonus ${skillTag.bonus >= 0 ? '+' : ''}${skillTag.bonus}${skillTag.proficient ? ', proficient' : ''}`}
              className={`text-[10px] uppercase tracking-widest border px-1.5 py-0.5 ${
                skillTag.proficient
                  ? 'text-[var(--color-accent-amber)] border-[var(--color-accent-amber)]/60'
                  : 'text-[var(--color-text-secondary)] border-[var(--color-border-warm)]'
              }`}
            >
              {skillLabel(skillTag.skill)} DC {skillTag.dc} · {skillTag.bonus >= 0 ? '+' : ''}
              {skillTag.bonus}
            </div>
          )}
          {choice.successChance !== undefined && (
            <div
              data-testid="chance-badge"
              className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest border border-[var(--color-border-warm)] px-1.5 py-0.5"
            >
              {Math.round(choice.successChance * 100)}%
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
  check?: SkillCheckResult;
  onContinue: () => void;
}

function ResolutionPanel({ choiceLabel, result, check, onContinue }: ResolutionPanelProps) {
  const continueLabel = result.ambush ? 'Draw steel →' : 'Continue Deeper →';
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        you chose · {choiceLabel}
      </div>
      {check && (
        <div
          data-testid="skillcheck-result"
          className={`text-center text-xs uppercase tracking-widest font-mono ${
            check.passed
              ? 'text-[var(--color-status-poison)]'
              : 'text-[var(--color-accent-blood)]'
          }`}
        >
          {skillLabel(check.skill)} · d20 {check.d20}
          {check.abilityMod !== 0 && ` ${check.abilityMod >= 0 ? '+' : '−'}${Math.abs(check.abilityMod)}`}
          {check.proficiencyMod !== 0 && ` +${check.proficiencyMod}`} = {check.total} vs DC {check.dc} —{' '}
          {check.passed ? 'Success' : 'Failure'}
        </div>
      )}
      <Panel tone="warm">
        <p className="text-[var(--color-text-primary)] text-sm leading-relaxed">
          {result.resolution}
        </p>
        {result.effectsApplied.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-[var(--color-border-dim)] flex flex-col gap-2">
            {result.effectsApplied.map((eff, idx) => (
              <li
                key={`${eff.kind}-${idx}`}
                className={`text-xs uppercase tracking-widest font-mono ${toneForEffect(eff)}`}
              >
                · {eff.detail}
              </li>
            ))}
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
    case 'grant_boss_buff':
      return 'text-[var(--color-accent-amber)]';
    case 'mark_bold_approach':
      return 'text-[var(--color-accent-gold)]';
    default:
      return 'text-[var(--color-text-secondary)]';
  }
}
