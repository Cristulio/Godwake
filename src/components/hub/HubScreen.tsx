import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { createGodwakeDelve } from '../../engine/delve';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { playMusic, stopMusic } from '../../engine/audio';
import { PhandalinScene } from './PhandalinScene';
import { QuirkRow } from '../ui/QuirkBadge';
import { QuirkCard } from '../ui/QuirkCard';

export function HubScreen() {
  const character = useGameStore((s) => s.character);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startDelve = useGameStore((s) => s.startDelve);
  const goToDruidGrove = useGameStore((s) => s.goToDruidGrove);
  const chapter1Cleared = useGameStore((s) => s.chapter1Cleared);
  const hasReincarnated = useGameStore((s) => s.hasReincarnated);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);

  useEffect(() => {
    playMusic('hub_ambient');
    return () => {
      stopMusic();
    };
  }, []);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. Return to title.
        <Button onClick={goToTitle}>Title</Button>
      </div>
    );
  }

  const race = getRace(character.raceId);
  const cls = getClass(character.classId);

  function handleEnterDungeon() {
    // Hades-style: one delve, every run. All chapters chain. Chapters
    // unlock progressively within the run, not via separate hub entries.
    void chapter1Cleared; // referenced for future "skip already-cleared" flag
    const delve = createGodwakeDelve();
    startDelve(delve);
  }

  // Before the first death, the hub does not exist for the player — they
  // wake in the cells, fight, die. This view only renders as a fallback if
  // they reload mid-delve and lose the session-only delve state. Keep it
  // minimal: one prompt, one button, no town and no choices.
  if (!hasReincarnated) {
    return <FirstLifeFallback name={character.name} onDescend={handleEnterDungeon} onTitle={goToTitle} />;
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]" style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}>
            PHANDALIN
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            Sword Coast · Chapter I · The Mage's Cells
          </p>
        </div>
        <Button variant="ghost" onClick={goToTitle}>
          ← Title
        </Button>
      </header>

      <PhandalinScene druidGroveUnlocked={druidGroveUnlocked} />

      <Panel tone="glow" className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 panel-etched border border-[var(--color-border-warm)] flex items-center justify-center text-3xl shrink-0">
            <span aria-hidden>🛡️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[var(--color-accent-amber)] text-sm uppercase tracking-widest" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}>
              {character.name}
            </div>
            <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mt-0.5">
              {race.name} {cls.name} · <span className="text-[var(--color-accent-amber)]">Level {character.level}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-[9px] text-[var(--color-text-dim)] tracking-widest">HP</span>
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
              <QuirkRow quirkIds={character.quirks} emptyText="The soul wears no marks this life" />
            </div>
          </div>
        </div>
      </Panel>

      {character.quirks.length > 0 && (
        <Panel className="mb-6" title="Quirks of this Incarnation">
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            The soul carries scars and gifts from death to death. These shape the life you wear now —
            until you fall again, and the wheel turns.
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
        <Panel tone="warm" title="The Descent">
          <p className="text-[var(--color-text-secondary)] text-sm mb-4 leading-relaxed">
            One road, many rooms. The cells beneath Tresendar Manor open onto a longer dark — chapter by chapter, the wheel turns. Gold and XP belong to the road; only renown returns.
          </p>
          <Button variant="primary" size="lg" onClick={handleEnterDungeon}>
            ▸ Descend
          </Button>
        </Panel>
        <Panel
          tone={druidGroveUnlocked ? 'glow' : 'default'}
          title="The Druid Grove"
        >
          <p className="text-[var(--color-text-secondary)] text-sm mb-4 leading-relaxed">
            {druidGroveUnlocked
              ? 'The circle of Mielikki tends the Wellspring. They will return you to life when you fall — and shape what comes back. Spend renown here.'
              : 'A clearing past the treeline. Smoke drifts from somewhere within, but no path opens for you. Renown enough to barter has not yet reached the keepers.'}
          </p>
          <Button
            variant={druidGroveUnlocked ? 'primary' : 'secondary'}
            disabled={!druidGroveUnlocked}
            onClick={goToDruidGrove}
          >
            {druidGroveUnlocked ? '◆ Tend the Soul' : 'Sealed to you'}
          </Button>
        </Panel>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <StatTile label="Renown" value={character.renown} accent="amber" glyph="◆" />
        <button
          type="button"
          onClick={useGameStore.getState().goToCodex}
          className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
            ☥ Bestiary
          </div>
          <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
            Open →
          </div>
        </button>
        <button
          type="button"
          onClick={useGameStore.getState().goToInventory}
          className="panel-etched border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] p-4 transition-colors text-center group"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 group-hover:text-[var(--color-accent-amber)]">
            ⛁ Inventory
          </div>
          <div className="text-base text-[var(--color-text-primary)] uppercase tracking-wider group-hover:text-[var(--color-accent-amber)]">
            Open →
          </div>
        </button>
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
}

function FirstLifeFallback({ name, onDescend, onTitle }: FirstLifeFallbackProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 text-center">
      <div>
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-[0.4em] mb-2">
          The Iron Cells
        </div>
        <h1
          className="text-3xl md:text-4xl text-[var(--color-accent-amber)] italic"
          style={{ textShadow: '0 0 24px rgba(244,167,66,0.4), 0 0 12px rgba(0,0,0,0.8)' }}
        >
          You wake in the dark, {name}.
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm italic mt-4 max-w-xl leading-relaxed">
          The cell stinks of old iron and older blood. There is no light, no door you can name —
          only the corridor ahead, and the things the master left to keep it.
        </p>
      </div>
      <Button variant="primary" onClick={onDescend}>
        Descend →
      </Button>
      <button
        type="button"
        onClick={onTitle}
        className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic hover:text-[var(--color-text-secondary)]"
      >
        ← Title
      </button>
    </div>
  );
}

