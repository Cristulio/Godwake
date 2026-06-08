import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getActiveRoller } from '../../engine/dice';
import { getEvent } from '../../content/events';
import { EventIllustration } from './EventIllustration';
import {
  applyEventOutcome,
  canTakeChoice,
  eventGoldScale,
  resolveChoiceOutcome,
  rollChoiceCheck,
  scaleGold,
  type AppliedEffect,
  type EventOutcomeResult,
} from '../../engine/delve';
import { skillBonus, type SkillCheckResult } from '../../engine/character/skillCheck';
import { bossIntelBuffFor } from '../../content/bossIntel';
import { SKILL_TO_ABILITY } from '../../types/skills';
import { ABILITY_FULL_NAMES } from '../../types/abilities';
import type { SkillName } from '../../types/skills';
import type { Character } from '../../types/character';
import { playSfx } from '../../engine/audio';
import type { EventChoice } from '../../schemas/event';
import { isFeatureUnlocked } from '../../engine/progression/unlocks';
import { useT } from '../../i18n/useT';

type TFn = (key: string, params?: Record<string, string | number>) => string;

function skillLabel(skill: SkillName, t: TFn): string {
  return t(`delve.skill.${skill}`);
}

interface EventRoomProps {
  room: RoomSpec;
  onContinue: () => void;
  /** Called when an outcome demands a combat encounter (spawn_ambush). */
  onAmbush: (monsterDefIds: string[]) => void;
}

/** A content-seam pointer (namespace + id + field) into an es overlay. */
interface OverlayRef {
  namespace: string;
  id: string;
  field: string;
}

interface ResolvedTurn {
  choiceId: string;
  choiceLabel: string;
  /**
   * The overlay row to read the resolution from (`events`/`choice.<id>.…` for
   * ordinary events, `bossIntel`/<resolution-field> for intel rooms), or null
   * when the displayed resolution can't be mapped to a canonical one (a
   * random-weighted branch or an appended suffix) — then the engine's English
   * resolution stands.
   */
  resolutionRef: OverlayRef | null;
  result: EventOutcomeResult;
  /** Present when the chosen option resolved via a skill check. */
  check?: SkillCheckResult;
}

/** boss-intel choice id → the es/bossIntel.json resolution field for it. */
const BOSS_INTEL_RESOLUTION_FIELD: Record<string, string> = {
  'find-weak-spot': 'weakSpotResolution',
  'study-the-approach': 'battlePlanResolution',
  'walk-past': 'walkPastResolution',
};

/** Boss def id when this room is a boss-intel beat, else null. */
function bossDefIdForRoom(room: RoomSpec): string | null {
  const id = room.eventTemplateId;
  return id && id.startsWith('boss-intel-') ? id.slice('boss-intel-'.length) : null;
}

