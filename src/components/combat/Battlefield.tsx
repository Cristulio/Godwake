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
    '[background:radial-gradient(ellipse_at_72%_22%,rgba(244,167,66,0.14),transparent_50%),radial-gradient(ellipse_at_28%_88%,rgba(31,58,61,0.22),transparent_55%),radial-gradient(ellipse_at_50%_55%,rgba(107,74,46,0.15),transparent_60%),linear-gradient(to_bottom,#12100c_0%,#1a1410_45%,#0e0a08_100%)]',
  boss:
    '[background:radial-gradient(ellipse_at_72%_22%,rgba(181,48,44,0.22),transparent_50%),radial-gradient(ellipse_at_28%_88%,rgba(15,5,5,0.45),transparent_55%),radial-gradient(ellipse_at_50%_45%,rgba(120,28,28,0.20),transparent_60%),linear-gradient(to_bottom,#0d0606_0%,#1a0808_50%,#080404_100%)]',
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
        relative border-2 border-[var(--color-border-warm)]
        overflow-hidden ${BG_BY_SCENE[scene]}
      `}
      style={{ width: '824px', height: '420px', flexShrink: 0 }}
    >
      <DecorationLayer kind={decoration} />
      <GrainOverlay />

      {/* Floor strip with subtle vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgba(0,0,0,0.65)] to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-6 right-6 h-px bg-[var(--color-border-dim)] opacity-40" />
      <div className="absolute bottom-1 left-0 right-0 h-4 bg-gradient-to-t from-[rgba(244,167,66,0.04)] to-transparent pointer-events-none" />

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

      {/* Absolute-positioned slots — sprites occupy fixed positions on the
          battlefield regardless of who's alive. Killing an enemy doesn't
          reflow the layout; the rectangle never gets narrower. */}
      <div className="absolute inset-0 px-6 pt-10 pb-6">
        {/* Player at left */}
        <div className="absolute bottom-8 left-10 w-[96px] flex justify-center">
          <BattlefieldSprite
            kind="player"
            character={character}
            isActiveTurn={currentTurnId === 'player'}
            facing="right"
            attackPulse={playerAttackPulse}
          />
        </div>

        {/* Enemies anchored to the right, evenly spaced — slot index drives
            position so dead enemies keep their place. */}
        {monsterCombatants.map((c, idx) => (
          <div
            key={c.id}
            className="absolute bottom-8 w-[96px] flex justify-center"
            style={{ right: `${40 + idx * 116}px` }}
          >
            <BattlefieldSprite
              kind="monster"
              instance={c.instance}
              isActiveTurn={currentTurnId === c.id}
              facing="left"
              selectable={selectingTarget}
              onSelect={() => onSelectTarget(c.id)}
              attackPulse={monsterAttackPulseFor(c)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GrainOverlay() {
  // Subtle SVG noise filter applied as a faint overlay. Adds painterly grain
  // without external assets. Opacity kept low so it reads as texture, not dirt.
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08] mix-blend-overlay"
      preserveAspectRatio="none"
    >
      <filter id="grain-filter">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.3   0 0 0 0 0.25   0 0 0 0 0.2   0 0 0 1 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-filter)" />
    </svg>
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
  const bars = Array.from({ length: 14 });
  return (
    <>
      {/* Deep-back wall with depth gradient */}
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 w-full h-3/4"
      >
        <defs>
          <linearGradient id="ironcells-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d150f" />
            <stop offset="60%" stopColor="#221a14" />
            <stop offset="100%" stopColor="#1a120d" />
          </linearGradient>
          <linearGradient id="ironcells-stones" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1f17" />
            <stop offset="100%" stopColor="#1a120c" />
          </linearGradient>
          <radialGradient id="torch-glow" cx="0.85" cy="0.18" r="0.45">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#f4a742" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="torch-glow-left" cx="0.12" cy="0.30" r="0.32">
            <stop offset="0%" stopColor="#f4a742" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="400" height="200" fill="url(#ironcells-wall)" />
        {/* Stone block mortar joints */}
        <g fill="url(#ironcells-stones)" stroke="#1a120c" strokeWidth="0.6" opacity="0.85">
          <rect x="0" y="0" width="78" height="38" />
          <rect x="78" y="0" width="96" height="38" />
          <rect x="174" y="0" width="84" height="38" />
          <rect x="258" y="0" width="142" height="38" />
          <rect x="0" y="38" width="62" height="48" />
          <rect x="62" y="38" width="118" height="48" />
          <rect x="180" y="38" width="92" height="48" />
          <rect x="272" y="38" width="128" height="48" />
          <rect x="0" y="86" width="92" height="42" />
          <rect x="92" y="86" width="76" height="42" />
          <rect x="168" y="86" width="108" height="42" />
          <rect x="276" y="86" width="124" height="42" />
        </g>
        {/* Iron bars in alcoves */}
        {bars.map((_, i) => (
          <rect
            key={i}
            x={20 + i * 26}
            y={68}
            width={3}
            height={110}
            fill="#0e0a07"
            opacity="0.85"
          />
        ))}
        {/* Bar cross-rivets */}
        <rect x="20" y="80" width="380" height="2" fill="#0e0a07" opacity="0.6" />
        <rect x="20" y="148" width="380" height="2" fill="#0e0a07" opacity="0.6" />
        {/* Torch sconces */}
        <rect x="330" y="20" width="3" height="14" fill="#3a2e22" />
        <rect x="328" y="34" width="7" height="3" fill="#3a2e22" />
        <polygon points="328,17 336,17 332,4" fill="#ffb347" opacity="0.85" />
        <polygon points="329,12 335,12 332,2" fill="#fff5d1" opacity="0.85" />

        <rect x="68" y="30" width="3" height="12" fill="#3a2e22" />
        <rect x="66" y="42" width="7" height="3" fill="#3a2e22" />
        <polygon points="66,28 74,28 70,18" fill="#f4a742" opacity="0.7" />

        {/* Glow patches */}
        <rect x="0" y="0" width="400" height="200" fill="url(#torch-glow)" />
        <rect x="0" y="0" width="400" height="200" fill="url(#torch-glow-left)" />
      </svg>
      {/* Foreground floor stones (parallax forward layer) */}
      <svg
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-[18%] opacity-90"
      >
        <defs>
          <linearGradient id="floor-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22170f" />
            <stop offset="100%" stopColor="#0c0805" />
          </linearGradient>
        </defs>
        <rect width="400" height="60" fill="url(#floor-grad)" />
        {/* Floor tiles in perspective */}
        <g stroke="#0c0805" strokeWidth="0.6" opacity="0.7">
          <line x1="0" y1="20" x2="400" y2="20" />
          <line x1="40" y1="20" x2="20" y2="60" />
          <line x1="120" y1="20" x2="100" y2="60" />
          <line x1="200" y1="20" x2="200" y2="60" />
          <line x1="280" y1="20" x2="300" y2="60" />
          <line x1="360" y1="20" x2="380" y2="60" />
        </g>
      </svg>
    </>
  );
}

function VivisectorBackdrop() {
  return (
    <>
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="viv-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#180c08" />
            <stop offset="55%" stopColor="#1f120a" />
            <stop offset="100%" stopColor="#0e0604" />
          </linearGradient>
          <radialGradient id="viv-pool" cx="0.5" cy="0.78" r="0.4">
            <stop offset="0%" stopColor="#6b1a14" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6b1a14" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="viv-stones" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#231410" />
            <stop offset="100%" stopColor="#150807" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#viv-wall)" />
        {/* Stone wall blocks */}
        <g fill="url(#viv-stones)" stroke="#0d0606" strokeWidth="0.5" opacity="0.85">
          <rect x="0" y="0" width="100" height="44" />
          <rect x="100" y="0" width="140" height="44" />
          <rect x="240" y="0" width="160" height="44" />
          <rect x="0" y="44" width="80" height="50" />
          <rect x="80" y="44" width="140" height="50" />
          <rect x="220" y="44" width="180" height="50" />
        </g>
        {/* Hanging tools on the back wall (silhouettes) */}
        <g fill="#0e0606" opacity="0.85">
          <rect x="60" y="22" width="2" height="36" />
          <polygon points="55,58 65,58 60,68" />
          <rect x="80" y="20" width="2" height="32" />
          <polygon points="76,52 84,52 80,60" />
          <rect x="300" y="22" width="2" height="36" />
          <circle cx="301" cy="60" r="4" />
        </g>
        {/* Vivisector's slab silhouette */}
        <rect x="130" y="108" width="140" height="6" fill="#2d1812" stroke="#0d0606" strokeWidth="1" />
        <rect x="130" y="114" width="140" height="16" fill="#1f1210" stroke="#0d0606" strokeWidth="1" />
        <rect x="138" y="130" width="6" height="14" fill="#0d0606" />
        <rect x="256" y="130" width="6" height="14" fill="#0d0606" />
        {/* Blood pools / smears */}
        <rect x="148" y="116" width="38" height="3" fill="#6b1a14" opacity="0.6" />
        <rect x="196" y="118" width="50" height="4" fill="#6b1a14" opacity="0.65" />
        <rect x="160" y="124" width="20" height="2" fill="#6b1a14" opacity="0.55" />
        {/* Splatters on the floor */}
        <ellipse cx="80" cy="172" rx="14" ry="3" fill="#6b1a14" opacity="0.45" />
        <ellipse cx="320" cy="165" rx="10" ry="2.5" fill="#6b1a14" opacity="0.45" />
        <circle cx="100" cy="178" r="2" fill="#6b1a14" opacity="0.55" />
        <circle cx="305" cy="170" r="2" fill="#6b1a14" opacity="0.55" />
        {/* Red pool glow */}
        <rect width="400" height="200" fill="url(#viv-pool)" />
      </svg>
    </>
  );
}

function WardensHallBackdrop() {
  return (
    <>
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="warden-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#100808" />
            <stop offset="55%" stopColor="#1a0a08" />
            <stop offset="100%" stopColor="#080404" />
          </linearGradient>
          <linearGradient id="warden-pillar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1410" />
            <stop offset="100%" stopColor="#0e0606" />
          </linearGradient>
          <radialGradient id="warden-throne-glow" cx="0.5" cy="0.55" r="0.35">
            <stop offset="0%" stopColor="#b5302c" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="warden-vignette" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#b5302c" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="200" fill="url(#warden-wall)" />
        {/* Back wall stones */}
        <g fill="#15080a" stroke="#2a1014" strokeWidth="0.5" opacity="0.85">
          <rect x="62" y="0" width="138" height="32" />
          <rect x="200" y="0" width="138" height="32" />
          <rect x="62" y="32" width="100" height="44" />
          <rect x="162" y="32" width="176" height="44" />
          <rect x="62" y="76" width="276" height="44" />
        </g>
        {/* Tall pillars */}
        <rect x="36" y="0" width="28" height="178" fill="url(#warden-pillar)" stroke="#3a1410" strokeWidth="1" />
        <rect x="36" y="0" width="28" height="8" fill="#3a1410" />
        <rect x="36" y="172" width="28" height="8" fill="#3a1410" />
        <rect x="40" y="14" width="20" height="3" fill="#0e0506" />
        <rect x="40" y="166" width="20" height="3" fill="#0e0506" />

        <rect x="336" y="0" width="28" height="178" fill="url(#warden-pillar)" stroke="#3a1410" strokeWidth="1" />
        <rect x="336" y="0" width="28" height="8" fill="#3a1410" />
        <rect x="336" y="172" width="28" height="8" fill="#3a1410" />
        <rect x="340" y="14" width="20" height="3" fill="#0e0506" />
        <rect x="340" y="166" width="20" height="3" fill="#0e0506" />

        {/* Hanging chains */}
        <g stroke="#3a1410" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.85">
          <line x1="120" y1="0" x2="120" y2="86" />
          <line x1="280" y1="0" x2="280" y2="70" />
          <line x1="200" y1="0" x2="200" y2="48" />
        </g>
        <g fill="#1a0606" opacity="0.85">
          <circle cx="120" cy="88" r="2.5" />
          <circle cx="280" cy="72" r="2.2" />
          <circle cx="200" cy="50" r="2" />
        </g>
        {/* Distant throne dais silhouette */}
        <polygon points="170,150 230,150 240,180 160,180" fill="#0c0404" stroke="#2a0c0c" strokeWidth="1" />
        <polygon points="180,108 220,108 220,150 180,150" fill="#0c0404" stroke="#2a0c0c" strokeWidth="1" />
        <rect x="195" y="118" width="10" height="6" fill="#5a1a14" opacity="0.5" />
        {/* Throne glow + vignette */}
        <rect width="400" height="200" fill="url(#warden-throne-glow)" />
        <rect width="400" height="200" fill="url(#warden-vignette)" />
      </svg>
    </>
  );
}
