import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { BattlefieldSprite } from './BattlefieldSprite';

export type BattlefieldDecoration =
  | 'iron-cells'
  | 'vivisector-lab'
  | 'wardens-hall'
  | 'generic';

interface BattlefieldProps {
  character: Character;
  state: CombatState;
  selectingTarget: boolean;
  onSelectTarget: (id: string) => void;
  scene: 'combat' | 'boss';
  decoration?: BattlefieldDecoration;
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
  decoration = 'generic',
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
      <DecorationLayer kind={decoration} />

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

function DecorationLayer({ kind }: { kind: BattlefieldDecoration }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {kind === 'iron-cells' && <IronCellsBackdrop />}
      {kind === 'vivisector-lab' && <VivisectorBackdrop />}
      {kind === 'wardens-hall' && <WardensHallBackdrop />}
    </div>
  );
}

function IronCellsBackdrop() {
  // Iron-bar grid hinting at sealed cells lining the corridor.
  const bars = Array.from({ length: 14 });
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-0 w-full h-2/3 opacity-25"
    >
      {/* Stone wall blocks */}
      <g fill="#221a14" stroke="#3a2e22" strokeWidth="0.5">
        <rect x="0" y="0" width="80" height="40" />
        <rect x="80" y="0" width="100" height="40" />
        <rect x="180" y="0" width="100" height="40" />
        <rect x="280" y="0" width="120" height="40" />
        <rect x="0" y="40" width="100" height="50" />
        <rect x="100" y="40" width="120" height="50" />
        <rect x="220" y="40" width="80" height="50" />
        <rect x="300" y="40" width="100" height="50" />
      </g>
      {/* Iron bars */}
      {bars.map((_, i) => (
        <rect
          key={i}
          x={20 + i * 28}
          y={60}
          width={3}
          height={130}
          fill="#1a1410"
          opacity="0.7"
        />
      ))}
      {/* Bar crossbeams */}
      <rect x="20" y="90" width="380" height="2" fill="#1a1410" opacity="0.5" />
      <rect x="20" y="160" width="380" height="2" fill="#1a1410" opacity="0.5" />
      {/* Torch glow patch */}
      <radialGradient id="torch-glow" cx="0.85" cy="0.2" r="0.4">
        <stop offset="0%" stopColor="#f4a742" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
      </radialGradient>
      <rect x="0" y="0" width="400" height="200" fill="url(#torch-glow)" />
    </svg>
  );
}

function VivisectorBackdrop() {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full opacity-30"
    >
      {/* Stone walls darker, with blood stains */}
      <g fill="#1a0e08" stroke="#3a1a10" strokeWidth="0.5">
        <rect x="0" y="0" width="120" height="50" />
        <rect x="120" y="0" width="160" height="50" />
        <rect x="280" y="0" width="120" height="50" />
        <rect x="0" y="50" width="100" height="60" />
        <rect x="100" y="50" width="140" height="60" />
        <rect x="240" y="50" width="160" height="60" />
      </g>
      {/* Slab in middle background */}
      <rect x="140" y="110" width="120" height="20" fill="#3a2e22" stroke="#1a1410" strokeWidth="1" />
      <rect x="148" y="115" width="40" height="3" fill="#6b1a14" opacity="0.5" />
      <rect x="200" y="118" width="50" height="4" fill="#6b1a14" opacity="0.6" />
      {/* Splatters */}
      <circle cx="80" cy="160" r="3" fill="#6b1a14" opacity="0.6" />
      <circle cx="92" cy="166" r="2" fill="#6b1a14" opacity="0.5" />
      <circle cx="320" cy="155" r="2" fill="#6b1a14" opacity="0.5" />
      <circle cx="335" cy="165" r="3" fill="#6b1a14" opacity="0.6" />
    </svg>
  );
}

function WardensHallBackdrop() {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full opacity-30"
    >
      {/* Tall stone pillars flanking the hall */}
      <rect x="40" y="0" width="22" height="170" fill="#1a1008" stroke="#3a2014" strokeWidth="1" />
      <rect x="40" y="0" width="22" height="6" fill="#3a2014" />
      <rect x="40" y="164" width="22" height="6" fill="#3a2014" />
      <rect x="338" y="0" width="22" height="170" fill="#1a1008" stroke="#3a2014" strokeWidth="1" />
      <rect x="338" y="0" width="22" height="6" fill="#3a2014" />
      <rect x="338" y="164" width="22" height="6" fill="#3a2014" />
      {/* Stone wall in the back */}
      <g fill="#150806" stroke="#2d1208" strokeWidth="0.5">
        <rect x="62" y="0" width="276" height="30" />
        <rect x="62" y="30" width="276" height="40" />
        <rect x="62" y="70" width="276" height="50" />
      </g>
      {/* Hanging chains */}
      <line x1="120" y1="0" x2="120" y2="80" stroke="#3a2014" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="280" y1="0" x2="280" y2="60" stroke="#3a2014" strokeWidth="1" strokeDasharray="3 2" />
      {/* Throne / dais silhouette */}
      <polygon points="170,150 230,150 240,180 160,180" fill="#1a0808" stroke="#3a1408" strokeWidth="1" opacity="0.8" />
      <polygon points="180,110 220,110 220,150 180,150" fill="#1a0808" stroke="#3a1408" strokeWidth="1" opacity="0.8" />
      {/* Blood-red glow vignette */}
      <radialGradient id="warden-glow" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0%" stopColor="#b5302c" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
      </radialGradient>
      <rect x="0" y="0" width="400" height="200" fill="url(#warden-glow)" />
    </svg>
  );
}
