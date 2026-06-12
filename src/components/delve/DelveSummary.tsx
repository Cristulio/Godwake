import type { DelveState } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { computeDelveRenown, useGameStore } from '../../stores/gameStore';
import {
  baneQuirkCount,
  SOUL_MARK_PER_BANE,
} from '../../engine/character/quirks';
import { getAscensionLevel, MAX_ASCENSION } from '../../engine/delve';
import { useT } from '../../i18n/useT';

interface DelveSummaryProps {
  delve: DelveState;
  outcome: 'completed' | 'failed';
  onReturn: () => void;
}

export function DelveSummary({ delve, outcome, onReturn }: DelveSummaryProps) {
  const { t } = useT();
  const character = useGameStore((s) => s.character);
  const ascensionUnlocked = useGameStore((s) => s.ascensionUnlocked);
  const victorious = outcome === 'completed';
  const banes = character ? baneQuirkCount(character) : 0;
  const ascensionLevel = delve.ascensionLevel ?? 0;
  const ascension = getAscensionLevel(ascensionLevel);
  // Single source of truth — exactly what finishDelve will bank.
  // A settled delve carries its exact payout (death settles with the DYING
  // soul's marks; recomputing here with the reborn soul would understate it).
  const renown =
    delve.renownSettledBreakdown ??
    (character ? computeDelveRenown(delve, character) : null);
  const renownEarned = renown?.total ?? 0;
  // A clear at the current highest rung opens the next (see unlockNextAscension).
  // ascensionUnlocked hasn't incremented yet — finishDelve runs on Return.
  const willUnlockAscension =
    victorious && ascensionLevel >= ascensionUnlocked && ascensionUnlocked < MAX_ASCENSION;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-2xl mx-auto gap-8 animate-fade-in">
      <div className="text-center">
        <div
          className={`
            text-4xl uppercase tracking-[0.4em] mb-2
            ${victorious ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-accent-blood)]'}
          `}
        >
          {victorious ? t('ui.summary.delveComplete') : t('ui.summary.youFallen')}
        </div>
        <div className="text-[var(--color-text-secondary)] text-sm uppercase tracking-widest">
          {delve.dungeonName}
        </div>
      </div>

      <Panel className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label={t('ui.summary.roomsCleared')} value={String(delve.roomsCleared)} />
          <Stat label={t('ui.summary.goldEarned')} value={String(delve.goldEarned)} color="gold" />
          <Stat label={t('ui.summary.xpEarned')} value={String(delve.xpEarned)} color="amber" />
          <Stat label={victorious ? t('ui.summary.renown') : t('ui.summary.renownLost')} value={`+${renownEarned}`} color="amber" />
        </div>
        {renown && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-dim)] text-center">
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
              {t('ui.summary.renownLedger', {
                mobs: renown.mobsKilled,
                bosses: renown.bossesKilled,
                rooms: renown.roomsReached,
                base: renown.base,
                mult: renown.multiplier.toFixed(2),
              })}
            </span>
          </div>
        )}
        {banes > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-dim)] text-center">
            <span className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest">
              ◆ {t('ui.summary.soulMark', { pct: Math.round(SOUL_MARK_PER_BANE * banes * 100) })}
            </span>
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest ml-2">
              {t(banes > 1 ? 'ui.summary.baneBoostPlural' : 'ui.summary.baneBoost', { n: banes })}
            </span>
          </div>
        )}
        {ascensionLevel > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border-dim)] text-center">
            <span className="text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest">
              ▲ {t('ui.summary.ascension', { n: ascensionLevel })}
            </span>
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest ml-2">
              {t('ui.summary.renownMult', { mult: ascension.renownMult.toFixed(2) })}
            </span>
          </div>
        )}
      </Panel>

      {willUnlockAscension && (
        <p className="text-[var(--color-accent-amber)] italic text-sm text-center max-w-md animate-pulse-glow">
          {t('ui.summary.deepens', { n: ascensionUnlocked + 1 })}
        </p>
      )}

      {!victorious && (
        <p className="text-[var(--color-text-secondary)] italic text-sm text-center max-w-md">
          {t('ui.summary.groveReturns')}
        </p>
      )}

      <Button variant="primary" onClick={onReturn}>
        {victorious ? t('ui.summary.returnToTown') : t('ui.summary.wakeAtGrove')}
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
