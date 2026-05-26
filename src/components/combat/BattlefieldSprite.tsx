import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import type { MonsterInstance } from '../../types/combat';
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

/**
 * Per-monster display widths. Heights flow from each sprite's viewBox aspect.
 * Fighter is rendered at 84px wide (= 140px tall at 24:40 ratio); use that as
 * the "human" reference and size races accordingly.
 *
 *   Goblin / kobold        — small race, ~68% human height
 *   Skeleton / mephit      — medium-small, ~80% human height
 *   Warden / Ilyich        — duergar (small but stocky), full ~95%
 *   Animated Armor         — human-plate-suit sized, ~100%
 */
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
    default:
      return '60px';
  }
}

export function BattlefieldSprite(props: BattlefieldSpriteProps) {
  const hpCurrent =
    props.kind === 'player' ? props.character.hp.current : props.instance.hp.current;
  const hpMax = props.kind === 'player' ? props.character.hp.max : props.instance.hp.max;
  const ac = props.kind === 'player' ? computeAC(props.character) : props.instance.ac;
  const acVisible = props.kind === 'player' ? true : props.instance.acRevealed;
  const name = props.kind === 'player' ? props.character.name : props.instance.displayName;
  const dead = hpCurrent <= 0;
  const hpPercent = (hpCurrent / hpMax) * 100;

  const prevHp = useRef(hpCurrent);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const [slashes, setSlashes] = useState<{ id: number; direction: 'left-to-right' | 'right-to-left' }[]>([]);
  const [lunge, setLunge] = useState(false);
  const lastAttackPulse = useRef(props.attackPulse);

  // Float damage / heal + slash effect whenever HP changes
  useEffect(() => {
    if (prevHp.current === hpCurrent) return;
    const delta = prevHp.current - hpCurrent;
    prevHp.current = hpCurrent;
    if (delta > 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: delta, kind: 'damage' }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 260);

      // Slash effect: comes from the attacker's side toward this sprite.
      const direction: 'left-to-right' | 'right-to-left' =
        props.facing === 'right' ? 'right-to-left' : 'left-to-right';
      const slashId = Date.now() + Math.random();
      setSlashes((s) => [...s, { id: slashId, direction }]);
      setTimeout(() => setSlashes((s) => s.filter((x) => x.id !== slashId)), 350);
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
    const t = setTimeout(() => setLunge(false), 420);
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
      <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-bold mb-0.5">
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
          <div className="absolute inset-0 border-2 border-[var(--color-accent-amber)] -m-1 pointer-events-none" />
        )}
        <div
          className={`
            relative w-full ${lungeClass || idleClass}
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
          {hitFlash && (
            <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-55 mix-blend-screen pointer-events-none" />
          )}
        </div>
        {slashes.map((s) => (
          <SlashEffect key={s.id} direction={s.direction} />
        ))}
        <FloatingDamage items={damageFloats} />
        {dead && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em] font-bold">
            Slain
          </div>
        )}
      </div>

      <div className="w-20 flex flex-col gap-0.5 mt-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-[var(--color-text-dim)]">HP</span>
          <span className="text-[var(--color-text-primary)]">
            {hpCurrent}/{hpMax}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              props.kind === 'monster'
                ? 'bg-[var(--color-accent-blood)]'
                : hpPercent > 50
                  ? 'bg-[var(--color-status-poison)]'
                  : hpPercent > 25
                    ? 'bg-[var(--color-accent-amber)]'
                    : 'bg-[var(--color-accent-blood)]'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-[var(--color-text-dim)] font-mono text-center">
          AC {acVisible ? ac : '?'}
        </div>
      </div>
    </button>
  );
}
