import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import { BattlefieldSprite } from './BattlefieldSprite';

export type BattlefieldDecoration =
  | 'iron-cells'
  | 'vivisector-lab'
  | 'wardens-hall'
  | 'athkatla-street'
  | 'magistrate-hall'
  | 'spellhold-corridor'
  | 'spellhold-warden-chamber'
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
            lastAttack={state.lastAttack}
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
              lastAttack={state.lastAttack}
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
      {kind === 'athkatla-street' && <AthkatlaStreetBackdrop />}
      {kind === 'magistrate-hall' && <MagistrateHallBackdrop />}
      {kind === 'spellhold-corridor' && <SpellholdCorridorBackdrop />}
      {kind === 'spellhold-warden-chamber' && <SpellholdWardenChamberBackdrop />}
    </div>
  );
}

function SpellholdCorridorBackdrop() {
  // Pale, watery corridor — bone-white stone, faint silver Cowled sigils on
  // the wall, cell-bar shadows striping the floor. Reads colder than Iron
  // Cells (asylum, not torture lab).
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient id="sph-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#181820" />
          <stop offset="55%" stopColor="#222232" />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
        <linearGradient id="sph-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c28" />
          <stop offset="100%" stopColor="#08080e" />
        </linearGradient>
        <radialGradient id="sph-glow" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#9ec3ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#9ec3ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sph-vignette" cx="0.5" cy="0.5" r="0.6">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="url(#sph-wall)" />
      {/* Tall stone blocks */}
      <g fill="#1a1a26" stroke="#0a0a14" strokeWidth="0.5" opacity="0.9">
        <rect x="0" y="0" width="92" height="40" />
        <rect x="92" y="0" width="120" height="40" />
        <rect x="212" y="0" width="98" height="40" />
        <rect x="310" y="0" width="90" height="40" />
        <rect x="0" y="40" width="74" height="48" />
        <rect x="74" y="40" width="132" height="48" />
        <rect x="206" y="40" width="104" height="48" />
        <rect x="310" y="40" width="90" height="48" />
        <rect x="0" y="88" width="100" height="44" />
        <rect x="100" y="88" width="84" height="44" />
        <rect x="184" y="88" width="124" height="44" />
        <rect x="308" y="88" width="92" height="44" />
      </g>
      {/* Cell-door grates evenly spaced */}
      <g fill="#06060a" stroke="#3a3a50" strokeWidth="0.6" opacity="0.95">
        <rect x="40" y="58" width="34" height="58" />
        <rect x="160" y="58" width="34" height="58" />
        <rect x="280" y="58" width="34" height="58" />
      </g>
      {/* Vertical bars across each cell window */}
      <g stroke="#06060a" strokeWidth="1.2" opacity="0.9">
        <line x1="48" y1="60" x2="48" y2="114" />
        <line x1="57" y1="60" x2="57" y2="114" />
        <line x1="66" y1="60" x2="66" y2="114" />
        <line x1="168" y1="60" x2="168" y2="114" />
        <line x1="177" y1="60" x2="177" y2="114" />
        <line x1="186" y1="60" x2="186" y2="114" />
        <line x1="288" y1="60" x2="288" y2="114" />
        <line x1="297" y1="60" x2="297" y2="114" />
        <line x1="306" y1="60" x2="306" y2="114" />
      </g>
      {/* Silver Cowled sigil scratched between cells — circle with cross */}
      <g stroke="#9ec3ff" strokeWidth="0.8" fill="none" opacity="0.55">
        <circle cx="115" cy="76" r="9" />
        <line x1="115" y1="67" x2="115" y2="85" />
        <line x1="106" y1="76" x2="124" y2="76" />
        <circle cx="240" cy="78" r="8" />
        <line x1="240" y1="70" x2="240" y2="86" />
        <line x1="232" y1="78" x2="248" y2="78" />
      </g>
      {/* Floor strip */}
      <rect x="0" y="160" width="400" height="40" fill="url(#sph-floor)" />
      <g stroke="#0a0a14" strokeWidth="0.5" opacity="0.7">
        <line x1="0" y1="170" x2="400" y2="170" />
        <line x1="60" y1="170" x2="40" y2="200" />
        <line x1="140" y1="170" x2="130" y2="200" />
        <line x1="220" y1="170" x2="220" y2="200" />
        <line x1="300" y1="170" x2="320" y2="200" />
        <line x1="380" y1="170" x2="400" y2="200" />
      </g>
      {/* Pale magical glow above, vignette */}
      <rect width="400" height="200" fill="url(#sph-glow)" />
      <rect width="400" height="200" fill="url(#sph-vignette)" />
    </svg>
  );
}

