import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
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
import type { SkillName } from '../../types/skills';
import {
  isClassUnlocked,
  CLASS_UNLOCK_DELVE,
  STARTER_CLASSES,
} from '../../engine/progression/unlocks';

const ABILITY_SHORT: Record<AbilityName, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const RACE_LABEL: Record<RaceId, string> = {
  human: 'Human',
  'half-elf': 'Half-Elf',
  elf: 'Elf',
  'wood-elf': 'Wood Elf',
  dwarf: 'Dwarf',
  'hill-dwarf': 'Hill Dwarf',
  halfling: 'Halfling',
  'half-orc': 'Half-Orc',
  gnome: 'Gnome',
  tiefling: 'Tiefling',
};

// The real starting kit per class (mirrors startingKitFor in defaultCharacter),
// and the signature features the soul already carries or grows into. Both are
// truthful — no flavor-only filler.
const CLASS_KIT: Record<ClassId, string> = {
  fighter: 'Longsword, shield & leather armor · 2 healing potions · 25 gold',
  rogue: 'Rapier, shortbow & leather armor · 1 healing potion · 15 gold',
  wizard: 'Dagger & spellbook · 1 healing potion · 20 gold',
  cleric: '—',
  barbarian: 'Greataxe, no armor · 2 healing potions · 20 gold',
  ranger: 'Longbow, shortsword & leather armor · 1 healing potion · 15 gold',
  druid: 'Sickle & leather armor · 2 healing potions · 20 gold',
  monk: 'Bare fists & shortsword, no armor · 2 healing potions · 15 gold',
};

const CLASS_HALLMARKS: Record<ClassId, string> = {
  fighter: 'Second Wind · Action Surge · Champion crits on 19–20',
  rogue: 'Sneak Attack · Cunning Action · Uncanny Dodge',
  wizard: 'Fire Bolt · Magic Missile · Fireball at L5',
  cleric: '—',
  barbarian: 'Rage · Reckless Attack · Berserker Frenzy',
  ranger: "Hunter's Mark · Archery · Colossus Slayer",
  druid: 'Produce Flame · Wild Shape · Circle of the Moon',
  monk: 'Martial Arts · Flurry of Blows · Stunning Strike',
};

function skillLabel(s: SkillName): string {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface SoulOption {
  classId: ClassId;
  className: string;
  characterName: string;
  raceId: RaceId;
  blurb: string;
  skills: SkillName[];
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
        skills: preset.recommendedSkills,
        scores,
      };
    });
}

