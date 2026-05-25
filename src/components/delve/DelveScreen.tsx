import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useGameStore } from '../../stores/gameStore';

export function DelveScreen() {
  const goToHub = useGameStore((s) => s.goToHub);

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            THE IRON CELLS · Room 1 / 7
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Chapter I · The Mage's Cells
          </p>
        </div>
        <Button variant="secondary" onClick={goToHub}>
          ← Abandon delve
        </Button>
      </header>

      <Panel title="Encounter">
        <p className="text-[var(--color-text-secondary)] text-sm">
          You stand at the threshold of a stone chamber. A flickering torch casts
          long shadows across iron-bound walls. Something stirs in the dark.
        </p>
        <p className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mt-4">
          Combat system coming online soon.
        </p>
      </Panel>

      <Panel title="Doors">
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" disabled>⚔️ Combat</Button>
          <Button variant="secondary" disabled>💰 Treasure</Button>
          <Button variant="secondary" disabled>🔥 Rest</Button>
        </div>
      </Panel>
    </div>
  );
}
