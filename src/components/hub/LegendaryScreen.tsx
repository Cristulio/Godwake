import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import {
  LEGENDARIES,
  canEquipLegendary,
  type Legendary,
} from '../../content/legendaries';
import { SETS, setProgress } from '../../content/sets';
import { getClass } from '../../content/classes';
import { isFeatureUnlocked } from '../../engine/progression/unlocks';

interface LegendaryScreenProps {
  onBack: () => void;
}

/**
 * The hub "Relics" view: inspect earned legendary relics and choose which to
 * EQUIP for every future descent. No slot cap — equipped relics stay on until
 * changed. Relics are effect-only (no AC, no weapon damage); their effects layer
 * on top of the run's affix gear. Class-bound relics can be found by any class
 * but are only equippable while playing that class.
 */
export function LegendaryScreen({ onBack }: LegendaryScreenProps) {
  const owned = useGameStore((s) => s.ownedLegendaries);
  const active = useGameStore((s) => s.activeLegendaries);
  const setActive = useGameStore((s) => s.setActiveLegendaries);
  const classId = useGameStore((s) => s.character?.classId) ?? null;
  const delveCount = useGameStore((s) => s.delveCount);
  const chaptersCleared = useGameStore((s) => s.chaptersCleared);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const setsUnlocked = isFeatureUnlocked('sets', { delveCount, chaptersCleared, druidGroveUnlocked });
  const [flash, setFlash] = useState<string | null>(null);

  function toggle(relic: Legendary) {
    if (active.includes(relic.id)) {
      setActive(active.filter((a) => a !== relic.id));
      return;
    }
    if (classId && !canEquipLegendary(relic.id, classId)) {
      const cls = relic.classGate ? getClass(relic.classGate).name : 'another class';
      setFlash(`Bound to the ${cls} — play that class to wield this relic.`);
      setTimeout(() => setFlash(null), 2600);
      return;
    }
    setActive([...active, relic.id]);
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            RELICS OF THE SOUL
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            Legendary effects · What death cannot take
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Phandalin
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
        <Panel tone="glow">
          <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed font-narrative">
            Some things the wheel cannot strip from you. These relics, won from the elites of the
            deep dark, return with the soul through every death. Equip the ones you will carry — they
            lend no armour and swing no blade, only their gifts, layered over whatever gear the road
            provides. They stay with you until you choose otherwise.
          </p>
        </Panel>
        <div className="panel-etched-warm border border-[var(--color-border-warm)] p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
              <span className="text-[var(--color-accent-gold)]">✦</span>
              Equipped
            </div>
            <div
              className="font-mono text-3xl text-[var(--color-accent-gold)]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 12px rgba(212,176,98,0.4)' }}
            >
              {active.length}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
              {owned.length} / {LEGENDARIES.length} relics found
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div className="mb-4 px-4 py-2 border-2 border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)] text-xs uppercase tracking-widest text-center font-display animate-fade-in">
          {flash}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {LEGENDARIES.map((relic) =>
          owned.includes(relic.id) ? (
            <RelicCard
              key={relic.id}
              relic={relic}
              equipped={active.includes(relic.id)}
              locked={!!classId && !canEquipLegendary(relic.id, classId)}
              onToggle={() => toggle(relic)}
            />
          ) : (
            <UndiscoveredCard key={relic.id} />
          ),
        )}
      </div>

      {setsUnlocked && <SetsPanel active={active} owned={owned} />}
    </div>
  );
}

function SetsPanel({ active, owned }: { active: string[]; owned: string[] }) {
  return (
    <div className="mt-8">
      <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent-gold)]/60">✦</span>
        Set Bonuses · equip multiple pieces
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {SETS.map((set) => {
          const activeCount = setProgress(set, active);
          const ownedCount = set.pieceIds.filter((id) => owned.includes(id)).length;
          return (
            <div key={set.id} className="panel-etched border border-[var(--color-border-dim)] p-3">
              <div className="flex justify-between items-baseline gap-2">
                <h4 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[11px]">
                  {set.name}
                </h4>
                <span className="font-mono text-[10px] text-[var(--color-accent-gold)] shrink-0">
                  {activeCount}/{set.pieceIds.length} equipped
                </span>
              </div>
              <p className="text-[var(--color-text-secondary)] text-[10px] italic mt-1 font-narrative leading-snug">
                {set.flavor}
              </p>
              <div className="mt-2 space-y-0.5">
                {set.bonuses.map((tier) => {
                  const on = activeCount >= tier.piecesRequired;
                  return (
                    <div
                      key={tier.piecesRequired}
                      className="text-[10px] font-mono leading-snug"
                      style={{ color: on ? 'var(--color-accent-gold)' : 'var(--color-text-dim)' }}
                    >
                      {on ? '✦' : '○'} {tier.label}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
                {ownedCount}/{set.pieceIds.length} pieces found
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RelicCardProps {
  relic: Legendary;
  equipped: boolean;
  locked: boolean;
  onToggle: () => void;
}

function RelicCard({ relic, equipped, locked, onToggle }: RelicCardProps) {
  const boundClass = relic.classGate ? getClass(relic.classGate).name : null;
  return (
    <div
      className={`
        relative panel-etched-warm border-2 p-4 transition-all flex flex-col
        ${equipped
          ? 'border-[var(--color-accent-gold)] shadow-[0_0_18px_rgba(244,167,66,0.25)]'
          : locked
            ? 'border-[var(--color-border-dim)] opacity-70'
            : 'border-[var(--color-border-dim)]'}
      `}
    >
      {equipped && (
        <div className="absolute -top-px -right-px bg-[var(--color-accent-gold)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          ✦ Equipped
        </div>
      )}
      {!equipped && locked && boundClass && (
        <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          ⚿ {boundClass}
        </div>
      )}

      <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px] leading-tight mb-1">
        {relic.name}
      </h3>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed font-narrative">
        {relic.flavor}
      </p>
      <div className="text-[var(--color-accent-gold)] text-xs mb-1 font-mono">{relic.effect}</div>
      {boundClass && (
        <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-widest font-display mb-2">
          Bound · {boundClass}
        </div>
      )}

      <div className="mt-auto">
        <Button
          variant={equipped ? 'secondary' : locked ? 'secondary' : 'primary'}
          onClick={onToggle}
          disabled={locked && !equipped}
          className="w-full"
        >
          {equipped ? 'Unequip' : locked ? `Bound to the ${boundClass}` : 'Equip'}
        </Button>
      </div>
    </div>
  );
}

function UndiscoveredCard() {
  return (
    <div className="relative panel-etched border-2 border-[var(--color-border-dim)] opacity-70 p-4 flex flex-col">
      <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
        ⚿ Undiscovered
      </div>
      <h3 className="font-display text-[var(--color-text-dim)] uppercase tracking-wider text-[12px] leading-tight mb-1">
        ??? ??? ???
      </h3>
      <p className="text-[var(--color-text-dim)] text-xs italic leading-relaxed font-narrative">
        A relic not yet earned. Brave the elites of the dark, and it may yet be yours.
      </p>
    </div>
  );
}
