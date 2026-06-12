import { layoutMonsterSprites, SLOT_WIDTH, FIELD_WIDTH } from './battlefieldLayout';
import { useEffect, useRef, useState } from 'react';
import type {
  CombatState,
  MonsterCombatant,
  SpellEffectEvent,
  SpellEffectKind,
  SpellElement,
} from '../../types/combat';
import { PlayerPortrait } from './PlayerPortrait';
import {
  WeaponSlashEffect,
  WeaponPierceEffect,
  WeaponBludgeonEffect,
  ArrowShotEffect,
  UnarmedImpactEffect,
  UnarmedFlurryEffect,
  KiChargeEffect,
  AxeChopEffect,
  CrushEffect,
  SpearThrustEffect,
  DaggerFlickEffect,
  BowShotEffect,
  CasterBonkEffect,
  StunBurstEffect,
  KnockdownBurstEffect,
  ClawRakeEffect,
} from './SlashEffect';

interface Anchor {
  x: number;
  y: number;
}

interface SpellEffectProps {
  kind: SpellEffectKind;
  origin: Anchor;
  target: Anchor;
  /** Element for the shape kinds — picks the colour ramp + particle style. */
  element?: SpellElement;
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
  // Mirror the Battlefield's REAL slot layout (corpse culling + crowd
  // compression) instead of a naive fixed-step index — the two diverged the
  // moment summons crowded the row or old corpses were culled, and bolts
  // landed mid-field while the damage hit the right sprite (owner-seen).
  const slot = layoutMonsterSprites(monsters).find((s) => s.combatant.id === id);
  if (slot) {
    return { x: FIELD_WIDTH - slot.right - SLOT_WIDTH / 2, y: MONSTER_Y };
  }
  // Culled corpse (effect aimed at a body the row no longer shows) — the old
  // approximation is fine for a fading target.
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
        element={active.element}
        onDone={() => setActive(null)}
      />
    </div>
  );
}

export function SpellEffect({ kind, origin, target, element, onDone }: SpellEffectProps) {
  switch (kind) {
    case 'magic-missile':
      return <MagicMissileEffect origin={origin} target={target} onDone={onDone} />;
    // === spell-vfx-by-element === shape × element. The palette comes from
    // `element`; the shape from the kind. Together they keep every damage
    // school visually distinct.
    case 'spell-bolt':
      return <SpellBoltEffect origin={origin} target={target} element={element} onDone={onDone} />;
    case 'spell-burst':
      return <SpellBurstEffect target={target} element={element} onDone={onDone} />;
    case 'spell-fork':
      return <SpellForkEffect origin={origin} target={target} element={element} onDone={onDone} />;
    case 'spell-drain':
      return <SpellDrainEffect origin={origin} target={target} element={element} onDone={onDone} />;
    case 'burning-hands':
      return <BurningHandsEffect origin={origin} onDone={onDone} />;
    case 'shield':
      return <ShieldEffect origin={origin} onDone={onDone} />;
    case 'mage-armor':
      return <MageArmorEffect origin={origin} onDone={onDone} />;
    case 'hold-person':
      return <HoldPersonEffect target={target} onDone={onDone} />;
    // --- weapon kinds (feat/vfx-combat) ---
    case 'slash':
      return <WeaponSlashEffect origin={origin} target={target} onDone={onDone} />;
    case 'pierce':
      return <WeaponPierceEffect origin={origin} target={target} onDone={onDone} />;
    case 'bludgeon':
      return <WeaponBludgeonEffect origin={origin} target={target} onDone={onDone} />;
    case 'arrow':
      return <ArrowShotEffect origin={origin} target={target} onDone={onDone} />;
    // === animations-revamp === per-weapon-TYPE identities + monk + control landings.
    case 'unarmed':
      return <UnarmedImpactEffect origin={origin} target={target} onDone={onDone} />;
    case 'unarmed-flurry':
      return <UnarmedFlurryEffect origin={origin} target={target} onDone={onDone} />;
    case 'ki-charge':
      return <KiChargeEffect origin={origin} onDone={onDone} />;
    case 'axe-chop':
      return <AxeChopEffect origin={origin} target={target} onDone={onDone} />;
    case 'crush':
      return <CrushEffect origin={origin} target={target} onDone={onDone} />;
    case 'spear-thrust':
      return <SpearThrustEffect origin={origin} target={target} onDone={onDone} />;
    case 'dagger-flick':
      return <DaggerFlickEffect origin={origin} target={target} onDone={onDone} />;
    case 'bow-shot':
      return <BowShotEffect origin={origin} target={target} onDone={onDone} />;
    case 'caster-bonk':
      return <CasterBonkEffect origin={origin} target={target} onDone={onDone} />;
    case 'stun-burst':
      return <StunBurstEffect origin={origin} target={target} onDone={onDone} />;
    case 'knockdown-burst':
      return <KnockdownBurstEffect origin={origin} target={target} onDone={onDone} />;
    // === claw-vfx === shapeshift natural weapons.
    case 'claw-rake':
      return <ClawRakeEffect origin={origin} target={target} onDone={onDone} />;
    case 'dragon-rake':
      return <ClawRakeEffect origin={origin} target={target} heavy onDone={onDone} />;
    // --- class-ability kinds (feat/vfx-combat) ---
    case 'rage':
      return <RageEffect origin={origin} onDone={onDone} />;
    case 'reckless':
      return <RecklessEffect origin={origin} onDone={onDone} />;
    case 'hunters-mark':
      return <HuntersMarkEffect target={target} onDone={onDone} />;
    case 'colossus':
      return <ColossusEffect origin={origin} target={target} onDone={onDone} />;
    case 'cunning-action':
      return <CunningActionEffect origin={origin} onDone={onDone} />;
    case 'second-wind':
      return <SecondWindEffect origin={origin} onDone={onDone} />;
    case 'action-surge':
      return <ActionSurgeEffect origin={origin} onDone={onDone} />;
    // === enemy-vfx (feat/vfx-enemies) ===
    case 'enemy-summon':
      return <SummonEffect target={target} onDone={onDone} />;
    case 'debuff-poison':
      return <PoisonCloudEffect target={target} onDone={onDone} />;
    case 'debuff-frighten':
      return <FrightenEffect target={target} onDone={onDone} />;
    case 'debuff-blind':
      return <BlindEffect target={target} onDone={onDone} />;
    case 'debuff-weaken':
      return <WeakenEffect target={target} onDone={onDone} />;
    case 'debuff-restrain':
      return <RestrainEffect target={target} onDone={onDone} />;
    case 'sustain-heal':
      return <SustainHealEffect target={target} onDone={onDone} />;
    case 'sustain-ward':
      return <SustainWardEffect target={target} onDone={onDone} />;
    case 'sustain-drain':
      return <LifeDrainEffect origin={origin} target={target} onDone={onDone} />;
    case 'multiattack-flurry':
      return <FlurryEffect origin={origin} target={target} onDone={onDone} />;
    case 'enemy-frenzy':
      return <FrenzyEffect origin={origin} onDone={onDone} />;
    // === bard-redesign ===
    case 'song-pulse':
      return <SongPulseEffect origin={origin} onDone={onDone} />;
    // === druid-signature ===
    case 'regrowth':
      return <RegrowthEffect origin={origin} onDone={onDone} />;
    case 'summon-beast':
      return <SummonBeastEffect target={target} onDone={onDone} />;
    // The Druid's at-will damage spells: a nature look distinct from the
    // wizard's arcane Fire Bolt / Magic Missile (which they share engine-side).
    case 'nature-flame':
      return <NatureFlameEffect origin={origin} target={target} onDone={onDone} />;
    case 'thorn-lash':
      return <ThornLashEffect origin={origin} target={target} onDone={onDone} />;
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
  // Cadence + spread jitter per cast (animations-revamp): the trio never
  // launches or lands on exactly the same beat twice. Computed once per mount.
  const [darts] = useState(() =>
    [0, 120, 240].map((d) => Math.max(0, d + Math.round(Math.random() * 70 - 35))),
  );
  // Each dart aims a little above/below the target center for visual spread.
  const [targetOffsets] = useState(() =>
    [-10, 0, 10].map((o) => o + Math.round(Math.random() * 10 - 5)),
  );
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

// ============================================================================
// === spell-vfx-by-element ===
// Element-aware spell shapes. Every damage cast routes to one of four SHAPE
// components — projectile (spell-bolt), AoE burst/cone (spell-burst), chain/fork
// lightning (spell-fork), or a necrotic drain tether (spell-drain) — each
// parameterized by an element colour ramp + particle style. So a cold cone, a
// lightning fork, a necrotic drain, and a fire bolt never share a look, and no
// damage spell falls through to nothing. Palettes track the combat-juice
// HIT-spark (BattlefieldSprite.sparkTint) and damage-number
// (FloatingDamage.ELEMENT_TINT) hues so a cast and its impact read as one element.
// ============================================================================

interface ElementPalette {
  /** Hot near-white centre. */
  core: string;
  /** The element's signature hue — the body of the effect. */
  mid: string;
  /** Dark edge the gradient fades into. */
  deep: string;
  /** Particle / shadow glow as an rgba() string. */
  glow: string;
  /** Secondary hue: fork branches, necrotic rot, ice-shard rims, sun rays. */
  accent: string;
}

// Arcane fallback for a damage spell whose element we don't recognise — keeps
// the "no spell renders nothing" guarantee even for an unmapped damageType.
const ARCANE_PALETTE: ElementPalette = {
  core: '#ffffff',
  mid: '#c9a8ff',
  deep: '#5e3a8f',
  glow: 'rgba(201,168,255,0.85)',
  accent: '#e6d6ff',
};

const ELEMENT_PALETTES: Record<SpellElement, ElementPalette> = {
  fire: { core: '#fff8dc', mid: '#ff7a3a', deep: '#8b1f1b', glow: 'rgba(255,107,43,0.9)', accent: '#ffd166' },
  cold: { core: '#ffffff', mid: '#8fe6ff', deep: '#1f5b86', glow: 'rgba(143,230,255,0.85)', accent: '#e2f7ff' },
  lightning: { core: '#ffffff', mid: '#ffe066', deep: '#6a3fbf', glow: 'rgba(255,224,102,0.9)', accent: '#b98cff' },
  thunder: { core: '#eef2ff', mid: '#9fb6d6', deep: '#36456a', glow: 'rgba(159,182,214,0.85)', accent: '#cdd9ee' },
  acid: { core: '#f6ffd6', mid: '#caf04a', deep: '#4d5f12', glow: 'rgba(170,210,40,0.85)', accent: '#e9ff8a' },
  poison: { core: '#eaffba', mid: '#b6f04a', deep: '#2f4a08', glow: 'rgba(146,200,30,0.85)', accent: '#d7f06a' },
  necrotic: { core: '#e6ffe0', mid: '#86d86a', deep: '#241033', glow: 'rgba(140,210,110,0.75)', accent: '#a86fd0' },
  radiant: { core: '#fffdf0', mid: '#ffe9a8', deep: '#c79a2e', glow: 'rgba(255,220,120,0.9)', accent: '#fff6d0' },
  force: { core: '#ffffff', mid: '#c9a8ff', deep: '#5e3a8f', glow: 'rgba(201,168,255,0.85)', accent: '#e6d6ff' },
};

function paletteFor(element: SpellElement | undefined): ElementPalette {
  return element ? ELEMENT_PALETTES[element] : ARCANE_PALETTE;
}

interface ElementArcProps {
  origin: Anchor;
  target: Anchor;
  element?: SpellElement;
  onDone: () => void;
}

interface ElementTargetProps {
  target: Anchor;
  element?: SpellElement;
  onDone: () => void;
}

// ---------- Shape: single-target projectile (spell-bolt) ----------

/**
 * Flight-path variants for the projectile shapes (animations-revamp): the
 * classic mid arc, a flat fast sizzle, and a high lobbed throw. Picked at
 * random per cast so repeat fire bolts never trace the same line. All three
 * settle identically under prefers-reduced-motion (see index.css).
 */
const BOLT_ARC_VARIANTS = [
  'animate-firebolt-arc',
  'animate-firebolt-arc-low',
  'animate-firebolt-arc-high',
] as const;

function pickBoltArc(): (typeof BOLT_ARC_VARIANTS)[number] {
  return BOLT_ARC_VARIANTS[Math.floor(Math.random() * BOLT_ARC_VARIANTS.length)];
}

function SpellBoltEffect({ origin, target, element, onDone }: ElementArcProps) {
  useDoneTimer(820, onDone);
  const pal = paletteFor(element);
  const el = element ?? 'arcane';
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Ghost trail particles — each a snapshot behind the head, riding the same arc.
  const trail = [60, 120, 180];
  // One flight path per cast; the trail rides the same variant as the head.
  const [arcClass] = useState(pickBoltArc);

  return (
    <>
      {trail.map((delay, i) => (
        <div
          key={`trail-${i}`}
          className={`absolute ${arcClass}`}
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
          <BoltTrail pal={pal} el={el} />
        </div>
      ))}
      <div
        className={`absolute ${arcClass}`}
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
        <BoltHead pal={pal} el={el} angle={angle} />
      </div>
    </>
  );
}

function BoltHead({ pal, el, angle }: { pal: ElementPalette; el: string; angle: number }) {
  const id = `bolt-core-${el}`;
  return (
    <svg
      width="52"
      height="52"
      viewBox="-26 -26 52 52"
      style={{ position: 'absolute', left: -26, top: -26, overflow: 'visible', filter: `drop-shadow(0 0 6px ${pal.glow})` }}
    >
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.core} stopOpacity="1" />
          <stop offset="38%" stopColor={pal.mid} stopOpacity="1" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Flourish sits behind the core and rotates to trail the flight line. */}
      <g transform={`rotate(${angle})`}>
        <BoltFlourish pal={pal} el={el} />
      </g>
      <circle cx="0" cy="0" r="18" fill={`url(#${id})`} />
      <circle cx="-2" cy="-2" r="6" fill={pal.core} opacity="0.9" />
    </svg>
  );
}

