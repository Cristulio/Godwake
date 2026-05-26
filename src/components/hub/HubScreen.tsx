import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { createGodwakeDelve } from '../../engine/delve';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { PhandalinScene } from './PhandalinScene';
import { QuirkRow } from '../ui/QuirkBadge';
import { QuirkCard } from '../ui/QuirkCard';

interface Building {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cta?: string;
  lockedCta?: string;
}

function buildingsFor(druidGroveUnlocked: boolean, chapter1Cleared: boolean): Building[] {
  return [
    {
      id: 'druid-grove',
      name: 'The Druid Grove',
      description: druidGroveUnlocked
        ? 'The circle of Mielikki tends the Wellspring. They will return you to life when you fall — and shape what comes back.'
        : 'A clearing past the treeline. Smoke drifts from somewhere within, but no path opens for you. Renown enough to barter has not yet reached the keepers.',
      enabled: druidGroveUnlocked,
      cta: 'Tend the Soul',
      lockedCta: 'Sealed to you',
    },
    {
      id: 'iron-cells',
      name: chapter1Cleared ? 'The Long Road South' : 'The Iron Cells',
      description: chapter1Cleared
        ? "A staircase down through Tresendar Manor's ruined cellar. Past the duergar, the road bends south — Athkatla waits at the end of the Trade Way."
        : "A staircase down through Tresendar Manor's ruined cellar. The first dungeon under Phandalin.",
      enabled: true,
      cta: 'Delve',
    },
    {
      id: 'lionshield-coster',
      name: 'Lionshield Coster',
      description: 'A modest trading post. Potions, scrolls, and gear for the road ahead.',
      enabled: false,
    },
  ];
}

export function HubScreen() {
  const character = useGameStore((s) => s.character);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startDelve = useGameStore((s) => s.startDelve);
  const goToDruidGrove = useGameStore((s) => s.goToDruidGrove);
  const chapter1Cleared = useGameStore((s) => s.chapter1Cleared);
  const hasReincarnated = useGameStore((s) => s.hasReincarnated);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);

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
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            PHANDALIN
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Sword Coast · Chapter I · The Mage's Cells
          </p>
        </div>
        <Button variant="secondary" onClick={goToTitle}>
          ← Title
        </Button>
      </header>

      <PhandalinScene />

      <Panel className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-center justify-center text-3xl">
            <span aria-hidden>🛡️</span>
          </div>
          <div className="flex-1">
            <div className="text-[var(--color-accent-amber)] font-bold uppercase tracking-wider">
              {character.name}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
              {race.name} {cls.name} · Level {character.level}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs mt-1">
              HP {character.hp.current}/{character.hp.max}
            </div>
            <div className="mt-2">
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

      <div className="grid md:grid-cols-3 gap-4">
        {buildingsFor(druidGroveUnlocked, chapter1Cleared).map((b) => (
          <Panel key={b.id} title={b.name}>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4 min-h-[5rem]">
              {b.description}
            </p>
            <Button
              variant={b.enabled ? 'primary' : 'secondary'}
              disabled={!b.enabled}
              onClick={
                b.id === 'iron-cells'
                  ? handleEnterDungeon
                  : b.id === 'druid-grove'
                    ? goToDruidGrove
                    : undefined
              }
            >
              {b.enabled ? (b.cta ?? 'Enter') : (b.lockedCta ?? 'Coming soon')}
            </Button>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-5 gap-4 text-center">
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Gold</div>
          <div className="text-2xl text-[var(--color-accent-gold)]">{character.goldInBank + character.goldInPocket}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Renown</div>
          <div className="text-2xl text-[var(--color-accent-amber)]">{character.renown}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">XP</div>
          <div className="text-2xl text-[var(--color-text-primary)]">{character.xp}</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Pack</div>
          <button
            type="button"
            onClick={useGameStore.getState().goToInventory}
            className="text-2xl text-[var(--color-text-primary)] hover:text-[var(--color-accent-amber)] uppercase tracking-wider"
          >
            Open →
          </button>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Bestiary</div>
          <button
            type="button"
            onClick={useGameStore.getState().goToCodex}
            className="text-2xl text-[var(--color-text-primary)] hover:text-[var(--color-accent-amber)] uppercase tracking-wider"
          >
            Open →
          </button>
        </Panel>
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

