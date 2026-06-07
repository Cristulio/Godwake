import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import {
  LEGENDARIES,
  RELIC_SLOTS,
  RELIC_SLOT_META,
  relicsInSlot,
  getLegendary,
  canEquipLegendary,
  type Legendary,
  type RelicSlot,
} from '../../content/legendaries';
import {
  isFeatureUnlocked,
  unlockedRelicSlots,
  relicSlotUnlockRenown,
} from '../../engine/progression/unlocks';
import { SETS, setProgress } from '../../content/sets';
import { getClass } from '../../content/classes';
import type { ClassId } from '../../schemas/ids';
import { useT } from '../../i18n/useT';

interface LegendaryScreenProps {
  onBack: () => void;
}

/**
 * The hub "Relics of the Soul" view: a TYPED nine-slot loadout, separate from the
 * run's affix gear. Each relic seats in exactly one slot (chosen by its primary
 * effect) but grants ALL of its effects when bound; the soul holds at most one
 * relic per slot. Slots open progressively as Renown is laid down at the Grove.
 * Relics are effect-only (no AC, no weapon damage); their effects layer on top of
 * the run's gear. Class-bound relics can be found by any class but only seat while
 * playing that class. The Reliquary below tracks the whole collection.
 */
export function LegendaryScreen({ onBack }: LegendaryScreenProps) {
  const { t } = useT();
  const owned = useGameStore((s) => s.ownedLegendaries);
  const equippedRelics = useGameStore((s) => s.equippedRelics);
  const equipRelic = useGameStore((s) => s.equipRelic);
  const unequipRelicSlot = useGameStore((s) => s.unequipRelicSlot);
  const classId = useGameStore((s) => s.character?.classId) ?? null;
  const delveCount = useGameStore((s) => s.delveCount);
  const chaptersCleared = useGameStore((s) => s.chaptersCleared);
  const renownSpent = useGameStore((s) => s.renownSpent);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const setsUnlocked = isFeatureUnlocked('sets', {
    delveCount,
    chaptersCleared,
    renownSpent,
    druidGroveUnlocked,
  });

  const openSlots = unlockedRelicSlots(renownSpent);
  const equippedIds = Object.values(equippedRelics).filter((id): id is string => !!id);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            {t('hub.relicsScreen.title')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            {t('hub.relicsScreen.subtitle')}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          {t('hub.relicsScreen.backPhandalin')}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
        <Panel tone="glow">
          <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed font-narrative">
            {t('hub.relicsScreen.intro')}
          </p>
        </Panel>
        <div className="panel-etched-warm border border-[var(--color-border-warm)] p-4 flex items-center gap-5">
          <div>
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
              <span className="text-[var(--color-accent-gold)]">✦</span>
              {t('hub.relicsScreen.slotsAwake')}
            </div>
            <div
              className="font-mono text-3xl text-[var(--color-accent-gold)]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 12px rgba(212,176,98,0.4)' }}
            >
              {openSlots}
              <span className="text-base text-[var(--color-text-dim)]">/{RELIC_SLOTS.length}</span>
            </div>
          </div>
          <div className="h-10 w-px bg-[var(--color-border-dim)]" />
          <div>
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1">
              {t('hub.relicsScreen.relicsFound')}
            </div>
            <div className="font-mono text-3xl text-[var(--color-accent-amber)]">
              {owned.length}
              <span className="text-base text-[var(--color-text-dim)]">/{LEGENDARIES.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RELIC_SLOTS.map((slot, i) => (
          <SlotRow
            key={slot}
            slot={slot}
            index={i}
            locked={i >= openSlots}
            equippedId={equippedRelics[slot]}
            owned={owned}
            classId={classId}
            onEquip={equipRelic}
            onUnequip={unequipRelicSlot}
          />
        ))}
      </div>

      {setsUnlocked && <SetsPanel equipped={equippedIds} owned={owned} />}

      <Reliquary owned={owned} />
    </div>
  );
}

interface SlotRowProps {
  slot: RelicSlot;
  index: number;
  locked: boolean;
  equippedId: string | undefined;
  owned: string[];
  classId: ClassId | null;
  onEquip: (relicId: string) => void;
  onUnequip: (slot: RelicSlot) => void;
}

