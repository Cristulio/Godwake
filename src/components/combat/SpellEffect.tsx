import { useEffect, useState } from 'react';
import type {
  CombatState,
  MonsterCombatant,
  SpellEffectEvent,
  SpellEffectKind,
} from '../../types/combat';

interface Anchor {
  x: number;
  y: number;
}

interface SpellEffectProps {
  kind: SpellEffectKind;
  origin: Anchor;
  target: Anchor;
  onDone: () => void;
}

interface SpellEffectLayerProps {
  state: CombatState;
}

// Battlefield is fixed at 824 x 420. Sprite slots are positioned with
// absolute pixels; these constants mirror the Battlefield layout so the
// overlay can anchor without DOM measurement.
const PLAYER_ANCHOR: Anchor = { x: 112, y: 316 };
const MONSTER_BASE_X = 712;
const MONSTER_STEP_X = 116;
const MONSTER_Y = 316;

function anchorFor(state: CombatState, id: string): Anchor {
  if (id === 'player') return PLAYER_ANCHOR;
  const monsters = state.combatants.filter(
    (c) => c.kind === 'monster',
  ) as MonsterCombatant[];
  const idx = monsters.findIndex((m) => m.id === id);
  if (idx < 0) return PLAYER_ANCHOR;
  return { x: MONSTER_BASE_X - idx * MONSTER_STEP_X, y: MONSTER_Y };
}

/**
 * Mounts into the Battlefield as an absolute overlay. Subscribes to
 * `state.spellEffectEvent` and renders the matching SpellEffect for each
 * new event id. Clears itself when the effect signals onDone.
 */