export function EventRoom({ room, onContinue, onAmbush }: EventRoomProps) {
  const { t, tc } = useT();
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
  const renownSpent = useGameStore((s) => s.renownSpent);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const progressionMeta = { delveCount, chaptersCleared, renownSpent, druidGroveUnlocked };
  const bossIntelUnlocked = isFeatureUnlocked('boss-intel', progressionMeta);

  if (!character) return null;

  // Boss-intel rooms are event-kind rooms whose template id starts with
  // "boss-intel-". Before the feature unlocks, the preparation choices are
  // hidden: the player just walks past with a locked-room notice.
  const bossDefId = bossDefIdForRoom(room);
  const isBossIntelRoom = bossDefId != null;
  if (isBossIntelRoom && !bossIntelUnlocked) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-4 animate-fade-in">
        <EventIllustration explicit={template?.illustration} chapter={room.chapter} />
        <Panel>
          <p className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-2">
            {t('delve.event.sealed')}
          </p>
          <h2 className="font-display text-[var(--color-accent-amber)] text-lg uppercase tracking-wider mb-3">
            {tc('bossIntel', bossDefId, 'roomTitle', room.title)}
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed font-narrative italic">
            {tc('bossIntel', bossDefId, 'roomFlavor', room.flavorText)}
          </p>
          <p className="text-[var(--color-text-dim)] text-xs mt-4 italic">
            {t('delve.event.sealedNote')}
          </p>
        </Panel>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onContinue}>
            {t('delve.common.pressOn')}
          </Button>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-4 animate-fade-in">
        <EventIllustration chapter={room.chapter} />
        <Panel>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {t('delve.event.nothing')}
          </p>
        </Panel>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onContinue}>
            {t('delve.common.continueDeeper')}
          </Button>
        </div>
      </div>
    );
  }

  // Event gold (rewards AND the costs that buy them) scales with chapter depth
  // so a flat authored payout stays proportional to the chapter economy instead
  // of going trivial in the late game. Anchored at the event's own minChapter so
  // already-rich deep events don't double-count into a jackpot. Boss-intel fees
  // price themselves by chapter already (bossIntelCoinCost), so leave those ×1.
  const goldScale = isBossIntelRoom
    ? 1
    : eventGoldScale(room.chapter ?? 1, template.minChapter ?? 1);

  // Boss-intel rooms carry their Spanish in the bossIntel overlay (keyed by boss
  // def id); ordinary events in the events overlay (keyed by template id).
  const localizedTitle = bossDefId
    ? tc('bossIntel', bossDefId, 'roomTitle', template.title)
    : tc('events', template.id, 'title', template.title);
  const localizedFlavor = bossDefId
    ? tc('bossIntel', bossDefId, 'roomFlavor', template.flavor)
    : tc('events', template.id, 'flavor', template.flavor);

  // The resolution is translatable only when the displayed text is verbatim a
  // canonical outcome resolution the overlay carries — not a random-weighted
  // branch and not a suffixed string. Boss-intel resolutions live in the
  // bossIntel overlay (keyed by boss def id); ordinary events in the events
  // overlay (keyed by template + choice id).
  function resolutionRefFor(
    choice: EventChoice,
    succeeded: boolean | undefined,
    displayedResolution: string,
  ): OverlayRef | null {
    if (bossDefId) {
      const field = BOSS_INTEL_RESOLUTION_FIELD[choice.id];
      if (field && choice.outcome && 'resolution' in choice.outcome && choice.outcome.resolution === displayedResolution) {
        return { namespace: 'bossIntel', id: bossDefId, field };
      }
      return null;
    }
    const srcOutcome = succeeded === false ? choice.failureOutcome : choice.outcome;
    if (srcOutcome && 'resolution' in srcOutcome && srcOutcome.resolution === displayedResolution) {
      const field = succeeded === false ? 'failureResolution' : 'resolution';
      return { namespace: 'events', id: template!.id, field: `choice.${choice.id}.${field}` };
    }
    return null;
  }

  function handlePick(choice: EventChoice) {
    if (!character) return;
    const roller = getActiveRoller();
    const checked = rollChoiceCheck(choice, roller, character);
    const outcome = resolveChoiceOutcome(checked.outcome, roller);
    const result = applyEventOutcome(character, outcome, roller, goldScale);
    setCharacter(result.character);
    setResolved({
      choiceId: choice.id,
      choiceLabel: choice.label,
      resolutionRef: resolutionRefFor(choice, checked.succeeded, result.resolution),
      result,
      check: checked.skillCheck,
    });
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
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(212,176,98,0.07),transparent_55%)]">
      <EventIllustration explicit={template.illustration} chapter={room.chapter} />
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            {localizedTitle.toUpperCase()}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {t('delve.event.label')}
          </p>
        </div>
        <div data-testid="gold-balance" className="shrink-0 text-right">
          <div className="text-[var(--color-accent-gold)] text-lg font-bold tracking-wider">
            {character.goldInPocket}g
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
            {t('delve.event.inPocket')}
          </div>
        </div>
      </header>

      <Panel tone="warm" className="bg-gradient-to-br from-[#2d2418] to-[#221a14]">
        <p className="text-[var(--color-text-primary)] text-base italic leading-7">
          {localizedFlavor}
        </p>
      </Panel>

      {!resolved ? (
        <>
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.3em] text-center">
            {t('delve.event.chooseRoad')}
          </div>
          <div className="flex flex-col gap-3">
            {template.choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                templateId={template.id}
                choice={choice}
                character={character}
                goldScale={goldScale}
                bossDefId={bossDefId}
                onPick={() => handlePick(choice)}
              />
            ))}
          </div>
        </>
      ) : (
        <ResolutionPanel
          templateId={template.id}
          choiceId={resolved.choiceId}
          choiceLabel={resolved.choiceLabel}
          resolutionRef={resolved.resolutionRef}
          result={resolved.result}
          check={resolved.check}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}

