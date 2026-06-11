import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import {
  listUpgradesByCategory,
  listClassUpgrades,
  listUpgrades,
  findUpgrade,
  groveUpgradeCost,
  UPGRADE_CATEGORIES,
  type Upgrade,
  type UpgradeCategory,
} from '../../content/upgrades';
import type { ClassId } from '../../schemas/ids';
import type { UpgradePurchaseError } from '../../stores/metaStore';
import { GroveScene } from './GroveScene';
import { playMusic, stopMusic } from '../../engine/audio';
import { isFeatureUnlocked } from '../../engine/progression/unlocks';
import { useT } from '../../i18n/useT';
import { stripDiacritics } from '../../i18n';

type FlashKind = 'ok' | 'err';
/** Shared functional tabs plus the active class's own tab. */
type GroveTab = UpgradeCategory | 'class';

function classLabel(classId: ClassId): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export function DruidGroveScreen() {
  useEffect(() => {
    playMusic('grove_theme');
    return () => {
      stopMusic();
    };
  }, []);

  const { t, tc } = useT();
  const character = useGameStore((s) => s.character);
  const unlocked = useGameStore((s) => s.unlockedUpgrades);
  const ascensionUnlocked = useGameStore((s) => s.ascensionUnlocked);
  const purchase = useGameStore((s) => s.purchaseUpgrade);
  const goToHub = useGameStore((s) => s.goToHub);
  const delveCount = useGameStore((s) => s.delveCount);
  const chaptersCleared = useGameStore((s) => s.chaptersCleared);
  const renownSpent = useGameStore((s) => s.renownSpent);
  const druidGroveUnlocked = useGameStore((s) => s.druidGroveUnlocked);
  const groveDeepUnlocked = isFeatureUnlocked('grove-deep', { delveCount, chaptersCleared, renownSpent, druidGroveUnlocked });
  const [flash, setFlash] = useState<{ kind: FlashKind; msg: string } | null>(null);
  const [pulsing, setPulsing] = useState<string | null>(null);
  const [tab, setTab] = useState<GroveTab>('survival');

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        {t('hub.grove.noCharacter')} <Button onClick={goToHub}>{t('hub.grove.hub')}</Button>
      </div>
    );
  }

  function purchaseErrorMessage(reason: UpgradePurchaseError | undefined, id: string): string {
    switch (reason) {
      case 'no-character':
        return t('hub.grove.errors.noCharacter');
      case 'unknown-upgrade':
        return t('hub.grove.errors.unknownUpgrade');
      case 'max-rank':
        return t('hub.grove.errors.maxRank');
      case 'insufficient-renown':
        return t('hub.grove.errors.insufficient');
      case 'locked': {
        // Speak the upgrade's own gate ("Reach Ascension 3…"), localized.
        const u = findUpgrade(id);
        return u?.unlock ? tc('upgrades', id, 'unlockLabel', u.unlock.label) : t('hub.grove.locked');
      }
      default:
        return t('hub.grove.cannotPurchase');
    }
  }

  function tryBuy(id: string) {
    const res = purchase(id);
    if (res.ok) {
      setFlash({ kind: 'ok', msg: t('hub.grove.tribute') });
      setPulsing(id);
      setTimeout(() => setPulsing(null), 1400);
    } else {
      setFlash({ kind: 'err', msg: purchaseErrorMessage(res.reason, id) });
    }
    setTimeout(() => setFlash(null), 2400);
  }

  const all = listUpgrades();
  const ownedRanks = all.reduce((sum, u) => sum + (unlocked[u.id] ?? 0), 0);
  const totalRanks = all.reduce((sum, u) => sum + u.maxRank, 0);

  const classUpgrades = listClassUpgrades(character.classId);
  const hasClassTab = classUpgrades.length > 0;
  const shownUpgrades = tab === 'class' ? classUpgrades : listUpgradesByCategory(tab);
  const tabLabel =
    tab === 'class'
      ? tc('classes', character.classId, 'name', classLabel(character.classId))
      : t(`hub.grove.tabs.${tab}`);
  const tabTagline =
    tab === 'class' ? t('hub.grove.classTagline') : t(`hub.grove.taglines.${tab}`);

  return (
    <div className="h-[calc(100vh-3rem)] lg:h-screen p-4 md:p-6 max-w-6xl mx-auto flex flex-col animate-room-enter">
      <header className="flex-none flex flex-wrap gap-2 items-start mb-3 pb-3 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            {stripDiacritics(t('hub.grove.title'))}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            {t('hub.grove.subtitle')}
          </p>
        </div>
        <Button variant="ghost" onClick={goToHub}>
          {t('hub.grove.backPhandalin')}
        </Button>
      </header>

      <div className="relative flex-none mb-3">
        <GroveScene />
        <div className="absolute inset-0 pointer-events-none animate-torch-flicker bg-gradient-to-b from-[rgba(168,208,66,0.04)] via-transparent to-transparent" />
      </div>

      <div className="flex-none grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-4">
        <Panel tone="glow">
          <p className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed font-narrative line-clamp-2">
            {t('hub.grove.intro')}
          </p>
        </Panel>
        <div className="panel-etched-warm border border-[var(--color-border-warm)] p-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
              <span className="text-[var(--color-accent-gold)]">◆</span>
              {t('hub.grove.renown')}
            </div>
            <div
              className="font-mono text-3xl text-[var(--color-accent-gold)]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 12px rgba(212,176,98,0.4)' }}
            >
              {character.renown}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
              {t('hub.grove.ranksBlessed', { owned: ownedRanks, total: totalRanks })}
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div
          className={`
            flex-none mb-4 px-4 py-2 border-2 text-xs uppercase tracking-widest text-center font-display animate-fade-in
            ${flash.kind === 'ok'
              ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
              : 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)]'}
          `}
        >
          {flash.msg}
        </div>
      )}

      <GroveTabs
        current={tab}
        onChange={setTab}
        unlocked={unlocked}
        classId={character.classId}
        hasClassTab={hasClassTab}
        classUpgrades={classUpgrades}
      />

      <div className="flex-none mb-3 text-center">
        <div className="font-display text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.3em]">
          {stripDiacritics(tabLabel)}
        </div>
        <div className="font-narrative italic text-[var(--color-text-secondary)] text-xs mt-1">
          {tabTagline}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto grid md:grid-cols-2 gap-4 content-start">
        {[...shownUpgrades]
          .sort((a, b) => {
            // Cheapest next purchase first (owner ask) — the tab reads as a
            // price ladder. Fully-blessed nodes have nothing left to buy, so
            // they sink to the end as trophies.
            const next = (u: (typeof shownUpgrades)[number]) => {
              const rank = unlocked[u.id] ?? 0;
              return rank >= u.maxRank
                ? Infinity
                : groveUpgradeCost(u, rank + 1, ascensionUnlocked);
            };
            return next(a) - next(b);
          })
          .map((u) => (
          <UpgradeCard
            key={u.id}
            upgrade={u}
            currentRank={unlocked[u.id] ?? 0}
            renown={character.renown}
            ascensionUnlocked={ascensionUnlocked}
            locked={
              (u.unlock != null && !groveDeepUnlocked) ||
              (u.unlock?.ascension ?? 0) > ascensionUnlocked
            }
            pulsing={pulsing === u.id}
            onBuy={() => tryBuy(u.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface GroveTabsProps {
  current: GroveTab;
  onChange: (t: GroveTab) => void;
  unlocked: Record<string, number>;
  classId: ClassId;
  hasClassTab: boolean;
  classUpgrades: Upgrade[];
}

function GroveTabs({ current, onChange, unlocked, classId, hasClassTab, classUpgrades }: GroveTabsProps) {
  const { t, tc } = useT();
  const tally = (ups: Upgrade[]) => ({
    owned: ups.reduce((s, u) => s + (unlocked[u.id] ?? 0), 0),
    max: ups.reduce((s, u) => s + u.maxRank, 0),
  });

  return (
    <div className="flex-none flex flex-wrap gap-1 mb-3 border-b border-[var(--color-border-warm)]">
      {UPGRADE_CATEGORIES.map((cat) => {
        const { owned, max } = tally(listUpgradesByCategory(cat));
        return (
          <TabButton
            key={cat}
            label={t(`hub.grove.tabs.${cat}`)}
            owned={owned}
            max={max}
            active={cat === current}
            onClick={() => onChange(cat)}
          />
        );
      })}
      {hasClassTab && (() => {
        const { owned, max } = tally(classUpgrades);
        return (
          <TabButton
            label={tc('classes', classId, 'name', classLabel(classId))}
            owned={owned}
            max={max}
            active={current === 'class'}
            highlight
            onClick={() => onChange('class')}
          />
        );
      })()}
    </div>
  );
}

interface TabButtonProps {
  label: string;
  owned: number;
  max: number;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}

function TabButton({ label, owned, max, active, highlight, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 min-w-[4.5rem] py-2 px-2 border-2 border-b-0 transition-colors text-center
        font-display text-[10px] uppercase tracking-wide
        ${active
          ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
          : highlight
            ? 'border-[var(--color-accent-gold)]/50 text-[var(--color-accent-gold)] hover:border-[var(--color-accent-gold)]'
            : 'border-[var(--color-border-dim)] text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'}
      `}
    >
      <div className="[overflow-wrap:anywhere] leading-[1.2]">{stripDiacritics(label)}</div>
      <div className="font-mono text-[9px] mt-0.5 opacity-70">
        {owned} / {max}
      </div>
    </button>
  );
}

interface UpgradeCardProps {
  upgrade: Upgrade;
  currentRank: number;
  renown: number;
  ascensionUnlocked: number;
  locked: boolean;
  pulsing: boolean;
  onBuy: () => void;
}

function UpgradeCard({ upgrade, currentRank, renown, ascensionUnlocked, locked, pulsing, onBuy }: UpgradeCardProps) {
  const { t, tc } = useT();
  const maxed = currentRank >= upgrade.maxRank;
  const nextRank = currentRank + 1;
  // Price the soul actually pays: the ascension-scaled cost the purchase path
  // (metaStore) charges. Displaying the bare costForRank desynced the button from
  // the deduction, so an "affordable" buy could fail "Not enough Renown" at Asc≥1.
  const nextCost = maxed ? null : groveUpgradeCost(upgrade, nextRank, ascensionUnlocked);
  const affordable = !locked && nextCost !== null && renown >= nextCost;
  const owned = currentRank > 0;
  const shortfall = nextCost !== null ? nextCost - renown : 0;

  const borderClass = locked
    ? 'border-[var(--color-border-dim)] opacity-80'
    : maxed
      ? 'border-[var(--color-accent-amber)] shadow-[0_0_18px_rgba(244,167,66,0.25)]'
      : owned
        ? 'border-[var(--color-accent-amber)]/60'
        : affordable
          ? 'border-[var(--color-accent-gold)] hover:shadow-[0_0_22px_rgba(244,167,66,0.3)]'
          : 'border-[var(--color-border-dim)]';

  return (
    <div
      className={`
        relative panel-etched-warm border-2 p-4 transition-all flex flex-col
        ${borderClass}
        ${pulsing ? 'animate-pulse-glow' : ''}
      `}
    >
      {locked && (
        <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          {t('hub.grove.sealed')}
        </div>
      )}
      {!locked && maxed && (
        <div className="absolute -top-px -right-px bg-[var(--color-accent-gold)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          {t('hub.grove.maxRank')}
        </div>
      )}

      <div className="flex justify-between items-start mb-1 gap-3">
        <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px] leading-tight">
          {tc('upgrades', upgrade.id, 'name', upgrade.name)}
        </h3>
        <RankPips current={currentRank} max={upgrade.maxRank} />
      </div>

      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed font-narrative">
        {tc('upgrades', upgrade.id, 'flavor', upgrade.flavor)}
      </p>

      <div className="text-[var(--color-text-primary)] text-xs mb-3 font-mono space-y-1">
        {owned && (
          <div>
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mr-2">
              {t('hub.grove.now', { rank: currentRank, max: upgrade.maxRank })}
            </span>
            {upgrade.effectAtRank(currentRank)}
          </div>
        )}
        {!maxed && (
          <div className="text-[var(--color-accent-gold)]">
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mr-2">
              {t('hub.grove.next', { rank: nextRank, max: upgrade.maxRank })}
            </span>
            {upgrade.effectAtRank(nextRank)}
          </div>
        )}
      </div>

      <div className="mt-auto">
        {locked ? (
          <div className="font-display text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] text-center py-2 border border-[var(--color-border-dim)] bg-[var(--color-bg-deep)]/40">
            ⚿ {upgrade.unlock
              ? tc('upgrades', upgrade.id, 'unlockLabel', upgrade.unlock.label)
              : t('hub.grove.locked')}
          </div>
        ) : maxed ? (
          <div className="font-display text-[10px] uppercase tracking-widest text-[var(--color-accent-amber)]/80 text-center py-2 border border-[var(--color-accent-amber)]/40 bg-[var(--color-bg-deep)]/40">
            {t('hub.grove.blessedInFull')}
          </div>
        ) : affordable ? (
          <Button variant="primary" onClick={onBuy} className="w-full">
            {owned
              ? t('hub.grove.rankUp', { cost: nextCost ?? 0 })
              : t('hub.grove.drink', { cost: nextCost ?? 0 })}
          </Button>
        ) : (
          <div className="flex flex-col gap-1">
            <Button variant="secondary" disabled className="w-full">
              {t('hub.grove.withholds', { cost: nextCost ?? 0 })}
            </Button>
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-accent-blood)] text-center font-mono mt-0.5">
              {t('hub.grove.short', { n: shortfall })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RankPips({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-1 shrink-0">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`
              w-2.5 h-2.5 border
              ${filled
                ? 'bg-[var(--color-accent-gold)] border-[var(--color-accent-amber)] shadow-[0_0_6px_rgba(244,167,66,0.6)]'
                : 'bg-transparent border-[var(--color-border-dim)]'}
            `}
          />
        );
      })}
    </div>
  );
}
