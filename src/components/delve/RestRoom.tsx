import { useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { shortRestHeal } from '../../engine/character/actions';

interface RestRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

export function RestRoom({ room, onContinue }: RestRoomProps) {
  const character = useGameStore((s) => s.character);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const [rested, setRested] = useState(false);

  if (!character) return null;

  function handleShortRest() {
    if (!character) return;
    // MVP simplified short rest: heal 1d10 + level (Hit Die roll). Skipping
    // hit-die tracking for now — just heals to full.
    const healed = shortRestHeal(character, character.hp.max - character.hp.current);
    setCharacter(healed);
    setRested(true);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Rest · Short
        </p>
      </header>

      <Panel>
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="text-6xl">🔥</div>
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md">
            {room.flavorText}
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            HP {character.hp.current}/{character.hp.max}
          </div>
        </div>
      </Panel>

      <div className="flex gap-3 justify-center">
        {!rested ? (
          <Button variant="primary" onClick={handleShortRest}>
            Short rest (heal to full)
          </Button>
        ) : (
          <div className="text-[var(--color-status-poison)] text-sm uppercase tracking-widest">
            You feel restored.
          </div>
        )}
        <Button variant={rested ? 'primary' : 'secondary'} onClick={onContinue}>
          Continue Deeper →
        </Button>
      </div>
    </div>
  );
}
