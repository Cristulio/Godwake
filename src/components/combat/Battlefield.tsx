import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { BattlefieldSprite } from './BattlefieldSprite';

interface BattlefieldProps {
  character: Character;
  state: CombatState;
  selectingTarget: boolean;
  onSelectTarget: (id: string) => void;
  scene: 'combat' | 'boss';
}

const BG_BY_SCENE: Record<'combat' | 'boss', string> = {
  combat:
    '[background:radial-gradient(circle_at_75%_28%,rgba(244,167,66,0.10),transparent_55%),radial-gradient(circle_at_30%_85%,rgba(31,58,61,0.18),transparent_50%),linear-gradient(to_bottom_right,#15100c,#1f1610_55%,#1a100c)]',
  boss:
    '[background:radial-gradient(circle_at_75%_28%,rgba(181,48,44,0.18),transparent_55%),radial-gradient(circle_at_30%_85%,rgba(15,5,5,0.30),transparent_50%),linear-gradient(to_bottom_right,#0e0606,#1a0808_60%,#220a08)]',
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

  // Compute attackPulse per sprite: bumps the unique attack-event id when this
  // sprite is the attacker, otherwise stays at 0. Subscribers re-trigger the
  // lunge animation only when their own pulse changes.
  const playerAttackPulse =
    state.lastAttack && state.lastAttack.attackerKind === 'player'
      ? state.lastAttack.id
      : 0;
  const monsterAttackPulseFor = (c: MonsterCombatant) =>
    state.lastAttack &&
    state.lastAttack.attackerKind === 'monster' &&
    state.lastAttack.attackerName === c.instance.displayName
      ? state.lastAttack.id
      : 0;

  return (
    <div
      className={`
        relative w-full min-h-[340px] border-2 border-[var(--color-border-warm)]
        overflow-hidden ${BG_BY_SCENE[scene]}
      `}
    >
      {/* Floor strip with subtle vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[rgba(0,0,0,0.55)] to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-6 right-6 h-px bg-[var(--color-border-dim)] opacity-40" />

      <div className="relative flex items-end justify-between px-10 pt-8 pb-6 gap-6 min-h-[340px]">
        {/* Player on the left, facing right */}
        <div className="shrink-0">
          <BattlefieldSprite
            kind="player"
            character={character}
            isActiveTurn={currentTurnId === 'player'}
            facing="right"
            attackPulse={playerAttackPulse}
          />
        </div>

        {/* Enemies on the right, facing left */}
        <div className="flex items-end gap-8 flex-wrap justify-end max-w-[68%]">
          {monsterCombatants.map((c) => (
            <BattlefieldSprite
              key={c.id}
              kind="monster"
              instance={c.instance}
              isActiveTurn={currentTurnId === c.id}
              facing="left"
              selectable={selectingTarget}
              onSelect={() => onSelectTarget(c.id)}
              attackPulse={monsterAttackPulseFor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
