import type { CombatState } from '../../types/combat';
import type { Character } from '../../types/character';

interface InitiativeTrackerProps {
  state: CombatState;
  character: Character;
}

export function InitiativeTracker({ state, character }: InitiativeTrackerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs uppercase tracking-wider">
      <span className="text-[var(--color-text-dim)]">Initiative:</span>
      {state.initiativeOrder.map((id, idx) => {
        const c = state.combatants.find((x) => x.id === id);
        if (!c) return null;
        const name = c.kind === 'player' ? character.name : c.instance.displayName;
        const dead =
          c.kind === 'player'
            ? character.hp.current <= 0
            : c.instance.hp.current <= 0;
        const active = idx === state.currentTurnIndex;
        return (
          <span
            key={id}
            className={`
              px-2 py-1 border
              ${active
                ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-amber)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-dim)]'}
              ${dead ? 'opacity-30 line-through' : ''}
            `}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}
