import { useEffect } from 'react';

/**
 * Weapon-swing VFX, brought up to the SpellEffect bar. Each effect is an
 * absolutely-positioned overlay anchored to battlefield coordinates and driven
 * by layered SVG gradients + CSS `@keyframes` (see the combat-vfx and
 * animations-revamp blocks in `src/index.css`). Dispatched from `SpellEffect`'s
 * switch for the weapon kinds: slash / pierce / bludgeon / arrow, plus the
 * per-weapon-TYPE identities (axe-chop / crush / spear-thrust / dagger-flick /
 * bow-shot / caster-bonk), the monk's bare-hand language (unarmed /
 * unarmed-flurry / ki-charge), the control-landing signatures (stun-burst /
 * knockdown-burst) and the shapeshift claw rakes (claw-rake / dragon-rake).
 * They self-clean via `onDone`.
 */

interface Anchor {
  x: number;
  y: number;
}

interface WeaponEffectProps {
  origin: Anchor;
  target: Anchor;
  onDone: () => void;
}

function useDoneTimer(ms: number, onDone: () => void): void {
  useEffect(() => {
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** +1 when the attack travels left-to-right (player → enemy), -1 otherwise. */
function attackDir(origin: Anchor, target: Anchor): 1 | -1 {
  return target.x >= origin.x ? 1 : -1;
}

// ---------- Slash ----------

export function WeaponSlashEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(380, onDone);
  const dir = attackDir(origin, target);
  return (
    <div
      className="absolute animate-weapon-slash"
      style={{ left: target.x, top: target.y, width: 0, height: 0 }}
    >
      <svg
        width="128"
        height="128"
        viewBox="-64 -64 128 128"
        style={{ position: 'absolute', left: -64, top: -64, overflow: 'visible', transform: `scaleX(${dir})` }}
      >
        <defs>
          <linearGradient id="slash-blade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#ffd9a0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="slash-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffb347" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Wide soft glow crescent under the blade */}
        <path
          d="M -44 -40 Q 36 -34 46 44 Q 0 -6 -44 -40 Z"
          fill="url(#slash-glow)"
        />
        {/* Bright steel arc */}
        <path
          d="M -40 -34 Q 34 -28 40 38 Q 6 -10 -40 -34 Z"
          fill="url(#slash-blade)"
        />
        {/* Hot leading edge */}
        <path
          d="M -36 -30 Q 30 -24 34 30"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.95"
        />
      </svg>
      {/* Impact sparks flung off the connecting edge */}
      {[18, 30, -6].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 30 + i * 6;
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-[var(--color-accent-torch)] animate-spark rounded-[1px]"
            style={{
              left: 0,
              top: 0,
              boxShadow: '0 0 6px rgba(255,179,71,0.95)',
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist * dir}px, ${Math.sin(rad) * dist}px)`,
              animationDelay: `${60 + i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Pierce ----------

export function WeaponPierceEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(360, onDone);
  const dir = attackDir(origin, target);
  return (
    <>
      {/* Thrust streak — drives in from the attacker side toward the target */}
      <div
        className="absolute animate-weapon-pierce"
        style={
          {
            left: target.x,
            top: target.y,
            width: 0,
            height: 0,
            ['--pierce-from' as string]: `${-58 * dir}px`,
          } as React.CSSProperties
        }
      >
        <svg
          width="96"
          height="40"
          viewBox="-48 -20 96 40"
          style={{ position: 'absolute', left: -48, top: -20, overflow: 'visible', transform: `scaleX(${dir})` }}
        >
          <defs>
            <linearGradient id="pierce-streak" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#e8dcc4" stopOpacity="0" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffd9a0" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M -44 0 L 22 0" stroke="url(#pierce-streak)" strokeWidth="4" strokeLinecap="round" />
          {/* Lance head */}
          <polygon points="20,-7 38,0 20,7" fill="#ffffff" />
          <polygon points="24,-3 33,0 24,3" fill="#f4a742" />
        </svg>
      </div>
      {/* Focused puncture burst at the target */}
      <div
        className="absolute animate-pierce-burst"
        style={{ left: target.x, top: target.y, width: 0, height: 0 }}
      >
        <svg
          width="64"
          height="64"
          viewBox="-32 -32 64 64"
          style={{ position: 'absolute', left: -32, top: -32, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="pierce-ring" cx="0.5" cy="0.5" r="0.5">
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="80%" stopColor="#ffd9a0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="24" fill="url(#pierce-ring)" />
          <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
            <line x1="0" y1="-18" x2="0" y2="-9" />
            <line x1="0" y1="9" x2="0" y2="18" />
            <line x1="-18" y1="0" x2="-9" y2="0" />
            <line x1="9" y1="0" x2="18" y2="0" />
          </g>
        </svg>
      </div>
    </>
  );
}

// ---------- Bludgeon ----------

export function WeaponBludgeonEffect({ target, onDone }: WeaponEffectProps) {
  useDoneTimer(440, onDone);
  return (
    <div
      className="absolute"
      style={{ left: target.x, top: target.y, width: 0, height: 0 }}
    >
      {/* Heavy shockwave ring */}
      <div className="absolute animate-bludgeon-ring" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="120"
          height="120"
          viewBox="-60 -60 120 120"
          style={{ position: 'absolute', left: -60, top: -60, overflow: 'visible' }}
        >
          <circle cx="0" cy="0" r="40" fill="none" stroke="#e8dcc4" strokeWidth="5" opacity="0.85" />
          <circle cx="0" cy="0" r="40" fill="none" stroke="#d4b062" strokeWidth="2" opacity="0.6" />
        </svg>
      </div>
      {/* Impact star — concussive flash */}
      <div className="absolute animate-bludgeon-star" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="84"
          height="84"
          viewBox="-42 -42 84 84"
          style={{ position: 'absolute', left: -42, top: -42, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="bludgeon-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fffaf0" stopOpacity="1" />
              <stop offset="55%" stopColor="#e8dcc4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="20" fill="url(#bludgeon-core)" />
          <g fill="#fffaf0" opacity="0.9">
            <polygon points="0,-34 5,-8 -5,-8" />
            <polygon points="0,34 5,8 -5,8" />
            <polygon points="-34,0 -8,5 -8,-5" />
            <polygon points="34,0 8,5 8,-5" />
          </g>
        </svg>
      </div>
      {/* Dust motes kicked out low */}
      {[200, 250, 300, 340].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 26 + (i % 2) * 10;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 bg-[#cdbb98] rounded-full animate-spark"
            style={{
              left: 0,
              top: 0,
              opacity: 0.7,
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)`,
              animationDelay: `${i * 24}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Arrow ----------

export function ArrowShotEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(520, onDone);
  const dir = attackDir(origin, target);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const flightMs = 300;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <>
      <div
        className="absolute animate-arrow-fly"
        style={
          {
            left: origin.x,
            top: origin.y - 6,
            width: 0,
            height: 0,
            ['--dx' as string]: `${dx}px`,
            ['--dy' as string]: `${dy + 6}px`,
          } as React.CSSProperties
        }
      >
        <svg
          width="56"
          height="16"
          viewBox="-28 -8 56 16"
          style={{ position: 'absolute', left: -28, top: -8, overflow: 'visible', transform: `rotate(${angle}deg)` }}
        >
          <defs>
            <linearGradient id="arrow-trail" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffd9a0" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <line x1="-26" y1="0" x2="14" y2="0" stroke="url(#arrow-trail)" strokeWidth="3" strokeLinecap="round" />
          {/* Shaft */}
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#6b4a2e" strokeWidth="2" />
          {/* Head */}
          <polygon points="14,-4 24,0 14,4" fill="#d8d2c4" />
          {/* Fletching */}
          <polygon points="-14,0 -20,-4 -16,0 -20,4" fill="#b5302c" />
        </svg>
      </div>
      {/* Thunk splinter at the target */}
      <div
        className="absolute animate-arrow-thunk"
        style={{ left: target.x, top: target.y, width: 0, height: 0, animationDelay: `${flightMs - 40}ms`, opacity: 0 }}
      >
        <svg
          width="48"
          height="48"
          viewBox="-24 -24 48 48"
          style={{ position: 'absolute', left: -24, top: -24, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="arrow-impact" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ffd9a0" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="14" fill="url(#arrow-impact)" />
          <g stroke="#fffaf0" strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
            {[20, 90, 160, 240, 310].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={Math.cos(rad) * 6}
                  y1={Math.sin(rad) * 6}
                  x2={Math.cos(rad) * 16 * dir}
                  y2={Math.sin(rad) * 16}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </>
  );
}

// ============================================================================
// === animations-revamp === per-weapon-TYPE identities, the monk's bare-hand
// language, and the control-landing signatures. Keyframes live in the
// animations-revamp block of index.css.
// ============================================================================

// The monk's inner power: jade — distinct from rage red, arcane violet and
// radiant gold, so a ki spend reads as its own school on the field.
const KI_CORE = '#eafff6';
const KI_MID = '#5fd9b8';
const KI_GLOW = 'rgba(95,217,184,0.9)';

// ---------- Unarmed: straight jab ----------

/** Flat-knuckle impact: a short jab streak drives in, lands as a compressed
 *  vertical impact plane with shock arcs bouncing off the far side. */
export function UnarmedImpactEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(380, onDone);
  const dir = attackDir(origin, target);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Jab streak in from the attacker side */}
      <div
        className="absolute animate-jab-in"
        style={
          {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            ['--jab-from' as string]: `${-58 * dir}px`,
          } as React.CSSProperties
        }
      >
        <svg
          width="104"
          height="32"
          viewBox="-72 -16 104 32"
          style={{ position: 'absolute', left: -72, top: -16, overflow: 'visible', transform: `scaleX(${dir})` }}
        >
          <defs>
            <linearGradient id="jab-streak" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor={KI_MID} stopOpacity="0" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor={KI_CORE} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M -66 0 Q -12 -6 20 0 Q -12 6 -66 0 Z" fill="url(#jab-streak)" />
        </svg>
      </div>
      {/* Flat-knuckle impact plane + shock arcs */}
      <div className="absolute animate-fist-impact" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="104"
          height="104"
          viewBox="-52 -52 104 104"
          style={{ position: 'absolute', left: -52, top: -52, overflow: 'visible', transform: `scaleX(${dir})`, filter: `drop-shadow(0 0 6px ${KI_GLOW})` }}
        >
          <defs>
            <radialGradient id="fist-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor={KI_CORE} stopOpacity="0.8" />
              <stop offset="100%" stopColor={KI_MID} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="3" cy="0" r="21" fill="url(#fist-core)" />
          {/* The impact plane — the wall the blow flattens against */}
          <path d="M 9 -22 Q 17 0 9 22" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
          {/* Shock arcs bouncing off beyond the plane */}
          <path d="M 19 -28 Q 30 0 19 28" fill="none" stroke={KI_MID} strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
          <path d="M 30 -32 Q 44 0 30 32" fill="none" stroke={KI_MID} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      {/* Knuckle sparks flung past the impact */}
      {[-26, 8, 30].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 34 + i * 7;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-[1px] animate-spark"
            style={{
              left: 0,
              top: 0,
              background: KI_CORE,
              boxShadow: `0 0 8px ${KI_GLOW}`,
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist * dir}px, ${Math.sin(rad) * dist}px)`,
              animationDelay: `${50 + i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Unarmed: Flurry double-jab ----------

/** Flurry extra strike: two jabs rattle in high/low in quick succession —
 *  rat-tat — each with its own compact impact pop. */
export function UnarmedFlurryEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(560, onDone);
  const dir = attackDir(origin, target);
  const jabs = [
    { off: -15, delay: 0 },
    { off: 13, delay: 110 },
  ];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {jabs.map((j, i) => (
        <div key={i}>
          <div
            className="absolute animate-jab-in"
            style={
              {
                left: 0,
                top: j.off,
                width: 0,
                height: 0,
                animationDelay: `${j.delay}ms`,
                opacity: 0,
                ['--jab-from' as string]: `${-52 * dir}px`,
              } as React.CSSProperties
            }
          >
            <svg
              width="92"
              height="26"
              viewBox="-62 -13 92 26"
              style={{ position: 'absolute', left: -62, top: -13, overflow: 'visible', transform: `scaleX(${dir})` }}
            >
              <defs>
                <linearGradient id={`flurry-jab-${i}`} x1="0" y1="0.5" x2="1" y2="0.5">
                  <stop offset="0%" stopColor={KI_MID} stopOpacity="0" />
                  <stop offset="75%" stopColor="#ffffff" stopOpacity="0.92" />
                  <stop offset="100%" stopColor={KI_CORE} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d="M -56 0 Q -10 -4.5 18 0 Q -10 4.5 -56 0 Z" fill={`url(#flurry-jab-${i})`} />
            </svg>
          </div>
          <div
            className="absolute animate-fist-impact"
            style={{ left: 5 * dir, top: j.off, width: 0, height: 0, animationDelay: `${j.delay + 60}ms`, opacity: 0 }}
          >
            <svg
              width="64"
              height="64"
              viewBox="-32 -32 64 64"
              style={{ position: 'absolute', left: -32, top: -32, overflow: 'visible', transform: `scaleX(${dir})`, filter: `drop-shadow(0 0 5px ${KI_GLOW})` }}
            >
              <defs>
                <radialGradient id={`flurry-pop-${i}`} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="55%" stopColor={KI_CORE} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={KI_MID} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="0" cy="0" r="14" fill={`url(#flurry-pop-${i})`} />
              <path d="M 6 -15 Q 13 0 6 15" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.92" />
            </svg>
          </div>
        </div>
      ))}
      {/* A couple of trailing speed ticks between the jabs */}
      {[-2, 24].map((y, i) => (
        <div
          key={`tick-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full animate-spark"
          style={{
            left: -16 * dir,
            top: y,
            background: KI_MID,
            boxShadow: `0 0 5px ${KI_GLOW}`,
            ['--spark-dest' as string]: `translate(${-26 * dir}px, ${(i ? 10 : -10)}px)`,
            animationDelay: `${90 + i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Ki charge (Flurry / Stunning Strike wind-up) ----------

interface SelfAnchorProps {
  origin: Anchor;
  onDone: () => void;
}

/** Ki gathered into the palms: two rings contract INTO a bright core between
 *  the hands, motes rise off the stance. The monk's "power flows" tell. */
export function KiChargeEffect({ origin, onDone }: SelfAnchorProps) {
  useDoneTimer(700, onDone);
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      {/* Contracting gather rings */}
      {[0, 140].map((delay, i) => (
        <div
          key={i}
          className="absolute animate-ki-gather"
          style={{ left: 0, top: -4, width: 0, height: 0, animationDelay: `${delay}ms`, opacity: 0 }}
        >
          <svg
            width="120"
            height="120"
            viewBox="-60 -60 120 120"
            style={{ position: 'absolute', left: -60, top: -60, overflow: 'visible' }}
          >
            <circle cx="0" cy="0" r="44" fill="none" stroke={KI_MID} strokeWidth={i === 0 ? 2.4 : 1.6} opacity="0.85" />
            <circle cx="0" cy="0" r="44" fill="none" stroke={KI_CORE} strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>
      ))}
      {/* The bright palm core the rings collapse into */}
      <div className="absolute animate-ki-core" style={{ left: 0, top: -4, width: 0, height: 0 }}>
        <svg
          width="72"
          height="72"
          viewBox="-36 -36 72 72"
          style={{ position: 'absolute', left: -36, top: -36, overflow: 'visible', filter: `drop-shadow(0 0 8px ${KI_GLOW})` }}
        >
          <defs>
            <radialGradient id="ki-core-grad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor={KI_CORE} stopOpacity="0.9" />
              <stop offset="100%" stopColor={KI_MID} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="16" fill="url(#ki-core-grad)" />
          {/* Open-palm chevrons cupping the core */}
          <path d="M -14 -12 Q -20 0 -14 12" fill="none" stroke={KI_CORE} strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
          <path d="M 14 -12 Q 20 0 14 12" fill="none" stroke={KI_CORE} strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
        </svg>
      </div>
      {/* Ki motes rising off the stance */}
      {[-20, -6, 8, 22].map((x, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full animate-secondwind-mote"
          style={{
            left: x,
            top: 14,
            background: KI_CORE,
            boxShadow: `0 0 6px ${KI_GLOW}`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Axe: heavy chop ----------

/** The descending heavy chop: a fat wedge crescent with a trailing wake,
 *  ending in a bite flash and chunky debris — chunkier and steeper than the
 *  sword's clean slash. */
export function AxeChopEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(440, onDone);
  const dir = attackDir(origin, target);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Trailing wake — same wedge, dimmer, a beat behind */}
      <div className="absolute animate-axe-chop" style={{ left: 0, top: 0, width: 0, height: 0, animationDelay: '50ms', opacity: 0 }}>
        <AxeWedge dir={dir} dim />
      </div>
      {/* The chop itself */}
      <div className="absolute animate-axe-chop" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <AxeWedge dir={dir} />
      </div>
      {/* Bite flash low where the edge stops */}
      <div className="absolute animate-pierce-burst" style={{ left: 6 * dir, top: 22, width: 0, height: 0 }}>
        <svg
          width="56"
          height="56"
          viewBox="-28 -28 56 56"
          style={{ position: 'absolute', left: -28, top: -28, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="axe-bite" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#ffd9a0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="20" fill="url(#axe-bite)" />
        </svg>
      </div>
      {/* Chunky debris bitten out — squares, not sparks */}
      {[205, 250, 305].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 28 + i * 8;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 animate-spark"
            style={{
              left: 4 * dir,
              top: 18,
              background: i === 1 ? '#cdbb98' : '#8a6a3a',
              boxShadow: '0 0 4px rgba(205,187,152,0.7)',
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist * dir}px, ${Math.sin(rad) * dist * -1}px)`,
              animationDelay: `${80 + i * 40}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function AxeWedge({ dir, dim }: { dir: 1 | -1; dim?: boolean }) {
  const id = dim ? 'axe-wedge-dim' : 'axe-wedge';
  return (
    <svg
      width="140"
      height="140"
      viewBox="-70 -70 140 140"
      style={{ position: 'absolute', left: -70, top: -70, overflow: 'visible', transform: `scaleX(${dir})`, opacity: dim ? 0.45 : 1 }}
    >
      <defs>
        <linearGradient id={id} x1="0.2" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="72%" stopColor="#ffb347" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fat wedge — a steep, chunky crescent (vs the slash's slim arc) */}
      <path d="M -34 -58 Q 38 -36 30 52 Q -8 -4 -34 -58 Z" fill={`url(#${id})`} />
      {/* Heavy leading edge */}
      <path d="M -28 -50 Q 30 -30 26 42" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" opacity="0.95" />
      {/* Haft shadow trailing the blade */}
      <path d="M -40 -44 Q 6 -28 12 24" fill="none" stroke="#8a6a3a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// ---------- Mace / hammer / flail: crush ----------

/** The ground-cracking crush: a hammer block slams down, a shock half-ring
 *  rides the ground line, jagged cracks flash, dust kicks low. */
export function CrushEffect({ target, onDone }: WeaponEffectProps) {
  useDoneTimer(500, onDone);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* The falling weight */}
      <div className="absolute animate-crush-drop" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="84"
          height="104"
          viewBox="-42 -74 84 104"
          style={{ position: 'absolute', left: -42, top: -74, overflow: 'visible', filter: 'drop-shadow(0 0 6px rgba(232,220,196,0.6))' }}
        >
          <defs>
            <linearGradient id="crush-head" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffaf0" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d4b062" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          {/* Motion smear above the head */}
          <rect x="-9" y="-70" width="18" height="40" rx="8" fill="#e8dcc4" opacity="0.4" />
          {/* The blunt head */}
          <rect x="-17" y="-32" width="34" height="27" rx="5" fill="url(#crush-head)" stroke="#fffaf0" strokeWidth="1.8" />
        </svg>
      </div>
      {/* Ground-shock half ring, clamped low */}
      <div className="absolute animate-crack-ring" style={{ left: 0, top: 16, width: 0, height: 0 }}>
        <svg
          width="180"
          height="60"
          viewBox="-90 -30 180 60"
          style={{ position: 'absolute', left: -90, top: -30, overflow: 'visible' }}
        >
          <path d="M -72 10 Q 0 -34 72 10" fill="none" stroke="#e8dcc4" strokeWidth="5.5" opacity="0.95" strokeLinecap="round" />
          <path d="M -56 12 Q 0 -20 56 12" fill="none" stroke="#d4b062" strokeWidth="2.6" opacity="0.65" strokeLinecap="round" />
        </svg>
      </div>
      {/* Jagged ground cracks radiating from the slam point */}
      <div className="absolute animate-crack-lines" style={{ left: 0, top: 14, width: 0, height: 0 }}>
        <svg
          width="150"
          height="50"
          viewBox="-75 -12 150 50"
          style={{ position: 'absolute', left: -75, top: -12, overflow: 'visible' }}
        >
          <g stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.95">
            <path d="M 0 2 L -20 10 L -38 7 L -56 17" />
            <path d="M 0 2 L 18 12 L 36 10 L 52 20" />
            <path d="M 0 2 L -5 15 L 3 26" />
          </g>
          <g stroke="#8a6a3a" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75">
            <path d="M 0 5 L -15 15 L -33 12" />
            <path d="M 0 5 L 13 17 L 30 15" />
          </g>
        </svg>
      </div>
      {/* Concussive core flash */}
      <div className="absolute animate-bludgeon-star" style={{ left: 0, top: 8, width: 0, height: 0 }}>
        <svg
          width="64"
          height="64"
          viewBox="-32 -32 64 64"
          style={{ position: 'absolute', left: -32, top: -32, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="crush-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fffaf0" stopOpacity="1" />
              <stop offset="55%" stopColor="#e8dcc4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="16" fill="url(#crush-core)" />
        </svg>
      </div>
      {/* Dust kicked out along the ground */}
      {[190, 235, 290, 335, 350].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 38 + (i % 3) * 11;
        return (
          <div
            key={i}
            className="absolute rounded-full animate-spark"
            style={{
              left: 0,
              top: 14,
              width: 9,
              height: 9,
              marginLeft: -4.5,
              marginTop: -4.5,
              background: '#e8dcc4',
              boxShadow: '0 0 5px rgba(205,187,152,0.8)',
              opacity: 0.85,
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist}px, ${Math.abs(Math.sin(rad)) * -12}px)`,
              animationDelay: `${60 + i * 24}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Spear / javelin: lance thrust ----------

/** The long lance line: a full-length shaft with a leaf head drives deep,
 *  overshoots a touch, recoils — far longer reach than the rapier's pierce. */
export function SpearThrustEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(420, onDone);
  const dir = attackDir(origin, target);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-lance-thrust"
        style={
          {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            ['--lance-from' as string]: `${-110 * dir}px`,
            ['--lance-recoil' as string]: `${-8 * dir}px`,
          } as React.CSSProperties
        }
      >
        <svg
          width="170"
          height="32"
          viewBox="-140 -16 170 32"
          style={{ position: 'absolute', left: -140, top: -16, overflow: 'visible', transform: `scaleX(${dir})` }}
        >
          <defs>
            <linearGradient id="lance-shaft" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#6b4a2e" stopOpacity="0" />
              <stop offset="35%" stopColor="#8a6a3a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b89058" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="lance-gleam" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* Long shaft */}
          <rect x="-132" y="-2.5" width="138" height="5" rx="2.5" fill="url(#lance-shaft)" />
          {/* Speed gleam riding the shaft */}
          <rect x="-80" y="-1.2" width="80" height="2.4" fill="url(#lance-gleam)" opacity="0.85" />
          {/* Leaf-blade head */}
          <path d="M 5 0 L 17 -8 Q 35 0 17 8 Z" fill="#e8e2d4" stroke="#ffffff" strokeWidth="1" />
          <path d="M 8 0 L 30 0" stroke="#9a9486" strokeWidth="1" />
        </svg>
      </div>
      {/* Focused puncture burst — deeper and tighter than the rapier's */}
      <div className="absolute animate-pierce-burst" style={{ left: 8 * dir, top: 0, width: 0, height: 0 }}>
        <svg
          width="72"
          height="72"
          viewBox="-36 -36 72 72"
          style={{ position: 'absolute', left: -36, top: -36, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="lance-ring" cx="0.5" cy="0.5" r="0.5">
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="75%" stopColor="#ffd9a0" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="26" fill="url(#lance-ring)" />
          {/* Penetration lines streaming past the wound */}
          <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
            <line x1={8 * dir} y1="-6" x2={26 * dir} y2="-10" />
            <line x1={10 * dir} y1="0" x2={30 * dir} y2="0" />
            <line x1={8 * dir} y1="6" x2={26 * dir} y2="10" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// ---------- Dagger: double flick ----------

/** Quick steel: two thin flicks cross in an X a heartbeat apart, with a glint
 *  star where they meet. Minimal glow — it reads as speed, not power. */
export function DaggerFlickEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(400, onDone);
  const dir = attackDir(origin, target);
  const flicks = [
    { rot: -32, delay: 0 },
    { rot: 38, delay: 90 },
  ];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {flicks.map((f, i) => (
        // Outer wrapper owns the static tilt; the inner leaf rides the flick
        // keyframe, so its translateX whips along the rotated axis instead of
        // clobbering the rotation.
        <div
          key={i}
          className="absolute"
          style={{ left: 0, top: 0, width: 0, height: 0, transform: `rotate(${f.rot * dir}deg)` }}
        >
          <div
            className="absolute animate-flick"
            style={
              {
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                animationDelay: `${f.delay}ms`,
                opacity: 0,
                ['--flick-from' as string]: `${-30 * dir}px`,
              } as React.CSSProperties
            }
          >
            <svg
              width="108"
              height="16"
              viewBox="-54 -8 108 16"
              style={{ position: 'absolute', left: -54, top: -8, overflow: 'visible', transform: `scaleX(${dir})` }}
            >
              <defs>
                <linearGradient id={`flick-edge-${i}`} x1="0" y1="0.5" x2="1" y2="0.5">
                  <stop offset="0%" stopColor="#dfe7ef" stopOpacity="0" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dfe7ef" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M -50 0 Q 0 -3.6 50 0 Q 0 3.6 -50 0 Z" fill={`url(#flick-edge-${i})`} />
            </svg>
          </div>
        </div>
      ))}
      {/* Glint star where the X crosses */}
      <div className="absolute animate-glint" style={{ left: 2 * dir, top: -2, width: 0, height: 0, opacity: 0 }}>
        <svg
          width="48"
          height="48"
          viewBox="-24 -24 48 48"
          style={{ position: 'absolute', left: -24, top: -24, overflow: 'visible', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }}
        >
          <g fill="#ffffff" opacity="0.95">
            <polygon points="0,-17 2.6,-2.6 17,0 2.6,2.6 0,17 -2.6,2.6 -17,0 -2.6,-2.6" />
          </g>
          <circle cx="0" cy="0" r="3.2" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}

// ---------- Bow: shot with draw-flash + feather burst ----------

/** The arrow flight plus the moments around it: a bow-limb draw-flash snaps at
 *  release, and the thunk shakes loose a flutter of fletching feathers. */
export function BowShotEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(760, onDone);
  const dir = attackDir(origin, target);
  const flightMs = 300;
  const feathers = [
    { dx: 20, dy: -28, rot: 130, delay: 0 },
    { dx: -12, dy: -36, rot: -100, delay: 40 },
    { dx: 30, dy: -14, rot: 200, delay: 80 },
  ];
  return (
    <>
      {/* Draw-flash at release — limbs + string snapping forward */}
      <div
        className="absolute animate-bow-flash"
        style={{ left: origin.x + 10 * dir, top: origin.y - 8, width: 0, height: 0 }}
      >
        <svg
          width="92"
          height="112"
          viewBox="-46 -56 92 112"
          style={{ position: 'absolute', left: -46, top: -56, overflow: 'visible', transform: `scaleX(${dir})`, filter: 'drop-shadow(0 0 6px rgba(255,217,160,0.8))' }}
        >
          {/* Bow limbs */}
          <path d="M 6 -46 Q 30 0 6 46" fill="none" stroke="#ffd9a0" strokeWidth="3.6" strokeLinecap="round" opacity="0.95" />
          {/* String released — straight line with a slight forward bow */}
          <path d="M 6 -46 Q 14 0 6 46" fill="none" stroke="#fffaf0" strokeWidth="1.6" opacity="0.9" />
          {/* Release flash at the grip */}
          <circle cx="12" cy="0" r="9" fill="#fffaf0" opacity="0.85" />
          {/* Speed ticks streaming off the string */}
          <g stroke="#ffd9a0" strokeWidth="2" strokeLinecap="round" opacity="0.75">
            <line x1="16" y1="-14" x2="28" y2="-16" />
            <line x1="18" y1="0" x2="32" y2="0" />
            <line x1="16" y1="14" x2="28" y2="16" />
          </g>
        </svg>
      </div>
      {/* The arrow itself — same flight as ever */}
      <ArrowShotEffect origin={origin} target={target} onDone={() => {}} />
      {/* Feather burst off the thunk */}
      {feathers.map((f, i) => (
        <div
          key={i}
          className="absolute animate-feather"
          style={
            {
              left: target.x,
              top: target.y - 2,
              width: 0,
              height: 0,
              animationDelay: `${flightMs - 20 + f.delay}ms`,
              opacity: 0,
              ['--feather-x' as string]: `${f.dx * dir}px`,
              ['--feather-y' as string]: `${f.dy}px`,
              ['--feather-rot' as string]: `${f.rot}deg`,
            } as React.CSSProperties
          }
        >
          <svg
            width="22"
            height="22"
            viewBox="-11 -11 22 22"
            style={{ position: 'absolute', left: -11, top: -11, overflow: 'visible', filter: 'drop-shadow(0 0 3px rgba(232,220,196,0.6))' }}
          >
            <polygon points="-8,0 2,-6 8,0 2,6" fill="#d84a42" opacity="0.95" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff5e0" strokeWidth="1.2" opacity="0.9" />
          </svg>
        </div>
      ))}
    </>
  );
}

// ---------- Staff / orb / wand: the caster bonk ----------

/** The scholar's indignity: a knobbed staff head swings a short overhead arc
 *  and lands with a modest, slightly arcane pop. Deliberately humble. */
export function CasterBonkEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(460, onDone);
  const dir = attackDir(origin, target);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Knob arcs overhead and comes down */}
      <div className="absolute animate-bonk-arc" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="124"
          height="124"
          viewBox="-62 -62 124 124"
          style={{ position: 'absolute', left: -62, top: -62, overflow: 'visible', transform: `scaleX(${dir})` }}
        >
          {/* Short staff segment with a knob — the part that does the bonking */}
          <g transform="rotate(-24)">
            <rect x="-5" y="-54" width="9" height="38" rx="4" fill="#8a6a3a" opacity="0.92" />
            <circle cx="-0.5" cy="-56" r="11" fill="#b89058" stroke="#ffd9a0" strokeWidth="2" />
            <circle cx="-4" cy="-59" r="3.2" fill="#fff5d1" opacity="0.9" />
          </g>
          {/* Faint swing trail */}
          <path d="M -42 -34 Q 0 -64 38 -40" fill="none" stroke="#ffd9a0" strokeWidth="2.6" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      {/* The arcane pop — modest ring + offended violet sparkle */}
      <div className="absolute animate-mm-burst" style={{ left: 0, top: -14, width: 0, height: 0, animationDelay: '170ms', opacity: 0 }}>
        <svg
          width="72"
          height="72"
          viewBox="-36 -36 72 72"
          style={{ position: 'absolute', left: -36, top: -36, overflow: 'visible', filter: 'drop-shadow(0 0 6px rgba(201,168,255,0.7))' }}
        >
          <defs>
            <radialGradient id="bonk-pop" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fff5d1" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#c9a8ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#5e3a8f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="21" fill="url(#bonk-pop)" />
          <circle cx="0" cy="0" r="27" fill="none" stroke="#c9a8ff" strokeWidth="1.8" opacity="0.75" />
        </svg>
      </div>
      {/* Dazed sparkles wobbling up */}
      {[-12, 4, 16].map((x, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full animate-spark"
          style={{
            left: x,
            top: -14,
            background: '#e6d6ff',
            boxShadow: '0 0 5px rgba(201,168,255,0.9)',
            ['--spark-dest' as string]: `translate(${x * 0.6}px, ${-22 - i * 6}px)`,
            animationDelay: `${200 + i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Claws: the rending rake ----------

// The wound palette — raw rends, deliberately apart from the slash's steel
// amber and the monk's jade: deep blood-dark tails into a white-hot tear edge.
const REND_DARK = '#7e1f1a';
const REND_MID = '#d84a42';
const REND_HOT = '#ff8d7a';
const REND_EDGE = '#fff1e8';

/** Shapeshift natural weapons: three parallel ragged tear-lines rip steeply
 *  across the target a heartbeat apart — rend, not steel. Distinct from the
 *  sword slash in angle (52° rake vs the shallow crescent), count (three
 *  staggered gashes) and texture (torn red wounds, no metal gleam). The dragon
 *  variant (`heavy`) is the same language grown to sword-length talons:
 *  1.35× scale, thicker tears, and a gouge flash where the rake bites. */
export function ClawRakeEffect({ origin, target, onDone, heavy }: WeaponEffectProps & { heavy?: boolean }) {
  useDoneTimer(heavy ? 600 : 520, onDone);
  const dir = attackDir(origin, target);
  // Middle gash leads and reaches furthest, like the longest finger of a paw.
  const gashes = [
    { off: -19, lead: -4, scale: 0.86, delay: 0 },
    { off: 0, lead: 6, scale: 1, delay: 60 },
    { off: 19, lead: -4, scale: 0.9, delay: 120 },
  ];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Gouge flash under the rake — the dragon's bite depth */}
      {heavy && (
        <div className="absolute animate-pierce-burst" style={{ left: 0, top: 0, width: 0, height: 0, animationDelay: '90ms', opacity: 0 }}>
          <svg
            width="120"
            height="120"
            viewBox="-60 -60 120 120"
            style={{ position: 'absolute', left: -60, top: -60, overflow: 'visible' }}
          >
            <defs>
              <radialGradient id="claw-gouge" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor={REND_EDGE} stopOpacity="0.9" />
                <stop offset="50%" stopColor={REND_HOT} stopOpacity="0.55" />
                <stop offset="100%" stopColor={REND_DARK} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="44" fill="url(#claw-gouge)" />
          </svg>
        </div>
      )}
      {/* Outer wrapper owns the static rake angle + dragon scale; each gash
          whips along the rotated axis inside it (transform-nesting rule). */}
      <div
        className="absolute"
        style={{ left: 0, top: 0, width: 0, height: 0, transform: `rotate(${52 * dir}deg) scale(${heavy ? 1.35 : 1})` }}
      >
        {gashes.map((g, i) => (
          <div key={i} className="absolute" style={{ left: g.lead, top: g.off, width: 0, height: 0, transform: `scale(${g.scale})` }}>
            <div
              className="absolute animate-claw-rip"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 0,
                  height: 0,
                  animationDelay: `${g.delay}ms`,
                  opacity: 0,
                  ['--rip-from' as string]: `${-46 * dir}px`,
                } as React.CSSProperties
              }
            >
              <svg
                width="136"
                height="26"
                viewBox="-68 -13 136 26"
                style={{ position: 'absolute', left: -68, top: -13, overflow: 'visible', transform: `scaleX(${dir})`, filter: `drop-shadow(0 0 ${heavy ? 6 : 4}px rgba(216,74,66,0.75))` }}
              >
                <defs>
                  <linearGradient id={`claw-tear-${i}`} x1="0" y1="0.5" x2="1" y2="0.5">
                    <stop offset="0%" stopColor={REND_DARK} stopOpacity="0" />
                    <stop offset="40%" stopColor={REND_MID} stopOpacity="0.85" />
                    <stop offset="78%" stopColor={REND_HOT} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={REND_EDGE} stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Ragged tear body — smooth cutting edge above, torn underside */}
                <path
                  d="M -64 0 Q -10 -5 42 -3 L 60 0 L 42 3 L 30 6.5 L 17 3.5 L 4 7 L -12 3.5 L -28 5.5 L -46 2.5 Z"
                  fill={`url(#claw-tear-${i})`}
                />
                {/* White-hot claw point at the lead */}
                <path d="M 44 -2 L 62 0 L 44 2 Z" fill="#ffffff" opacity="0.95" />
              </svg>
            </div>
          </div>
        ))}
      </div>
      {/* Rend flecks sprayed off the wound, downward with the rake */}
      {(heavy ? [56, 78, 98, 118] : [62, 84, 108]).map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = (heavy ? 36 : 30) + i * 7;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-[1px] animate-spark"
            style={{
              left: 0,
              top: 0,
              background: i % 2 ? '#ffd9c9' : REND_MID,
              boxShadow: `0 0 6px rgba(216,74,66,0.85)`,
              ['--spark-dest' as string]: `translate(${Math.cos(rad) * dist * dir}px, ${Math.sin(rad) * dist}px)`,
              animationDelay: `${110 + i * 36}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Stun lands (Stunning Strike) ----------

/** The palm lands and the lights go out: a jade palm flash so the blow reads,
 *  then dizzy gold stars orbit the head over a wobbling halo ring. The
 *  persistent staggered-state halo on the sprite takes over from here. */
export function StunBurstEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(980, onDone);
  const dir = attackDir(origin, target);
  const headY = -34;
  const stars = [0, 120, 240];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* The connecting palm — the hit itself still reads */}
      <div className="absolute animate-fist-impact" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width="76"
          height="76"
          viewBox="-38 -38 76 76"
          style={{ position: 'absolute', left: -38, top: -38, overflow: 'visible', transform: `scaleX(${dir})`, filter: `drop-shadow(0 0 8px ${KI_GLOW})` }}
        >
          <defs>
            <radialGradient id="stun-palm" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor={KI_CORE} stopOpacity="0.85" />
              <stop offset="100%" stopColor={KI_MID} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="18" fill="url(#stun-palm)" />
          <path d="M 8 -18 Q 16 0 8 18" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
        </svg>
      </div>
      {/* Wobbling dazed halo over the head */}
      <div className="absolute animate-stun-ring" style={{ left: 0, top: headY, width: 0, height: 0, opacity: 0 }}>
        <svg
          width="80"
          height="36"
          viewBox="-40 -18 80 36"
          style={{ position: 'absolute', left: -40, top: -18, overflow: 'visible' }}
        >
          <ellipse cx="0" cy="0" rx="26" ry="9" fill="none" stroke="#ffd166" strokeWidth="2" opacity="0.85" />
          <ellipse cx="0" cy="0" rx="26" ry="9" fill="none" stroke="#fff5d1" strokeWidth="0.8" opacity="0.6" strokeDasharray="4 5" />
        </svg>
      </div>
      {/* Dizzy stars whirling the halo — same translate-ellipse orbit as the
          persistent staggered halo, faster, inside a fade-in/out shell. */}
      <div className="absolute animate-stun-fade" style={{ left: 0, top: headY, width: 0, height: 0, opacity: 0 }}>
        {stars.map((deg, i) => (
          <div
            key={deg}
            className="absolute animate-stun-star-orbit"
            style={{
              left: -8,
              top: -8,
              width: 16,
              height: 16,
              // Faster than the persistent halo — a full whirl inside the shell.
              animationDuration: '1100ms',
              animationDelay: `${-i * 367}ms`,
            }}
          >
            <svg width="16" height="16" viewBox="-8 -8 16 16" style={{ overflow: 'visible' }}>
              <polygon
                points="0,-7 1.8,-1.8 7,0 1.8,1.8 0,7 -1.8,1.8 -7,0 -1.8,-1.8"
                fill="#ffd166"
                stroke="#fff5d1"
                strokeWidth="0.6"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Knockdown lands (martial DISRUPT) ----------

/** The fell: heavy slam lines drive down through the target, the ground
 *  cracks, and a wide skirt of dust billows out low. The persistent
 *  staggered-state visuals on the sprite take over from here. */
export function KnockdownBurstEffect({ origin, target, onDone }: WeaponEffectProps) {
  useDoneTimer(700, onDone);
  const dir = attackDir(origin, target);
  const puffs = [
    { x: -36, d: 40, s: 1.1 },
    { x: -12, d: 0, s: 1.5 },
    { x: 12, d: 70, s: 1.3 },
    { x: 38, d: 110, s: 1 },
  ];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Slam wedge — heavy convergent force lines driving down */}
      <div className="absolute animate-fist-impact" style={{ left: 0, top: -14, width: 0, height: 0 }}>
        <svg
          width="112"
          height="112"
          viewBox="-56 -56 112 112"
          style={{ position: 'absolute', left: -56, top: -56, overflow: 'visible', transform: `scaleX(${dir})`, filter: 'drop-shadow(0 0 6px rgba(255,179,71,0.6))' }}
        >
          <g stroke="#fffaf0" strokeWidth="4.6" strokeLinecap="round" opacity="0.95">
            <line x1="-24" y1="-40" x2="-5" y2="8" />
            <line x1="3" y1="-48" x2="3" y2="10" />
            <line x1="27" y1="-37" x2="11" y2="8" />
          </g>
          <g stroke="#ffb347" strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
            <line x1="-35" y1="-29" x2="-16" y2="5" />
            <line x1="38" y1="-26" x2="19" y2="5" />
          </g>
        </svg>
      </div>
      {/* Ground crack half-ring (shared with the crush) */}
      <div className="absolute animate-crack-ring" style={{ left: 0, top: 20, width: 0, height: 0 }}>
        <svg
          width="190"
          height="64"
          viewBox="-95 -32 190 64"
          style={{ position: 'absolute', left: -95, top: -32, overflow: 'visible' }}
        >
          <path d="M -76 10 Q 0 -34 76 10" fill="none" stroke="#e8dcc4" strokeWidth="5" opacity="0.9" strokeLinecap="round" />
          <path d="M -58 12 Q 0 -20 58 12" fill="none" stroke="#cdbb98" strokeWidth="2.4" opacity="0.6" strokeLinecap="round" />
        </svg>
      </div>
      {/* Dust skirt hugging the ground */}
      {puffs.map((p, i) => (
        <div
          key={i}
          className="absolute animate-cunning-smoke rounded-full"
          style={{
            left: p.x,
            top: 20,
            width: 38 * p.s,
            height: 28 * p.s,
            marginLeft: (-38 * p.s) / 2,
            marginTop: (-28 * p.s) / 2,
            background:
              'radial-gradient(ellipse, rgba(226,209,176,0.85) 0%, rgba(155,122,70,0.5) 50%, rgba(60,48,30,0) 75%)',
            animationDelay: `${p.d}ms`,
          }}
        />
      ))}
    </div>
  );
}
