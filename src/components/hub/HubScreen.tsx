import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';

interface Building {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const BUILDINGS: Building[] = [
  {
    id: 'druid-grove',
    name: 'The Druid Grove',
    description: 'The circle of Mielikki tends the Wellspring. They will return you to life when you fall.',
    enabled: false,
  },
  {
    id: 'adventurers-board',
    name: "Adventurer's Board",
    description: 'Posted notices of dungeons that need delving. Start a new run here.',
    enabled: true,
  },
  {
    id: 'lionshield-coster',
    name: 'Lionshield Coster',
    description: 'A modest trading post. Potions, scrolls, and gear for the road ahead.',
    enabled: false,
  },
];

export function HubScreen() {
  const goToDelve = useGameStore((s) => s.goToDelve);
  const goToTitle = useGameStore((s) => s.goToTitle);

  function handleEnterDungeon() {
    goToDelve();
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

      <div className="grid md:grid-cols-3 gap-4">
        {BUILDINGS.map((b) => (
          <Panel key={b.id} title={b.name}>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4 min-h-[5rem]">
              {b.description}
            </p>
            <Button
              variant={b.enabled ? 'primary' : 'secondary'}
              disabled={!b.enabled}
              onClick={b.id === 'adventurers-board' ? handleEnterDungeon : undefined}
            >
              {b.enabled ? 'Enter' : 'Coming soon'}
            </Button>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4 text-center">
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Gold</div>
          <div className="text-2xl text-[var(--color-accent-gold)]">0</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Renown</div>
          <div className="text-2xl text-[var(--color-accent-amber)]">0</div>
        </Panel>
        <Panel>
          <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">Delves Completed</div>
          <div className="text-2xl text-[var(--color-text-primary)]">0</div>
        </Panel>
      </div>
    </div>
  );
}
