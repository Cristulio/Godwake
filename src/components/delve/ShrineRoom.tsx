import { useEffect, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { BlessingCard } from '../ui/BlessingCard';
import { useGameStore } from '../../stores/gameStore';
import { getActiveRoller } from '../../engine/dice';
import { rollBlessingOptions } from '../../engine/character/blessings';
import { playSfx } from '../../engine/audio';

interface ShrineRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

export function ShrineRoom({ room, onContinue }: ShrineRoomProps) {
  const addBlessing = useGameStore((s) => s.addBlessing);
  const shrineOptionBonus = useGameStore((s) => s.character?.shrineOptionBonus ?? 0);
  const shrineTitheGold = useGameStore((s) => s.character?.shrineTitheGold ?? 0);
  const classId = useGameStore((s) => s.character?.classId);
  const [options, setOptions] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  // Roll N unique blessing options on mount. Wider Pantheon adds extras.
  useEffect(() => {
    const roller = getActiveRoller();
    const count = 3 + shrineOptionBonus;
    setOptions(rollBlessingOptions(roller, count, classId));
    // Shrine Tithe: pay out gold on each shrine entry.
    if (shrineTitheGold > 0) {
      const state = useGameStore.getState();
      const ch = state.character;
      if (ch) {
        useGameStore.setState({
          character: { ...ch, goldInPocket: ch.goldInPocket + shrineTitheGold },
          delve: state.delve
            ? { ...state.delve, goldEarned: state.delve.goldEarned + shrineTitheGold }
            : state.delve,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(id: string) {
    addBlessing(id);
    setChosen(id);
    playSfx('shrine_chime');
    // Brief beat before advancing so the player sees the confirmation.
    setTimeout(() => onContinue(), 1000);
  }

  function leave() {
    onContinue();
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(212,176,98,0.10),transparent_55%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Shrine · A god is listening
        </p>
      </header>

      <Panel className="bg-gradient-to-br from-[#2d2418] to-[#221a14]">
        <div className="flex flex-col items-center gap-3 py-4">
          <ShrineSilhouette />
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md leading-relaxed">
            {room.flavorText}
          </p>
        </div>
      </Panel>

      {!chosen ? (
        <>
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.3em] text-center">
            ► Choose a blessing
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {options.map((id) => (
              <BlessingCard key={id} blessingId={id} pickable onPick={() => pick(id)} />
            ))}
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={leave}
              className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic hover:text-[var(--color-text-secondary)] py-2 px-4 border border-[var(--color-border-dim)] hover:border-[var(--color-border-warm)] transition-colors"
            >
              Leave the altar untouched
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="text-[var(--color-accent-amber)] text-sm uppercase tracking-[0.3em]">
            ◆ The god accepts the bargain
          </div>
          <div className="w-full max-w-md">
            <BlessingCard blessingId={chosen} />
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
            walking deeper...
          </div>
        </div>
      )}
    </div>
  );
}

function ShrineSilhouette() {
  return (
    <svg
      viewBox="0 0 200 100"
      className="w-32 h-16 drop-shadow-[0_0_18px_rgba(244,167,66,0.4)]"
    >
      <defs>
        <radialGradient id="shrine-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#f4a742" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Altar base */}
      <rect x="60" y="62" width="80" height="14" fill="#3a2418" stroke="#1a1410" strokeWidth="1" />
      <rect x="55" y="76" width="90" height="6" fill="#2a1a10" stroke="#1a1410" strokeWidth="1" />
      <rect x="50" y="82" width="100" height="6" fill="#1a1208" stroke="#1a1410" strokeWidth="1" />
      {/* Sigil basin on top */}
      <rect x="75" y="55" width="50" height="8" fill="#1a1208" stroke="#3a2418" strokeWidth="1" />
      <rect x="85" y="50" width="30" height="6" fill="#3a2418" />
      {/* Glow halo */}
      <rect x="60" y="20" width="80" height="40" fill="url(#shrine-glow)" />
      {/* Three sigils */}
      <circle cx="80" cy="55" r="2.5" fill="#ffd76a" />
      <circle cx="100" cy="55" r="2.5" fill="#ffd76a" />
      <circle cx="120" cy="55" r="2.5" fill="#ffd76a" />
    </svg>
  );
}