interface ChoiceButtonProps {
  templateId: string;
  choice: EventChoice;
  character: Character;
  /** Chapter gold multiplier — scales the displayed cost and the gate check. */
  goldScale: number;
  /** Set on a boss-intel room — its three generic choices localize via fixed keys. */
  bossDefId: string | null;
  onPick: () => void;
}

/** The boss-intel choice ids → their fixed delve.intel.* localization key. */
const INTEL_CHOICE_KEY: Record<string, string> = {
  'find-weak-spot': 'findWeakSpot',
  'study-the-approach': 'study',
  'walk-past': 'walkPast',
};

function ChoiceButton({ templateId, choice, character, goldScale, bossDefId, onPick }: ChoiceButtonProps) {
  const { t, tc } = useT();
  // Boss-intel choices are generic (same labels every boss) and the per-boss
  // template id never matches an es/events overlay — localize them via fixed
  // delve.intel.* keys, interpolating the chapter-scaled temp-HP into the study hint.
  const intelKey = bossDefId ? INTEL_CHOICE_KEY[choice.id] : undefined;
  const intelGird =
    intelKey === 'study' && bossDefId
      ? (bossIntelBuffFor(bossDefId, 'battle-plan')?.tempHp ?? 0)
      : 0;
  const label = intelKey
    ? t(`delve.intel.${intelKey}.label`)
    : tc('events', templateId, `choice.${choice.id}.label`, choice.label);
  const hint = intelKey
    ? t(`delve.intel.${intelKey}.hint`, { n: intelGird })
    : choice.hint
      ? tc('events', templateId, `choice.${choice.id}.hint`, choice.hint)
      : null;
  const availability = canTakeChoice(character, choice, goldScale);
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold">
          {label}
        </div>
        <div className="flex flex-wrap items-baseline gap-2 shrink-0">
          {skillTag && (
            <div
              data-testid="skillcheck-badge"
              title={t('delve.event.checkTitle', {
                skill: skillLabel(skillTag.skill, t),
                ability: ABILITY_FULL_NAMES[SKILL_TO_ABILITY[skillTag.skill]],
                bonus: `${skillTag.bonus >= 0 ? '+' : ''}${skillTag.bonus}`,
                proficient: skillTag.proficient ? t('delve.event.proficientSuffix') : '',
              })}
              className={`text-[10px] uppercase tracking-widest border px-1.5 py-0.5 ${
                skillTag.proficient
                  ? 'text-[var(--color-accent-amber)] border-[var(--color-accent-amber)]/60'
                  : 'text-[var(--color-text-secondary)] border-[var(--color-border-warm)]'
              }`}
            >
              {t('delve.event.dcBadge', {
                skill: skillLabel(skillTag.skill, t),
                dc: skillTag.dc,
                bonus: `${skillTag.bonus >= 0 ? '+' : ''}${skillTag.bonus}`,
              })}
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
              {scaleGold(choice.requiresGold, goldScale)}g
            </div>
          )}
        </div>
      </div>
      {hint && (
        <div className="text-[var(--color-text-secondary)] text-xs italic mt-1">
          {hint}
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
  templateId: string;
  choiceId: string;
  choiceLabel: string;
  /** Overlay row to read the resolution from, or null to keep English. */
  resolutionRef: OverlayRef | null;
  result: EventOutcomeResult;
  check?: SkillCheckResult;
  onContinue: () => void;
}

function ResolutionPanel({
  templateId,
  choiceId,
  choiceLabel,
  resolutionRef,
  result,
  check,
  onContinue,
}: ResolutionPanelProps) {
  const { t, tc } = useT();
  const continueLabel = result.ambush ? t('delve.event.drawSteel') : t('delve.common.continueDeeper');
  const resolutionText = resolutionRef
    ? tc(resolutionRef.namespace, resolutionRef.id, resolutionRef.field, result.resolution)
    : result.resolution;
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        {t('delve.event.youChose', {
          label: tc('events', templateId, `choice.${choiceId}.label`, choiceLabel),
        })}
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
          {skillLabel(check.skill, t)} · d20 {check.d20}
          {check.abilityMod !== 0 && ` ${check.abilityMod >= 0 ? '+' : '−'}${Math.abs(check.abilityMod)}`}
          {check.proficiencyMod !== 0 && ` +${check.proficiencyMod}`} = {check.total} vs DC {check.dc} —{' '}
          {check.passed ? t('delve.event.success') : t('delve.event.failure')}
        </div>
      )}
      <Panel tone="warm">
        <p className="text-[var(--color-text-primary)] text-sm leading-relaxed">
          {resolutionText}
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
