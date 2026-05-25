import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { BattlefieldSprite } from './BattlefieldSprite';

interface BattlefieldProps {
  character: Character;
  state: CombatState;
  selectingTarget: boolean;
  onSelectTarget: (id: string) => void;
  /** 'combat' | 'boss' — controls the background tint. */
  scene: 'combat' | 'boss';
}

const BG_BY_SCENE: Record<'combat' | 'boss', string> = {
  combat:
    'bg-gradient-to-br from-[#1a1410] via-[#221a14] to-[#1f1410] [background-image:radial-gradient(circle_at_70%_30%,rgba(244,167,66,0.06),transparent_60%),linear-gradient(to_bottom_right,#1a1410,#221a14_55%,#1f1410)]',
  boss:
    'bg-gradient-to-br from-[#160a08] via-[#221008] to-[#1a0808] [background-image:radial-gradient(circle_at_70%_30%,rgba(181,48,44,0.10),transparent_60%),linear-gradient(to_bottom_right,#0f0606,#1f0a08_60%,#260a08)]',
};

export function Battlefield({
  character,
  state,
  selectingTarget,
  onSelectTarget,
  scene,
}: BattlefieldProps) {
  const currentTurnId = state.initiativeOrder[state.currentTurnIndex];
  const monsterCombatants = state.combatants.filter(
    (c) => c.kind === 'monster',
  ) as MonsterCombatant[];

  return (
    <div
      className={`
        relative w-full min-h-[260px] border-2 border-[var(--color-border-warm)]
        overflow-hidden ${BG_BY_SCENE[scene]}
      `}
    >
      {/* subtle floor strip */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[rgba(0,0,0,0.45)] to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-0 right-0 h-px bg-[var(--color-border-dim)] opacity-40" />

      <div className="relative flex items-end justify-between px-8 py-6 gap-4 min-h-[260px]">
        {/* Player on the left, facing right */}
        <div className="shrink-0">
          <BattlefieldSprite
            kind="player"
            character={character}
            isActiveTurn={currentTurnId === 'player'}
            facing="right"
          />
        </div>

        {/* Enemies on the right, facing left */}
        <div className="flex items-end gap-6 flex-wrap justify-end max-w-[68%]">
          {monsterCombatants.map((c) => (
            <BattlefieldSprite
              key={c.id}
              kind="monster"
              instance={c.instance}
              isActiveTurn={currentTurnId === c.id}
              facing="left"
              selectable={selectingTarget}
              onSelect={() => onSelectTarget(c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
