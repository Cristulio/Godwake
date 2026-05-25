import { useGameStore } from '../../stores/gameStore';
import { CombatScreen } from '../combat/CombatScreen';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

export function DelveScreen() {
  const character = useGameStore((s) => s.character);
  const combat = useGameStore((s) => s.combat);
  const goToHub = useGameStore((s) => s.goToHub);

  if (!character) {
    return (
      <div className="p-8">
        <p className="text-[var(--color-text-primary)]">No character. Return to hub.</p>
        <Button onClick={goToHub}>Hub</Button>
      </div>
    );
  }

  if (combat) {
    return <CombatScreen character={character} state={combat} />;
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            THE IRON CELLS · Between rooms
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
          No active combat. (Room transitions and door previews coming next.)
        </p>
      </Panel>
    </div>
  );
}
