import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { useT } from '../../i18n/useT';
import { useGameStore } from '../../stores/gameStore';
import { getRace } from '../../content/races';
import { listClasses } from '../../content/classes';
import { presetCreationInput } from '../../engine/character/defaultCharacter';
import type { RaceId, ClassId } from '../../schemas/ids';
import {
  ABILITY_NAMES,
  abilityModifier,
  type AbilityName,
} from '../../types/abilities';
import {
  isClassUnlocked,
  classUnlockRenown,
  relativeClassOrder,
  SLOT_RENOWN_THRESHOLDS,
  STARTER_CLASSES,
} from '../../engine/progression/unlocks';

interface SoulOption {
  classId: ClassId;
  className: string;
  characterName: string;
  raceId: RaceId;
  blurb: string;
  scores: { ability: AbilityName; total: number; mod: number }[];
}

function buildSoulOptions(): SoulOption[] {
  return listClasses()
    .filter((cls) => cls.preset)
    .map((cls) => {
      const preset = cls.preset!;
      const race = getRace(preset.recommendedRaceId);
      const scores = ABILITY_NAMES.map((a) => {
        const total = preset.abilityScores[a] + (race.abilityScoreBonuses[a] ?? 0);
        return { ability: a, total, mod: abilityModifier(total) };
      });
      return {
        classId: cls.id,
        className: cls.name,
        characterName: preset.characterName,
        raceId: preset.recommendedRaceId,
        blurb: preset.flavorBlurb,
        scores,
      };
    });
}

