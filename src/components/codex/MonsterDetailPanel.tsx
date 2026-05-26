import { useEffect } from 'react';
import type { Monster, MonsterAction } from '../../schemas/monster';
import { MonsterPortrait } from '../combat/MonsterPortrait';
import { abilityModifier, ABILITY_NAMES, ABILITY_FULL_NAMES } from '../../types/abilities';

interface MonsterDetailPanelProps {
  monster: Monster;
  encounters: number;
  onClose: () => void;
}

export function MonsterDetailPanel({ monster, encounters, onClose }: MonsterDetailPanelProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${monster.name} codex entry`}
    >
      <div
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)] max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--color-border-warm)]">
          <div>
            <h2 className="text-[var(--color-accent-amber)] text-xl uppercase tracking-widest">
              {monster.name}
            </h2>
            <p className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
              CR {monster.cr} · {monster.size} {monster.creatureType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-amber)] text-xs uppercase tracking-widest"
            title="Close (Esc)"
          >
            ✕ Close
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-[180px_1fr] gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[160px] h-[220px] bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-end justify-center p-2">
              <MonsterPortrait defId={monster.id} className="w-full h-full" />
            </div>
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] px-3 py-2 text-center w-full">
              <div className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
                Encountered
              </div>
              <div className="text-[var(--color-accent-amber)] font-mono text-lg">
                × {encounters}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <Stat label="HP" value={String(monster.maxHp)} />
              <Stat label="AC" value={String(monster.ac)} />
              <Stat label="Speed" value={`${monster.speed} ft`} />
            </div>

            <div className="grid grid-cols-6 gap-1 text-[10px] font-mono">
              {ABILITY_NAMES.map((a) => {
                const score = monster.abilityScores[a] ?? 10;
                const mod = abilityModifier(score);
                return (
                  <div
                    key={a}
                    className="text-center bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] py-1"
                    title={ABILITY_FULL_NAMES[a]}
                  >
                    <div className="text-[var(--color-text-dim)] uppercase">{a}</div>
                    <div className="text-[var(--color-text-primary)]">{score}</div>
                    <div className="text-[var(--color-accent-amber)]">
                      {mod >= 0 ? '+' : ''}
                      {mod}
                    </div>
                  </div>
                );
              })}
            </div>

            {(monster.vulnerabilities || monster.resistances || monster.immunities) && (
              <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest">
                {monster.vulnerabilities?.map((d) => (
                  <span
                    key={`v-${d}`}
                    className="bg-[var(--color-accent-blood)]/30 text-[var(--color-accent-blood)] px-2 py-0.5"
                  >
                    vuln {d}
                  </span>
                ))}
                {monster.resistances?.map((d) => (
                  <span
                    key={`r-${d}`}
                    className="bg-[var(--color-status-frost)]/20 text-[var(--color-status-frost)] px-2 py-0.5"
                  >
                    resist {d}
                  </span>
                ))}
                {monster.immunities?.map((d) => (
                  <span
                    key={`i-${d}`}
                    className="bg-[var(--color-text-dim)]/30 text-[var(--color-text-secondary)] px-2 py-0.5"
                  >
                    immune {d}
                  </span>
                ))}
              </div>
            )}

            <div>
              <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest mb-1.5 border-b border-[var(--color-border-dim)] pb-1">
                Actions
              </div>
              <div className="flex flex-col gap-2">
                {monster.actions.map((a, i) => (
                  <ActionRow key={`${a.kind}-${a.name}-${i}`} action={a} />
                ))}
              </div>
            </div>

            {monster.flavorText && (
              <div>
                <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest mb-1.5 border-b border-[var(--color-border-dim)] pb-1">
                  Lore
                </div>
                <p className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed">
                  {monster.flavorText}
                </p>
              </div>
            )}

            {monster.bossMechanic && (
              <div className="bg-[var(--color-accent-blood)]/10 border border-[var(--color-accent-blood)]/40 p-2">
                <div className="text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest mb-1">
                  Boss Mechanic
                </div>
                <p className="text-[var(--color-text-secondary)] text-xs leading-snug">
                  {bossMechanicText(monster.bossMechanic)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: MonsterAction }) {
  if (action.kind === 'attack') {
    const reachRange = action.range
      ? `range ${action.range[0]}/${action.range[1]} ft`
      : `reach ${action.reach ?? 5} ft`;
    const bonus = action.attackBonus >= 0 ? `+${action.attackBonus}` : `${action.attackBonus}`;
    return (
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] p-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[var(--color-text-primary)] text-xs uppercase tracking-wider font-bold">
            {action.name}
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
            {reachRange}
          </div>
        </div>
        <div className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-1">
          {bonus} to hit · {action.damage} {action.damageType}
        </div>
        {action.description && (
          <p className="text-[var(--color-text-secondary)] text-[11px] italic mt-1 leading-snug">
            {action.description}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[var(--color-text-primary)] text-xs uppercase tracking-wider font-bold">
          {action.name}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
          {action.durationRounds} rd
        </div>
      </div>
      <div className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-1">
        DC {action.saveDC} {action.saveAbility.toUpperCase()} save
      </div>
      {action.description && (
        <p className="text-[var(--color-text-secondary)] text-[11px] italic mt-1 leading-snug">
          {action.description}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] px-2 py-1.5 flex items-baseline gap-2">
      <span className="text-[var(--color-text-dim)] uppercase tracking-widest text-[9px]">
        {label}
      </span>
      <span className="text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

function bossMechanicText(mechanic: 'battle-rage'): string {
  switch (mechanic) {
    case 'battle-rage':
      return 'Battle Rage: when reduced to half HP or less, gains advantage on attacks and +2 damage for the rest of combat.';
  }
}
