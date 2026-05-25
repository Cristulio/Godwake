import type { Character } from '../../types/character';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { computeAC } from '../../engine/character/derived';

interface PlayerPanelProps {
  character: Character;
  isActiveTurn: boolean;
}

export function PlayerPanel({ character, isActiveTurn }: PlayerPanelProps) {
  const race = getRace(character.raceId);
  const cls = getClass(character.classId);
  const ac = computeAC(character);
  const hpPercent = (character.hp.current / character.hp.max) * 100;
  const ae = character.actionEconomy;

  return (
    <div
      className={`
        bg-[var(--color-bg-panel)] border-2 p-4 flex gap-4
        ${isActiveTurn
          ? 'border-[var(--color-accent-amber)] shadow-[0_0_24px_rgba(244,167,66,0.25)]'
          : 'border-[var(--color-border-warm)]'}
      `}
    >
      <div className="w-24 h-24 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-center justify-center text-4xl shrink-0">
        <span aria-hidden>🛡️</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[var(--color-accent-amber)] text-lg font-bold uppercase tracking-wider">
          {character.name}
        </div>
        <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mb-2">
          {race.name} {cls.name} · Level {character.level}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">HP</div>
            <div className="font-mono text-[var(--color-text-primary)]">
              {character.hp.current}/{character.hp.max}
            </div>
            <div className="h-1 bg-[var(--color-bg-elevated)] mt-1">
              <div
                className={`h-full transition-all ${
                  hpPercent > 50 ? 'bg-[var(--color-status-poison)]'
                    : hpPercent > 25 ? 'bg-[var(--color-accent-amber)]'
                      : 'bg-[var(--color-accent-blood)]'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">AC</div>
            <div className="font-mono text-[var(--color-text-primary)]">{ac}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">Speed</div>
            <div className="font-mono text-[var(--color-text-primary)]">{race.speed} ft</div>
          </div>
        </div>

        <div className="mt-3 flex gap-3 text-xs">
          <ActionFlag label="Action" available={!ae.actionUsed} />
          <ActionFlag label="Bonus" available={!ae.bonusActionUsed} />
          <ActionFlag label="Reaction" available={!ae.reactionUsed} />
        </div>
      </div>
    </div>
  );
}

function ActionFlag({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`w-2 h-2 rounded-full ${
          available ? 'bg-[var(--color-status-poison)]' : 'bg-[var(--color-text-muted)]'
        }`}
      />
      <span
        className={`uppercase tracking-wider ${
          available ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] line-through'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