export function CharacterCreationScreen() {
  const { t, tc } = useT();
  const commit = useGameStore((s) => s.commitCharacterCreation);
  const selectCharacter = useGameStore((s) => s.selectCharacter);
  const selectCharacterAndDescend = useGameStore((s) => s.selectCharacterAndDescend);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const goToHub = useGameStore((s) => s.goToHub);
  const goToAscensionSelect = useGameStore((s) => s.goToAscensionSelect);
  const newGamePlusFlow = useGameStore((s) => s.newGamePlusFlow);
  const selectedAscension = useGameStore((s) => s.selectedAscension);
  const existing = useGameStore((s) => s.character);
  const renownSpent = useGameStore((s) => s.renownSpent);
  const originClass = useGameStore((s) => s.originClass);
  // The starter the soul forged anchors the RELATIVE unlock ladder. Before one is
  // stamped (first creation) fall back to the worn body, then to fighter — the
  // non-starter bars (200/300/450/600) are origin-invariant, so a fresh soul's
  // sealed cards read correctly whichever default is used.
  const soulOrigin = originClass ?? existing?.classId ?? 'fighter';

  // Three modes share this screen:
  //  - New Game+ (run-launcher): pick/keep a soul and descend straight into the
  //    next run at the chosen ascension.
  //  - Hub swap: a soul already in the world, picked between runs → returns to
  //    Phandalin keeping renown / Grove / quirks.
  //  - First creation: no soul yet → runs the intro → first-delve handoff.
  const isSwap = existing != null;

  // Selectability has two regimes:
  //  - First creation: a fresh soul may forge ONLY one of the three easy starters;
  //    the rest show as sealed, earned later by spending renown at the Grove.
  //  - Hub swap: the body already worn is always selectable, plus any class the
  //    soul has spent enough renown to unlock. The rest stay sealed.
  const isSelectable = (classId: ClassId) =>
    isSwap
      ? classId === existing?.classId || isClassUnlocked(classId, renownSpent, soulOrigin)
      : STARTER_CLASSES.includes(classId);

  const allOptions = useMemo(buildSoulOptions, []);
  // Present every soul in the origin's unlock order: the worn origin first, then
  // the rest in the order the renown-spent ladder opens them (slots 2..7).
  const ordered = useMemo(() => {
    const order = relativeClassOrder(soulOrigin);
    return [...allOptions].sort((a, b) => order.indexOf(a.classId) - order.indexOf(b.classId));
  }, [allOptions, soulOrigin]);
  const options = ordered.filter((o) => isSelectable(o.classId));
  const sealedOptions = ordered.filter((o) => !isSelectable(o.classId));
  const [selectedClassId, setSelectedClassId] = useState<ClassId | null>(null);
  const selected = options.find((o) => o.classId === selectedClassId) ?? null;
  const selectedName = selected
    ? tc('classes', selected.classId, 'characterName', selected.characterName)
    : '';

  function confirm() {
    if (!selectedClassId) return;
    if (newGamePlusFlow) {
      selectCharacterAndDescend(selectedClassId);
    } else if (isSwap) {
      selectCharacter(selectedClassId);
    } else {
      commit(presetCreationInput(selectedClassId));
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.3em] leading-tight"
            style={{
              textShadow:
                '0 0 18px rgba(244,167,66,0.55), 0 0 6px rgba(244,167,66,0.85), 0 2px 0 rgba(0,0,0,0.9)',
            }}
          >
            {t('screens.charCreation.titleHeading')}
          </h1>
          <p className="font-narrative text-[var(--color-text-secondary)] text-sm italic mt-2 tracking-wide">
            {newGamePlusFlow
              ? t('screens.charCreation.subtitleNgp', {
                  asc:
                    selectedAscension > 0
                      ? t('screens.charCreation.atAscension', { n: selectedAscension })
                      : '',
                })
              : isSwap
                ? t('screens.charCreation.subtitleSwap')
                : t('screens.charCreation.subtitleFirst')}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={newGamePlusFlow ? goToAscensionSelect : isSwap ? goToHub : goToTitle}
        >
          {newGamePlusFlow
            ? t('screens.charCreation.backAscension')
            : isSwap
              ? t('screens.charCreation.backPhandalin')
              : t('screens.charCreation.backTitle')}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = opt.classId === selectedClassId;
          return (
            <button
              key={opt.classId}
              onClick={() => setSelectedClassId(opt.classId)}
              aria-pressed={isSelected}
              className={`text-left p-4 border transition-colors flex flex-col gap-3 ${
                isSelected
                  ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                  : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-warm)]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base ${
                      isSelected
                        ? 'text-[var(--color-accent-amber)]'
                        : 'text-[var(--color-accent-gold)]'
                    }`}
                  >
                    ✦
                  </span>
                  <span className="font-display text-[var(--color-text-primary)] text-base tracking-wide">
                    {tc('races', opt.raceId, 'name', getRace(opt.raceId).name)}{' '}
                    {tc('classes', opt.classId, 'name', opt.className)}
                  </span>
                </div>
                <div className="text-[var(--color-text-secondary)] text-[11px] tracking-wide mt-1">
                  {tc('classes', opt.classId, 'characterName', opt.characterName)}
                </div>
              </div>

              <p className="font-narrative text-[var(--color-text-dim)] text-xs italic leading-relaxed">
                {tc('classes', opt.classId, 'flavorBlurb', opt.blurb)}
              </p>

              <div className="grid grid-cols-3 gap-1.5">
                {opt.scores.map(({ ability, total, mod }) => (
                  <div
                    key={ability}
                    className="border border-[var(--color-border-dim)] bg-[var(--color-bg-deep)]/40 px-1.5 py-1 text-center"
                  >
                    <div className="font-display text-[8px] text-[var(--color-accent-amber)] uppercase tracking-widest">
                      {t(`screens.common.abilityShort.${ability}`)}
                    </div>
                    <div className="font-mono text-[var(--color-text-primary)] text-xs tabular-nums">
                      {total}
                      <span className="ml-0.5 text-[var(--color-text-dim)]">
                        {mod >= 0 ? '+' : ''}
                        {mod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-[11px] leading-relaxed">
                <div>
                  <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
                    {t('screens.charCreation.hallmarksLabel')}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {t(`screens.charCreation.hallmarks.${opt.classId}`)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
                    {t('screens.charCreation.kitLabel')}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {t(`screens.charCreation.kit.${opt.classId}`)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
        {/* Souls not yet open to this walker show as sealed placeholders, each
            naming the renown it must be given at the Wellspring before it wakes —
            and how much remains — so the path to it is never a mystery. */}
        {sealedOptions.map((o) => {
          const threshold = classUnlockRenown(o.classId, soulOrigin);
          const firstOffering = threshold === SLOT_RENOWN_THRESHOLDS[0];
          const remaining = Math.max(0, threshold - renownSpent);
          return (
            <div
              key={o.classId}
              className="relative p-4 border-2 border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] opacity-60 flex flex-col gap-2"
            >
              <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
                {t('screens.charCreation.sealed')}
              </div>
              <div className="font-display text-[var(--color-text-dim)] text-base tracking-wide">
                {tc('classes', o.classId, 'name', o.className)}
              </div>
              <p className="font-narrative text-[var(--color-text-dim)] text-xs italic leading-relaxed">
                {firstOffering ? (
                  t('screens.charCreation.sealedFirst')
                ) : (
                  <>
                    {t('screens.charCreation.sealedThreshold', { n: threshold })}
                    {remaining > 0 && t('screens.charCreation.sealedRemaining', { n: remaining })}
                  </>
                )}
              </p>
              <div className="text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest mt-auto">
                {firstOffering
                  ? t('screens.charCreation.afterFirstOffering')
                  : t('screens.charCreation.unlocksAt', { n: threshold })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--color-border-warm)]">
        <div className="font-narrative text-[var(--color-text-dim)] text-sm italic tracking-wide hidden md:block">
          {selected
            ? t('screens.charCreation.standsReady', { name: selectedName })
            : t('screens.charCreation.pickToContinue')}
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          onClick={confirm}
        >
          {selected
            ? newGamePlusFlow
              ? t('screens.charCreation.descendAs', { name: selectedName })
              : isSwap
                ? t('screens.charCreation.becomeAs', { name: selectedName })
                : t('screens.charCreation.beginAs', { name: selectedName })
            : t('screens.charCreation.chooseSoul')}
        </Button>
      </div>
    </div>
  );
}
