import { memo, useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import type { MonsterInstance, AttackEvent } from '../../types/combat';
import { computeAC } from '../../engine/character/derived';
import { MonsterPortrait } from './MonsterPortrait';
import { PlayerPortrait } from './PlayerPortrait';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';
import { SlashEffect } from './SlashEffect';

type CommonProps = {
  isActiveTurn: boolean;
  facing: 'left' | 'right';
  /** Bumps when this sprite has just executed an attack. Triggers a lunge animation. */
  attackPulse: number;
  /** Latest attack event in combat — used to detect crits against this sprite. */
  lastAttack?: AttackEvent;
};

type PlayerProps = CommonProps & {
  kind: 'player';
  character: Character;
};

type MonsterProps = CommonProps & {
  kind: 'monster';
  instance: MonsterInstance;
  selectable: boolean;
  onSelect?: () => void;
};

export type BattlefieldSpriteProps = PlayerProps | MonsterProps;

function monsterSpriteWidth(defId: string): string {
  switch (defId) {
    case 'goblin-warden':
    case 'duergar-ilyich':
      return '80px';
    case 'bugbear':
      return '92px';
    case 'animated-armor':
      return '84px';
    case 'skeleton':
      return '70px';
    case 'dust-mephit':
      return '72px';
    case 'imp':
      return '64px';
    case 'kobold':
      return '50px';
    case 'goblin':
      return '56px';
    case 'hobgoblin':
      return '82px';
    case 'ghoul':
      return '72px';
    case 'stirge':
      return '60px';
    case 'cult-fanatic':
      return '76px';
    case 'shadow':
      return '78px';
    case 'cowled-enforcer':
      return '80px';
    case 'slaver-cuirassier':
      return '88px';
    case 'athkatla-magistrate':
      return '92px';
    case 'bandit-captain':
      return '84px';
    case 'dust-mephit-elder':
      return '84px';
    case 'bone-stalker':
      return '78px';
    case 'shadow-hound':
      return '88px';
    case 'bonebound-test-subject':
      return '78px';
    case 'hollow-sage':
      return '78px';
    case 'mad-mage-prisoner':
      return '76px';
    case 'drow-warrior':
      return '80px';
    case 'drow-crossbowman':
      return '78px';
    case 'drow-matron-mother':
      return '92px';
    case 'drider':
      return '110px';
    case 'driderling':
      return '54px';
    case 'mind-flayer-fragment':
      return '74px';
    case 'slayer-hound':
      return '92px';
    case 'asylum-director':
      return '96px';
    case 'wardens-apprentice':
      return '80px';
    default:
      return '60px';
  }
}

function BattlefieldSpriteImpl(props: BattlefieldSpriteProps) {
  const hpCurrent =
    props.kind === 'player' ? props.character.hp.current : props.instance.hp.current;
  const hpMax = props.kind === 'player' ? props.character.hp.max : props.instance.hp.max;
  const hpTemp =
    props.kind === 'player' ? props.character.hp.temp : props.instance.hp.temp;
  const ac = props.kind === 'player' ? computeAC(props.character) : props.instance.ac;
  const acVisible = props.kind === 'player' ? true : props.instance.acRevealed;
  const name = props.kind === 'player' ? props.character.name : props.instance.displayName;
  const dead = hpCurrent <= 0;
  // When temp HP is present, scale the bar against (max + temp) so the temp
  // buffer reads as an extension of the bar instead of overlapping current.
  const hpScale = hpMax + hpTemp;
  const hpPercent = (hpCurrent / hpScale) * 100;
  const tempPercent = (hpTemp / hpScale) * 100;
  const healthRatio = hpCurrent / hpMax;

  const prevHp = useRef(hpCurrent);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState<'normal' | 'crit' | null>(null);
  const [hitPause, setHitPause] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; dx: number; dy: number }>>([]);
  const [slashes, setSlashes] = useState<{ id: number; direction: 'left-to-right' | 'right-to-left'; crit: boolean }[]>([]);
  const [lunge, setLunge] = useState(false);
  const lastAttackPulse = useRef(props.attackPulse);

  // Float damage / heal + slash effect whenever HP changes
  useEffect(() => {
    if (prevHp.current === hpCurrent) return;
    const delta = prevHp.current - hpCurrent;
    prevHp.current = hpCurrent;
    if (delta > 0) {
      // Detect crit against THIS sprite by matching the lastAttack event.
      const targetMatches =
        props.lastAttack &&
        (props.kind === 'monster'
          ? props.lastAttack.targetName === props.instance.displayName
          : props.lastAttack.attackerKind === 'monster');
      const wasCrit = props.lastAttack?.crit === true && targetMatches;

      const id = Date.now() + Math.random();
      setDamageFloats((d) => [
        ...d,
        { id, amount: delta, kind: wasCrit ? 'crit' : 'damage' },
      ]);
      setTimeout(
        () => setDamageFloats((d) => d.filter((x) => x.id !== id)),
        wasCrit ? 1500 : 1200,
      );

      setHitFlash(wasCrit ? 'crit' : 'normal');
      setTimeout(() => setHitFlash(null), wasCrit ? 320 : 240);
      setHitPause(true);
      setTimeout(() => setHitPause(false), 160);

      // Slash effect: comes from the attacker's side toward this sprite.
      const direction: 'left-to-right' | 'right-to-left' =
        props.facing === 'right' ? 'right-to-left' : 'left-to-right';
      const slashId = Date.now() + Math.random();
      setSlashes((s) => [...s, { id: slashId, direction, crit: !!wasCrit }]);
      setTimeout(() => setSlashes((s) => s.filter((x) => x.id !== slashId)), 350);

      if (wasCrit) {
        // Crit spark burst — 8 particles radiating outward
        const burst = Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 36 + Math.random() * 20;
          return {
            id: id + i + 1,
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist - 8,
          };
        });
        setSparks((s) => [...s, ...burst]);
        setTimeout(() => {
          setSparks((s) => s.filter((sp) => !burst.find((b) => b.id === sp.id)));
        }, 600);
      }
    } else if (delta < 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: -delta, kind: 'heal' }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpCurrent]);

  // Lunge only when this sprite has actually attacked (attackPulse bumps).
  useEffect(() => {
    if (props.attackPulse === lastAttackPulse.current) return;
    if (props.attackPulse === 0) return;
    lastAttackPulse.current = props.attackPulse;
    if (dead) return;
    setLunge(true);
    const t = setTimeout(() => setLunge(false), 460);
    return () => clearTimeout(t);
  }, [props.attackPulse, dead]);

  const selectable = props.kind === 'monster' && props.selectable && !dead;

  const lungeClass = lunge
    ? props.facing === 'right'
      ? 'animate-lunge-right'
      : 'animate-lunge-left'
    : '';
  const idleClass = dead ? 'animate-die-fall' : 'animate-idle-breath';

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={props.kind === 'monster' ? props.onSelect : undefined}
      className={`
        relative flex flex-col items-center gap-1 transition-opacity
        ${selectable ? 'cursor-pointer' : 'cursor-default'}
        ${dead ? 'opacity-40' : ''}
        disabled:cursor-default
      `}
    >
      <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-bold mb-0.5 font-display">
        {name}
      </div>

      <div
        className={`
          relative flex items-end justify-center
          ${selectable ? 'drop-shadow-[0_0_18px_rgba(244,167,66,0.55)] hover:scale-[1.06] transition-transform' : ''}
          ${props.isActiveTurn && !dead ? 'drop-shadow-[0_0_18px_rgba(255,179,71,0.55)]' : ''}
        `}
        style={{ width: props.kind === 'player' ? '84px' : monsterSpriteWidth(props.instance.defId) }}
      >
        {selectable && (
          <div className="absolute inset-0 border-2 border-[var(--color-accent-amber)] -m-1 pointer-events-none animate-pulse-glow" />
        )}
        <div
          className={`
            relative w-full ${lungeClass || idleClass} ${hitPause ? 'animate-hit-pause' : ''}
            ${props.facing === 'left' ? '-scale-x-100' : ''}
          `}
        >
          {props.kind === 'monster' ? (
            <MonsterPortrait
              defId={props.instance.defId}
              className="w-full h-auto"
            />
          ) : (
            <PlayerPortrait
              classId={props.character.classId}
              className="w-full h-auto"
            />
          )}
          {hitFlash === 'normal' && (
            <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-55 mix-blend-screen pointer-events-none" />
          )}
          {hitFlash === 'crit' && (
            <div className="absolute inset-0 pointer-events-none animate-hit-flash-crit" />
          )}
        </div>
        {slashes.map((s) => (
          <SlashEffect key={s.id} direction={s.direction} />
        ))}
        {/* Crit sparks */}
        {sparks.map((s) => (
          <div
            key={s.id}
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-[var(--color-accent-torch)] pointer-events-none animate-spark rounded-[1px]"
            style={{
              boxShadow:
                '0 0 6px rgba(255,179,71,0.95), 0 0 14px rgba(255,71,48,0.6)',
              ['--spark-dest' as string]: `translate(${s.dx}px, ${s.dy}px)`,
            }}
          />
        ))}
        <FloatingDamage items={damageFloats} />
        {dead && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em] font-bold font-display">
            Slain
          </div>
        )}
      </div>

      <div className="w-20 flex flex-col gap-0.5 mt-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-[var(--color-text-dim)] font-display text-[8px]">HP</span>
          <span className="text-[var(--color-text-primary)]">
            {hpCurrent}/{hpMax}
            {hpTemp > 0 && (
              <span
                className="ml-0.5 text-[var(--color-accent-amber)]"
                title={`+${hpTemp} temporary HP — absorbs damage first`}
              >
                +{hpTemp}
              </span>
            )}
          </span>
        </div>
        <div className="h-2 bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] overflow-hidden relative flex">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              props.kind === 'monster'
                ? healthRatio > 0.5
                  ? 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)]'
                  : 'bg-gradient-to-r from-[var(--color-accent-deep-blood)] to-[var(--color-accent-blood)] animate-pulse'
                : healthRatio > 0.5
                  ? 'bg-gradient-to-r from-[var(--color-status-poison)] to-[#5a8013]'
                  : healthRatio > 0.25
                    ? 'bg-gradient-to-r from-[var(--color-accent-amber)] to-[var(--color-accent-torch)]'
                    : 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)] animate-pulse'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
          {hpTemp > 0 && (
            <div
              className="h-full bg-[var(--color-accent-amber)]/65 border-l border-[var(--color-bg-base)] transition-all duration-500 ease-out"
              style={{ width: `${tempPercent}%` }}
              title={`+${hpTemp} temporary HP`}
            />
          )}
          {/* Glossy shine on top half */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"
          />
        </div>
        <div className="text-[10px] text-[var(--color-text-dim)] font-mono text-center">
          <span className="font-display text-[8px] mr-1">AC</span>
          {acVisible ? ac : '?'}
        </div>
      </div>
    </button>
  );
}