export function CharacterCreationScreen() {
  const commit = useGameStore((s) => s.commitCharacterCreation);
  const selectCharacter = useGameStore((s) => s.selectCharacter);
  const selectCharacterAndDescend = useGameStore((s) => s.selectCharacterAndDescend);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const goToHub = useGameStore((s) => s.goToHub);
  const goToAscensionSelect = useGameStore((s) => s.goToAscensionSelect);
  const newGamePlusFlow = useGameStore((s) => s.newGamePlusFlow);
  const selectedAscension = useGameStore((s) => s.selectedAscension);
  const existing = useGameStore((s) => s.character);
  const delveCount = useGameStore((s) => s.delveCount);

  // Three modes share this screen:
  //  - New Game+ (run-launcher): pick/keep a soul and descend straight into the
  //    next run at the chosen ascension.
  //  - Hub swap: a soul already in the world, picked between runs → returns to
  //    Phandalin keeping renown / Grove / quirks.
  //  - First creation: no soul yet → runs the intro → first-delve handoff.
  const isSwap = existing != null;

  // Selectability has two regimes:
  //  - First creation: a fresh soul may forge ONLY one of the three easy starters;
  //    the rest show as sealed, earned later by clearing chapters.
  //  - Hub swap: the body already worn is always selectable, plus any class the
  //    soul has logged enough delves to unlock. The rest stay sealed.
  const isSelectable = (classId: ClassId) =>
    isSwap
      ? classId === existing?.classId || isClassUnlocked(classId, delveCount)
      : STARTER_CLASSES.includes(classId);

  const allOptions = useMemo(buildSoulOptions, []);
  const options = allOptions.filter((o) => isSelectable(o.classId));
  const sealedOptions = allOptions.filter((o) => !isSelectable(o.classId));
  const [selectedClassId, setSelectedClassId] = useState<ClassId | null>(null);
  const selected = options.find((o) => o.classId === selectedClassId) ?? null;

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
            CHOOSE A SOUL
          </h1>
          <p className="font-narrative text-[var(--color-text-secondary)] text-sm italic mt-2 tracking-wide">
            {newGamePlusFlow
              ? `Pick the soul you will wear into the dark${selectedAscension > 0 ? ` at Ascension ${selectedAscension}` : ''}. Your renown, your marks, and the keepers’ gifts all follow you down.`
              : isSwap
                ? 'Step into a different body for the next descent. Your renown, your marks, and the keepers’ gifts all follow you.'
                : 'Three souls wait at the wheel. Pick the one you will wear into the dark.'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={newGamePlusFlow ? goToAscensionSelect : isSwap ? goToHub : goToTitle}
        >
          {newGamePlusFlow ? '← Ascension' : isSwap ? '← Phandalin' : '← Title'}
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
                    {RACE_LABEL[opt.raceId]} {opt.className}
                  </span>
                </div>
                <div className="text-[var(--color-text-secondary)] text-[11px] tracking-wide mt-1">
                  {opt.characterName}
                </div>
              </div>

              <p className="font-narrative text-[var(--color-text-dim)] text-xs italic leading-relaxed">
                {opt.blurb}
              </p>

              <div className="grid grid-cols-3 gap-1.5">
                {opt.scores.map(({ ability, total, mod }) => (
                  <div
                    key={ability}
                    className="border border-[var(--color-border-dim)] bg-[var(--color-bg-deep)]/40 px-1.5 py-1 text-center"
                  >
                    <div className="font-display text-[8px] text-[var(--color-accent-amber)] uppercase tracking-widest">
                      {ABILITY_SHORT[ability]}
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
                    Hallmarks ·{' '}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {CLASS_HALLMARKS[opt.classId]}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
                    Kit ·{' '}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {CLASS_KIT[opt.classId]}
                  </span>
                </div>
                {opt.skills.length > 0 && (
                  <div>
                    <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
                      Skills ·{' '}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">
                      {opt.skills.map(skillLabel).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {/* Souls not yet open to this walker show as sealed placeholders, each
            naming the delve count at which it will wake — and how many turns of
            the wheel remain — so the path to it is never a mystery. */}
        {sealedOptions.map((o) => {
          const threshold = CLASS_UNLOCK_DELVE[o.classId];
          const remaining = Math.max(0, threshold - delveCount);
          return (
            <div
              key={o.classId}
              className="relative p-4 border-2 border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] opacity-60 flex flex-col gap-2"
            >
              <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
                ⚿ Sealed
              </div>
              <div className="font-display text-[var(--color-text-dim)] text-base tracking-wide">
                {o.className}
              </div>
              <p className="font-narrative text-[var(--color-text-dim)] text-xs italic leading-relaxed">
                This soul will not wake until the wheel has turned for you{' '}
                {threshold} {threshold === 1 ? 'time' : 'times'}.
                {remaining > 0 && (
                  <>
                    {' '}
                    {remaining} {remaining === 1 ? 'more descent' : 'more descents'} and it is
                    yours to wear.
                  </>
                )}
              </p>
              <div className="text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest mt-auto">
                Unlocks at delve {threshold}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--color-border-warm)]">
        <div className="font-narrative text-[var(--color-text-dim)] text-sm italic tracking-wide hidden md:block">
          {selected
            ? `${selected.characterName} stands ready.`
            : 'Pick a soul to continue.'}
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          onClick={confirm}
        >
          {selected
            ? newGamePlusFlow
              ? `Descend as ${selected.characterName} ▸`
              : isSwap
                ? `Become ${selected.characterName} ▸`
                : `Begin as ${selected.characterName} ▸`
            : 'Choose a soul'}
        </Button>
      </div>
    </div>
  );
}
