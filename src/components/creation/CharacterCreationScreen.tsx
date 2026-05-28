import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { getRace } from '../../content/races';
import { listClasses, getClass } from '../../content/classes';
import { RaceIdSchema, type RaceId, type ClassId } from '../../schemas/ids';
import {
  ABILITY_NAMES,
  ABILITY_FULL_NAMES,
  abilityModifier,
  type AbilityName,
  type AbilityScores,
} from '../../types/abilities';
import { STANDARD_ARRAY } from '../../engine/character/initialize';
import { SKILL_DESCRIPTIONS, type SkillName } from '../../types/skills';
import type { ClassPreset } from '../../schemas/class';

type Step = 1 | 2 | 3 | 4;

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

const CLASS_BLURB: Record<ClassId, string> = {
  fighter: 'A martial veteran of the Sword Coast. Steel, Second Wind, and a long road.',
  wizard: 'Bookbound caster. Cantrips and the slow accrual of arcane lore.',
  cleric: 'A vessel of divine power. Heals, smites, and channels gods.',
  rogue: 'Shadow and edge. Sneak Attack and a careful step over every trap.',
  barbarian: 'Rage incarnate. The body takes the punishment so the soul keeps swinging.',
};

const RACE_BLURB: Record<RaceId, string> = {
  human: 'Wanderers and adventurers. +1 to every ability score.',
  'half-elf': 'Walkers between two worlds. +2 CHA, +1 DEX, +1 CON.',
  elf: 'Long-lived and keen-eyed. Trance instead of sleep.',
  'wood-elf': 'Long-lived archers of the high forest. +2 DEX, +1 WIS, speed 35.',
  dwarf: 'Stone-blooded, axe-handed, suspicious of magic.',
  'hill-dwarf': 'Stone-blooded toughness. +2 CON, +1 WIS, +1 HP per level.',
  halfling: 'Small, lucky, and harder to pin down than they look.',
  'half-orc': 'Strength and stamina; the rage of one heritage, the wits of the other.',
  gnome: 'Tinker-souled and curious. Small frames, bright minds.',
  tiefling: 'Bloodlines marked by an older pact. +2 CHA, +1 INT, fire resistance.',
};

