import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { playSfx } from '../../engine/audio';
import { Panel } from '../ui/Panel';
import { getClass } from '../../content/classes';
import {
  hpGainForLevelUp,
  availableWizardSpellsForLearn,
  wizardSpellLearnTierForLevel,
  asiPlanCost,
  ASI_POINT_BUDGET,
  ABILITY_SCORE_CAP,
} from '../../engine/character/leveling';
import { effectiveAbilityScores } from '../../engine/character/derived';
import type { AbilityName, AbilityScores } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { Spell, SpellLevel } from '../../schemas/spell';

function spellScopeLabel(target: Spell['target']): string {
  switch (target) {
    case 'area': return 'Hits all enemies';
    case 'single': return 'Hits one enemy';
    case 'self': return 'Self only';
  }
}

/** "1st", "2nd", "3rd", "4th"… for the slot-tier reveal copy. */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

const SCHOOL_LABEL: Record<Spell['school'], string> = {
  abjuration: 'Abjuration',
  conjuration: 'Conjuration',
  divination: 'Divination',
  enchantment: 'Enchantment',
  evocation: 'Evocation',
  illusion: 'Illusion',
  necromancy: 'Necromancy',
  transmutation: 'Transmutation',
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
  const [pickedSpellId, setPickedSpellId] = useState<string | null>(null);
  const [pickedArchetypeId, setPickedArchetypeId] = useState<string | null>(null);

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
    // Spell-learn prompts (learn-*) are fully represented by the selectable
    // spell cards below — drop their blurbs so the options aren't listed twice.
  ].filter((f) => !f.id.startsWith('learn-'));
  const hpDelta = hpGainForLevelUp(c);
  const isAsiLevel = features.some((f) => f.mechanicKey === 'asi');

  // The score an ASI raises *from* is the current effective value (race + any
  // prior ASI gains). Cost is weighted: a +1 starting at 18+ eats 2 of the
  // 2-point budget, so the whole improvement goes into a single high stat.
  const eff = effectiveAbilityScores(c);
  const pointsSpent = asiPlanCost(eff, asiPlan);
  const asiValid = !isAsiLevel || pointsSpent === ASI_POINT_BUDGET;

  const spellLearnTier: SpellLevel | null =
    c.classId === 'wizard' ? wizardSpellLearnTierForLevel(nextLevel) : null;
  const availableSpells: Spell[] =
    spellLearnTier === null ? [] : availableWizardSpellsForLearn(c, spellLearnTier);
  const needsSpellPick = spellLearnTier !== null && availableSpells.length > 0;
  const spellValid = !needsSpellPick || pickedSpellId !== null;

  // Archetype pick: at the class's subclass level, when the player hasn't yet
  // committed to one and the class offers more than one. The chosen id is
  // applied via the subclassId override; applyLevelUp preserves it (and falls
  // back to the first archetype for any caller that skips the pick).
  const needsArchetypePick =
    nextLevel >= cls.subclassLevel && !c.subclassId && cls.subclasses.length > 1;
  const archetypeValid = !needsArchetypePick || pickedArchetypeId !== null;

  function bump(ability: AbilityName, delta: number) {
    setAsiPlan((prev) => {
      const current = prev[ability] ?? 0;
      // Never carry a score past the cap, and never more than +2 from one ASI.
      const headroom = Math.max(0, Math.min(2, ABILITY_SCORE_CAP - eff[ability]));
      const next = Math.max(0, Math.min(headroom, current + delta));
      const candidate = { ...prev, [ability]: next };
      // Reject any plan whose weighted cost (1 below 18, 2 at 18+) overspends.
      if (asiPlanCost(eff, candidate) > ASI_POINT_BUDGET) return prev;
      return candidate;
    });
  }

  function handleContinue() {
    if (!asiValid || !spellValid || !archetypeValid) return;
    const overrides: Partial<Character> = {};
    if (needsArchetypePick && pickedArchetypeId) {
      overrides.subclassId = pickedArchetypeId;
    }
    if (isAsiLevel) {
      const prev = c.runAsiGains ?? {};
      const next: Partial<AbilityScores> = { ...prev };
      for (const ab of ABILITY_ORDER) {
        const gain = asiPlan[ab] ?? 0;
        if (gain) next[ab] = (next[ab] ?? 0) + gain;
      }
      overrides.runAsiGains = next;
    }
    if (needsSpellPick && pickedSpellId) {
      const existing = c.resources.knownSpells ?? [];
      overrides.resources = {
        ...c.resources,
        knownSpells: [...existing, pickedSpellId],
      };
    }
    applyPendingLevelUp(Object.keys(overrides).length > 0 ? overrides : undefined);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12 gap-6 md:gap-8 relative overflow-hidden animate-fade-in-slow">
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
              +2 to one ability, or +1 to two — but a score already at 18+ costs 2 per point. ({pointsSpent}/{ASI_POINT_BUDGET} spent)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ABILITY_ORDER.map((ab) => {
                const base = c.baseAbilityScores[ab];
                const planned = asiPlan[ab] ?? 0;
                const finalEffective = eff[ab] + planned;
                const nextStepCost = eff[ab] + planned >= 18 ? 2 : 1;
                const canIncrement =
                  planned < 2 &&
                  eff[ab] + planned < ABILITY_SCORE_CAP &&
                  pointsSpent + nextStepCost <= ASI_POINT_BUDGET;
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
                        disabled={!canIncrement}
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

        {needsArchetypePick && (
          <Panel
            title={`Choose your Archetype — pick 1 (${pickedArchetypeId ? 1 : 0}/1)`}
            tone="glow"
          >
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              A lasting path — it shapes which gear and playstyle reward you. This choice sticks for the run.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {cls.subclasses.map((sub) => {
                const selected = pickedArchetypeId === sub.id;
                const feat = sub.featuresByLevel[String(cls.subclassLevel)]?.[0];
                return (
                  <button
                    key={sub.id}
                    onClick={() => setPickedArchetypeId(selected ? null : sub.id)}
                    className={`text-left px-3 py-2 border text-sm transition-colors ${
                      selected
                        ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-text-primary)]'
                        : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'
                    }`}
                  >
                    <div className="font-display text-[var(--color-text-primary)] text-[12px] uppercase tracking-[0.18em]">
                      {sub.name}
                    </div>
                    {feat && (
                      <div className="text-[var(--color-text-secondary)] text-xs mt-1.5 leading-relaxed normal-case tracking-normal">
                        {feat.description}
                      </div>
                    )}
                    <div className="text-[var(--color-text-dim)] text-[11px] mt-1.5 italic normal-case tracking-normal">
                      {sub.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {needsSpellPick && (
          <Panel
            title={`Learn a New Spell — pick 1 (${pickedSpellId ? 1 : 0}/1)`}
            tone="warm"
          >
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              {spellLearnTier !== null &&
                `Your first ${ordinal(spellLearnTier)}-level slot opens — a working to fill it.`}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableSpells.map((sp) => {
                const selected = pickedSpellId === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => setPickedSpellId(selected ? null : sp.id)}
                    className={`text-left px-3 py-2 border text-sm transition-colors ${
                      selected
                        ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-text-primary)]'
                        : 'border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display text-[var(--color-text-primary)] text-[12px] uppercase tracking-[0.18em]">
                        {sp.name}
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
                        L{sp.level} · {SCHOOL_LABEL[sp.school]}
                      </div>
                    </div>
                    <div className="text-[var(--color-text-dim)] text-[11px] mt-1 normal-case tracking-normal">
                      {spellScopeLabel(sp.target)}
                      {sp.damageType ? ` · ${sp.damageType}` : ''}
                    </div>
                    <div className="text-[var(--color-text-secondary)] text-xs mt-1.5 leading-relaxed normal-case tracking-normal">
                      {sp.description}
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
            disabled={!asiValid || !spellValid || !archetypeValid}
          >
            {!archetypeValid
              ? 'Choose an archetype'
              : isAsiLevel && !asiValid
              ? `Place ${ASI_POINT_BUDGET - pointsSpent} more point${
                  ASI_POINT_BUDGET - pointsSpent === 1 ? '' : 's'
                }`
              : !spellValid
                ? 'Pick a spell'
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
