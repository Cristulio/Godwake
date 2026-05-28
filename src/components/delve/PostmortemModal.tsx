import type { Postmortem } from '../../types/postmortem';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { MonsterPortrait } from '../combat/MonsterPortrait';

interface PostmortemModalProps {
  postmortem: Postmortem;
  onReincarnate: () => void;
}

const ABILITY_FULL: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

export function PostmortemModal({ postmortem, onReincarnate }: PostmortemModalProps) {
  const goToCodex = useGameStore((s) => s.goToCodex);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-2xl mx-auto gap-6 animate-fade-in">
      <div className="text-center">
        <div
          className="text-3xl md:text-4xl uppercase tracking-[0.4em] mb-2 text-[var(--color-accent-blood)]"
          style={{ textShadow: '0 0 24px rgba(200,51,46,0.4), 2px 2px 0 rgba(0,0,0,0.85)' }}
        >
          ✶ The Soul Falls ✶
        </div>
        <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest italic">
          {postmortem.dungeonName}
          {postmortem.roomNumber > 0 && (
            <> · Room {postmortem.roomNumber}</>
          )}
        </div>
      </div>

      <div
        className="panel-etched-warm border-2 border-[var(--color-accent-blood)] w-full p-5 flex flex-col gap-4 animate-pop-in"
        style={{ boxShadow: '0 0 32px rgba(200,51,46,0.15)' }}
      >
        <div className="flex items-start gap-4">
          {postmortem.killerDefId && (
            <div className="w-[88px] h-[120px] bg-[var(--color-bg-deep)] border border-[var(--color-border-warm)] flex items-end justify-center p-1 shrink-0">
              <MonsterPortrait
                defId={postmortem.killerDefId}
                className="w-full h-full"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-display text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1">
              Slain by
            </div>
            <div
              className="font-display text-[var(--color-accent-amber)] text-xl uppercase tracking-wider"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.85), 0 0 14px rgba(244,167,66,0.25)' }}
            >
              {postmortem.killerName}
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 font-narrative">
              Final blow:{' '}
              <span className="text-[var(--color-text-primary)] not-italic">
                {postmortem.attackName}
              </span>
              {postmortem.damageDealt !== undefined && (
                <>
                  {' — '}
                  <span className="text-[var(--color-accent-blood)] font-mono not-italic">
                    {postmortem.damageDealt}
                  </span>
                  {postmortem.damageType && (
                    <span className="text-[var(--color-text-dim)] not-italic">
                      {' '}
                      {postmortem.damageType}
                    </span>
                  )}
                  {postmortem.crit && (
                    <span className="text-[var(--color-accent-blood)] font-display text-[10px] uppercase tracking-widest not-italic ml-2">
                      ◆ CRIT
                    </span>
                  )}
                  {' damage.'}
                </>
              )}
            </div>
          </div>
        </div>

        {postmortem.failedSave && (
          <div className="border-t border-[var(--color-border-dim)] pt-3">
            <div className="font-display text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1">
              The save that broke
            </div>
            <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed font-narrative italic">
              You failed a{' '}
              <span className="text-[var(--color-text-primary)] not-italic">
                {ABILITY_FULL[postmortem.failedSave.ability] ?? postmortem.failedSave.ability.toUpperCase()}
              </span>{' '}
              save against{' '}
              <span className="text-[var(--color-text-primary)] not-italic">
                {postmortem.failedSave.sourceName}
              </span>{' '}
              — rolled{' '}
              <span className="text-[var(--color-accent-blood)] font-mono not-italic">
                {postmortem.failedSave.rolled}
                {postmortem.failedSave.mod >= 0 ? '+' : ''}
                {postmortem.failedSave.mod}
              </span>{' '}
              vs DC{' '}
              <span className="text-[var(--color-accent-amber)] font-mono not-italic">
                {postmortem.failedSave.dc}
              </span>
              .
            </div>
          </div>
        )}

        {postmortem.activeConditions.length > 0 && (
          <div className="border-t border-[var(--color-border-dim)] pt-3">
            <div className="font-display text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1.5">
              Bound by
            </div>
            <div className="flex flex-wrap gap-1.5">
              {postmortem.activeConditions.map((c) => (
                <span
                  key={c}
                  className="bg-[var(--color-accent-blood)]/20 text-[var(--color-accent-blood)] border border-[var(--color-accent-blood)]/40 px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {postmortem.unspentResources.length > 0 && (
          <div className="border-t border-[var(--color-border-dim)] pt-3">
            <div className="font-display text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1.5">
              You died with
            </div>
            <div className="flex flex-wrap gap-1.5">
              {postmortem.unspentResources.map((r) => (
                <span
                  key={r}
                  className="panel-etched border border-[var(--color-border-dim)] text-[var(--color-text-secondary)] px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono"
                >
                  {r}
                </span>
              ))}
            </div>
            <p className="text-[var(--color-text-dim)] text-[10px] italic mt-2 leading-snug">
              These could have helped. The soul remembers.
            </p>
          </div>
        )}
      </div>

      {postmortem.killerDefId && (
        <button
          type="button"
          onClick={goToCodex}
          className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic hover:text-[var(--color-accent-amber)]"
        >
          View {postmortem.killerName} in the Bestiary →
        </button>
      )}

      <Button variant="primary" size="lg" onClick={onReincarnate}>
        ↻ Reincarnate
      </Button>
    </div>
  );
}
