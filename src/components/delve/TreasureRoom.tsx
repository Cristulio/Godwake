import { useEffect, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';

interface TreasureRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

export function TreasureRoom({ room, onContinue }: TreasureRoomProps) {
  const addDelveReward = useGameStore((s) => s.addDelveReward);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    if (room.goldReward) {
      addDelveReward(room.goldReward, 0);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Treasure
        </p>
      </header>

      <Panel>
        <div className="flex flex-col items-center gap-6 py-8">
          <div
            className={`
              text-6xl transition-all duration-500
              ${revealed ? 'scale-110' : 'scale-90 opacity-50'}
            `}
          >
            💰
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md">
            {room.flavorText}
          </p>
          {revealed && room.goldReward && (
            <div className="text-2xl font-mono text-[var(--color-accent-gold)] animate-fade-in">
              +{room.goldReward} gold
            </div>
          )}
        </div>
      </Panel>

      <div className="flex justify-center">
        <Button variant="primary" onClick={onContinue} disabled={!revealed}>
          Continue Deeper →
        </Button>
      </div>
    </div>
  );
}
