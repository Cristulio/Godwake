import { useEffect } from 'react';

/**
 * Weapon-swing VFX, brought up to the SpellEffect bar. Each effect is an
 * absolutely-positioned overlay anchored to battlefield coordinates and driven
 * by layered SVG gradients + CSS `@keyframes` (see the combat-vfx block in
 * `src/index.css`). Dispatched from `SpellEffect`'s switch for the weapon
 * kinds: slash / pierce / bludgeon / arrow. They self-clean via `onDone`.
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
