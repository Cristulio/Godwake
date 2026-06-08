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
import { localizedDamageType } from '../inventory/itemDisplay';
import { useT } from '../../i18n/useT';

const ABILITY_ORDER: AbilityName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function LevelUpScreen() {
  const { t, tc } = useT();
  const spellScopeLabel = (target: Spell['target']): string => {
    switch (target) {
      case 'area': return t('ui.combat.hitsAll');
      case 'single': return t('ui.combat.hitsOne');
      case 'self': return t('ui.combat.selfOnly');
    }
  };
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
  // `tcId` is the es/classes.json overlay key (base feature vs subclass feature
  // use different composite keys — see the completeness test's scheme).
  const features = [
    ...(cls.featuresByLevel[String(nextLevel)] ?? []).map((f) => ({
      f,
      tcId: `${cls.id}.${f.id}`,
    })),
    ...(effectiveSubclassId
      ? (cls.subclasses.find((s) => s.id === effectiveSubclassId)?.featuresByLevel[
          String(nextLevel)
        ] ?? []).map((f) => ({ f, tcId: `${cls.id}.${effectiveSubclassId}.${f.id}` }))
      : []),
    // Spell-learn prompts (learn-*) are fully represented by the selectable
    // spell cards below — drop their blurbs so the options aren't listed twice.
  ].filter(({ f }) => !f.id.startsWith('learn-'));
  const hpDelta = hpGainForLevelUp(c);
  const isAsiLevel = features.some(({ f }) => f.mechanicKey === 'asi');

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
            {t('ui.level.soulTempers')}
          </div>
          <h1
            className="font-display text-2xl md:text-4xl text-[var(--color-accent-amber)] tracking-[0.25em]"
            style={{
              textShadow:
                '0 0 28px rgba(244,167,66,0.7), 0 0 12px rgba(244,167,66,0.9), 0 3px 0 rgba(0,0,0,0.9)',
            }}
          >
            ◆ {t('ui.level.levelN', { n: nextLevel })} ◆
          </h1>
          <div className="text-[var(--color-text-secondary)] text-xs mt-3 uppercase tracking-[0.3em]">
            {c.name} · {tc('classes', cls.id, 'name', cls.name)}
          </div>
        </div>

        <Panel title={t('ui.level.body')}>
          <div className="flex items-baseline gap-4 flex-wrap">
            <div className="text-[var(--color-text-secondary)] text-sm">{t('ui.level.maxHp')}</div>
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
              {t('ui.level.hpGain', { n: hpDelta })}
            </div>
          </div>
        </Panel>

        {features.length > 0 && (
          <Panel title={t('ui.level.newFeatures')} tone="glow" className="animate-scale-in">
            <ul className="flex flex-col gap-3">
              {features.map(({ f, tcId }) => (
                <li key={f.id} className="border-l-2 border-[var(--color-accent-amber)] pl-3">
                  <div className="font-display text-[var(--color-text-primary)] text-[11px] uppercase tracking-[0.2em]">
                    {tc('classes', tcId, 'name', f.name)}
                  </div>
                  <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed mt-1.5">
                    {tc('classes', tcId, 'description', f.description)}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {isAsiLevel && (
          <Panel title={t('ui.level.asiTitle')} tone="warm">
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              {t('ui.level.asiHint', { spent: pointsSpent, budget: ASI_POINT_BUDGET })}
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
                        {t(`ui.level.ability.${ab}`)}
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
            title={t('ui.level.archetypeTitle', { n: pickedArchetypeId ? 1 : 0 })}
            tone="glow"
          >
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              {t('ui.level.archetypeHint')}
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
                      {tc('classes', `${cls.id}.${sub.id}`, 'name', sub.name)}
                    </div>
                    {feat && (
                      <div className="text-[var(--color-text-secondary)] text-xs mt-1.5 leading-relaxed normal-case tracking-normal">
                        {tc('classes', `${cls.id}.${sub.id}.${feat.id}`, 'description', feat.description)}
                      </div>
                    )}
                    <div className="text-[var(--color-text-dim)] text-[11px] mt-1.5 italic normal-case tracking-normal">
                      {tc('classes', `${cls.id}.${sub.id}`, 'description', sub.description)}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {needsSpellPick && (
          <Panel
            title={t('ui.level.spellTitle', { n: pickedSpellId ? 1 : 0 })}
            tone="warm"
          >
            <div className="text-[var(--color-text-dim)] text-xs mb-3 uppercase tracking-widest">
              {spellLearnTier !== null && t('ui.level.slotOpens', { n: spellLearnTier })}
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
                        {tc('spells', sp.id, 'name', sp.name)}
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
                        L{sp.level} · {t(`ui.level.school.${sp.school}`)}
                      </div>
                    </div>
                    <div className="text-[var(--color-text-dim)] text-[11px] mt-1 normal-case tracking-normal">
                      {spellScopeLabel(sp.target)}
                      {sp.damageType ? ` · ${localizedDamageType(sp.damageType)}` : ''}
                    </div>
                    <div className="text-[var(--color-text-secondary)] text-xs mt-1.5 leading-relaxed normal-case tracking-normal">
                      {tc('spells', sp.id, 'description', sp.description)}
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
              ? t('ui.level.chooseArchetype')
              : isAsiLevel && !asiValid
              ? t(
                  ASI_POINT_BUDGET - pointsSpent === 1
                    ? 'ui.level.placePoint'
                    : 'ui.level.placePoints',
                  { n: ASI_POINT_BUDGET - pointsSpent },
                )
              : !spellValid
                ? t('ui.level.pickSpell')
                : t('ui.level.continueArrow')}
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
