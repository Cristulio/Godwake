import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { PlayerPortrait } from '../combat/PlayerPortrait';
import { useGameStore } from '../../stores/gameStore';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { playMusic, stopMusic } from '../../engine/audio';
import { PhandalinScene } from './PhandalinScene';
import { LegendaryScreen } from './LegendaryScreen';
import { GlossaryScreen } from './GlossaryScreen';
import { AchievementsScreen } from './AchievementsScreen';
import { QuirkRow } from '../ui/QuirkBadge';
import { QuirkCard } from '../ui/QuirkCard';
import { isFeatureUnlocked } from '../../engine/progression/unlocks';
import { loadDelveFactory } from '../../engine/delve/loadDelveFactory';
import { runAchievementCheck } from '../../engine/achievements/check';
import { useT } from '../../i18n/useT';

export function HubScreen() {
  const { t, tc } = useT();
  const character = useGameStore((s) => s.character);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startDelve = useGameStore((s) => s.startDelve);
  const goToDruidGrove = useGameStore((s) => s.goToDruidGrove);
  const goToCharacterSelect = useGameStore((s) => s.goToCharacterSelect);
  const chapter1Cleared = useGameStore((s) => s.chapter1Cleared);
  const hasReincarnated = useGameStore((s) => s.hasReincarnated);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const selectedAscension = useGameStore((s) => s.selectedAscension);
  const newGamePlusActive = useGameStore((s) => s.newGamePlusActive);
  const ownedLegendaries = useGameStore((s) => s.ownedLegendaries);
  const equippedRelics = useGameStore((s) => s.equippedRelics);
  const delveCount = useGameStore((s) => s.delveCount);
  const deathCount = useGameStore((s) => s.deathCount);
  const chaptersCleared = useGameStore((s) => s.chaptersCleared);
  const renownSpent = useGameStore((s) => s.renownSpent);
  const progressionMeta = { delveCount, chaptersCleared, renownSpent, druidGroveUnlocked, hasReincarnated };
  const groveUnlocked = isFeatureUnlocked('grove', progressionMeta);
  const legendariesUnlocked = isFeatureUnlocked('legendaries', progressionMeta);
  // Elites are intentionally always available (players choose the risk). Re-enable
  // the delve gate by restoring the line below.
  // const elitesEnabled = isFeatureUnlocked('elite-nodes', progressionMeta);
  const elitesEnabled = true;
  const [view, setView] = useState<'hub' | 'relics' | 'glossary' | 'achievements'>('hub');

  useEffect(() => {
    playMusic('hub_theme');
    return () => {
      stopMusic();
    };
  }, []);

  // Hub return is the catch-all evaluation moment: surface any achievement the
  // last run earned but whose toast the player may have missed mid-delve.
  useEffect(() => {
    runAchievementCheck();
  }, []);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        {t('hub.noCharacter')}
        <Button onClick={goToTitle}>{t('hub.title')}</Button>
      </div>
    );
  }

  const race = getRace(character.raceId);
  const cls = getClass(character.classId);

  async function handleEnterDungeon() {
    // Hades-style: one delve, every run. All chapters chain. Chapters
    // unlock progressively within the run, not via separate hub entries.
    void chapter1Cleared; // referenced for future "skip already-cleared" flag
    // Ascension is chosen in the title's New Game+ launcher and stored on the
    // soul; every descent of the run (incl. post-death re-descents) reuses it.
    // createGodwakeDelve pulls the full chapter/bestiary graph — load it on
    // descend so it stays out of the initial bundle.
    const createGodwakeDelve = await loadDelveFactory();
    if (!createGodwakeDelve) return; // chunk load failed — recovery reload in flight
    // A New Game+ campaign builds the full Cells→Throne chain on every descent,
    // including these post-death hub re-descents; a base campaign builds only the
    // Cells→Velnaris arc.
    const delve = createGodwakeDelve({
      ascension: selectedAscension,
      elitesEnabled,
      fullChain: newGamePlusActive,
    });
    startDelve(delve);
  }

  // Before the first death, the hub does not exist for the player — they
  // wake in the cells, fight, die. This view only renders as a fallback if
  // they reload mid-delve and lose the session-only delve state. Keep it
  // minimal: one prompt, one button, no town and no choices.
  if (!hasReincarnated) {
    return <FirstLifeFallback name={character.name} onDescend={handleEnterDungeon} onTitle={goToTitle} t={t} />;
  }

  // The reliquary opens only once the soul has earned a relic (progressive
  // onboarding) — the button below is hidden until then, so this is reachable
  // only with at least one owned.
  if (view === 'relics') {
    return <LegendaryScreen onBack={() => setView('hub')} />;
  }

  if (view === 'glossary') {
    return <GlossaryScreen onBack={() => setView('hub')} />;
  }

  if (view === 'achievements') {
    return <AchievementsScreen onBack={() => setView('hub')} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 justify-between items-end mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]" style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}>
            WAKEFORD
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            {t('hub.location')}
          </p>
          <p className="text-[var(--color-text-dim)] text-[10px] italic tracking-widest mt-1">
            {t('hub.soulsWalked', { n: deathCount })}
          </p>
        </div>
        <Button variant="ghost" onClick={goToTitle}>
          {t('hub.backTitle')}
        </Button>
      </header>

      <PhandalinScene druidGroveUnlocked={groveUnlocked} />

      <Panel tone="glow" className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div
            aria-hidden
            className="w-16 h-20 panel-etched border border-[var(--color-border-warm)] flex items-end justify-center overflow-hidden shrink-0"
          >
            <PlayerPortrait classId={character.classId} className="h-[4.5rem] w-auto" />
          </div>
          <div className="flex-1 min-w-0 self-stretch flex flex-col justify-center">
            <div className="font-display text-[var(--color-accent-amber)] text-sm uppercase tracking-widest" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}>
              {character.name}
            </div>
            <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mt-0.5">
              {tc('races', race.id, 'name', race.name)} {tc('classes', cls.id, 'name', cls.name)} · <span className="text-[var(--color-accent-amber)]">{t('hub.levelInline', { n: character.level })}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-[9px] text-[var(--color-text-dim)] tracking-widest">{t('hub.hp')}</span>
              <span className="font-mono text-[var(--color-text-primary)] text-sm">{character.hp.current}/{character.hp.max}</span>
              <div className="flex-1 h-2 bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] overflow-hidden relative max-w-xs">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    character.hp.current / character.hp.max > 0.5
                      ? 'bg-gradient-to-r from-[var(--color-status-poison)] to-[#5a8013]'
                      : character.hp.current / character.hp.max > 0.25
                        ? 'bg-gradient-to-r from-[var(--color-accent-amber)] to-[var(--color-accent-torch)]'
                        : 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)] animate-pulse'
                  }`}
                  style={{ width: `${(character.hp.current / character.hp.max) * 100}%` }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"
                  style={{ width: `${(character.hp.current / character.hp.max) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-3">
              <QuirkRow quirkIds={character.quirks} emptyText={t('hub.noMarks')} />
            </div>
          </div>
          <div className="shrink-0 self-start basis-full w-full sm:basis-auto sm:w-auto flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={goToCharacterSelect}
              className="w-full"
            >
              {t('hub.changeCharacter')}
            </Button>
            <Button
              variant="ghost"
              onClick={useGameStore.getState().goToInventory}
              className="w-full"
            >
              {t('hub.backpack')}
            </Button>
          </div>
        </div>
      </Panel>

      {character.quirks.length > 0 && (
        <Panel className="mb-6" title={t('hub.quirksTitle')}>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            {t('hub.quirksIntro')}
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {character.quirks.map((id) => (
              <QuirkCard key={id} quirkId={id} />
            ))}
          </div>
        </Panel>
      )}

      {/* Single descent. Chapters unfold inside the delve, not on the
          hub. Grove is the only place that takes coin for permanent
          purchases — and it spends renown, not gold. */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel tone="warm" title={t('hub.descentTitle')}>
          <p className="text-[var(--color-text-secondary)] text-sm mb-4 leading-relaxed">
            {t('hub.descentBody')}
          </p>
          <Button variant="primary" size="lg" onClick={handleEnterDungeon}>
            {selectedAscension > 0
              ? t('hub.descendAscension', { n: selectedAscension })
              : t('hub.descend')}
          </Button>
        </Panel>
        <Panel
          tone={groveUnlocked ? 'glow' : 'default'}
          title={t('hub.groveTitle')}
        >
          <p className="text-[var(--color-text-secondary)] text-sm mb-4 leading-relaxed">
            {groveUnlocked ? t('hub.groveUnlocked') : t('hub.groveLocked')}
          </p>
          <Button
            variant={groveUnlocked ? 'primary' : 'secondary'}
            disabled={!groveUnlocked}
            onClick={goToDruidGrove}
          >
            {groveUnlocked ? t('hub.tendSoul') : t('hub.groveSealed')}
          </Button>
        </Panel>
      </div>

      <div
        className={`mt-8 grid gap-3 text-center ${
          legendariesUnlocked ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'
        }`}
      >
        <StatTile label={t('hub.renown')} value={character.renown} accent="amber" glyph="◆" />
        <button
          type="button"
          onClick={useGameStore.getState().goToCodex}
          className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
            {t('hub.bestiary')}
          </div>
          <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
            {t('hub.open')}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setView('glossary')}
          className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
            {t('hub.glossary')}
          </div>
          <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
            {t('hub.open')}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setView('achievements')}
          className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
            {t('hub.achievements')}
          </div>
          <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
            {t('hub.open')}
          </div>
        </button>
        {legendariesUnlocked && (
          <button
            type="button"
            onClick={() => setView('relics')}
            className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
          >
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
              {t('hub.relics')}
            </div>
            <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
              {ownedLegendaries.length > 0
                ? t('hub.relicsBound', { n: Object.keys(equippedRelics).length })
                : t('hub.open')}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  accent: 'gold' | 'amber' | 'primary';
  glyph?: string;
}

function StatTile({ label, value, accent, glyph }: StatTileProps) {
  const accentClass =
    accent === 'gold'
      ? 'text-[var(--color-accent-gold)]'
      : accent === 'amber'
        ? 'text-[var(--color-accent-amber)]'
        : 'text-[var(--color-text-primary)]';
  return (
    <div className="panel-etched border border-[var(--color-border-warm)] p-4 text-center">
      <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
        {glyph && <span className="text-[var(--color-accent-gold)]">{glyph}</span>}
        {label}
      </div>
      <div
        className={`font-mono text-2xl ${accentClass}`}
        style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
      >
        {value}
      </div>
    </div>
  );
}

interface FirstLifeFallbackProps {
  name: string;
  onDescend: () => void;
  onTitle: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function FirstLifeFallback({ name, onDescend, onTitle, t }: FirstLifeFallbackProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 text-center">
      <div>
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-[0.4em] mb-2">
          {t('hub.firstLife.ironCells')}
        </div>
        <h1
          className="text-3xl md:text-4xl text-[var(--color-accent-amber)] italic"
          style={{ textShadow: '0 0 24px rgba(244,167,66,0.4), 0 0 12px rgba(0,0,0,0.8)' }}
        >
          {t('hub.firstLife.wake', { name })}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm italic mt-4 max-w-xl leading-relaxed">
          {t('hub.firstLife.body')}
        </p>
      </div>
      <Button variant="primary" onClick={onDescend}>
        {t('hub.firstLife.descend')}
      </Button>
      <button
        type="button"
        onClick={onTitle}
        className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic hover:text-[var(--color-text-secondary)]"
      >
        {t('hub.backTitle')}
      </button>
    </div>
  );
}