export function SpellEffectLayer({ state }: SpellEffectLayerProps) {
  const [active, setActive] = useState<SpellEffectEvent | null>(null);
  const eventId = state.spellEffectEvent?.id;

  useEffect(() => {
    if (!state.spellEffectEvent) return;
    setActive(state.spellEffectEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (!active) return null;

  const origin = anchorFor(state, active.attackerId);
  const target = active.targetId
    ? anchorFor(state, active.targetId)
    : origin;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
      <SpellEffect
        key={active.id}
        kind={active.kind}
        origin={origin}
        target={target}
        onDone={() => setActive(null)}
      />
    </div>
  );
}

export function SpellEffect({ kind, origin, target, onDone }: SpellEffectProps) {
  switch (kind) {
    case 'magic-missile':
      return <MagicMissileEffect origin={origin} target={target} onDone={onDone} />;
    case 'fire-bolt':
      return <FireBoltEffect origin={origin} target={target} onDone={onDone} />;
    case 'burning-hands':
      return <BurningHandsEffect origin={origin} onDone={onDone} />;
    case 'shield':
      return <ShieldEffect origin={origin} onDone={onDone} />;
    case 'mage-armor':
      return <MageArmorEffect origin={origin} onDone={onDone} />;
    case 'hold-person':
      return <HoldPersonEffect target={target} onDone={onDone} />;
    default:
      return null;
  }
}

function useDoneTimer(ms: number, onDone: () => void): void {
  useEffect(() => {
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ---------- Magic Missile ----------

interface ArcProps {
  origin: Anchor;
  target: Anchor;
  onDone: () => void;
}

function MagicMissileEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(1100, onDone);
  const darts = [0, 120, 240];
  // Each dart aims a little above/below the target center for visual spread.
  const targetOffsets = [-10, 0, 10];
  const flightMs = 560;

  return (
    <>
      {darts.map((delay, i) => {
        const tY = target.y + targetOffsets[i];
        const dx = target.x - origin.x;
        const dy = tY - origin.y;
        return (
          <div key={i}>
            <div
              className="absolute animate-mm-dart"
              style={
                {
                  left: origin.x,
                  top: origin.y,
                  width: 0,
                  height: 0,
                  ['--dx' as string]: `${dx}px`,
                  ['--dy' as string]: `${dy}px`,
                  animationDelay: `${delay}ms`,
                } as React.CSSProperties
              }
            >
              <MagicMissileDart />
            </div>
            <div
              className="absolute animate-mm-burst"
              style={{
                left: target.x,
                top: tY,
                width: 0,
                height: 0,
                animationDelay: `${delay + flightMs - 60}ms`,
                opacity: 0,
              }}
            >
              <ForceBurst />
            </div>
          </div>
        );
      })}
    </>
  );
}

function MagicMissileDart() {
  return (
    <svg
      width="44"
      height="22"
      viewBox="-22 -11 44 22"
      style={{ position: 'absolute', left: -22, top: -11, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="mm-head" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#d6c0ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#5e3a8f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mm-tail" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#5e3a8f" stopOpacity="0" />
          <stop offset="100%" stopColor="#c9a8ff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x="-18" y="-2" width="18" height="4" fill="url(#mm-tail)" />
      <circle cx="0" cy="0" r="9" fill="url(#mm-head)" />
      <circle cx="0" cy="0" r="3" fill="#ffffff" />
    </svg>
  );
}

function ForceBurst() {
  return (
    <svg
      width="60"
      height="60"
      viewBox="-30 -30 60 60"
      style={{ position: 'absolute', left: -30, top: -30, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="mm-burst-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#c9a8ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#5e3a8f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="22" fill="url(#mm-burst-grad)" />
      <g stroke="#e8d8ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <line x1="-16" y1="0" x2="-8" y2="0" />
        <line x1="8" y1="0" x2="16" y2="0" />
        <line x1="0" y1="-16" x2="0" y2="-8" />
        <line x1="0" y1="8" x2="0" y2="16" />
        <line x1="-11" y1="-11" x2="-6" y2="-6" />
        <line x1="11" y1="11" x2="6" y2="6" />
        <line x1="-11" y1="11" x2="-6" y2="6" />
        <line x1="11" y1="-11" x2="6" y2="-6" />
      </g>
    </svg>
  );
}

// ---------- Fire Bolt ----------

function FireBoltEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(800, onDone);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;

  // Ghost trail particles — each delayed by 60ms behind the head, riding
  // the same arc, but with the flame-trail fade-shrink on top.
  const trail = [60, 120, 180];

  return (
    <>
      {trail.map((delay, i) => (
        <div
          key={`trail-${i}`}
          className="absolute animate-firebolt-arc"
          style={
            {
              left: origin.x,
              top: origin.y,
              width: 0,
              height: 0,
              opacity: 0.5 - i * 0.12,
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
              animationDelay: `-${delay}ms`,
            } as React.CSSProperties
          }
        >
          <FireBoltTrail />
        </div>
      ))}
      <div
        className="absolute animate-firebolt-arc"
        style={
          {
            left: origin.x,
            top: origin.y,
            width: 0,
            height: 0,
            ['--dx' as string]: `${dx}px`,
            ['--dy' as string]: `${dy}px`,
          } as React.CSSProperties
        }
      >
        <FireBoltHead />
      </div>
    </>
  );
}

function FireBoltHead() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="-24 -24 48 48"
      style={{ position: 'absolute', left: -24, top: -24, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="fb-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff8dc" stopOpacity="1" />
          <stop offset="35%" stopColor="#ffd166" stopOpacity="1" />
          <stop offset="65%" stopColor="#ff6b2b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b1f1b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="20" fill="url(#fb-core)" />
      <circle cx="-3" cy="-2" r="6" fill="#fff8dc" opacity="0.85" />
      {/* Flame licks */}
      <g fill="#ff8a3a" opacity="0.7">
        <path d="M -14 -2 Q -20 -8 -12 -10 Q -10 -4 -14 -2 Z" />
        <path d="M -16 4 Q -22 8 -12 12 Q -10 6 -16 4 Z" />
      </g>
    </svg>
  );
}

function FireBoltTrail() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="-14 -14 28 28"
      style={{ position: 'absolute', left: -14, top: -14, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="fb-trail" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd166" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff6b2b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="12" fill="url(#fb-trail)" />
    </svg>
  );
}

// ---------- Burning Hands ----------

interface SelfProps {
  origin: Anchor;
  onDone: () => void;
}

function BurningHandsEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(620, onDone);
  // Cone fans to the right (player faces right). Stylized fan, not RAW geometry.
  // Width ~280px, height ~200px, anchored at the player's left edge.
  const width = 320;
  const height = 220;
  return (
    <div
      className="absolute animate-burning-hands"
      style={{
        left: origin.x,
        top: origin.y - height / 2,
        width,
        height,
        transformOrigin: '0% 50%',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="bh-grad" cx="0" cy="0.5" r="1">
            <stop offset="0%" stopColor="#fff8dc" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#ffd166" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#ff6b2b" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#8b1f1b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bh-grad-inner" cx="0" cy="0.5" r="0.8">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffd166" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff6b2b" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Big outer fan */}
        <path
          d={`M 0 ${height / 2} Q ${width * 0.5} ${height * 0.05} ${width} ${height * 0.18} Q ${width * 0.7} ${height * 0.5} ${width} ${height * 0.82} Q ${width * 0.5} ${height * 0.95} 0 ${height / 2} Z`}
          fill="url(#bh-grad)"
        />
        {/* Inner hot core */}
        <path
          d={`M 0 ${height / 2} Q ${width * 0.4} ${height * 0.2} ${width * 0.78} ${height * 0.3} Q ${width * 0.55} ${height * 0.5} ${width * 0.78} ${height * 0.7} Q ${width * 0.4} ${height * 0.8} 0 ${height / 2} Z`}
          fill="url(#bh-grad-inner)"
        />
        {/* Flame tongues at the leading edge */}
        <g fill="#ff8a3a" opacity="0.75">
          <path d={`M ${width * 0.7} ${height * 0.25} Q ${width * 0.9} ${height * 0.15} ${width * 0.95} ${height * 0.3} Q ${width * 0.82} ${height * 0.32} ${width * 0.7} ${height * 0.25} Z`} />
          <path d={`M ${width * 0.7} ${height * 0.75} Q ${width * 0.9} ${height * 0.85} ${width * 0.95} ${height * 0.7} Q ${width * 0.82} ${height * 0.68} ${width * 0.7} ${height * 0.75} Z`} />
          <path d={`M ${width * 0.74} ${height * 0.5} Q ${width * 0.98} ${height * 0.45} ${width * 0.99} ${height * 0.55} Q ${width * 0.84} ${height * 0.54} ${width * 0.74} ${height * 0.5} Z`} />
        </g>
      </svg>
    </div>
  );
}

// ---------- Shield ----------

function ShieldEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(1400, onDone);
  const size = 120;
  // Frost-tinted hexagonal shimmer using --color-status-frost.
  return (
    <div
      className="absolute animate-shield-shimmer"
      style={{
        left: origin.x - size / 2,
        top: origin.y - size / 2,
        width: size,
        height: size,
        transformOrigin: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-50 -50 100 100"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="shield-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--color-status-frost)" stopOpacity="0.0" />
            <stop offset="70%" stopColor="var(--color-status-frost)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-status-frost)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shield-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ed8ff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="var(--color-status-frost)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#9ed8ff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx="0" cy="0" r="48" fill="url(#shield-glow)" />
        {/* Hexagon */}
        <polygon
          points="0,-44 38,-22 38,22 0,44 -38,22 -38,-22"
          fill="none"
          stroke="url(#shield-edge)"
          strokeWidth="2.2"
        />
        <polygon
          points="0,-44 38,-22 38,22 0,44 -38,22 -38,-22"
          fill="var(--color-status-frost)"
          opacity="0.12"
        />
        {/* Inner hex with cross-lines for that mage-shield lattice */}
        <polygon
          points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
          fill="none"
          stroke="#dcefff"
          strokeWidth="1"
          opacity="0.6"
        />
        <g stroke="#dcefff" strokeWidth="0.8" opacity="0.4">
          <line x1="-38" y1="-22" x2="38" y2="22" />
          <line x1="-38" y1="22" x2="38" y2="-22" />
          <line x1="0" y1="-44" x2="0" y2="44" />
        </g>
      </svg>
    </div>
  );
}

// ---------- Mage Armor ----------

function MageArmorEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(920, onDone);
  const size = 130;
  return (
    <div
      className="absolute animate-mage-armor"
      style={{
        left: origin.x - size / 2,
        top: origin.y - size / 2,
        width: size,
        height: size,
        transformOrigin: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-50 -50 100 100"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="ma-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff5d1" stopOpacity="0" />
            <stop offset="65%" stopColor="#ffd166" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d4b062" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="48" fill="url(#ma-glow)" />
        {/* Outer rune ring */}
        <circle
          cx="0"
          cy="0"
          r="44"
          fill="none"
          stroke="#ffd166"
          strokeWidth="1.5"
          opacity="0.85"
        />
        {/* Inner ring */}
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="none"
          stroke="#d4b062"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.85"
        />
        {/* Six rune marks evenly spaced */}
        <g fill="#fff5d1" opacity="0.9">
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const r = 39;
            const rad = (deg * Math.PI) / 180;
            return (
              <g
                key={deg}
                transform={`translate(${Math.cos(rad) * r}, ${Math.sin(rad) * r}) rotate(${deg + 90})`}
              >
                <rect x="-2" y="-4" width="4" height="8" />
                <circle cx="0" cy="0" r="1.5" fill="#ffd166" />
              </g>
            );
          })}
        </g>
        {/* Center sigil — small star */}
        <g stroke="#ffd166" strokeWidth="1" fill="none" opacity="0.6">
          <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" />
        </g>
      </svg>
    </div>
  );
}

// ---------- Hold Person ----------

interface HoldProps {
  target: Anchor;
  onDone: () => void;
}

function HoldPersonEffect({ target, onDone }: HoldProps) {
  useDoneTimer(1400, onDone);
  // Three rings vertically stacked across the target.
  const offsets = [-32, 0, 32];
  const delays = [0, 140, 280];
  return (
    <>
      {offsets.map((dy, i) => (
        <div
          key={i}
          className="absolute animate-hold-ring"
          style={{
            left: target.x,
            top: target.y + dy,
            width: 0,
            height: 0,
            animationDelay: `${delays[i]}ms`,
            opacity: 0,
          }}
        >
          <ChainRing />
        </div>
      ))}
    </>
  );
}

function ChainRing() {
  // Drawn centered on (0,0). Chain links rendered around an ellipse.
  const linkCount = 14;
  const rx = 46;
  const ry = 18;
  return (
    <svg
      width="120"
      height="60"
      viewBox="-60 -30 120 60"
      style={{ position: 'absolute', left: -60, top: -30, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="hp-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#c9a8ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5e3a8f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="0" rx={rx + 6} ry={ry + 4} fill="url(#hp-glow)" />
      <ellipse
        cx="0"
        cy="0"
        rx={rx}
        ry={ry}
        fill="none"
        stroke="#9b6fcf"
        strokeWidth="2"
        opacity="0.85"
      />
      <ellipse
        cx="0"
        cy="0"
        rx={rx - 4}
        ry={ry - 3}
        fill="none"
        stroke="#c9a8ff"
        strokeWidth="0.8"
        opacity="0.7"
        strokeDasharray="2 3"
      />
      <g fill="#5e3a8f" stroke="#c9a8ff" strokeWidth="0.6" opacity="0.95">
        {Array.from({ length: linkCount }).map((_, i) => {
          const t = (i / linkCount) * Math.PI * 2;
          const x = Math.cos(t) * rx;
          const y = Math.sin(t) * ry;
          const rot = (t * 180) / Math.PI;
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${rot})`}>
              <ellipse cx="0" cy="0" rx="3" ry="2" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
