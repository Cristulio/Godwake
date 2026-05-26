import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import { getRace } from '../../content/races';
import { getClass } from '../../content/classes';
import { computeAC } from '../../engine/character/derived';
import { PlayerPortrait } from './PlayerPortrait';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';
import { QuirkRow } from '../ui/QuirkBadge';
import { BlessingRow } from '../ui/BlessingBadge';

interface PlayerPanelProps {
  character: Character;
  isActiveTurn: boolean;
}

export function PlayerPanel({ character, isActiveTurn }: PlayerPanelProps) {
  const race = getRace(character.raceId);
  const cls = getClass(character.classId);
  const ac = computeAC(character);
  const hpPercent = (character.hp.current / character.hp.max) * 100;
  const ae = character.actionEconomy;

  const prevHp = useRef(character.hp.current);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState(false);

  useEffect(() => {
    if (prevHp.current === character.hp.current) return;
    const delta = prevHp.current - character.hp.current;
    prevHp.current = character.hp.current;
    if (delta > 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: delta, kind: 'damage' }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 240);
    } else if (delta < 0) {
      const id = Date.now() + Math.random();
      setDamageFloats((d) => [...d, { id, amount: -delta, kind: 'heal' }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
    }
  }, [character.hp.current]);

  return (
    <div
      className={`
        bg-[var(--color-bg-panel)] border-2 p-4 flex gap-4 transition-all
        ${isActiveTurn
          ? 'border-[var(--color-accent-amber)] shadow-[0_0_24px_rgba(244,167,66,0.25)]'
          : 'border-[var(--color-border-warm)]'}
      `}
    >
      <div
        className={`
          w-24 h-24 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-center justify-center shrink-0 relative overflow-hidden
          ${hitFlash ? 'animate-pulse' : ''}
        `}
      >
        <PlayerPortrait classId={character.classId} className="w-full h-full" />
        {hitFlash && (
          <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-50 mix-blend-screen" />
        )}
        <FloatingDamage items={damageFloats} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[var(--color-accent-amber)] text-lg font-bold uppercase tracking-wider">
          {character.name}
        </div>
        <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mb-2">
          {race.name} {cls.name} · Level {character.level}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">HP</div>
            <div className="font-mono text-[var(--color-text-primary)]">
              {character.hp.current}/{character.hp.max}
              {character.hp.temp > 0 && (
                <span
                  className="ml-1 text-[var(--color-accent-amber)]"
                  title="Temporary HP — absorbs damage before regular HP."
                >
                  +{character.hp.temp}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-[var(--color-bg-elevated)] mt-1 border border-[var(--color-border-dim)] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  hpPercent > 50 ? 'bg-[var(--color-status-poison)]'
                    : hpPercent > 25 ? 'bg-[var(--color-accent-amber)]'
                      : 'bg-[var(--color-accent-blood)]'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">AC</div>
            <div className="font-mono text-[var(--color-text-primary)]">{ac}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-dim)] uppercase tracking-wider">Speed</div>
            <div className="font-mono text-[var(--color-text-primary)]">{race.speed} ft</div>
          </div>
        </div>

        <div className="mt-3 flex gap-3 text-xs">
          <ActionFlag label="Action" available={!ae.actionUsed} />
          <ActionFlag label="Bonus" available={!ae.bonusActionUsed} />
          <ActionFlag label="Reaction" available={!ae.reactionUsed} />
        </div>

        {character.quirks.length > 0 && (
          <div className="mt-3">
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-1">
              Quirks
            </div>
            <QuirkRow quirkIds={character.quirks} />
          </div>
        )}

        {character.blessings.length > 0 && (
          <div className="mt-3">
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-1">
              Blessings
            </div>
            <BlessingRow blessingIds={character.blessings} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionFlag({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          available ? 'bg-[var(--color-status-poison)]' : 'bg-[var(--color-text-muted)]'
        }`}
      />
      <span
        className={`uppercase tracking-wider transition-colors ${
          available ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] line-through'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