/** Element-specific decoration on the projectile head — the per-school read. */
function BoltFlourish({ pal, el }: { pal: ElementPalette; el: string }) {
  switch (el) {
    case 'fire':
      return (
        <g fill={pal.accent} opacity="0.78">
          <path d="M -16 -3 Q -27 -10 -14 -12 Q -11 -5 -16 -3 Z" />
          <path d="M -18 5 Q -29 11 -14 14 Q -11 7 -18 5 Z" />
          <path d="M -20 0 Q -31 0 -16 3 Q -13 0 -20 0 Z" />
        </g>
      );
    case 'cold':
      return (
        <g fill={pal.accent} stroke={pal.mid} strokeWidth="0.6" opacity="0.92">
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} transform={`rotate(${a})`} d="M 0 -11 L 4 -23 L -4 -23 Z" />
          ))}
        </g>
      );
    case 'necrotic':
      return (
        <g opacity="0.85">
          <circle cx="0" cy="0" r="21" fill="none" stroke={pal.accent} strokeWidth="1.5" opacity="0.5" />
          <path d="M -14 -6 Q -25 -2 -16 7 Q -10 2 -14 -6 Z" fill={pal.mid} opacity="0.6" />
          <path d="M 13 -8 Q 23 -4 14 7 Q 9 0 13 -8 Z" fill={pal.mid} opacity="0.45" />
        </g>
      );
    case 'radiant':
      return (
        <g stroke={pal.accent} strokeWidth="1.7" strokeLinecap="round" opacity="0.82">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={Math.cos(r) * 14} y1={Math.sin(r) * 14} x2={Math.cos(r) * 25} y2={Math.sin(r) * 25} />;
          })}
        </g>
      );
    case 'acid':
    case 'poison':
      return (
        <g fill={pal.accent} opacity="0.85">
          <circle cx="-13" cy="9" r="3.6" />
          <circle cx="11" cy="11" r="2.7" />
          <circle cx="2" cy="15" r="2" />
        </g>
      );
    default:
      // force / thunder / arcane fallback — concentric kinetic rings.
      return (
        <g fill="none" stroke={pal.accent} opacity="0.7">
          <circle cx="0" cy="0" r="22" strokeWidth="1.4" />
          <circle cx="0" cy="0" r="15" strokeWidth="1" opacity="0.6" />
        </g>
      );
  }
}

function BoltTrail({ pal, el }: { pal: ElementPalette; el: string }) {
  const id = `bolt-trail-${el}`;
  return (
    <svg
      width="30"
      height="30"
      viewBox="-15 -15 30 30"
      style={{ position: 'absolute', left: -15, top: -15, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.mid} stopOpacity="0.9" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="13" fill={`url(#${id})`} />
    </svg>
  );
}

// ---------- Shape: AoE burst / cone (spell-burst) ----------

/** Scatter for the burst — most particles fly along the enemy line (−x toward
 *  the rest of the foes), a few splash up and out. Stable per mount. */
function burstScatter(): { id: number; dx: number; dy: number; delay: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const splash = i % 4 === 0;
    return {
      id: i,
      dx: splash ? (Math.random() - 0.5) * 80 : -(20 + Math.random() * 180),
      dy: splash ? -(20 + Math.random() * 50) : (Math.random() - 0.5) * 90,
      delay: Math.round(Math.random() * 150),
    };
  });
}

function SpellBurstEffect({ target, element, onDone }: ElementTargetProps) {
  useDoneTimer(780, onDone);
  const pal = paletteFor(element);
  const el = element ?? 'arcane';
  const [motes] = useState(() => burstScatter());
  // Half the casts detonate with a double-pulse bloom (animations-revamp) so
  // back-to-back bursts read as separate blasts, not a looped replay.
  const [bloomClass] = useState(() =>
    Math.random() < 0.5 ? 'animate-spell-bloom' : 'animate-spell-bloom-double',
  );
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      <div className={`absolute ${bloomClass}`} style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <BurstFlare pal={pal} el={el} />
      </div>
      <div className="absolute animate-spell-ring" style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}>
        <BurstRing pal={pal} el={el} />
      </div>
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-rift-mote"
          background={`radial-gradient(circle, ${pal.core} 0%, ${pal.mid} 55%, transparent 80%)`}
          glow={`0 0 6px ${pal.glow}`}
          size={7}
        />
      ))}
    </div>
  );
}

function BurstFlare({ pal, el }: { pal: ElementPalette; el: string }) {
  const id = `burst-flare-${el}`;
  return (
    <svg
      width="360"
      height="172"
      viewBox="-300 -86 360 172"
      style={{ position: 'absolute', left: -300, top: -86, overflow: 'visible', filter: `drop-shadow(0 0 10px ${pal.glow})` }}
    >
      <defs>
        <radialGradient id={id} cx="0.83" cy="0.5" r="0.6">
          <stop offset="0%" stopColor={pal.core} stopOpacity="0.95" />
          <stop offset="32%" stopColor={pal.mid} stopOpacity="0.82" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Wide bloom: hot at the primary target (right), sweeping over the line (left). */}
      <ellipse cx="0" cy="0" rx="290" ry="66" fill={`url(#${id})`} />
      <circle cx="0" cy="0" r="42" fill={`url(#${id})`} />
      <BurstAccent pal={pal} el={el} />
    </svg>
  );
}

