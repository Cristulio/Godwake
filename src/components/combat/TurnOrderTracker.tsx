import type { CombatState } from '../../types/combat';
import type { Character } from '../../types/character';
import { useT } from '../../i18n/useT';

interface TurnOrderTrackerProps {
  state: CombatState;
  character: Character;
}

export function TurnOrderTracker({ state, character }: TurnOrderTrackerProps) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase">
      <span className="font-display text-[var(--color-accent-gold)] text-[9px] tracking-[0.25em]">
        {t('combat.order.label')}
      </span>
      {state.turnOrder.map((id, idx) => {
        const c = state.combatants.find((x) => x.id === id);
        if (!c) return null;
        const name = c.kind === 'player' ? character.name : c.instance.displayName;
        const dead =
          c.kind === 'player'
            ? character.hp.current <= 0
            : c.instance.hp.current <= 0;
        const active = idx === state.currentTurnIndex;
        const isPlayer = c.kind === 'player';
        return (
          <span
            key={id}
            className={`
              relative px-2.5 py-1 border-2 tracking-wider font-bold transition-all
              ${active
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-amber)] shadow-[0_0_12px_rgba(244,167,66,0.5)]'
                : isPlayer
                  ? 'bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] border-[var(--color-accent-gold)]'
                  : 'bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] border-[var(--color-border-dim)]'}
              ${dead ? 'opacity-30 line-through' : ''}
            `}
          >
            {active && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-[var(--color-accent-amber)]">
                ▼
              </span>
            )}
            {name}
          </span>
        );
      })}
    </div>
  );
}