const SKILL_LABEL: Record<SkillName, string> = {
  acrobatics: 'Acrobatics',
  'animal-handling': 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  'sleight-of-hand': 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

const ABILITY_SHORT: Record<AbilityName, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

// Step 1 and Step 2 only surface implemented options. Cleric / Barbarian and
// Elf / Dwarf / Halfling / Half-Orc / Gnome are deliberately hidden until
// they're implemented — the v1 screen showed greyed-out "Coming soon" tiles
// and several players read those as bugs.
const STEPPER_CLASS_IDS: readonly ClassId[] = ['fighter', 'rogue', 'wizard'];
const STEPPER_RACE_IDS: readonly RaceId[] = [
  'human',
  'wood-elf',
  'hill-dwarf',
  'half-elf',
  'tiefling',
];

function raceStatLine(id: RaceId): string {
  const race = (() => {
    try {
      return getRace(id);
    } catch {
      return null;
    }
  })();
  if (!race) return '';
  const bonuses = ABILITY_NAMES.filter((a) => (race.abilityScoreBonuses[a] ?? 0) > 0)
    .map((a) => `${ABILITY_SHORT[a]} +${race.abilityScoreBonuses[a]}`)
    .join(' · ');
  return `SPD ${race.speed}${bonuses ? ' · ' + bonuses : ''}`;
}

function classStatLine(id: ClassId): string {
  const cls = (() => {
    try {
      return getClass(id);
    } catch {
      return null;
    }
  })();
  if (!cls) return '';
  return `d${cls.hitDie} HD · ${cls.skillChoiceCount} skill picks`;
}

const IMPLEMENTED_CLASS_IDS = new Set(listClasses().map((c) => c.id));

export function CharacterCreationScreen() {
  const commit = useGameStore((s) => s.commitCharacterCreation);
  const goToTitle = useGameStore((s) => s.goToTitle);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [raceId, setRaceId] = useState<RaceId | null>(null);
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [assignments, setAssignments] = useState<Partial<Record<AbilityName, number>>>({});
  const [skills, setSkills] = useState<SkillName[]>([]);

  const cls = classId ? getClass(classId) : null;
  const race = raceId ? getRace(raceId) : null;
  const preset: ClassPreset | null = cls?.preset ?? null;

  const allAssigned = ABILITY_NAMES.every((a) => typeof assignments[a] === 'number');
  const skillsValid = cls ? skills.length === cls.skillChoiceCount : false;
  const nameValid = name.trim().length > 0;

  function pickClass(next: ClassId) {
    if (next === classId) return;
    setClassId(next);
    setSkills([]);
    setAssignments({});
  }

  function pickRace(next: RaceId) {
    setRaceId(next);
  }

  function assignAbility(ability: AbilityName, value: number | null) {
    setAssignments((prev) => {
      const nextMap = { ...prev };
      if (value == null) delete nextMap[ability];
      else nextMap[ability] = value;
      return nextMap;
    });
  }

  function toggleSkill(s: SkillName) {
    if (!cls) return;
    setSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= cls.skillChoiceCount) return prev;
      return [...prev, s];
    });
  }

  function applyPreset() {
    if (!preset || !classId) return;
    // Pull the recommended race through Zod so a content typo can't escape
    // into UI state.
    const presetRace = RaceIdSchema.parse(preset.recommendedRaceId);
    setName(preset.characterName);
    setRaceId(presetRace);
    setAssignments({ ...preset.abilityScores });
    setSkills([...preset.recommendedSkills]);
    setStep(4);
  }

  function next() {
    if (step === 1 && classId) setStep(2);
    else if (step === 2 && raceId) setStep(3);
    else if (step === 3 && allAssigned && skillsValid) setStep(4);
  }

  function back() {
    if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  function confirm() {
    if (!classId || !raceId || !allAssigned || !skillsValid || !nameValid) return;
    const scores: AbilityScores = {
      str: assignments.str!,
      dex: assignments.dex!,
      con: assignments.con!,
      int: assignments.int!,
      wis: assignments.wis!,
      cha: assignments.cha!,
    };
    commit({
      name: name.trim(),
      raceId,
      classId,
      baseAbilityScores: scores,
      skillProficiencies: skills,
    });
  }

  const canNext =
    (step === 1 && !!classId) ||
    (step === 2 && !!raceId) ||
    (step === 3 && allAssigned && skillsValid);
  const canConfirm =
    !!classId && !!raceId && allAssigned && skillsValid && nameValid;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.3em] leading-tight"
            style={{
              textShadow:
                '0 0 18px rgba(244,167,66,0.55), 0 0 6px rgba(244,167,66,0.85), 0 2px 0 rgba(0,0,0,0.9)',
            }}
          >
            FORGE A SOUL
          </h1>
          <p className="font-narrative text-[var(--color-text-secondary)] text-sm italic mt-2 tracking-wide">
            The wheel turns. Choose the shape it takes.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {preset && classId && (
            <Button variant="primary" onClick={applyPreset}>
              Use {preset.characterName} Preset
            </Button>
          )}
          <Button variant="ghost" onClick={goToTitle}>
            ← Title
          </Button>
        </div>
      </header>

      <StepIndicator step={step} />

      {step === 1 && (
        <ClassStep classId={classId} pickClass={pickClass} />
      )}

      {step === 2 && (
        <RaceStep raceId={raceId} pickRace={pickRace} />
      )}

      {step === 3 && cls && race && (
        <AbilitiesAndSkillsStep
          cls={cls}
          race={race}
          assignments={assignments}
          assignAbility={assignAbility}
          skills={skills}
          toggleSkill={toggleSkill}
        />
      )}

      {step === 4 && cls && race && (
        <NameAndConfirmStep
          name={name}
          setName={setName}
          cls={cls}
          race={race}
          assignments={assignments as AbilityScores}
          skills={skills}
        />
      )}

      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--color-border-warm)]">
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={back}>
              ← Back
            </Button>
          )}
        </div>
        <div className="font-narrative text-[var(--color-text-dim)] text-sm italic tracking-wide hidden md:block">
          {stepHint(step, { canNext, canConfirm })}
        </div>
        {step < 4 ? (
          <Button variant="primary" size="lg" disabled={!canNext} onClick={next}>
            Next ▸
          </Button>
        ) : (
          <Button variant="primary" size="lg" disabled={!canConfirm} onClick={confirm}>
            <span className="mr-2 text-[var(--color-bg-base)]">▸</span>
            Begin
          </Button>
        )}
      </div>
    </div>
  );
}

function stepHint(step: Step, flags: { canNext: boolean; canConfirm: boolean }): string {
  if (step === 1) return flags.canNext ? 'A class is chosen.' : 'Pick a class to continue.';
  if (step === 2) return flags.canNext ? 'A bloodline is chosen.' : 'Pick a race to continue.';
  if (step === 3) return flags.canNext ? 'Scores and skills are set.' : 'Assign every score and pick your skills.';
  return flags.canConfirm ? 'Ready to walk the world.' : 'Enter a name to begin.';
}

interface StepIndicatorProps {
  step: Step;
}

