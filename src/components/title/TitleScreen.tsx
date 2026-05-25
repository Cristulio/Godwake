import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';

export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  function handleNewGame() {
    const seed = `godwake-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    startNewGame(seed);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 px-4">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-bold tracking-widest text-[var(--color-accent-amber)] mb-4 drop-shadow-[0_0_24px_rgba(244,167,66,0.4)]">
          GODWAKE
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm md:text-base uppercase tracking-[0.3em]">
          The soul remembers. The grove returns.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-72">
        <Button variant="primary" onClick={handleNewGame}>
          New Game
        </Button>
        <Button variant="secondary" disabled>
          Continue
        </Button>
        <Button variant="secondary" disabled>
          Settings
        </Button>
      </div>

      <div className="absolute bottom-4 text-[var(--color-text-dim)] text-xs">
        v0.0.0 · build in progress
      </div>
    </div>
  );
}