function SpellholdWardenChamberBackdrop() {
  // The Asylum Director's chamber — deep blue-violet, silver Cowled disc on
  // the wall, an austere desk silhouette, banners trimmed in grey. Reads as
  // a polished bureaucratic horror — different from Magistrate's Hall (which
  // is Athkatlan / marble / civic). This one is colder and emptier.
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient id="sph-wc-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a1c" />
          <stop offset="55%" stopColor="#141430" />
          <stop offset="100%" stopColor="#04040c" />
        </linearGradient>
        <linearGradient id="sph-wc-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a32" />
          <stop offset="100%" stopColor="#080814" />
        </linearGradient>
        <linearGradient id="sph-wc-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1818" />
          <stop offset="100%" stopColor="#0c0606" />
        </linearGradient>
        <radialGradient id="sph-wc-disc-glow" cx="0.5" cy="0.28" r="0.32">
          <stop offset="0%" stopColor="#9ec3ff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#9ec3ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sph-wc-vignette" cx="0.5" cy="0.5" r="0.6">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="url(#sph-wc-wall)" />
      {/* Back wall stones */}
      <g fill="url(#sph-wc-stone)" stroke="#06060e" strokeWidth="0.5" opacity="0.85">
        <rect x="0" y="0" width="120" height="44" />
        <rect x="120" y="0" width="170" height="44" />
        <rect x="290" y="0" width="110" height="44" />
        <rect x="0" y="44" width="90" height="52" />
        <rect x="90" y="44" width="220" height="52" />
        <rect x="310" y="44" width="90" height="52" />
      </g>
      {/* Vaulted arched recess behind the desk */}
      <path d="M 100 96 L 100 50 Q 200 0 300 50 L 300 96 Z" fill="#06060e" stroke="#2a2a48" strokeWidth="1" />
      <path d="M 110 50 Q 200 6 290 50" fill="none" stroke="#3a3a60" strokeWidth="0.8" opacity="0.6" />
      {/* Silver Cowled disc on the back wall — concentric rings with cross-line */}
      <circle cx="200" cy="44" r="18" fill="#1a1a32" stroke="#b5b5e0" strokeWidth="1.4" />
      <circle cx="200" cy="44" r="12" fill="#06060e" stroke="#7a7aa0" strokeWidth="0.8" />
      <line x1="200" y1="30" x2="200" y2="58" stroke="#b5b5e0" strokeWidth="0.8" opacity="0.8" />
      <line x1="186" y1="44" x2="214" y2="44" stroke="#b5b5e0" strokeWidth="0.8" opacity="0.8" />
      {/* Flanking silver-trim banners */}
      <rect x="60" y="0" width="14" height="68" fill="#10102a" stroke="#06060e" strokeWidth="0.5" />
      <polygon points="60,68 74,68 67,82" fill="#10102a" stroke="#06060e" strokeWidth="0.5" />
      <rect x="64" y="22" width="6" height="18" fill="#b5b5e0" opacity="0.65" />
      <rect x="326" y="0" width="14" height="68" fill="#10102a" stroke="#06060e" strokeWidth="0.5" />
      <polygon points="326,68 340,68 333,82" fill="#10102a" stroke="#06060e" strokeWidth="0.5" />
      <rect x="330" y="22" width="6" height="18" fill="#b5b5e0" opacity="0.65" />
      {/* Director's desk — long austere bench */}
      <polygon points="120,150 280,150 296,178 104,178" fill="url(#sph-wc-desk)" stroke="#04040c" strokeWidth="1" />
      <polygon points="140,114 260,114 260,150 140,150" fill="url(#sph-wc-desk)" stroke="#04040c" strokeWidth="1" />
      <rect x="140" y="114" width="120" height="3" fill="#7a7aa0" opacity="0.7" />
      {/* Stacked ledgers on the desk */}
      <rect x="156" y="120" width="22" height="12" fill="#2a1c10" stroke="#0a0608" strokeWidth="0.5" />
      <rect x="156" y="118" width="22" height="2" fill="#6a4a22" />
      <rect x="184" y="122" width="20" height="10" fill="#2a1c10" stroke="#0a0608" strokeWidth="0.5" />
      <rect x="184" y="120" width="20" height="2" fill="#6a4a22" />
      <rect x="218" y="120" width="34" height="12" fill="#2a1c10" stroke="#0a0608" strokeWidth="0.5" />
      <rect x="218" y="118" width="34" height="2" fill="#6a4a22" />
      {/* Quill and inkwell */}
      <rect x="208" y="124" width="2" height="8" fill="#06060e" />
      <line x1="209" y1="124" x2="216" y2="112" stroke="#e8dcc4" strokeWidth="0.6" />
      <rect x="204" y="128" width="6" height="4" fill="#06060e" />
      {/* Two pale wall-sconces flanking the disc — Cowled mage-light, not flame */}
      <circle cx="135" cy="60" r="4" fill="#9ec3ff" opacity="0.7" />
      <circle cx="135" cy="60" r="2" fill="#dcefff" opacity="0.95" />
      <circle cx="265" cy="60" r="4" fill="#9ec3ff" opacity="0.7" />
      <circle cx="265" cy="60" r="2" fill="#dcefff" opacity="0.95" />
      {/* Disc glow + vignette */}
      <rect width="400" height="200" fill="url(#sph-wc-disc-glow)" />
      {/* Floor seams */}
      <g stroke="#2a2a48" strokeWidth="0.5" opacity="0.45">
        <line x1="0" y1="184" x2="400" y2="184" />
        <line x1="60" y1="184" x2="60" y2="200" />
        <line x1="130" y1="184" x2="130" y2="200" />
        <line x1="200" y1="184" x2="200" y2="200" />
        <line x1="270" y1="184" x2="270" y2="200" />
        <line x1="340" y1="184" x2="340" y2="200" />
      </g>
      <rect width="400" height="200" fill="url(#sph-wc-vignette)" />
    </svg>
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

function AthkatlaStreetBackdrop() {
  return (
    <>
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="ath-st-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#180e1c" />
            <stop offset="55%" stopColor="#2a1828" />
            <stop offset="100%" stopColor="#3a2820" />
          </linearGradient>
          <linearGradient id="ath-st-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a1a" />
            <stop offset="100%" stopColor="#1a0e08" />
          </linearGradient>
          <radialGradient id="ath-st-lantern" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffe890" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Night sky between rooftops */}
        <rect width="400" height="200" fill="url(#ath-st-sky)" />
        {/* Faint star dots */}
        <g fill="#e8dcc4" opacity="0.45">
          <rect x="80" y="20" width="1" height="1" />
          <rect x="170" y="14" width="1" height="1" />
          <rect x="250" y="22" width="1" height="1" />
          <rect x="320" y="18" width="1" height="1" />
        </g>
        {/* Far rooftops silhouette */}
        <polygon points="0,80 50,72 100,80 150,68 200,78 250,66 300,80 350,72 400,82 400,200 0,200" fill="#1a0e08" />
        {/* Left building — counting house facade */}
        <rect x="0" y="40" width="120" height="160" fill="url(#ath-st-wall)" stroke="#1a0a04" strokeWidth="1" />
        <rect x="0" y="40" width="120" height="6" fill="#7a4e22" />
        {/* Counting-house windows — warm light */}
        <g fill="#ffd870" opacity="0.85">
          <rect x="14" y="60" width="6" height="10" />
          <rect x="34" y="60" width="6" height="10" />
          <rect x="54" y="60" width="6" height="10" />
          <rect x="74" y="60" width="6" height="10" />
          <rect x="94" y="60" width="6" height="10" />
          <rect x="14" y="90" width="6" height="10" />
          <rect x="34" y="90" width="6" height="10" />
          <rect x="74" y="90" width="6" height="10" />
          <rect x="94" y="90" width="6" height="10" />
        </g>
        {/* Door + ledger sign */}
        <rect x="46" y="130" width="28" height="44" fill="#1a0a04" />
        <rect x="48" y="132" width="24" height="6" fill="#7a4e22" />
        <rect x="58" y="148" width="4" height="6" fill="#d4a850" />
        {/* Right building — tenement */}
        <rect x="280" y="50" width="120" height="150" fill="url(#ath-st-wall)" stroke="#1a0a04" strokeWidth="1" />
        <rect x="280" y="50" width="120" height="5" fill="#7a4e22" />
        <g fill="#ffd870" opacity="0.75">
          <rect x="296" y="70" width="6" height="10" />
          <rect x="316" y="70" width="6" height="10" />
          <rect x="356" y="70" width="6" height="10" />
          <rect x="376" y="70" width="6" height="10" />
          <rect x="296" y="100" width="6" height="10" />
          <rect x="336" y="100" width="6" height="10" />
          <rect x="376" y="100" width="6" height="10" />
        </g>
        {/* A high arched window — Cowled-wizard tax sigil */}
        <rect x="324" y="64" width="22" height="36" fill="#3a2a10" stroke="#5a3a1c" strokeWidth="1" />
        <polygon points="324,64 335,54 346,64" fill="#3a2a10" stroke="#5a3a1c" strokeWidth="1" />
        <rect x="332" y="78" width="6" height="14" fill="#7a82a0" opacity="0.4" />
        {/* Cobblestone street strip across the bottom */}
        <rect x="0" y="174" width="400" height="26" fill="#1a0e08" />
        <g fill="#2a1810" stroke="#0e0606" strokeWidth="0.5">
          <rect x="10" y="178" width="18" height="6" />
          <rect x="30" y="178" width="22" height="6" />
          <rect x="54" y="178" width="18" height="6" />
          <rect x="74" y="178" width="24" height="6" />
          <rect x="100" y="178" width="20" height="6" />
          <rect x="124" y="178" width="22" height="6" />
          <rect x="148" y="178" width="18" height="6" />
          <rect x="168" y="178" width="24" height="6" />
          <rect x="194" y="178" width="20" height="6" />
          <rect x="216" y="178" width="22" height="6" />
          <rect x="240" y="178" width="18" height="6" />
          <rect x="260" y="178" width="24" height="6" />
          <rect x="286" y="178" width="20" height="6" />
          <rect x="308" y="178" width="22" height="6" />
          <rect x="332" y="178" width="18" height="6" />
          <rect x="352" y="178" width="24" height="6" />
          <rect x="378" y="178" width="20" height="6" />
        </g>
        {/* Hanging street lantern centered */}
        <rect x="198" y="32" width="4" height="22" fill="#3a2418" />
        <polygon points="190,52 210,52 206,68 194,68" fill="#7a4e22" stroke="#3a2418" strokeWidth="0.5" />
        <rect x="196" y="56" width="8" height="10" fill="#ffd870" opacity="0.85" />
        <rect width="400" height="200" fill="url(#ath-st-lantern)" />
        {/* Edge vignette */}
        <radialGradient id="ath-st-vignette" cx="0.5" cy="0.5" r="0.55">
          <stop offset="65%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <rect width="400" height="200" fill="url(#ath-st-vignette)" />
      </svg>
    </>
  );
}

function MagistrateHallBackdrop() {
  return (
    <>
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="mag-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c0c20" />
            <stop offset="55%" stopColor="#1a1a38" />
            <stop offset="100%" stopColor="#080814" />
          </linearGradient>
          <linearGradient id="mag-marble" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a5a78" />
            <stop offset="100%" stopColor="#1a1a2a" />
          </linearGradient>
          <linearGradient id="mag-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2818" />
            <stop offset="100%" stopColor="#1a0e08" />
          </linearGradient>
          <radialGradient id="mag-violet-glow" cx="0.5" cy="0.45" r="0.4">
            <stop offset="0%" stopColor="#a48ee0" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#a48ee0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mag-vignette" cx="0.5" cy="0.5" r="0.6">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <rect width="400" height="200" fill="url(#mag-wall)" />
        {/* Vaulted arch back wall */}
        <path d="M 60 0 L 60 110 Q 200 0 340 110 L 340 0 Z" fill="#080814" />
        <path d="M 60 110 Q 200 0 340 110" fill="none" stroke="#3a3a60" strokeWidth="2" />
        <path d="M 80 110 Q 200 20 320 110" fill="none" stroke="#3a3a60" strokeWidth="1" opacity="0.6" />
        {/* Heraldic seal at the keystone — Cowled disc */}
        <circle cx="200" cy="32" r="14" fill="#3a3a60" stroke="#b5b5c8" strokeWidth="1" />
        <circle cx="200" cy="32" r="9" fill="#1a1a38" />
        <rect x="198" y="20" width="4" height="24" fill="#b5b5c8" opacity="0.6" />
        <rect x="188" y="30" width="24" height="4" fill="#b5b5c8" opacity="0.6" />
        {/* Tall flanking marble columns */}
        <rect x="20" y="0" width="34" height="200" fill="url(#mag-marble)" stroke="#0a0a18" strokeWidth="1" />
        <rect x="20" y="0" width="34" height="6" fill="#7a7a98" />
        <rect x="20" y="194" width="34" height="6" fill="#7a7a98" />
        <rect x="24" y="20" width="26" height="2" fill="#3a3a60" />
        <rect x="24" y="40" width="26" height="2" fill="#3a3a60" />
        <rect x="24" y="60" width="26" height="2" fill="#3a3a60" />
        <rect x="24" y="80" width="26" height="2" fill="#3a3a60" />
        <rect x="346" y="0" width="34" height="200" fill="url(#mag-marble)" stroke="#0a0a18" strokeWidth="1" />
        <rect x="346" y="0" width="34" height="6" fill="#7a7a98" />
        <rect x="346" y="194" width="34" height="6" fill="#7a7a98" />
        <rect x="350" y="20" width="26" height="2" fill="#3a3a60" />
        <rect x="350" y="40" width="26" height="2" fill="#3a3a60" />
        <rect x="350" y="60" width="26" height="2" fill="#3a3a60" />
        <rect x="350" y="80" width="26" height="2" fill="#3a3a60" />
        {/* Magistrate's bench dais centered */}
        <polygon points="150,150 250,150 264,180 136,180" fill="url(#mag-bench)" stroke="#0a0a18" strokeWidth="1" />
        <polygon points="160,118 240,118 240,150 160,150" fill="url(#mag-bench)" stroke="#0a0a18" strokeWidth="1" />
        {/* Silver desk-edge */}
        <rect x="160" y="118" width="80" height="3" fill="#b5b5c8" />
        {/* Open ledger / warrant on the bench */}
        <rect x="186" y="124" width="28" height="14" fill="#e8dcc4" stroke="#3a2010" strokeWidth="0.5" />
        <rect x="186" y="124" width="28" height="2" fill="#a89878" />
        <rect x="190" y="128" width="20" height="1" fill="#3a2010" />
        <rect x="190" y="131" width="14" height="1" fill="#3a2010" />
        <rect x="190" y="134" width="18" height="1" fill="#3a2010" />
        {/* Pair of candles on the bench */}
        <rect x="166" y="112" width="2" height="6" fill="#e8dcc4" />
        <polygon points="167,108 165,114 169,114" fill="#ffd870" />
        <rect x="232" y="112" width="2" height="6" fill="#e8dcc4" />
        <polygon points="233,108 231,114 235,114" fill="#ffd870" />
        {/* Banners hanging from the rafters — silver Cowled livery */}
        <rect x="100" y="0" width="14" height="60" fill="#1a2050" stroke="#0a0a18" strokeWidth="0.5" />
        <polygon points="100,60 114,60 107,74" fill="#1a2050" stroke="#0a0a18" strokeWidth="0.5" />
        <rect x="105" y="18" width="4" height="14" fill="#b5b5c8" opacity="0.7" />
        <rect x="286" y="0" width="14" height="60" fill="#1a2050" stroke="#0a0a18" strokeWidth="0.5" />
        <polygon points="286,60 300,60 293,74" fill="#1a2050" stroke="#0a0a18" strokeWidth="0.5" />
        <rect x="291" y="18" width="4" height="14" fill="#b5b5c8" opacity="0.7" />
        {/* Faint violet mage-glow around the dais */}
        <rect width="400" height="200" fill="url(#mag-violet-glow)" />
        {/* Marble floor tile lines */}
        <g stroke="#3a3a60" strokeWidth="0.5" opacity="0.45">
          <line x1="0" y1="184" x2="400" y2="184" />
          <line x1="50" y1="184" x2="50" y2="200" />
          <line x1="100" y1="184" x2="100" y2="200" />
          <line x1="150" y1="184" x2="150" y2="200" />
          <line x1="200" y1="184" x2="200" y2="200" />
          <line x1="250" y1="184" x2="250" y2="200" />
          <line x1="300" y1="184" x2="300" y2="200" />
          <line x1="350" y1="184" x2="350" y2="200" />
        </g>
        <rect width="400" height="200" fill="url(#mag-vignette)" />
      </svg>
    </>
  );
}