function StepIndicator({ step }: StepIndicatorProps) {
  const labels: Array<{ n: Step; label: string }> = [
    { n: 1, label: 'Class' },
    { n: 2, label: 'Race' },
    { n: 3, label: 'Scores & Skills' },
    { n: 4, label: 'Name' },
  ];
  return (
    <ol className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.2em] font-display">
      {labels.map((entry, i) => {
        const isActive = entry.n === step;
        const isDone = entry.n < step;
        return (
          <li key={entry.n} className="flex items-center gap-2">
            <span
              className={`px-2 py-1 border ${
                isActive
                  ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)]'
                  : isDone
                    ? 'border-[var(--color-border-warm)] text-[var(--color-text-secondary)]'
                    : 'border-[var(--color-border-dim)] text-[var(--color-text-dim)]'
              }`}
            >
              {entry.n}. {entry.label}
            </span>
            {i < labels.length - 1 && (
              <span className="text-[var(--color-border-dim)]">·</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface ClassStepProps {
  classId: ClassId | null;
  pickClass: (id: ClassId) => void;
}

function ClassStep({ classId, pickClass }: ClassStepProps) {
  return (
    <Panel className="mb-4" title="Choose a Class" tone="warm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {STEPPER_CLASS_IDS.map((id) => {
          const implemented = IMPLEMENTED_CLASS_IDS.has(id);
          const selected = id === classId;
          const cls = implemented ? getClass(id) : null;
          return (
            <button
              key={id}
              disabled={!implemented}
              onClick={() => pickClass(id)}
              className={`text-left p-4 border transition-colors ${
                selected
                  ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                  : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-warm)]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-base ${
                    selected
                      ? 'text-[var(--color-accent-amber)]'
                      : 'text-[var(--color-accent-gold)]'
                  }`}
                >
                  ✦
                </span>
                <span className="font-display text-[var(--color-text-primary)] text-xs uppercase tracking-[0.2em]">
                  {cls?.name ?? id}
                </span>
              </div>
              <div className="text-[var(--color-text-secondary)] text-sm mt-3 leading-relaxed">
                {CLASS_BLURB[id]}
              </div>
              <div className="font-mono text-[10px] mt-3 text-[var(--color-accent-amber)] tabular-nums tracking-wide">
                {classStatLine(id)}
              </div>
              {cls?.preset && (
                <div className="font-narrative text-[var(--color-text-dim)] text-xs italic mt-3 leading-relaxed">
                  Preset: {cls.preset.characterName}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

interface RaceStepProps {
  raceId: RaceId | null;
  pickRace: (id: RaceId) => void;
}

function RaceStep({ raceId, pickRace }: RaceStepProps) {
  return (
    <Panel className="mb-4" title="Choose a Bloodline" tone="warm">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {STEPPER_RACE_IDS.map((id) => {
          const selected = id === raceId;
          return (
            <button
              key={id}
              onClick={() => pickRace(id)}
              className={`text-left p-3 border transition-colors ${
                selected
                  ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                  : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-warm)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-base ${
                    selected
                      ? 'text-[var(--color-accent-amber)]'
                      : 'text-[var(--color-accent-gold)]'
                  }`}
                >
                  ◆
                </span>
                <span className="font-display text-[var(--color-text-primary)] text-[10px] uppercase tracking-[0.18em]">
                  {RACE_LABEL[id]}
                </span>
              </div>
              <div className="text-[var(--color-text-secondary)] text-xs mt-2 leading-relaxed">
                {RACE_BLURB[id]}
              </div>
              <div className="font-mono text-[10px] mt-2 text-[var(--color-accent-amber)] tabular-nums tracking-wide">
                {raceStatLine(id)}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

interface AbilitiesAndSkillsStepProps {
  cls: ReturnType<typeof getClass>;
  race: ReturnType<typeof getRace>;
  assignments: Partial<Record<AbilityName, number>>;
  assignAbility: (ability: AbilityName, value: number | null) => void;
  skills: SkillName[];
  toggleSkill: (s: SkillName) => void;
}

function AbilitiesAndSkillsStep({
  cls,
  race,
  assignments,
  assignAbility,
  skills,
  toggleSkill,
}: AbilitiesAndSkillsStepProps) {
  return (
    <>
      <Panel
        className="mb-4"
        title={`Ability Scores · Standard Array (${STANDARD_ARRAY.join(', ')})`}
      >
        <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
          Assign each value to one ability. Racial bonuses apply on top.
        </p>
        <div className="space-y-2">
          {ABILITY_NAMES.map((ability) => {
            const assigned = assignments[ability];
            const racialBonus = race.abilityScoreBonuses[ability] ?? 0;
            const total = typeof assigned === 'number' ? assigned + racialBonus : null;
            const mod = total != null ? abilityModifier(total) : null;
            return (
              <div
                key={ability}
                className="grid grid-cols-[110px_1fr_140px] items-center gap-3 py-1 border-b border-[var(--color-border-dim)] last:border-b-0"
              >
                <div className="text-[var(--color-accent-amber)] uppercase tracking-wider text-xs font-bold">
                  {ABILITY_FULL_NAMES[ability]}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {STANDARD_ARRAY.map((v, i) => {
                    const isMine = assigned === v;
                    const takenElsewhere =
                      !isMine &&
                      Object.entries(assignments).some(
                        ([a, av]) => a !== ability && av === v,
                      );
                    return (
                      <button
                        key={`${v}-${i}`}
                        disabled={takenElsewhere}
                        onClick={() => assignAbility(ability, isMine ? null : v)}
                        className={`w-9 h-8 border text-sm font-bold transition-colors ${
                          isMine
                            ? 'border-[var(--color-accent-amber)] bg-[var(--color-accent-amber)] text-[var(--color-bg-base)]'
                            : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] hover:border-[var(--color-border-warm)]'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[var(--color-text-secondary)] text-xs text-right tabular-nums">
                  {total != null ? (
                    <>
                      <span className="text-[var(--color-text-primary)]">{total}</span>
                      {racialBonus > 0 && (
                        <span className="text-[var(--color-text-dim)]">
                          {' '}
                          ({assigned}+{racialBonus})
                        </span>
                      )}
                      <span className="ml-2 text-[var(--color-accent-amber)]">
                        {mod! >= 0 ? '+' : ''}
                        {mod}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--color-text-dim)]">unassigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        className="mb-4"
        title={`Skills · Pick ${cls.skillChoiceCount} (${skills.length}/${cls.skillChoiceCount})`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {cls.skillChoiceFrom.map((s) => {
            const selected = skills.includes(s);
            const disabled = !selected && skills.length >= cls.skillChoiceCount;
            return (
              <button
                key={s}
                disabled={disabled}
                onClick={() => toggleSkill(s)}
                className={`text-left px-3 py-2 border text-sm transition-colors ${
                  selected
                    ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div>{SKILL_LABEL[s]}</div>
                <div className="text-[var(--color-text-dim)] text-xs mt-1">
                  {SKILL_DESCRIPTIONS[s]}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

interface NameAndConfirmStepProps {
  name: string;
  setName: (v: string) => void;
  cls: ReturnType<typeof getClass>;
  race: ReturnType<typeof getRace>;
  assignments: AbilityScores;
  skills: SkillName[];
}

function NameAndConfirmStep({
  name,
  setName,
  cls,
  race,
  assignments,
  skills,
}: NameAndConfirmStepProps) {
  const totals = useMemo(() => {
    return ABILITY_NAMES.map((a) => {
      const base = assignments[a];
      const bonus = race.abilityScoreBonuses[a] ?? 0;
      const total = base + bonus;
      return { ability: a, base, bonus, total, mod: abilityModifier(total) };
    });
  }, [assignments, race]);

  return (
    <>
      <Panel className="mb-4" title="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="Enter a name…"
          className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] focus:border-[var(--color-accent-amber)] outline-none px-3 py-2 text-[var(--color-text-primary)] tracking-wider"
        />
      </Panel>

      <Panel className="mb-4" title="Summary" tone="glow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-wider">
              Class
            </div>
            <div className="text-[var(--color-text-primary)] font-display">{cls.name}</div>
            <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
              {CLASS_BLURB[cls.id]}
            </div>
          </div>
          <div>
            <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-wider">
              Race
            </div>
            <div className="text-[var(--color-text-primary)] font-display">
              {RACE_LABEL[race.id]}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
              {RACE_BLURB[race.id]}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {totals.map(({ ability, total, mod }) => (
            <div
              key={ability}
              className="border border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] px-2 py-1 text-xs flex items-center justify-between gap-2"
            >
              <span className="text-[var(--color-accent-amber)] uppercase tracking-wider font-bold">
                {ABILITY_FULL_NAMES[ability]}
              </span>
              <span className="font-mono text-[var(--color-text-primary)] tabular-nums">
                {total}
                <span className="ml-1 text-[var(--color-accent-amber)]">
                  {mod >= 0 ? '+' : ''}
                  {mod}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-wider">
            Skills
          </div>
          <div className="text-[var(--color-text-primary)] text-sm mt-1">
            {skills.length > 0
              ? skills.map((s) => SKILL_LABEL[s]).join(' · ')
              : '—'}
          </div>
        </div>
      </Panel>
    </>
  );
}