/** A light per-element touch over the burst body (colour already carries most). */
function BurstAccent({ pal, el }: { pal: ElementPalette; el: string }) {
  switch (el) {
    case 'cold':
      return (
        <g fill={pal.accent} stroke={pal.mid} strokeWidth="0.7" opacity="0.85">
          {[-150, -90, -40, 0].map((cx, i) => (
            <path key={cx} transform={`translate(${cx} ${i % 2 ? -18 : 22})`} d="M 0 -12 L 5 0 L 0 12 L -5 0 Z" />
          ))}
        </g>
      );
    case 'fire':
      return (
        <g fill={pal.accent} opacity="0.7">
          <path d="M -10 -30 Q 6 -52 18 -30 Q 6 -24 -10 -30 Z" />
          <path d="M -30 26 Q -14 50 -2 28 Q -16 22 -30 26 Z" />
          <path d="M -90 -8 Q -74 -30 -62 -8 Q -76 -2 -90 -8 Z" />
        </g>
      );
    case 'radiant':
      return (
        <g stroke={pal.accent} strokeWidth="2" strokeLinecap="round" opacity="0.6">
          {[200, 240, 280, 320, 160, 120].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <line key={deg} x1={Math.cos(r) * 40} y1={Math.sin(r) * 40} x2={Math.cos(r) * 78} y2={Math.sin(r) * 70} />;
          })}
        </g>
      );
    default:
      return null;
  }
}

