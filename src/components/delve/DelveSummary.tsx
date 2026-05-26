import type { DelveState } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { RENOWN_PER_DELVE_CLEAR } from '../../stores/gameStore';

interface DelveSummaryProps {
  delve: DelveState;
  outcome: 'completed' | 'failed';
  onReturn: () => void;
}

export function DelveSummary({ delve, outcome, onReturn }: DelveSummaryProps) {
  const victorious = outcome === 'completed';
  const renownEarned = victorious ? RENOWN_PER_DELVE_CLEAR : 0;
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
          <Stat label="Renown" value={victorious ? `+${renownEarned}` : '—'} color="amber" />
        </div>
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
