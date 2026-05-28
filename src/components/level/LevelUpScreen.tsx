import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { playSfx } from '../../engine/audio';
import { Panel } from '../ui/Panel';
import { getClass } from '../../content/classes';
import { hpGainForLevelUp } from '../../engine/character/leveling';
import { effectiveAbilityScores } from '../../engine/character/derived';
import type { AbilityName, AbilityScores } from '../../types/abilities';
import type { Character } from '../../types/character';
import { SKILL_DESCRIPTIONS, isSkillEnabled, type SkillName } from '../../types/skills';

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

const ABILITY_LABELS: Record<AbilityName, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_ORDER: AbilityName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function LevelUpScreen() {
  const character = useGameStore((s) => s.character);
  const applyPendingLevelUp = useGameStore((s) => s.applyPendingLevelUp);

  const [asiPlan, setAsiPlan] = useState<Partial<Record<AbilityName, number>>>({});
  const [pickedSkills, setPickedSkills] = useState<SkillName[]>([]);

  useEffect(() => {
    playSfx('level_up_sting');
  }, []);

  if (!character) return null;
  const c = character;

  const nextLevel = c.level + 1;
  const cls = getClass(c.classId);
  // If the subclass will be auto-picked at this level (only one available),
  // surface its features in the reveal too.
  const effectiveSubclassId =
    c.subclassId ??
    (nextLevel >= cls.subclassLevel && cls.subclasses.length === 1
      ? cls.subclasses[0].id
      : null);
  const features = [
    ...(cls.featuresByLevel[String(nextLevel)] ?? []),
    ...(effectiveSubclassId
      ? (cls.subclasses.find((s) => s.id === effectiveSubclassId)?.featuresByLevel[
          String(nextLevel)
        ] ?? [])
      : []),
  ];
  const hpDelta = hpGainForLevelUp(c);
  const isAsiLevel = features.some((f) => f.mechanicKey === 'asi');

  const skillGrants = cls.skillGrantsByLevel?.[String(nextLevel)] ?? 0;
  // Disabled (unwired) skills don't surface — match character creation.
  const availableSkills = cls.skillChoiceFrom.filter(
    (s) => isSkillEnabled(s) && !c.skillProficiencies.includes(s),
  );
  const skillsValid = pickedSkills.length === Math.min(skillGrants, availableSkills.length);

  const plannedTotal = Object.values(asiPlan).reduce<number>((a, b) => a + (b ?? 0), 0);
  const asiValid = !isAsiLevel || plannedTotal === 2;

  function bump(ability: AbilityName, delta: number) {
    setAsiPlan((prev) => {
      const current = prev[ability] ?? 0;
      const next = Math.max(0, Math.min(2, current + delta));
      const others = Object.entries(prev)
        .filter(([k]) => k !== ability)
        .reduce<number>((sum, [, v]) => sum + (v ?? 0), 0);
      if (next + others > 2) return prev;
      if (next === 2 && others > 0) return prev;
      return { ...prev, [ability]: next };
    });
  }

  function toggleSkill(s: SkillName) {
    setPickedSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= skillGrants) return prev;
      return [...prev, s];
    });
  }

  function handleContinue() {
    if (!asiValid || !skillsValid) return;
    const overrides: Partial<Character> = {};
    if (isAsiLevel) {
      const newBase: AbilityScores = { ...c.baseAbilityScores };
      for (const ab of ABILITY_ORDER) {
        newBase[ab] = (newBase[ab] ?? 0) + (asiPlan[ab] ?? 0);
      }
      overrides.baseAbilityScores = newBase;
    }
    if (pickedSkills.length > 0) {
      overrides.skillProficiencies = [...c.skillProficiencies, ...pickedSkills];
    }
    applyPendingLevelUp(Object.keys(overrides).length > 0 ? overrides : undefined);
  }

  const eff = effectiveAbilityScores(c);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8 relative overflow-hidden animate-fade-in-slow">
      <ForgeBackdrop />
      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-6">
        <div className="text-center animate-scale-in">
          <div className="font-narrative text-[var(--color-accent-amber)] text-sm italic tracking-[0.3em] mb-3">
            The soul tempers
          </div>
          <h1
            className="font-display text-2xl md:text-4xl text-[var(--color-accent-amber)] tracking-[0.25em]"
            style={{
              textShadow:
                '0 0 28px rgba(244,167,66,0.7), 0 0 12px rgba(244,167,66,0.9), 0 3px 0 rgba(0,0,0,0.9)',
            }}
          >
            ◆ LEVEL {nextLevel} ◆
          </h1>
          <div className="text-[var(--color-text-secondary)] text-xs mt-3 uppercase tracking-[0.3em]">
            {c.name} · {cls.name}
          </div>
        </div>

        <Panel title="Body">
          <div className="flex items-baseline gap-4 flex-wrap">
            <div className="text-[var(--color-text-secondary)] text-sm">Maximum HP</div>
            <div className="font-display text-[var(--color-text-primary)] text-lg">
              {c.hp.max}{' '}
              <span className="text-[var(--color-accent-amber)]">→ {c.hp.max + hpDelta}</span>
            </div>
            <div
              key={`hp-${nextLevel}`}
              className="font-display text-base animate-pop-in"
              style={{
                color: 'var(--color-dmg-heal)',
                textShadow: '0 0 14px rgba(111,217,84,0.5)',
              }}
            >
              +{hpDelta} HP
            </div>
          </div>
        </Panel>

        {features.length > 0 && (
          <Panel title="New features" tone="glow" className="animate-scale-in">
            <ul className="flex flex-col gap-3">
              {features.map((f) => (
                <li key={f.id} className="border-l-2 border-[var(--color-accent-amber)] pl-3">
                  <div className="font-display text-[var(--color-text-primary)] text-[11px] uppercase tracking-[0.2em]">
                    {f.name}
                  </div>
                  <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed mt-1.5">
                    {f.description}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {isAsiLevel && (
          <Panel title="Ability Score Improvement — spend 2 points" tone="warm">
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              +2 to one ability, or +1 to two. ({plannedTotal}/2 placed)
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ABILITY_ORDER.map((ab) => {
                const base = c.baseAbilityScores[ab];
                const planned = asiPlan[ab] ?? 0;
                const finalEffective = eff[ab] + planned;
                return (
                  <div
                    key={ab}
                    className="flex items-center justify-between border border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] px-3 py-2"
                  >
                    <div>
                      <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.18em]">
                        {ABILITY_LABELS[ab]}
                      </div>
                      <div className="text-[var(--color-text-dim)] text-xs mt-1 font-mono tabular-nums">
                        {base} → {finalEffective}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => bump(ab, -1)}
                        disabled={planned === 0}
                        className="!px-2 !py-0.5"
                      >
                        −
                      </Button>
                      <div className="w-7 text-center font-display text-[var(--color-accent-amber)] text-sm">
                        +{planned}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => bump(ab, +1)}
                        disabled={plannedTotal >= 2 || planned >= 2}
                        className="!px-2 !py-0.5"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {skillGrants > 0 && availableSkills.length > 0 && (
          <Panel
            title={`New Skill Proficiency — pick ${skillGrants} (${pickedSkills.length}/${Math.min(
              skillGrants,
              availableSkills.length,
            )})`}
            tone="warm"
          >
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              Already-trained skills are unavailable.
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {cls.skillChoiceFrom.filter(isSkillEnabled).map((s) => {
                const owned = c.skillProficiencies.includes(s);
                const selected = pickedSkills.includes(s);
                const disabled =
                  owned || (!selected && pickedSkills.length >= skillGrants);
                return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => toggleSkill(s)}
                    className={`text-left px-3 py-2 border text-sm transition-colors ${
                      selected
                        ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-text-primary)]'
                        : owned
                          ? 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-dim)] line-through'
                          : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div>{SKILL_LABEL[s]}</div>
                    <div className="text-[var(--color-text-dim)] text-xs mt-1 normal-case tracking-normal">
                      {SKILL_DESCRIPTIONS[s]}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        <div className="flex justify-center mt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            disabled={!asiValid || !skillsValid}
          >
            {isAsiLevel && !asiValid
              ? `Place ${2 - plannedTotal} more point${2 - plannedTotal === 1 ? '' : 's'}`
              : !skillsValid
                ? `Pick ${Math.min(skillGrants, availableSkills.length) - pickedSkills.length} more skill${
                    Math.min(skillGrants, availableSkills.length) - pickedSkills.length === 1
                      ? ''
                      : 's'
                  }`
                : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ForgeBackdrop() {
  return (
    <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,#1a0e0a_0%,#0a0604_100%)]">
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="forge-glow" cx="0.5" cy="0.7" r="0.5">
            <stop offset="0%" stopColor="#f4a742" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#c1542a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c1542a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="#0a0604" />
        <rect x="200" y="300" width="400" height="300" fill="url(#forge-glow)" />
        <g fill="#1a0e08" opacity="0.85">
          <rect x="0" y="520" width="800" height="80" />
        </g>
        <g fill="#2a1814" stroke="#0a0604" strokeWidth="1">
          <rect x="320" y="440" width="160" height="80" />
          <rect x="300" y="430" width="200" height="14" />
        </g>
        <g fill="#ffd76a">
          <circle cx="400" cy="450" r="18" opacity="0.95" />
          <circle cx="400" cy="450" r="32" opacity="0.45" />
        </g>
      </svg>
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}
