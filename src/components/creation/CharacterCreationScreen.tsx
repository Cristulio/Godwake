import { useState } from 'react';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { listRaces, getRace } from '../../content/races';
import { listClasses, getClass } from '../../content/classes';
import { RaceIdSchema, ClassIdSchema, type RaceId, type ClassId } from '../../schemas/ids';
import {
  ABILITY_NAMES,
  ABILITY_FULL_NAMES,
  abilityModifier,
  type AbilityName,
  type AbilityScores,
} from '../../types/abilities';
import { STANDARD_ARRAY } from '../../engine/character/initialize';
import { SIR_BRICK_PRESET } from '../../engine/character/defaultCharacter';
import type { SkillName } from '../../types/skills';

const RACE_LABEL: Record<RaceId, string> = {
  human: 'Human',
  'half-elf': 'Half-Elf',
  elf: 'Elf',
  dwarf: 'Dwarf',
  halfling: 'Halfling',
  'half-orc': 'Half-Orc',
  gnome: 'Gnome',
};

const CLASS_LABEL: Record<ClassId, string> = {
  fighter: 'Fighter',
  wizard: 'Wizard',
  cleric: 'Cleric',
  rogue: 'Rogue',
  barbarian: 'Barbarian',
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
  'half-elf': 'Walkers between two worlds. Charisma-tilted and resilient.',
  elf: 'Long-lived and keen-eyed. Trance instead of sleep.',
  dwarf: 'Stone-blooded, axe-handed, suspicious of magic.',
  halfling: 'Small, lucky, and harder to pin down than they look.',
  'half-orc': 'Strength and stamina; the rage of one heritage, the wits of the other.',
  gnome: 'Tinker-souled and curious. Small frames, bright minds.',
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

const ALL_RACE_IDS = RaceIdSchema.options;
const ALL_CLASS_IDS = ClassIdSchema.options;
const IMPLEMENTED_RACE_IDS = new Set(listRaces().map((r) => r.id));
const IMPLEMENTED_CLASS_IDS = new Set(listClasses().map((c) => c.id));

export function CharacterCreationScreen() {
  const commit = useGameStore((s) => s.commitCharacterCreation);
  const goToTitle = useGameStore((s) => s.goToTitle);

  const [name, setName] = useState('');
  const [raceId, setRaceId] = useState<RaceId>('human');
  const [classId, setClassId] = useState<ClassId>('fighter');
  const [assignments, setAssignments] = useState<Partial<Record<AbilityName, number>>>({});
  const [skills, setSkills] = useState<SkillName[]>([]);

  const race = getRace(raceId);
  const cls = getClass(classId);

  const allAssigned = ABILITY_NAMES.every((a) => typeof assignments[a] === 'number');
  const skillsValid = skills.length === cls.skillChoiceCount;
  const nameValid = name.trim().length > 0;
  const canConfirm = nameValid && allAssigned && skillsValid;

  function assignAbility(ability: AbilityName, value: number | null) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (value == null) delete next[ability];
      else next[ability] = value;
      return next;
    });
  }

  function pickClass(next: ClassId) {
    if (next === classId) return;
    setClassId(next);
    setSkills([]); // skill list depends on class — clear on change
  }

  function toggleSkill(s: SkillName) {
    setSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= cls.skillChoiceCount) return prev;
      return [...prev, s];
    });
  }

  function applyPreset() {
    setName(SIR_BRICK_PRESET.name);
    setRaceId(SIR_BRICK_PRESET.raceId);
    setClassId(SIR_BRICK_PRESET.classId);
    setAssignments({ ...SIR_BRICK_PRESET.baseAbilityScores });
    setSkills([...SIR_BRICK_PRESET.skillProficiencies]);
  }

  function confirm() {
    if (!canConfirm) return;
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

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-end mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-3xl md:text-4xl text-[var(--color-accent-amber)] tracking-widest">
            FORGE A SOUL
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            The wheel turns. Choose the shape it takes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={applyPreset}>
            Sir Brick Preset
          </Button>
          <Button variant="secondary" onClick={goToTitle}>
            ← Title
          </Button>
        </div>
      </header>

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

      <Panel className="mb-4" title="Race">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ALL_RACE_IDS.map((id) => {
            const implemented = IMPLEMENTED_RACE_IDS.has(id);
            const selected = id === raceId;
            return (
              <button
                key={id}
                disabled={!implemented}
                onClick={() => setRaceId(id)}
                className={`text-left p-3 border transition-colors ${
                  selected
                    ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                    : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-warm)]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm">
                  {RACE_LABEL[id]}
                </div>
                <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
                  {implemented ? RACE_BLURB[id] : 'Coming soon'}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="mb-4" title="Class">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {ALL_CLASS_IDS.map((id) => {
            const implemented = IMPLEMENTED_CLASS_IDS.has(id);
            const selected = id === classId;
            return (
              <button
                key={id}
                disabled={!implemented}
                onClick={() => pickClass(id)}
                className={`text-left p-3 border transition-colors ${
                  selected
                    ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                    : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-warm)]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm">
                  {CLASS_LABEL[id]}
                </div>
                <div className="text-[var(--color-text-secondary)] text-xs mt-1 leading-relaxed">
                  {implemented ? CLASS_BLURB[id] : 'Coming soon'}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="mb-4" title={`Ability Scores · Standard Array (${STANDARD_ARRAY.join(', ')})`}>
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
                    const takenElsewhere = !isMine && Object.entries(assignments).some(
                      ([a, av]) => a !== ability && av === v,
                    );
                    // Allow duplicate values in the array (none in standard) by also
                    // indexing each chip — we still want one click per usage.
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
                        <span className="text-[var(--color-text-dim)]"> ({assigned}+{racialBonus})</span>
                      )}
                      <span className="ml-2 text-[var(--color-accent-amber)]">
                        {mod! >= 0 ? '+' : ''}{mod}
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

      <Panel className="mb-4" title={`Skills · Pick ${cls.skillChoiceCount} (${skills.length}/${cls.skillChoiceCount})`}>
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
                {SKILL_LABEL[s]}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--color-border-warm)]">
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">
          {canConfirm
            ? 'Ready to walk the world.'
            : 'Complete every section above.'}
        </div>
        <Button variant="primary" disabled={!canConfirm} onClick={confirm}>
          Begin
        </Button>
      </div>
    </div>
  );
}
