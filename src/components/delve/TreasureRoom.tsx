import { useEffect, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { characterQuirkMods, soulMarkMultiplier } from '../../engine/character/quirks';

interface TreasureRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

export function TreasureRoom({ room, onContinue }: TreasureRoomProps) {
  const addDelveReward = useGameStore((s) => s.addDelveReward);
  const character = useGameStore((s) => s.character);
  const [revealed, setRevealed] = useState(false);
  const [actualGold, setActualGold] = useState(room.goldReward ?? 0);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    if (room.goldReward) {
      // addDelveReward applies gold + soul-mark multipliers; mirror them here
      // so the reveal label matches what the wallet actually receives.
      const mods = character ? characterQuirkMods(character) : {};
      const goldMult = mods.goldMultiplier ?? 1;
      const soulMult = character ? soulMarkMultiplier(character) : 1;
      setActualGold(Math.floor(room.goldReward * goldMult * soulMult));
      addDelveReward(room.goldReward, 0);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_40%,rgba(212,176,98,0.10),transparent_55%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Treasure
        </p>
      </header>

      <Panel className="bg-gradient-to-br from-[#2d2418] to-[#221a14]">
        <div className="flex flex-col items-center gap-6 py-8">
          <div
            className={`
              text-6xl transition-all duration-500
              ${revealed ? 'scale-110 drop-shadow-[0_0_24px_rgba(212,176,98,0.7)]' : 'scale-90 opacity-50'}
            `}
          >
            💰
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md">
            {room.flavorText}
          </p>
          {revealed && room.goldReward && (
            <div className="text-2xl font-mono text-[var(--color-accent-gold)] animate-fade-in">
              +{actualGold} gold
              {actualGold > (room.goldReward ?? 0) && (
                <span className="text-sm text-[var(--color-status-poison)] ml-2 uppercase tracking-widest">
                  · bargain hunter
                </span>
              )}
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