function BurstRing({ pal, el }: { pal: ElementPalette; el: string }) {
  // Cold gets a jagged frost ring; everything else a smooth shock ring.
  const jagged = el === 'cold';
  const pts = jagged
    ? Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r = i % 2 === 0 ? 58 : 46;
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r * 0.5).toFixed(1)}`;
      }).join(' ')
    : '';
  return (
    <svg
      width="160"
      height="100"
      viewBox="-80 -50 160 100"
      style={{ position: 'absolute', left: -80, top: -50, overflow: 'visible' }}
    >
      {jagged ? (
        <polygon points={pts} fill="none" stroke={pal.mid} strokeWidth="2" opacity="0.7" />
      ) : (
        <ellipse cx="0" cy="0" rx="58" ry="28" fill="none" stroke={pal.mid} strokeWidth="3" opacity="0.7" />
      )}
      <ellipse cx="0" cy="0" rx="48" ry="22" fill="none" stroke={pal.core} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// ---------- Shape: chain / fork lightning (spell-fork) ----------

/** A zig-zag SVG path between two field points, with perpendicular jitter that
 *  eases toward zero at both ends so the bolt connects cleanly. */
function jaggedPath(a: Anchor, b: Anchor, segments: number, amp: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const taper = 1 - Math.abs(t - 0.5) * 1.4;
    const jitter = (Math.random() * 2 - 1) * amp * Math.max(0.15, taper);
    const px = a.x + dx * t + nx * jitter;
    const py = a.y + dy * t + ny * jitter;
    d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return `${d} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function SpellForkEffect({ origin, target, element, onDone }: ElementArcProps) {
  useDoneTimer(560, onDone);
  const pal = paletteFor(element);
  const el = element ?? 'lightning';
  // Computed once: a jagged main bolt origin→target, then forks that arc on to
  // the adjacent enemy slots toward the line (the "and forks to a second foe").
  const [geom] = useState(() => {
    const branches: Anchor[] = [];
    for (let i = 1; i <= 2; i++) {
      const bx = target.x - i * MONSTER_STEP_X;
      if (bx > 44) branches.push({ x: bx, y: target.y + (Math.random() * 2 - 1) * 12 });
    }
    return {
      branches,
      main: jaggedPath(origin, target, 9, 18),
      forks: branches.map((b) => jaggedPath(target, b, 5, 13)),
    };
  });
  const blurId = `fork-glow-${el}`;
  return (
    <>
      <svg
        className="absolute animate-spell-fork"
        width="824"
        height="420"
        viewBox="0 0 824 420"
        style={{ left: 0, top: 0, overflow: 'visible' }}
      >
        <defs>
          <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        {/* Soft wide glow underlay. */}
        <path d={geom.main} fill="none" stroke={pal.mid} strokeWidth="6" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${blurId})`} />
        {geom.forks.map((d, i) => (
          <path key={`g-${i}`} d={d} fill="none" stroke={pal.accent} strokeWidth="4" opacity="0.4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${blurId})`} />
        ))}
        {/* Hot white-hot core over the glow. */}
        <path d={geom.main} fill="none" stroke={pal.core} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {geom.forks.map((d, i) => (
          <path key={`c-${i}`} d={d} fill="none" stroke={pal.core} strokeWidth="1.6" opacity="0.92" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <ForkFlash x={target.x} y={target.y} pal={pal} el={el} delay={40} />
      {geom.branches.map((b, i) => (
        <ForkFlash key={i} x={b.x} y={b.y} pal={pal} el={el} delay={130 + i * 60} />
      ))}
    </>
  );
}

function ForkFlash({ x, y, pal, el, delay }: { x: number; y: number; pal: ElementPalette; el: string; delay: number }) {
  const id = `fork-flash-${el}-${Math.round(x)}`;
  return (
    <div
      className="absolute animate-spell-bloom"
      style={{ left: x, top: y, width: 0, height: 0, animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <svg
        width="84"
        height="84"
        viewBox="-42 -42 84 84"
        style={{ position: 'absolute', left: -42, top: -42, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={pal.core} stopOpacity="0.95" />
            <stop offset="45%" stopColor={pal.mid} stopOpacity="0.6" />
            <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="30" fill={`url(#${id})`} />
        <g stroke={pal.accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
          <line x1="0" y1="-22" x2="0" y2="-10" />
          <line x1="0" y1="10" x2="0" y2="22" />
          <line x1="-22" y1="0" x2="-10" y2="0" />
          <line x1="10" y1="0" x2="22" y2="0" />
        </g>
      </svg>
    </div>
  );
}

// ---------- Shape: necrotic drain tether (spell-drain) ----------

function SpellDrainEffect({ origin, target, element, onDone }: ElementArcProps) {
  useDoneTimer(1000, onDone);
  const pal = paletteFor(element ?? 'necrotic');
  // Motes + tether run FROM the drained monster (target) back INTO the caster
  // (origin). Anchor at the monster; the vector points at the caster.
  const dx = origin.x - target.x;
  const dy = origin.y - target.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const [motes] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({ id: i, delay: i * 110 + Math.round(Math.random() * 50) })),
  );
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-drain-tether"
        style={{
          left: 0,
          top: -3,
          width: length,
          height: 6,
          transformOrigin: '0% 50%',
          transform: `rotate(${angle}deg)`,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${pal.mid} 0%, ${pal.accent} 60%, transparent 100%)`,
          boxShadow: `0 0 8px ${pal.glow}`,
        }}
      />
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={dx}
          dy={dy}
          delay={m.delay}
          animClass="animate-drain-mote"
          background={`radial-gradient(circle, ${pal.core} 0%, ${pal.mid} 55%, transparent 80%)`}
          glow={`0 0 6px ${pal.glow}`}
        />
      ))}
      <div
        className="absolute animate-drain-feed"
        style={{ left: dx, top: dy, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <DrainFeedBloom pal={pal} />
      </div>
    </div>
  );
}

function DrainFeedBloom({ pal }: { pal: ElementPalette }) {
  const id = `drain-feed-${pal.mid.replace('#', '')}`;
  return (
    <svg
      width="78"
      height="78"
      viewBox="-39 -39 78 78"
      style={{ position: 'absolute', left: -39, top: -39, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.core} stopOpacity="0.85" />
          <stop offset="40%" stopColor={pal.mid} stopOpacity="0.55" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="33" fill={`url(#${id})`} />
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

// ---------- Rage (Barbarian) ----------

function RageEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(640, onDone);
  const size = 150;
  return (
    <div
      className="absolute"
      style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}
    >
      {/* Outward roar shockwave */}
      <div className="absolute animate-rage-roar" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-75 -75 150 150"
          style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
        >
          <circle cx="0" cy="0" r="52" fill="none" stroke="#ff5a3a" strokeWidth="5" opacity="0.7" />
          <circle cx="0" cy="0" r="52" fill="none" stroke="#b5302c" strokeWidth="2" opacity="0.5" />
        </svg>
      </div>
      {/* Seething red aura clinging to the body */}
      <div className="absolute animate-rage-aura" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-75 -75 150 150"
          style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="rage-aura-grad" cx="0.5" cy="0.55" r="0.5">
              <stop offset="0%" stopColor="#ff8a3a" stopOpacity="0" />
              <stop offset="55%" stopColor="#ff5a3a" stopOpacity="0.28" />
              <stop offset="78%" stopColor="#b5302c" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7a1410" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="0" cy="-6" rx="46" ry="62" fill="url(#rage-aura-grad)" />
        </svg>
      </div>
      {/* Rising embers */}
      {[-26, -8, 12, 30].map((x, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-[#ff7a3a] rounded-[1px] animate-rage-ember"
          style={{
            left: x,
            top: 6,
            boxShadow: '0 0 6px rgba(255,90,58,0.9)',
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Reckless Attack (Barbarian) ----------

function RecklessEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(420, onDone);
  return (
    <div
      className="absolute animate-reckless-snarl"
      style={{ left: origin.x, top: origin.y - 8, width: 0, height: 0 }}
    >
      <svg
        width="110"
        height="110"
        viewBox="-55 -55 110 110"
        style={{ position: 'absolute', left: -55, top: -55, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="reckless-claw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5a3a" stopOpacity="0" />
            <stop offset="50%" stopColor="#ff7a4a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Three raking claw streaks */}
        <g stroke="url(#reckless-claw)" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M -40 -34 Q 4 -6 40 28" />
          <path d="M -34 -22 Q 10 4 44 38" />
          <path d="M -44 -20 Q 0 8 34 40" />
        </g>
      </svg>
    </div>
  );
}

// ---------- Hunter's Mark (Ranger) ----------

function HuntersMarkEffect({ target, onDone }: HoldProps) {
  useDoneTimer(760, onDone);
  const size = 96;
  return (
    <div
      className="absolute animate-hmark-lock"
      style={{ left: target.x, top: target.y - 4, width: 0, height: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-48 -48 96 96"
        style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="hmark-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#9ef0a0" stopOpacity="0" />
            <stop offset="80%" stopColor="#6fd36a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6fd36a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="44" fill="url(#hmark-glow)" />
        {/* Outer reticle ring (rotates via parent) */}
        <circle cx="0" cy="0" r="38" fill="none" stroke="#9ef0a0" strokeWidth="1.4" strokeDasharray="6 5" opacity="0.85" />
        <circle cx="0" cy="0" r="28" fill="none" stroke="#f4a742" strokeWidth="1.6" opacity="0.85" />
        {/* Corner brackets */}
        <g stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" opacity="0.95">
          <path d="M -38 -26 L -38 -38 L -26 -38" fill="none" />
          <path d="M 38 -26 L 38 -38 L 26 -38" fill="none" />
          <path d="M -38 26 L -38 38 L -26 38" fill="none" />
          <path d="M 38 26 L 38 38 L 26 38" fill="none" />
        </g>
        {/* Crosshair + center pip */}
        <g stroke="#b5302c" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
          <line x1="0" y1="-16" x2="0" y2="-6" />
          <line x1="0" y1="6" x2="0" y2="16" />
          <line x1="-16" y1="0" x2="-6" y2="0" />
          <line x1="6" y1="0" x2="16" y2="0" />
        </g>
        <circle cx="0" cy="0" r="3" fill="#b5302c" />
      </svg>
    </div>
  );
}

// ---------- Colossus Slayer (Ranger) ----------

function ColossusEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(500, onDone);
  const dir = target.x >= origin.x ? 1 : -1;
  return (
    <div
      className="absolute"
      style={{ left: target.x, top: target.y, width: 0, height: 0 }}
    >
      {/* Big downward cleave arc */}
      <div
        className="absolute animate-colossus-cleave"
        style={{ left: 0, top: 0, width: 0, height: 0 }}
      >
        <svg
          width="150"
          height="150"
          viewBox="-75 -75 150 150"
          style={{ position: 'absolute', left: -75, top: -75, overflow: 'visible', transform: `scaleX(${dir})` }}
        >
          <defs>
            <linearGradient id="colossus-blade" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#ffb347" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M -52 -54 Q 30 -30 52 56 Q -4 -10 -52 -54 Z" fill="url(#colossus-blade)" />
          <path
            d="M -48 -50 Q 26 -26 46 48"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.95"
          />
        </svg>
      </div>
      {/* Concussive impact flash + shockwave */}
      <div className="absolute animate-colossus-impact" style={{ left: 0, top: 8, width: 0, height: 0 }}>
        <svg
          width="100"
          height="100"
          viewBox="-50 -50 100 100"
          style={{ position: 'absolute', left: -50, top: -50, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="colossus-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fffaf0" stopOpacity="1" />
              <stop offset="50%" stopColor="#ffb347" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#b5302c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="26" fill="url(#colossus-core)" />
          <circle cx="0" cy="0" r="44" fill="none" stroke="#ffd9a0" strokeWidth="3" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
}

// ---------- Cunning Action (Rogue) ----------

function CunningActionEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(540, onDone);
  // Several smoke puffs billow up and out, masking a vanish-flicker.
  const puffs = [
    { x: -20, y: 4, d: 0, s: 1 },
    { x: 14, y: -2, d: 80, s: 1.2 },
    { x: -4, y: 10, d: 40, s: 0.9 },
    { x: 24, y: 14, d: 140, s: 1.05 },
    { x: -28, y: -8, d: 110, s: 0.85 },
  ];
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      {puffs.map((p, i) => (
        <div
          key={i}
          className="absolute animate-cunning-smoke rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: 34 * p.s,
            height: 34 * p.s,
            marginLeft: (-34 * p.s) / 2,
            marginTop: (-34 * p.s) / 2,
            background:
              'radial-gradient(circle, rgba(120,124,140,0.85) 0%, rgba(74,78,96,0.5) 45%, rgba(40,42,58,0) 72%)',
            animationDelay: `${p.d}ms`,
          }}
        />
      ))}
      {/* Faint violet vanish shimmer at the core */}
      <div
        className="absolute animate-cunning-vanish rounded-full"
        style={{
          left: 0,
          top: -2,
          width: 40,
          height: 56,
          marginLeft: -20,
          marginTop: -28,
          background:
            'radial-gradient(ellipse, rgba(155,111,207,0.45) 0%, rgba(94,58,143,0) 70%)',
        }}
      />
    </div>
  );
}

// ---------- Second Wind (Fighter) ----------

function SecondWindEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(740, onDone);
  const size = 130;
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      {/* Warm radial heal bloom */}
      <div className="absolute animate-secondwind-glow" style={{ left: 0, top: -4, width: 0, height: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-65 -65 130 130"
          style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="sw-bloom" cx="0.5" cy="0.55" r="0.5">
              <stop offset="0%" stopColor="#fff6d0" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#9ef0a0" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6fd36a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="0" cy="-4" rx="46" ry="58" fill="url(#sw-bloom)" />
          {/* Restorative cross sigil */}
          <g stroke="#fffdf2" strokeWidth="3" strokeLinecap="round" opacity="0.85">
            <line x1="0" y1="-18" x2="0" y2="18" />
            <line x1="-18" y1="0" x2="18" y2="0" />
          </g>
        </svg>
      </div>
      {/* Rising motes of life */}
      {[-22, -6, 10, 24, 2].map((x, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full animate-secondwind-mote"
          style={{
            left: x,
            top: 18,
            background: '#bff7b0',
            boxShadow: '0 0 6px rgba(159,240,160,0.9)',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Action Surge (Fighter) ----------

function ActionSurgeEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(520, onDone);
  const size = 132;
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      {/* Burst ring */}
      <div className="absolute animate-surge-ring" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-66 -66 132 132"
          style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="surge-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fff6d0" stopOpacity="0" />
              <stop offset="70%" stopColor="#ffb347" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="46" fill="url(#surge-glow)" />
          <circle cx="0" cy="0" r="46" fill="none" stroke="#ffd9a0" strokeWidth="3" opacity="0.7" />
        </svg>
      </div>
      {/* Speed lines streaking upward-forward */}
      <div className="absolute animate-surge-lines" style={{ left: 0, top: 0, width: 0, height: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-66 -66 132 132"
          style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}
        >
          <g stroke="#ffd9a0" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
            <line x1="-34" y1="-28" x2="-14" y2="-28" />
            <line x1="-40" y1="-10" x2="-16" y2="-10" />
            <line x1="-36" y1="8" x2="-12" y2="8" />
            <line x1="-30" y1="26" x2="-10" y2="26" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// ---------- Mirror Image ----------

// Warm-amber illusion tint applied to the duplicate portraits. Pushes every
// class palette toward the ember spectrum so the silhouettes read as conjured
// copies rather than real party members, with a soft amber glow on top.
const MIRROR_TINT =
  'sepia(1) saturate(4.5) hue-rotate(-12deg) brightness(1.05) drop-shadow(0 0 5px rgba(244,167,66,0.8))';

interface MirrorSlot {
  /** Horizontal offset from the player center, px. */
  x: number;
  scale: number;
  /** Tilt, degrees — alternating sides lean outward. */
  rot: number;
}

// Fan the duplicates outward in alternating right/left pairs, each tier a
// little smaller, further out, and more tilted than the last.
function mirrorSlot(i: number): MirrorSlot {
  const side = i % 2 === 0 ? 1 : -1;
  const tier = Math.floor(i / 2);
  return {
    x: side * (30 + tier * 26),
    scale: 0.84 - tier * 0.1,
    rot: side * (2 + tier * 2),
  };
}

interface MirrorImagesProps {
  classId: string;
  /** `character.resources.mirrorImages` — live duplicate count. */
  count: number;
}

/**
 * Persistent overlay for the L2 wizard Mirror Image. Renders one shimmering
 * amber duplicate of the player sprite per remaining image, flanking the real
 * one. When the count drops (an image absorbed a hit), the freed slot plays a
 * brief shatter burst. Mounts behind the player sprite (`-z-10` inside the
 * isolated sprite container) so the real player stays in front.
 */
export function MirrorImages({ classId, count }: MirrorImagesProps) {
  const prevCount = useRef(count);
  const [shatters, setShatters] = useState<{ id: number; slot: MirrorSlot }[]>([]);

  useEffect(() => {
    if (count < prevCount.current) {
      const broken: { id: number; slot: MirrorSlot }[] = [];
      for (let i = count; i < prevCount.current; i++) {
        broken.push({ id: Date.now() + i, slot: mirrorSlot(i) });
      }
      setShatters((s) => [...s, ...broken]);
      const ids = new Set(broken.map((b) => b.id));
      setTimeout(() => setShatters((s) => s.filter((x) => !ids.has(x.id))), 500);
    }
    prevCount.current = count;
  }, [count]);

  if (count <= 0 && shatters.length === 0) return null;

  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-visible">
      {Array.from({ length: Math.max(count, 0) }).map((_, i) => (
        <MirrorGhost key={`ghost-${i}`} classId={classId} slot={mirrorSlot(i)} phaseMs={-i * 700} />
      ))}
      {shatters.map((s) => (
        <MirrorShatter key={s.id} slot={s.slot} />
      ))}
    </div>
  );
}

function MirrorGhost({
  classId,
  slot,
  phaseMs,
}: {
  classId: string;
  slot: MirrorSlot;
  phaseMs: number;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 w-full overflow-visible"
      style={{
        transform: `translateX(${slot.x}px) scale(${slot.scale}) rotate(${slot.rot}deg)`,
        transformOrigin: 'bottom center',
      }}
    >
      {/* Entrance pop on cast (opacity + scale, once). */}
      <div className="w-full animate-mirror-in">
        {/* Steady opacity flicker (infinite); tint applied here so the
            entrance/flicker opacities multiply cleanly across nodes. */}
        <div
          className="w-full animate-mirror-shimmer"
          style={{ filter: MIRROR_TINT, animationDelay: `${phaseMs}ms` }}
        >
          <PlayerPortrait classId={classId} className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}

function MirrorShatter({ slot }: { slot: MirrorSlot }) {
  // Shards computed once — the parent unmounts this after the burst.
  const [shards] = useState(() =>
    Array.from({ length: 7 }, (_, i) => {
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 26 + Math.random() * 22;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 6,
        rot: Math.round(angle * 57),
      };
    }),
  );

  return (
    <div
      className="absolute bottom-0 left-0 w-full overflow-visible"
      style={{
        transform: `translateX(${slot.x}px) scale(${slot.scale}) rotate(${slot.rot}deg)`,
        transformOrigin: 'bottom center',
      }}
    >
      {/* Amber flash bloom at torso height. */}
      <div
        className="absolute left-1/2 top-[42%] w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full animate-mirror-shatter"
        style={{
          background:
            'radial-gradient(circle, rgba(255,244,214,0.95) 0%, rgba(244,167,66,0.6) 38%, rgba(244,167,66,0) 70%)',
        }}
      />
      {/* Splintering amber shards. */}
      {shards.map((sh) => (
        <div
          key={sh.id}
          className="absolute left-1/2 top-[42%] w-1.5 h-2.5 bg-[var(--color-accent-amber)] animate-spark"
          style={{
            boxShadow: '0 0 6px rgba(244,167,66,0.95), 0 0 12px rgba(255,179,71,0.6)',
            transform: `rotate(${sh.rot}deg)`,
            ['--spark-dest' as string]: `translate(${sh.dx}px, ${sh.dy}px) rotate(${sh.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// === enemy-vfx (feat/vfx-enemies) ===
// Bespoke effects for the monster toolkit (#164). Player casts anchor on the
// left at (112, 316); monster slots fan right from (712, 316). The anchor is
// treated as a sprite's vertical center, so most effects center on it.
// ============================================================================

interface TargetAnchorProps {
  target: Anchor;
  onDone: () => void;
}

/** Scatters `count` motes radially around the origin, with an optional upward
 *  bias and random angular jitter. Computed once per mount (positions are
 *  stable for the life of the effect). */
function scatter(
  count: number,
  opts: { min: number; max: number; up?: number; spread?: number },
): { id: number; dx: number; dy: number; delay: number }[] {
  const up = opts.up ?? 0;
  const spread = opts.spread ?? 0.6;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * spread;
    const dist = opts.min + Math.random() * (opts.max - opts.min);
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - up,
      delay: Math.round(Math.random() * 160),
    };
  });
}

/** A single glowing particle that drifts to (--dx, --dy) under `animClass`. */
function EffectMote({
  dx,
  dy,
  delay,
  animClass,
  background,
  glow,
  size = 6,
}: {
  dx: number;
  dy: number;
  delay: number;
  animClass: string;
  background: string;
  glow: string;
  size?: number;
}) {
  return (
    <div
      className={`absolute ${animClass}`}
      style={
        {
          left: 0,
          top: 0,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: '50%',
          background,
          boxShadow: glow,
          animationDelay: `${delay}ms`,
          ['--dx' as string]: `${dx}px`,
          ['--dy' as string]: `${dy}px`,
        } as React.CSSProperties
      }
    />
  );
}

// ---------- Summon ----------

function SummonEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(950, onDone);
  const [motes] = useState(() => scatter(8, { min: 16, max: 42, up: 34, spread: 0.5 }));
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={`smoke-${i}`}
          className="absolute animate-rift-smoke"
          style={{
            left: -16 + i * 16,
            top: 14,
            width: 0,
            height: 0,
            animationDelay: `${i * 90}ms`,
          }}
        >
          <SmokePuff />
        </div>
      ))}
      <div
        className="absolute animate-enemy-rift"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <RiftSlit />
      </div>
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-rift-mote"
          background="radial-gradient(circle, #f0d2ff 0%, #b45cff 50%, rgba(110,31,160,0) 75%)"
          glow="0 0 6px rgba(180,92,255,0.85)"
        />
      ))}
    </div>
  );
}

function RiftSlit() {
  return (
    <svg
      width="74"
      height="156"
      viewBox="-37 -78 74 156"
      style={{ position: 'absolute', left: -37, top: -78, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="summon-void" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#100018" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#2a0a3f" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2a0a3f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="summon-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e065ff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#9b6fcf" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6e1fa0" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="24" ry="70" fill="url(#summon-void)" />
      <ellipse cx="0" cy="0" rx="22" ry="66" fill="none" stroke="url(#summon-edge)" strokeWidth="3" />
      <ellipse cx="0" cy="0" rx="7" ry="58" fill="#f0d2ff" opacity="0.55" />
      {/* Crackling energy along the tear */}
      <g stroke="#e065ff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" fill="none">
        <path d="M -4 -40 L 5 -24 L -3 -8 L 4 8 L -5 26 L 3 42" />
        <path d="M 8 -30 L -2 -12 L 7 4 L -3 22" opacity="0.6" />
      </g>
    </svg>
  );
}

function SmokePuff() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="-32 -32 64 64"
      style={{ position: 'absolute', left: -32, top: -32, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="summon-smoke" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#4a3a5e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#241830" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="20" fill="url(#summon-smoke)" />
      <circle cx="-10" cy="4" r="13" fill="url(#summon-smoke)" />
      <circle cx="11" cy="2" r="11" fill="url(#summon-smoke)" />
    </svg>
  );
}

// ---------- Debuff: Poison ----------

function PoisonCloudEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(1000, onDone);
  const drips = [
    { x: -26, d: 80 },
    { x: -6, d: 0 },
    { x: 16, d: 200 },
    { x: 34, d: 320 },
  ];
  return (
    <div className="absolute" style={{ left: target.x, top: target.y - 18, width: 0, height: 0 }}>
      <div
        className="absolute animate-poison-cloud"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <PoisonCloud />
      </div>
      {drips.map((drip, i) => (
        <div
          key={i}
          className="absolute animate-poison-drip"
          style={{ left: drip.x, top: 8, width: 0, height: 0, animationDelay: `${drip.d}ms` }}
        >
          <PoisonDrip />
        </div>
      ))}
    </div>
  );
}

function PoisonCloud() {
  return (
    <svg
      width="150"
      height="110"
      viewBox="-75 -55 150 110"
      style={{ position: 'absolute', left: -75, top: -55, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="poison-grad" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0%" stopColor="#d7f06a" stopOpacity="0.85" />
          <stop offset="45%" stopColor="var(--color-status-poison)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#2f4a08" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="40" fill="url(#poison-grad)" />
      <circle cx="-28" cy="6" r="24" fill="url(#poison-grad)" />
      <circle cx="26" cy="-4" r="26" fill="url(#poison-grad)" />
      <circle cx="10" cy="14" r="20" fill="url(#poison-grad)" />
      <circle cx="-12" cy="-16" r="18" fill="url(#poison-grad)" />
      {/* Bubbles */}
      <g fill="#eaff8c" opacity="0.7">
        <circle cx="-8" cy="-4" r="3.5" />
        <circle cx="14" cy="6" r="2.5" />
        <circle cx="-22" cy="10" r="2" />
      </g>
    </svg>
  );
}

function PoisonDrip() {
  return (
    <svg
      width="14"
      height="22"
      viewBox="-7 -11 14 22"
      style={{ position: 'absolute', left: -7, top: -11, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="poison-drip-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7f06a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-status-poison)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path d="M 0 -9 Q 5 2 0 9 Q -5 2 0 -9 Z" fill="url(#poison-drip-grad)" />
    </svg>
  );
}

// ---------- Debuff: Frightened ----------

function FrightenEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(900, onDone);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Cold desaturating veil over the target */}
      <div
        className="absolute animate-fright-chill"
        style={{
          left: -46,
          top: -52,
          width: 92,
          height: 104,
          borderRadius: '46% 46% 42% 42%',
          background:
            'radial-gradient(ellipse at center, rgba(93,173,226,0.32) 0%, rgba(42,31,58,0.4) 55%, rgba(42,31,58,0) 100%)',
        }}
      />
      {/* Looming shadow that surges in from the monster side, then recoils */}
      <div
        className="absolute animate-fright-shadow"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <ShadowMaw />
      </div>
    </div>
  );
}

function ShadowMaw() {
  return (
    <svg
      width="150"
      height="150"
      viewBox="-75 -75 150 150"
      style={{ position: 'absolute', left: -75, top: -75, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="fright-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-status-shadow)" stopOpacity="0.92" />
          <stop offset="70%" stopColor="#191228" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#191228" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Hooded shadow body */}
      <path
        d="M 0 -56 C 34 -56 52 -26 50 6 C 48 38 26 58 0 58 C -26 58 -48 38 -50 6 C -52 -26 -34 -56 0 -56 Z"
        fill="url(#fright-grad)"
      />
      {/* Reaching tendrils */}
      <g stroke="#3a2f6b" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M -36 30 Q -54 44 -60 64" />
        <path d="M 36 30 Q 54 44 60 64" />
        <path d="M -16 48 Q -22 64 -18 76" />
        <path d="M 18 48 Q 24 64 20 76" />
      </g>
      {/* Cold hollow eyes */}
      <g fill="#9ed8ff" opacity="0.9">
        <ellipse cx="-14" cy="-10" rx="5" ry="8" />
        <ellipse cx="14" cy="-10" rx="5" ry="8" />
      </g>
    </svg>
  );
}

// ---------- Debuff: Blinded ----------

function BlindEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(850, onDone);
  const [splats] = useState(() => scatter(7, { min: 18, max: 38, spread: 0.7 }));
  return (
    <div className="absolute" style={{ left: target.x, top: target.y - 14, width: 0, height: 0 }}>
      <div
        className="absolute animate-blind-ink"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <InkBlob />
      </div>
      {splats.map((s) => (
        <EffectMote
          key={s.id}
          dx={s.dx}
          dy={s.dy}
          delay={s.delay}
          animClass="animate-blind-splat"
          background="radial-gradient(circle, #1a1622 0%, #050308 70%, rgba(5,3,8,0) 100%)"
          glow="0 0 4px rgba(0,0,0,0.6)"
          size={7}
        />
      ))}
    </div>
  );
}

function InkBlob() {
  return (
    <svg
      width="120"
      height="100"
      viewBox="-60 -50 120 100"
      style={{ position: 'absolute', left: -60, top: -50, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="blind-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.96" />
          <stop offset="62%" stopColor="#0a0710" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#1a1622" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Irregular splatter blob */}
      <path
        d="M 0 -38 C 24 -42 44 -22 40 2 C 50 10 46 34 22 36 C 14 50 -14 50 -24 34 C -48 32 -50 8 -38 -2 C -44 -24 -22 -36 0 -38 Z"
        fill="url(#blind-grad)"
      />
      <circle cx="0" cy="-2" r="18" fill="#000000" opacity="0.5" />
    </svg>
  );
}

// ---------- Debuff: Weakened ----------

function WeakenEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(950, onDone);
  const [motes] = useState(() => scatter(9, { min: 14, max: 36, up: 30, spread: 0.5 }));
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-weaken-wash"
        style={{
          left: -42,
          top: -50,
          width: 84,
          height: 100,
          borderRadius: '46% 46% 42% 42%',
          background:
            'radial-gradient(ellipse at center, rgba(160,160,160,0.4) 0%, rgba(120,120,120,0.18) 60%, rgba(120,120,120,0) 100%)',
          filter: 'saturate(0.2)',
        }}
      />
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-weaken-mote"
          background="radial-gradient(circle, #d8d8d8 0%, #9a9a9a 55%, rgba(120,120,120,0) 80%)"
          glow="0 0 4px rgba(180,180,180,0.5)"
          size={5}
        />
      ))}
    </div>
  );
}

// ---------- Debuff: Restrained ----------

function RestrainEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(950, onDone);
  return (
    <div
      className="absolute animate-restrain-web"
      style={{ left: target.x, top: target.y - 6, width: 0, height: 0, transformOrigin: 'center' }}
    >
      <WebStrands />
    </div>
  );
}

function WebStrands() {
  const spokes = 10;
  const r = 52;
  return (
    <svg
      width="120"
      height="120"
      viewBox="-60 -60 120 120"
      style={{ position: 'absolute', left: -60, top: -60, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="restrain-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#eef2f4" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#eef2f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="54" fill="url(#restrain-glow)" />
      <g stroke="#d8dde0" strokeWidth="1.1" opacity="0.85" fill="none">
        {/* Radial strands */}
        {Array.from({ length: spokes }).map((_, i) => {
          const a = (i / spokes) * Math.PI * 2;
          return (
            <line key={`s-${i}`} x1="0" y1="0" x2={Math.cos(a) * r} y2={Math.sin(a) * r} />
          );
        })}
        {/* Concentric capture rings */}
        {[18, 32, 46].map((ring) => (
          <polygon
            key={`r-${ring}`}
            points={Array.from({ length: spokes })
              .map((_, i) => {
                const a = (i / spokes) * Math.PI * 2;
                return `${Math.cos(a) * ring},${Math.sin(a) * ring}`;
              })
              .join(' ')}
            opacity="0.7"
          />
        ))}
      </g>
      {/* Sticky nodes */}
      <g fill="#eef2f4" opacity="0.6">
        <circle cx="0" cy="0" r="2.5" />
        <circle cx="32" cy="0" r="1.6" />
        <circle cx="-26" cy="18" r="1.6" />
        <circle cx="14" cy="-30" r="1.6" />
      </g>
    </svg>
  );
}

// ---------- Sustain: Heal ----------

function SustainHealEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(1000, onDone);
  const [motes] = useState(() => scatter(8, { min: 10, max: 30, up: 40, spread: 0.4 }));
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-heal-glow"
        style={{ left: -32, top: -56, width: 64, height: 88, transformOrigin: 'bottom center' }}
      >
        <HealColumn />
      </div>
      <div
        className="absolute animate-heal-pulse"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <HealPulse />
      </div>
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-heal-mote"
          background="radial-gradient(circle, #d6ffcf 0%, var(--color-dmg-heal) 55%, rgba(63,191,95,0) 80%)"
          glow="0 0 6px rgba(111,217,84,0.85)"
        />
      ))}
    </div>
  );
}

function HealColumn() {
  return (
    <svg
      width="64"
      height="88"
      viewBox="0 0 64 88"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="heal-col" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="var(--color-dmg-heal)" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#a8f59a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a8f59a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="84" rx="30" ry="10" fill="var(--color-dmg-heal)" opacity="0.35" />
      <path d="M 8 86 Q 14 30 32 6 Q 50 30 56 86 Z" fill="url(#heal-col)" />
    </svg>
  );
}

function HealPulse() {
  return (
    <svg
      width="90"
      height="90"
      viewBox="-45 -45 90 90"
      style={{ position: 'absolute', left: -45, top: -45, overflow: 'visible' }}
    >
      <circle cx="0" cy="0" r="38" fill="none" stroke="var(--color-dmg-heal)" strokeWidth="2" opacity="0.7" />
      {/* Mending cross */}
      <g fill="#d6ffcf" opacity="0.9">
        <rect x="-3" y="-12" width="6" height="24" rx="1.5" />
        <rect x="-12" y="-3" width="24" height="6" rx="1.5" />
      </g>
    </svg>
  );
}

// ---------- Sustain: Ward ----------

function SustainWardEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(1100, onDone);
  return (
    <div className="absolute" style={{ left: target.x, top: target.y - 6, width: 0, height: 0 }}>
      <div
        className="absolute animate-ward-bubble"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <WardBubble />
      </div>
      <div
        className="absolute animate-ward-sheen"
        style={{ left: -20, top: -34, width: 40, height: 60 }}
      >
        <WardSheen />
      </div>
    </div>
  );
}

function WardBubble() {
  return (
    <svg
      width="124"
      height="138"
      viewBox="-62 -69 124 138"
      style={{ position: 'absolute', left: -62, top: -69, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="ward-fill" cx="0.42" cy="0.36" r="0.7">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.22" />
          <stop offset="55%" stopColor="var(--color-accent-gold)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--color-accent-amber)" stopOpacity="0.04" />
        </radialGradient>
        <linearGradient id="ward-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="var(--color-accent-amber)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="56" ry="64" fill="url(#ward-fill)" />
      <ellipse cx="0" cy="0" rx="56" ry="64" fill="none" stroke="url(#ward-rim)" strokeWidth="2.4" />
      {/* Hex facet lattice on the dome */}
      <g stroke="#ffe9a8" strokeWidth="0.7" opacity="0.4" fill="none">
        <path d="M 0 -64 L 0 64" />
        <path d="M -52 -22 Q 0 -34 52 -22" />
        <path d="M -56 14 Q 0 26 56 14" />
        <path d="M -28 -58 Q -34 0 -22 60" />
        <path d="M 28 -58 Q 34 0 22 60" />
      </g>
      {/* Highlight cap */}
      <ellipse cx="-20" cy="-38" rx="14" ry="9" fill="#fff7e0" opacity="0.55" transform="rotate(-28 -20 -38)" />
    </svg>
  );
}

function WardSheen() {
  return (
    <svg width="40" height="60" viewBox="0 0 40 60" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="ward-sheen-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff7e0" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff7e0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff7e0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="14" y="0" width="12" height="60" rx="6" fill="url(#ward-sheen-grad)" />
    </svg>
  );
}

// ---------- Sustain: Life-drain ----------

function LifeDrainEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(1000, onDone);
  // Motes travel FROM the wounded player (target) INTO the feeding monster
  // (origin). The tether bar is rooted at the player and rotated toward the
  // monster; the feed-bloom sits at the monster end.
  const dx = origin.x - target.x;
  const dy = origin.y - target.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const [motes] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({ id: i, delay: i * 120 + Math.round(Math.random() * 60) })),
  );
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {/* Tether */}
      <div
        className="absolute animate-drain-tether"
        style={{
          left: 0,
          top: -3,
          width: length,
          height: 6,
          transformOrigin: '0% 50%',
          transform: `rotate(${angle}deg)`,
          borderRadius: 3,
          background:
            'linear-gradient(90deg, rgba(111,217,84,0.85) 0%, rgba(110,31,160,0.7) 60%, rgba(110,31,160,0.2) 100%)',
          boxShadow: '0 0 8px rgba(110,31,160,0.7)',
        }}
      />
      {/* Life motes flowing into the monster */}
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={dx}
          dy={dy}
          delay={m.delay}
          animClass="animate-drain-mote"
          background="radial-gradient(circle, #eaffe0 0%, var(--color-dmg-heal) 55%, rgba(63,191,95,0) 80%)"
          glow="0 0 6px rgba(111,217,84,0.9)"
        />
      ))}
      {/* Feed bloom at the monster */}
      <div
        className="absolute animate-drain-feed"
        style={{ left: dx, top: dy, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <DrainFeed />
      </div>
    </div>
  );
}

function DrainFeed() {
  return (
    <svg
      width="76"
      height="76"
      viewBox="-38 -38 76 76"
      style={{ position: 'absolute', left: -38, top: -38, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="drain-feed-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#eaffe0" stopOpacity="0.85" />
          <stop offset="40%" stopColor="var(--color-dmg-heal)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-status-necrotic)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="32" fill="url(#drain-feed-grad)" />
    </svg>
  );
}

// ---------- Multiattack: Flurry ----------

function FlurryEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(700, onDone);
  // Streaks land on the player; oriented along the monster→player line so they
  // read as incoming blows. Each strike is staggered with a small follow-through.
  const baseAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const strikes = [
    { off: -18, tilt: -0.42, delay: 0 },
    { off: 4, tilt: 0.28, delay: 110 },
    { off: 22, tilt: -0.12, delay: 220 },
  ];
  const follow = 22;
  return (
    <div className="absolute" style={{ left: target.x, top: target.y, width: 0, height: 0 }}>
      {strikes.map((s, i) => {
        const a = baseAngle + s.tilt;
        const fx = Math.cos(a) * follow;
        const fy = Math.sin(a) * follow;
        const deg = (a * 180) / Math.PI;
        return (
          <div key={i}>
            <div
              className="absolute animate-flurry-streak"
              style={
                {
                  left: 0,
                  top: s.off,
                  width: 0,
                  height: 0,
                  transform: `rotate(${deg}deg)`,
                  transformOrigin: 'center',
                  animationDelay: `${s.delay}ms`,
                  ['--dx' as string]: `${fx}px`,
                  ['--dy' as string]: `${fy}px`,
                } as React.CSSProperties
              }
            >
              <StrikeStreak />
            </div>
            <div
              className="absolute animate-flurry-spark"
              style={{
                left: 0,
                top: s.off,
                width: 0,
                height: 0,
                animationDelay: `${s.delay + 90}ms`,
                opacity: 0,
              }}
            >
              <StrikeSpark />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StrikeStreak() {
  return (
    <svg
      width="96"
      height="24"
      viewBox="-48 -12 96 24"
      style={{ position: 'absolute', left: -48, top: -12, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="flurry-grad" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="78%" stopColor="#dfe7ef" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d="M -46 0 Q -10 -5 44 0 Q -10 5 -46 0 Z" fill="url(#flurry-grad)" />
      <circle cx="44" cy="0" r="3" fill="#ffffff" />
    </svg>
  );
}

function StrikeSpark() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="-20 -20 40 40"
      style={{ position: 'absolute', left: -20, top: -20, overflow: 'visible' }}
    >
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <line x1="0" y1="-14" x2="0" y2="-5" />
        <line x1="0" y1="14" x2="0" y2="5" />
        <line x1="-14" y1="0" x2="-5" y2="0" />
        <line x1="14" y1="0" x2="5" y2="0" />
      </g>
      <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
    </svg>
  );
}

// ---------- Frenzy: Battle-rage aura ----------

function FrenzyEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(1000, onDone);
  const wisps = [-40, -20, 0, 20, 40];
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-frenzy-aura"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <FrenzyAura />
      </div>
      <div
        className="absolute animate-frenzy-ring"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <FrenzyRing />
      </div>
      {wisps.map((x, i) => (
        <div
          key={i}
          className="absolute animate-frenzy-wisp"
          style={{ left: x, top: 30, width: 0, height: 0, animationDelay: `${i * 60}ms` }}
        >
          <FrenzyWisp />
        </div>
      ))}
    </div>
  );
}

function FrenzyAura() {
  return (
    <svg
      width="170"
      height="170"
      viewBox="-85 -85 170 170"
      style={{ position: 'absolute', left: -85, top: -85, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="frenzy-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd6c2" stopOpacity="0.0" />
          <stop offset="55%" stopColor="var(--color-accent-blood)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-accent-deep-blood)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="72" fill="url(#frenzy-grad)" />
    </svg>
  );
}

function FrenzyRing() {
  return (
    <svg
      width="150"
      height="150"
      viewBox="-75 -75 150 150"
      style={{ position: 'absolute', left: -75, top: -75, overflow: 'visible' }}
    >
      <circle cx="0" cy="0" r="60" fill="none" stroke="var(--color-accent-blood)" strokeWidth="3" opacity="0.85" />
      <circle cx="0" cy="0" r="60" fill="none" stroke="#ffb199" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function FrenzyWisp() {
  return (
    <svg
      width="20"
      height="46"
      viewBox="-10 -23 20 46"
      style={{ position: 'absolute', left: -10, top: -23, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="frenzy-wisp-grad" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="var(--color-accent-deep-blood)" stopOpacity="0.1" />
          <stop offset="55%" stopColor="var(--color-accent-blood)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffb199" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M 0 22 Q -8 4 -2 -8 Q 2 -18 0 -22 Q -2 -16 4 -6 Q 8 6 0 22 Z" fill="url(#frenzy-wisp-grad)" />
    </svg>
  );
}

// ---------- Druid: Regrowth (heal-over-time) ----------

// ---------- Bard Song pulse (bard-redesign) ----------
// The music made visible: a quick sound-ring breathing off the performer with
// a few note glyphs rising. Deliberately small/short — it fires every round.
function SongPulseEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(760, onDone);
  const ringSize = 96;
  const notes = [
    { x: -20, glyph: '♪', delay: 0 },
    { x: 4, glyph: '♫', delay: 110 },
    { x: 22, glyph: '♪', delay: 220 },
  ];
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-song-ring"
        style={{ left: -ringSize / 2, top: -ringSize / 2 - 10, width: ringSize, height: ringSize }}
      >
        <svg width={ringSize} height={ringSize} viewBox="-48 -48 96 96" style={{ overflow: 'visible' }}>
          <circle cx="0" cy="0" r="30" fill="none" stroke="#e8b54a" strokeWidth="2.5" opacity="0.85" />
          <circle cx="0" cy="0" r="40" fill="none" stroke="#caa0e8" strokeWidth="1.5" opacity="0.5" />
        </svg>
      </div>
      {notes.map((n, i) => (
        <div
          key={i}
          className="absolute animate-song-note"
          style={
            {
              left: n.x,
              top: -34,
              color: '#ffe9ad',
              textShadow: '0 0 6px rgba(232,181,74,0.9)',
              fontSize: 15,
              animationDelay: `${n.delay}ms`,
              '--dx': `${n.x * 0.6}px`,
            } as React.CSSProperties
          }
        >
          {n.glyph}
        </div>
      ))}
    </div>
  );
}

function RegrowthEffect({ origin, onDone }: SelfProps) {
  useDoneTimer(1050, onDone);
  const [motes] = useState(() => scatter(9, { min: 12, max: 34, up: 44, spread: 0.5 }));
  return (
    <div className="absolute" style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}>
      <div
        className="absolute animate-heal-glow"
        style={{ left: -30, top: -60, width: 60, height: 92, transformOrigin: 'bottom center' }}
      >
        <LeafBloom />
      </div>
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-heal-mote"
          background="radial-gradient(circle, #eaffd6 0%, #6fd954 55%, rgba(63,150,60,0) 80%)"
          glow="0 0 6px rgba(120,217,84,0.85)"
        />
      ))}
    </div>
  );
}

function LeafBloom() {
  return (
    <svg width="60" height="92" viewBox="0 0 60 92" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="regrowth-col" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="var(--color-dmg-heal)" stopOpacity="0.7" />
          <stop offset="65%" stopColor="#a8f59a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a8f59a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="regrowth-leaf" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3f9640" />
          <stop offset="100%" stopColor="#8fe06a" />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="88" rx="26" ry="9" fill="var(--color-dmg-heal)" opacity="0.3" />
      <path d="M 24 90 Q 28 40 30 10 Q 32 40 36 90 Z" fill="url(#regrowth-col)" />
      {/* Curling vine up the centre */}
      <path
        d="M 30 88 Q 22 60 30 40 Q 38 22 30 8"
        fill="none"
        stroke="#5fb84a"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Sprung leaves */}
      <g fill="url(#regrowth-leaf)" opacity="0.95">
        <path d="M 30 58 Q 14 52 8 62 Q 22 66 30 58 Z" />
        <path d="M 30 44 Q 46 38 52 48 Q 38 52 30 44 Z" />
        <path d="M 30 30 Q 16 26 12 36 Q 24 38 30 30 Z" />
        <path d="M 30 16 Q 44 12 48 22 Q 36 24 30 16 Z" />
      </g>
    </svg>
  );
}

// ---------- Druid: Spirit Beast (summoned companion) ----------

function SummonBeastEffect({ target, onDone }: TargetAnchorProps) {
  useDoneTimer(1000, onDone);
  const [motes] = useState(() => scatter(10, { min: 14, max: 40, up: 10, spread: 0.6 }));
  return (
    <div className="absolute" style={{ left: target.x, top: target.y - 8, width: 0, height: 0 }}>
      <div
        className="absolute animate-pop-in"
        style={{ left: 0, top: 0, width: 0, height: 0, transformOrigin: 'center' }}
      >
        <BeastForm />
      </div>
      {motes.map((m) => (
        <EffectMote
          key={m.id}
          dx={m.dx}
          dy={m.dy}
          delay={m.delay}
          animClass="animate-rift-mote"
          background="radial-gradient(circle, #d6fff0 0%, #5fbfa0 55%, rgba(47,107,79,0) 80%)"
          glow="0 0 6px rgba(120,230,190,0.85)"
        />
      ))}
    </div>
  );
}

function BeastForm() {
  return (
    <svg
      width="150"
      height="120"
      viewBox="-75 -60 150 120"
      style={{ position: 'absolute', left: -75, top: -60, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="beast-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#bfffe6" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#2f6b4f" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2f6b4f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beast-claw" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eafff6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#5fbfa0" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <circle cx="0" cy="0" r="56" fill="url(#beast-aura)" />
      {/* Spectral beast-head silhouette */}
      <g fill="#3f8f6e" opacity="0.55">
        <path d="M -30 -6 Q -26 -34 -6 -34 Q 0 -44 6 -34 Q 26 -34 30 -6 Q 24 6 14 2 Q 10 14 0 14 Q -10 14 -14 2 Q -24 6 -30 -6 Z" />
      </g>
      {/* Burning eyes */}
      <g fill="#eafff6">
        <circle cx="-10" cy="-12" r="3" />
        <circle cx="10" cy="-12" r="3" />
      </g>
      {/* Three claw gashes raking the foe */}
      <g stroke="url(#beast-claw)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.92">
        <path d="M -34 -24 L 30 30" />
        <path d="M -22 -30 L 40 22" />
        <path d="M -10 -34 L 48 16" />
      </g>
    </svg>
  );
}

// ============================================================================
// === druid at-will VFX === Produce Flame + Thornlash reuse the wizard's cast
// handlers (fire-bolt / magic-missile) but route to these bespoke NATURE looks
// so they never read as arcane. Both ride the reduced-motion-aware shared
// animation classes (.animate-firebolt-arc / .animate-spell-bloom), which the
// prefers-reduced-motion block already settles in place.
// ============================================================================

// A wild flame is amber-hot at the core but green at the root — the wild's own
// fire, never the wizard's clean evocation bolt.
const NATURE_FLAME_PALETTE: ElementPalette = {
  core: '#fff3c0',
  mid: '#ff9a3a',
  deep: '#2f5d1c',
  glow: 'rgba(255,154,58,0.85)',
  accent: '#9ed85a',
};

// Living bramble — leaf-green shaft, paler barbs, dark-loam shadow.
const THORN_PALETTE: ElementPalette = {
  core: '#eaffc8',
  mid: '#6fae33',
  deep: '#243d10',
  glow: 'rgba(110,174,51,0.85)',
  accent: '#b6e06a',
};

// ---------- Druid: Produce Flame (nature-flame) ----------

function NatureFlameEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(880, onDone);
  const pal = NATURE_FLAME_PALETTE;
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const trail = [60, 130, 200];
  // A wild flame wanders — same per-cast flight variants as the arcane bolt.
  const [arcClass] = useState(pickBoltArc);
  return (
    <>
      {trail.map((delay, i) => (
        <div
          key={`nf-trail-${i}`}
          className={`absolute ${arcClass}`}
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
          <FlameEmber pal={pal} />
        </div>
      ))}
      <div
        className={`absolute ${arcClass}`}
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
        <LeafFlameHead pal={pal} angle={angle} />
      </div>
      <div
        className="absolute animate-spell-bloom"
        style={{ left: target.x, top: target.y, width: 0, height: 0, animationDelay: '300ms', opacity: 0 }}
      >
        <FlameScorch pal={pal} />
      </div>
    </>
  );
}

function LeafFlameHead({ pal, angle }: { pal: ElementPalette; angle: number }) {
  return (
    <svg
      width="56"
      height="56"
      viewBox="-28 -28 56 56"
      style={{ position: 'absolute', left: -28, top: -28, overflow: 'visible', filter: `drop-shadow(0 0 6px ${pal.glow})` }}
    >
      <defs>
        <radialGradient id="godwake-nf-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.core} stopOpacity="1" />
          <stop offset="42%" stopColor={pal.mid} stopOpacity="1" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Organic flame tongues — leaf flickers trailing, a hot lick forward. */}
      <g transform={`rotate(${angle})`}>
        <g fill={pal.accent} opacity="0.8">
          <path d="M -14 -4 Q -28 -10 -18 -14 Q -12 -9 -14 -4 Z" />
          <path d="M -16 6 Q -30 10 -19 15 Q -12 9 -16 6 Z" />
        </g>
        <path d="M 6 0 Q 22 -10 26 0 Q 22 10 6 0 Z" fill={pal.mid} opacity="0.85" />
      </g>
      <circle cx="0" cy="0" r="17" fill="url(#godwake-nf-core)" />
      <circle cx="-2" cy="-2" r="6" fill={pal.core} opacity="0.92" />
    </svg>
  );
}

function FlameEmber({ pal }: { pal: ElementPalette }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="-13 -13 26 26"
      style={{ position: 'absolute', left: -13, top: -13, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="godwake-nf-trail" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="11" fill="url(#godwake-nf-trail)" />
    </svg>
  );
}

function FlameScorch({ pal }: { pal: ElementPalette }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="-40 -40 80 80"
      style={{ position: 'absolute', left: -40, top: -40, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="godwake-nf-scorch" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.core} stopOpacity="0.95" />
          <stop offset="40%" stopColor={pal.mid} stopOpacity="0.6" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="28" fill="url(#godwake-nf-scorch)" />
      <g fill={pal.accent} opacity="0.85">
        <path d="M 0 -22 Q 6 -30 12 -22 Q 6 -18 0 -22 Z" />
        <path d="M -20 6 Q -28 12 -20 18 Q -16 11 -20 6 Z" />
        <path d="M 16 10 Q 26 12 24 20 Q 18 16 16 10 Z" />
      </g>
    </svg>
  );
}

// ---------- Druid: Thornlash (thorn-lash) ----------

function ThornLashEffect({ origin, target, onDone }: ArcProps) {
  useDoneTimer(1100, onDone);
  const pal = THORN_PALETTE;
  const lashes = [0, 110, 220];
  const targetOffsets = [-12, 2, 14];
  return (
    <>
      {lashes.map((delay, i) => {
        const tY = target.y + targetOffsets[i];
        const dx = target.x - origin.x;
        const dy = tY - origin.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div key={`lash-${i}`}>
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
                  animationDelay: `${delay}ms`,
                } as React.CSSProperties
              }
            >
              <ThornBarb pal={pal} angle={angle} />
            </div>
            <div
              className="absolute animate-spell-bloom"
              style={{ left: target.x, top: tY, width: 0, height: 0, animationDelay: `${delay + 320}ms`, opacity: 0 }}
            >
              <ThornBurst pal={pal} />
            </div>
          </div>
        );
      })}
    </>
  );
}

function ThornBarb({ pal, angle }: { pal: ElementPalette; angle: number }) {
  return (
    <svg
      width="56"
      height="32"
      viewBox="-28 -16 56 32"
      style={{ position: 'absolute', left: -28, top: -16, overflow: 'visible', filter: `drop-shadow(0 0 5px ${pal.glow})` }}
    >
      <defs>
        <linearGradient id="godwake-thorn-vine" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor={pal.deep} stopOpacity="0" />
          <stop offset="60%" stopColor={pal.mid} stopOpacity="0.95" />
          <stop offset="100%" stopColor={pal.core} stopOpacity="1" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${angle})`}>
        {/* Whipping vine shaft. */}
        <path d="M -24 0 Q -4 -3 22 0 Q -4 3 -24 0 Z" fill="url(#godwake-thorn-vine)" />
        {/* Barbs raking off the shaft. */}
        <g fill={pal.accent} opacity="0.95">
          <path d="M -6 -2 L -12 -9 L -2 -3 Z" />
          <path d="M 4 2 L 0 11 L 9 3 Z" />
          <path d="M 12 -1 L 10 -9 L 17 -2 Z" />
        </g>
        {/* Sharp tip. */}
        <path d="M 18 0 L 27 -3 L 27 3 Z" fill={pal.core} />
      </g>
    </svg>
  );
}

function ThornBurst({ pal }: { pal: ElementPalette }) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="-32 -32 64 64"
      style={{ position: 'absolute', left: -32, top: -32, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="godwake-thorn-burst" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={pal.core} stopOpacity="0.95" />
          <stop offset="45%" stopColor={pal.mid} stopOpacity="0.5" />
          <stop offset="100%" stopColor={pal.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="22" fill="url(#godwake-thorn-burst)" />
      {/* Radiating thorn spikes. */}
      <g stroke={pal.accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1={Math.cos(r) * 8} y1={Math.sin(r) * 8} x2={Math.cos(r) * 20} y2={Math.sin(r) * 20} />;
        })}
      </g>
    </svg>
  );
}
