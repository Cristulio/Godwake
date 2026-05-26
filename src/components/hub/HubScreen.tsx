import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';
import { createIronCellsDelve } from '../../engine/delve';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';

interface Building {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cta?: string;
}

const BUILDINGS: Building[] = [
  {
    id: 'druid-grove',
    name: 'The Druid Grove',
    description:
      'The circle of Mielikki tends the Wellspring. They will return you to life when you fall.',
    enabled: false,
  },
  {
    id: 'iron-cells',
    name: 'The Iron Cells',
    description:
      'A staircase down through Tresendar Manor\'s ruined cellar. The first dungeon under Phandalin.',
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

export function HubScreen() {
  const character = useGameStore((s) => s.character);
  const goToTitle = useGameStore((s) => s.goToTitle);
  const startDelve = useGameStore((s) => s.startDelve);

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
    const delve = createIronCellsDelve();
    startDelve(delve);
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--color-border-warm)]">
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
          </div>
        </div>
      </Panel>

      <div className="grid md:grid-cols-3 gap-4">
        {BUILDINGS.map((b) => (
          <Panel key={b.id} title={b.name}>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4 min-h-[5rem]">
              {b.description}
            </p>
            <Button
              variant={b.enabled ? 'primary' : 'secondary'}
              disabled={!b.enabled}
              onClick={b.id === 'iron-cells' ? handleEnterDungeon : undefined}
            >
              {b.enabled ? (b.cta ?? 'Enter') : 'Coming soon'}
            </Button>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-4 gap-4 text-center">
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
