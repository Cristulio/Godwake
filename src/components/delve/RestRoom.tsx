import { useEffect, useState } from 'react';
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
  const showTaunt = useGameStore((s) => s.showTaunt);
  const [rested, setRested] = useState(false);

  // Imoen whispers when the player first reaches an alcove. She can't
  // breathe through the soul-bond while combat is loud — but here, in stillness.
  useEffect(() => {
    const t = setTimeout(() => showTaunt('imoen', 'rest'), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!character) return null;

  function handleShortRest() {
    if (!character) return;
    // Rest rooms knit 70% of max HP and refresh class resources (Second Wind,
    // Action Surge, Cunning Action, spell slots). Full healing is reserved
    // for camps — the chained delve still needs HP attrition to bite between
    // chapters, but 50% left players walking into elites at ~7 HP.
    const healAmount = Math.floor(character.hp.max * 0.7);
    const healed = shortRestHeal(character, healAmount);
    setCharacter(healed);
    setRested(true);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(244,167,66,0.07),transparent_55%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Rest · Short
        </p>
      </header>

      <Panel className="bg-gradient-to-br from-[#2d2218] to-[#221a14]">
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="text-6xl drop-shadow-[0_0_18px_rgba(244,167,66,0.6)]">🔥</div>
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md">
            {room.flavorText}
          </p>
          <p className="text-[var(--color-text-dim)] text-xs italic text-center max-w-md">
            The wound knits deep, but not whole — true healing waits for the
            fire at the chapter's edge.
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            HP {character.hp.current}/{character.hp.max}
          </div>
        </div>
      </Panel>

      <div className="flex gap-3 justify-center">
        {!rested ? (
          <Button variant="primary" onClick={handleShortRest}>
            Rest (heal 70%, refresh resources)
          </Button>
        ) : (
          <div className="text-[var(--color-status-poison)] text-sm uppercase tracking-widest animate-fade-in">
            You feel steadied.
          </div>
        )}
        <Button variant={rested ? 'primary' : 'secondary'} onClick={onContinue}>
          Continue Deeper →
        </Button>
      </div>
    </div>
  );
}