/**
 * Memoized: combat state changes ~6-8x in a single dice/swing/hit cascade.
 * A sprite only needs to re-render when its OWN HP / activity / attack-pulse
 * changes, or when the latest attack might target it. The comparator below
 * skips render when none of those changed.
 */
export const BattlefieldSprite = memo(BattlefieldSpriteImpl, (prev, next) => {
  if (prev.kind !== next.kind) return false;
  if (prev.isActiveTurn !== next.isActiveTurn) return false;
  if (prev.facing !== next.facing) return false;
  if (prev.attackPulse !== next.attackPulse) return false;
  // lastAttack: only matters if it CHANGES — a new event id triggers a flash.
  // Sprite reads `lastAttack` to detect crits against itself, so id is enough.
  if (prev.lastAttack?.id !== next.lastAttack?.id) return false;
  if (prev.kind === 'player' && next.kind === 'player') {
    return (
      prev.character.hp.current === next.character.hp.current &&
      prev.character.hp.max === next.character.hp.max &&
      prev.character.hp.temp === next.character.hp.temp &&
      prev.character === next.character // catch any other field via identity
    );
  }
  if (prev.kind === 'monster' && next.kind === 'monster') {
    // onSelect intentionally NOT compared — Battlefield re-creates an
    // arrow each render (`() => onSelectTarget(c.id)`). Including it here
    // would defeat the memo. The closure captures the monster id, which
    // doesn't change for a given combatant.
    return (
      prev.selectable === next.selectable &&
      prev.instance.hp.current === next.instance.hp.current &&
      prev.instance.hp.max === next.instance.hp.max &&
      prev.instance.hp.temp === next.instance.hp.temp &&
      prev.instance.ac === next.instance.ac &&
      prev.instance.acRevealed === next.instance.acRevealed &&
      prev.instance === next.instance
    );
  }
  return false;
});
