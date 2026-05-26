import type { DelveState } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import {
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  useGameStore,
} from '../../stores/gameStore';
import {
  baneQuirkCount,
  soulMarkMultiplier,
  SOUL_MARK_PER_BANE,
} from '../../engine/character/quirks';

interface DelveSummaryProps {
  delve: DelveState;
  outcome: 'completed' | 'failed';
  onReturn: () => void;
}

export function DelveSummary({ delve, outcome, onReturn }: DelveSummaryProps) {
  const character = useGameStore((s) => s.character);
  const victorious = outcome === 'completed';
  const banes = character ? baneQuirkCount(character) : 0;
  const soulMark = character ? soulMarkMultiplier(character) : 1;
  const renownBase = victorious ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE;
  const renownEarned = Math.floor(renownBase * soulMark);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-2xl mx-auto gap-8 animate-fade-in">
      <div className="text-center">
        <div
          className={`
            text-4xl uppercase tracking-[0.4em] mb-2
            ${victorious ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-accent-blood)]'}
          `}
        >
          {victorious ? 'Delve Complete' : 'You Have Fallen'}
        </div>
        <div className="text-[var(--color-text-secondary)] text-sm uppercase tracking-widest">
          {delve.dungeonName}
        </div>
      </div>

      <Panel className="w-full">
        <div className="grid grid-cols-4 gap-4 text-center">
          <Stat label="Rooms Cleared" value={`${delve.roomsCleared} / ${delve.rooms.length}`} />
          <Stat label="Gold Earned" value={String(delve.goldEarned)} color="gold" />
          <Stat label="XP Earned" value={String(delve.xpEarned)} color="amber" />
          <Stat label={victorious ? 'Renown' : 'Renown (lost)'} value={`+${renownEarned}`} color="amber" />
        </div>
        {banes > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-dim)] text-center">
            <span className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest">
              ◆ Soul-mark · +{Math.round(SOUL_MARK_PER_BANE * banes * 100)}%
            </span>
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest ml-2">
              ({banes} bane{banes > 1 ? 's' : ''} · boosts gold, xp, renown)
            </span>
          </div>
        )}
      </Panel>

      {!victorious && (
        <p className="text-[var(--color-text-secondary)] italic text-sm text-center max-w-md">
          The grove will return you to life. Your soul remembers what your flesh has forgotten.
        </p>
      )}

      <Button variant="primary" onClick={onReturn}>
        {victorious ? 'Return to Phandalin' : 'Wake at the Grove'}
      </Button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'gold' | 'amber' }) {
  const textColor =
    color === 'gold'
      ? 'text-[var(--color-accent-gold)]'
      : color === 'amber'
        ? 'text-[var(--color-accent-amber)]'
        : 'text-[var(--color-text-primary)]';
  return (
    <div>
      <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className={`text-2xl font-mono ${textColor}`}>{value}</div>
    </div>
  );
}