function SlotRow({ slot, index, locked, equippedId, owned, classId, onEquip, onUnequip }: SlotRowProps) {
  const { t } = useT();
  const meta = RELIC_SLOT_META[slot];

  if (locked) {
    const at = relicSlotUnlockRenown(index);
    return (
      <div className="panel-etched border border-[var(--color-border-dim)] opacity-60 p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-[var(--color-text-dim)] uppercase tracking-wider text-[12px]">
            {meta.name}
          </h3>
          <span className="font-display text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
            {t('hub.relicsScreen.sealed')}
          </span>
        </div>
        <p className="text-[var(--color-text-dim)] text-[11px] italic mt-1 font-narrative leading-snug">
          {meta.blurb}
        </p>
        <div className="mt-auto pt-3 text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest font-display">
          {t('hub.relicsScreen.wakesWhen', { n: at })}
        </div>
      </div>
    );
  }

  const equipped = equippedId ? getLegendary(equippedId) : undefined;
  // Discovered, class-eligible relics that may seat in this slot.
  const choices = relicsInSlot(slot).filter(
    (r) => owned.includes(r.id) && (!classId || canEquipLegendary(r.id, classId)),
  );

  return (
    <div
      className={`panel-etched-warm border-2 p-4 flex flex-col transition-all ${
        equipped
          ? 'border-[var(--color-accent-gold)] shadow-[0_0_16px_rgba(244,167,66,0.2)]'
          : 'border-[var(--color-border-dim)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px]">
          {meta.name}
        </h3>
        <span
          className={`font-display text-[9px] uppercase tracking-widest ${
            equipped ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-dim)]'
          }`}
        >
          {equipped ? t('hub.relicsScreen.bound') : t('hub.relicsScreen.bare')}
        </span>
      </div>
      <p className="text-[var(--color-text-secondary)] text-[11px] italic mt-1 font-narrative leading-snug">
        {meta.blurb}
      </p>

      {equipped && (
        <div className="mt-2 text-[var(--color-accent-gold)] text-[11px] font-mono leading-snug">
          {equipped.effect}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {choices.length === 0 ? (
          <span className="text-[var(--color-text-dim)] text-[10px] italic font-narrative">
            {t('hub.relicsScreen.noGift')}
          </span>
        ) : (
          <>
            {choices.map((r) => {
              const on = equippedId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  title={r.effect}
                  onClick={() => (on ? onUnequip(slot) : onEquip(r.id))}
                  className={`px-2 py-1 text-[10px] font-display uppercase tracking-wider border transition-colors ${
                    on
                      ? 'border-[var(--color-accent-gold)] text-[var(--color-bg-base)] bg-[var(--color-accent-gold)]'
                      : 'border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)] hover:text-[var(--color-accent-amber)]'
                  }`}
                >
                  {r.name}
                  {r.classGate ? ' ⚔' : ''}
                </button>
              );
            })}
            {equipped && (
              <button
                type="button"
                onClick={() => onUnequip(slot)}
                className="px-2 py-1 text-[10px] font-display uppercase tracking-wider border border-[var(--color-border-dim)] text-[var(--color-text-dim)] hover:border-[var(--color-accent-blood)] hover:text-[var(--color-accent-blood)] transition-colors"
              >
                {t('hub.relicsScreen.unbind')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SetsPanel({ equipped, owned }: { equipped: string[]; owned: string[] }) {
  const { t } = useT();
  return (
    <div className="mt-8">
      <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent-gold)]/60">✦</span>
        {t('hub.relicsScreen.setBonuses')}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {SETS.map((set) => {
          const activeCount = setProgress(set, equipped);
          const ownedCount = set.pieceIds.filter((id) => owned.includes(id)).length;
          return (
            <div key={set.id} className="panel-etched border border-[var(--color-border-dim)] p-3">
              <div className="flex justify-between items-baseline gap-2">
                <h4 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[11px]">
                  {set.name}
                </h4>
                <span className="font-mono text-[10px] text-[var(--color-accent-gold)] shrink-0">
                  {t('hub.relicsScreen.boundCount', { n: activeCount, total: set.pieceIds.length })}
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
                {t('hub.relicsScreen.piecesFound', { n: ownedCount, total: set.pieceIds.length })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Reliquary({ owned }: { owned: string[] }) {
  const { t } = useT();
  return (
    <div className="mt-8">
      <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent-gold)]/60">✦</span>
        {t('hub.relicsScreen.reliquary', { n: owned.length, total: LEGENDARIES.length })}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEGENDARIES.map((relic) =>
          owned.includes(relic.id) ? (
            <CatalogCard key={relic.id} relic={relic} />
          ) : (
            <UndiscoveredCard key={relic.id} />
          ),
        )}
      </div>
    </div>
  );
}

function CatalogCard({ relic }: { relic: Legendary }) {
  const { t } = useT();
  const boundClass = relic.classGate ? getClass(relic.classGate).name : null;
  return (
    <div className="panel-etched border border-[var(--color-border-dim)] p-3 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[11px] leading-tight">
          {relic.name}
        </h3>
        <span className="font-display text-[8px] uppercase tracking-widest text-[var(--color-text-dim)] shrink-0">
          {RELIC_SLOT_META[relic.slot].name}
        </span>
      </div>
      <p className="text-[var(--color-text-secondary)] text-[10px] italic my-1.5 leading-snug font-narrative">
        {relic.flavor}
      </p>
      <div className="text-[var(--color-accent-gold)] text-[10px] font-mono leading-snug">{relic.effect}</div>
      {boundClass && (
        <div className="mt-1.5 text-[var(--color-text-dim)] text-[8px] uppercase tracking-widest font-display">
          {t('hub.relicsScreen.boundClass', { name: boundClass })}
        </div>
      )}
    </div>
  );
}

function UndiscoveredCard() {
  const { t } = useT();
  return (
    <div className="panel-etched border border-[var(--color-border-dim)] opacity-60 p-3 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[var(--color-text-dim)] uppercase tracking-wider text-[11px]">
          {t('hub.relicsScreen.undiscoveredName')}
        </h3>
        <span className="font-display text-[8px] uppercase tracking-widest text-[var(--color-text-dim)] shrink-0">
          ⚿
        </span>
      </div>
      <p className="text-[var(--color-text-dim)] text-[10px] italic mt-1.5 leading-snug font-narrative">
        {t('hub.relicsScreen.undiscoveredBody')}
      </p>
    </div>
  );
}
