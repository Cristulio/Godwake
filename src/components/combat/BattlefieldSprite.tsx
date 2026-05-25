import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import type { MonsterInstance } from '../../types/combat';
import { computeAC } from '../../engine/character/derived';
import { MonsterPortrait } from './MonsterPortrait';
import { PlayerPortrait } from './PlayerPortrait';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';

type CommonProps = {
  isActiveTurn: boolean;
  facing: 'left' | 'right';
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

export function BattlefieldSprite(props: BattlefieldSpriteProps) {
  const hpCurrent =
    props.kind === 'player' ? props.character.hp.current : props.instance.hp.current;
  const hpMax = props.kind === 'player' ? props.character.hp.max : props.instance.hp.max;
  const ac =
    props.kind === 'player' ? computeAC(props.character) : props.instance.ac;
  const name = props.kind === 'player' ? props.character.name : props.instance.displayName;
  const dead = hpCurrent <= 0;
  const hpPercent = (hpCurrent / hpMax) * 100;

  const prevHp = useRef(hpCurrent);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const [lunge, setLunge] = useState(false);

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
    } else if (delta < 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: -delta, kind: 'heal' }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
    }
  }, [hpCurrent]);

  // Lunge when this sprite becomes the active turn taker
  useEffect(() => {
    if (props.isActiveTurn && !dead) {
      setLunge(true);
      const t = setTimeout(() => setLunge(false), 420);
      return () => clearTimeout(t);
    }
  }, [props.isActiveTurn, dead]);

  const lungeClass = lunge
    ? props.facing === 'right'
      ? 'animate-lunge-right'
      : 'animate-lunge-left'
    : '';

  const idleClass = dead ? 'animate-die-fall' : 'animate-idle-breath';

  const selectable = props.kind === 'monster' && props.selectable && !dead;

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
      <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-bold">
        {name}
      </div>

      <div
        className={`
          relative w-28 h-28 flex items-center justify-center
          ${selectable ? 'ring-2 ring-[var(--color-accent-amber)] ring-offset-2 ring-offset-transparent hover:scale-105 transition-transform shadow-[0_0_18px_rgba(244,167,66,0.45)]' : ''}
          ${props.isActiveTurn && !dead ? 'drop-shadow-[0_0_14px_rgba(255,179,71,0.5)]' : ''}
        `}
      >
        <div
          className={`
            w-full h-full ${lungeClass || idleClass}
            ${props.facing === 'left' ? '-scale-x-100' : ''}
          `}
        >
          {props.kind === 'monster' ? (
            <MonsterPortrait defId={props.instance.defId} className="w-full h-full" />
          ) : (
            <PlayerPortrait classId={props.character.classId} className="w-full h-full" />
          )}
        </div>
        {hitFlash && (
          <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-55 mix-blend-screen pointer-events-none" />
        )}
        <FloatingDamage items={damageFloats} />
        {dead && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em] font-bold">
            Slain
          </div>
        )}
      </div>

      <div className="w-28 flex flex-col gap-0.5 mt-1">
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
          AC {ac}
        </div>
      </div>
    </button>
  );
}
