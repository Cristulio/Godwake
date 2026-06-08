import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RoomSpec } from '../../types/delve';
import type { Item } from '../../schemas/item';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { BlessingCard } from '../ui/BlessingCard';
import { CampScene } from './CampScene';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { getBlessing } from '../../content/blessings';
import { getItem } from '../../content/items';
import { localizedItemName } from '../inventory/itemDisplay';
import { playSfx } from '../../engine/audio';
import {
  boonsForCampTier,
  type CampBoon,
  type CampBoonTier,
} from '../../content/campBoons';
import { consumableStockForTier, rollGearStock, rollLegendaryOffer, type GearStock, type LegendaryOffer } from './shopStock';
import { GearWareRow, ConsumableWareRow, LegendaryWareRow } from './MerchantWares';
import { useT } from '../../i18n/useT';

/** Whether the caravan shop is open. Blessings are granted at shrines, not
 * here — the camp only sells wares. */
type MerchantStep = 'closed' | 'shop';

/** Which branch of the campfire fork the player has expanded but not yet
 * committed. Rest commits on a single click; Attune and Risk reveal a
 * sub-panel first. */
type ForkBranch = 'attune' | 'risk';

interface CampRoomProps {
  room: RoomSpec;
  onPressSouth: () => void;
}

export function CampRoom({ room, onPressSouth }: CampRoomProps) {
  const { t, tc } = useT();
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const campChoice = useGameStore((s) => s.delve?.campChoice ?? null);
  const pickCampChoice = useGameStore((s) => s.pickCampChoice);
  const pickCampBoon = useGameStore((s) => s.pickCampBoon);
  const resolveCampRisk = useGameStore((s) => s.resolveCampRisk);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const purchaseRolledGear = useGameStore((s) => s.purchaseRolledGear);
  const purchaseLegendary = useGameStore((s) => s.purchaseLegendary);
  const ownedLegendaries = useGameStore((s) => s.ownedLegendaries);
  const showTaunt = useGameStore((s) => s.showTaunt);
  const goToInventory = useGameStore((s) => s.goToInventory);
  // Sold-state persists in delveStore (keyed by this room's id) so bought wares
  // stay gone when the player closes the caravan, opens the pack, and returns.
  const recordShopPurchase = useGameStore((s) => s.recordShopPurchase);
  const purchasedKeys = useGameStore((s) => s.purchasedShopKeys[room.id]);
  const isBought = (key: string) => purchasedKeys?.includes(key) ?? false;

  // Which camp is this in the delve sequence? Count camp rooms from the start
  // up to (and including) the current room — the count is the tier index.
  const campTier = useMemo<CampBoonTier | null>(() => {
    if (!delve) return null;
    let count = 0;
    for (let i = 0; i <= delve.currentRoomIdx && i < delve.rooms.length; i++) {
      if (delve.rooms[i].kind === 'camp') count += 1;
    }
    if (count === 1 || count === 2 || count === 3) return count;
    return null;
  }, [delve]);

  const boonResolution = (delve?.campBoons ?? []).find(
    (e) => e.tier === campTier,
  );
  const boonOptions = useMemo<CampBoon[]>(() => {
    if (!character || campTier === null) return [];
    return boonsForCampTier(campTier, character.classId);
  }, [character, campTier]);

  const consumables = useMemo(
    () => consumableStockForTier(campTier).map(getItem).filter((it) => it.kind === 'consumable'),
    [campTier],
  );
  const classId = character?.classId;
  const gear = useMemo<GearStock[]>(
    () =>
      classId
        ? rollGearStock(room.id, room.chapter ?? 1, classId, room.layer ?? 0)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.id, room.chapter, room.layer, classId],
  );

  // Rolled deterministically per-visit (owned-blind), then hidden at render if
  // the relic is already owned or just bought — same pattern as ShopRoom.
  const legendaryOffer = useMemo<LegendaryOffer | null>(
    () =>
      classId
        ? rollLegendaryOffer(
            room.id,
            room.chapter ?? 1,
            classId,
            [],
            delve?.ascensionLevel ?? 0,
            ownedLegendaries.length,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.id, room.chapter, classId, delve?.ascensionLevel, ownedLegendaries.length],
  );

  const [expanded, setExpanded] = useState<ForkBranch | null>(null);
  // The throw-result gate lives on the delve (not component state) so it can't be
  // reset by leaving the camp screen for the backpack and coming back.
  const riskResult = delve?.campRisk ?? null;
  const [merchantStep, setMerchantStep] = useState<MerchantStep>('closed');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  // Imoen whispers when the road opens up — once per soul (never replays on re-entry or in future runs).
  useEffect(() => {
    if (useMetaStore.getState().seenDialogueBeats.includes('imoen-camp-whisper')) return;
    const t = setTimeout(() => {
      showTaunt('imoen', 'rest');
      useMetaStore.getState().markDialogueBeatSeen('imoen-camp-whisper');
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!character) return null;

  // The campfire is a single weighted fork: heal, attune a lasting boon, or
  // gamble — pick ONE, the other two close. (The merchant below is a separate
  // gold-sink, not part of the fork.)
  const restTaken = campChoice === 'rest';
  const takenBoon = boonResolution && boonResolution.boonId
    ? boonOptions.find((b) => b.id === boonResolution.boonId) ?? null
    : null;
  const boonTaken = takenBoon !== null;
  const riskTaken = riskResult !== null;
  const committed = restTaken || boonTaken || riskTaken;

  const riskTier = campTier ?? 1;
  const riskDamage = Math.max(1, Math.floor(character.hp.max * 0.25));

  function handleRest() {
    if (!character || committed) return;
    pickCampChoice('rest');
    setExpanded(null);
    playSfx('heal_chime');
  }

  function toggleBranch(branch: ForkBranch) {
    if (committed) return;
    setExpanded((cur) => (cur === branch ? null : branch));
    playSfx('ui_click');
  }

  function handlePickBoon(boonId: string) {
    if (committed || campTier === null) return;
    pickCampBoon(campTier, boonId);
    setExpanded(null);
    playSfx('shrine_chime');
  }

  function resolveRisk() {
    if (!character || committed) return;
    playSfx('dice_clack');
    const result = resolveCampRisk(riskTier);
    if (result) playSfx(result.outcome === 'win' ? 'shrine_chime' : 'hit_thud');
    setExpanded(null);
  }

  function openShop() {
    setMerchantStep('shop');
    setPurchaseMessage(null);
    playSfx('ui_click');
  }

  function buyConsumable(itemId: string) {
    const r = purchaseFromMerchant(itemId);
    if (r.ok) {
      recordShopPurchase(room.id, itemId);
      setPurchaseMessage(t('delve.camp.msg.added', { name: tc('items', itemId, 'name', getItem(itemId).name) }));
      playSfx('ui_click');
    } else {
      setPurchaseMessage(r.reason ?? t('delve.camp.msg.cannotPurchase'));
    }
  }

  function buyGear(stock: GearStock, key: string) {
    const r = purchaseRolledGear(stock.ref, stock.cost);
    if (r.ok) {
      recordShopPurchase(room.id, key);
      setPurchaseMessage(
        t('delve.camp.msg.added', { name: localizedItemName(stock.ref) || t('delve.camp.msg.itemFallback') }),
      );
      playSfx('ui_click');
    } else {
      setPurchaseMessage(r.reason ?? t('delve.camp.msg.cannotPurchase'));
    }
  }

  function buyLegendary() {
    if (!legendaryOffer) return;
    const r = purchaseLegendary(legendaryOffer.legendaryId, legendaryOffer.cost);
    if (r.ok) {
      recordShopPurchase(room.id, 'legendary');
      setPurchaseMessage(t('delve.camp.msg.legendaryBound', { name: tc('legendaries', legendaryOffer.legendaryId, 'name', legendaryOffer.name) }));
      playSfx('ui_click');
    } else {
      setPurchaseMessage(r.reason ?? t('delve.camp.msg.cannotPurchase'));
    }
  }

  // Show the reliquary offer only for an un-owned, not-yet-bought relic — same
  // gate as ShopRoom.
  const showLegendary =
    legendaryOffer != null &&
    !isBought('legendary') &&
    !ownedLegendaries.includes(legendaryOffer.legendaryId);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(244,167,66,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            {room.title.toUpperCase()}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {t('delve.camp.label')}
          </p>
        </div>
        <div
          className="shrink-0 panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
          title={t('delve.camp.goldTitle')}
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
            {t('delve.common.gold')}
          </div>
          <div
            className="font-mono text-lg text-[var(--color-accent-gold)] leading-none"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7)' }}
          >
            {character.goldInPocket}
          </div>
        </div>
      </header>

      <Panel className="bg-gradient-to-br from-[#2a1d12] to-[#1a1108]">
        <div className="flex flex-col items-center gap-4 py-4">
          <CampScene chapter={room.chapter} />
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-xl leading-relaxed">
            {room.flavorText}
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            {t('delve.common.hpStat', { current: character.hp.current, max: character.hp.max })}
          </div>
        </div>
      </Panel>

      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        {t('delve.camp.forkIntro')}
      </div>

      <div className="grid md:grid-cols-3 gap-3 items-start">
        <ForkCard
          title={t('delve.camp.rest.title')}
          flavor={t('delve.camp.rest.flavor')}
          state={
            restTaken ? 'taken' : committed ? 'closed' : 'open'
          }
          buttonLabel={t('delve.camp.rest.button')}
          onPick={handleRest}
          takenSummary={t('delve.camp.rest.taken')}
        />
        <ForkCard
          title={t('delve.camp.attune.title')}
          flavor={t('delve.camp.attune.flavor')}
          state={
            boonTaken
              ? 'taken'
              : committed
                ? 'closed'
                : expanded === 'attune'
                  ? 'active'
                  : 'open'
          }
          buttonLabel={boonOptions.length === 0 ? t('delve.camp.attune.noRite') : t('delve.camp.attune.button')}
          disabled={boonOptions.length === 0}
          onPick={() => toggleBranch('attune')}
          takenSummary={
            takenBoon
              ? t('delve.camp.attune.taken', {
                  name: tc('campBoons', takenBoon.id, 'name', takenBoon.name),
                  description: tc('campBoons', takenBoon.id, 'description', takenBoon.description),
                })
              : undefined
          }
        />
        <ForkCard
          title={t('delve.camp.risk.title')}
          flavor={t('delve.camp.risk.flavor')}
          state={
            riskTaken ? 'taken' : committed ? 'closed' : expanded === 'risk' ? 'active' : 'open'
          }
          buttonLabel={t('delve.camp.risk.button')}
          onPick={() => toggleBranch('risk')}
          takenTone={riskResult?.outcome === 'loss' ? 'bad' : 'good'}
          takenSummary={
            riskResult
              ? riskResult.outcome === 'win'
                ? t('delve.camp.risk.win', {
                    roll: riskResult.roll,
                    blessing: riskResult.blessingId
                      ? t('delve.camp.risk.winBlessing', {
                          name: tc(
                            'blessings',
                            riskResult.blessingId,
                            'name',
                            getBlessing(riskResult.blessingId).name,
                          ),
                        })
                      : '',
                    gold: riskResult.gold,
                  })
                : t('delve.camp.risk.loss', { roll: riskResult.roll, damage: riskResult.damage })
              : undefined
          }
        />
      </div>

      {!committed && expanded === 'attune' && boonOptions.length > 0 && (
        <Panel className="bg-gradient-to-br from-[#1e1a2a] to-[#100d18] border-[var(--color-accent-amber)] animate-fade-in">
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
            {t('delve.camp.attune.panelTitle', { tier: campTier ?? 1 })}
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            {t('delve.camp.attune.panelBody')}
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {boonOptions.map((b) => (
              <button
                type="button"
                key={b.id}
                onClick={() => handlePickBoon(b.id)}
                className="text-left border border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] hover:bg-[#2a1d12] transition-colors p-3 flex flex-col gap-1"
              >
                <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest">
                  {tc('campBoons', b.id, 'name', b.name)}
                </div>
                <div className="text-[var(--color-text-primary)] text-xs leading-relaxed">
                  {tc('campBoons', b.id, 'description', b.description)}
                </div>
                <div className="text-[var(--color-text-dim)] text-[11px] italic leading-relaxed mt-1">
                  {tc('campBoons', b.id, 'flavor', b.flavor)}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {!committed && expanded === 'risk' && (
        <Panel className="rest-fork-ember bg-gradient-to-br from-[#2a1212] to-[#160a0a] animate-fade-in">
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest mb-2">
            {t('delve.camp.risk.panelTitle')}
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            {t('delve.camp.risk.panelBody')}
          </p>
          <ul className="text-[var(--color-text-primary)] text-xs leading-relaxed mb-4 flex flex-col gap-1">
            <li>
              <span className="text-[var(--color-accent-gold)]">{t('delve.camp.risk.highRoll')}</span>
              {t('delve.camp.risk.highBody', { gold: 15 * riskTier, altGold: 50 * riskTier })}
            </li>
            <li>
              <span className="text-[var(--color-status-poison)]">{t('delve.camp.risk.lowRoll')}</span>
              {t('delve.camp.risk.lowBody', { damage: riskDamage })}
            </li>
          </ul>
          <Button variant="primary" onClick={resolveRisk}>
            {t('delve.camp.risk.throwButton')}
          </Button>
        </Panel>
      )}

      {riskTaken && riskResult?.blessingId && (
        <div className="max-w-md mx-auto animate-fade-in">
          <BlessingCard blessingId={riskResult.blessingId} />
        </div>
      )}

      <Panel>
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
          {t('delve.camp.caravan.title')}
        </div>
        <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
          {t('delve.camp.caravan.quote')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openShop}>
            {t('delve.camp.caravan.open')}
          </Button>
          <Button variant="ghost" onClick={goToInventory}>
            {t('delve.camp.caravan.openPack')}
          </Button>
        </div>
      </Panel>

      <div className="flex justify-center mt-2">
        <Button variant="primary" onClick={onPressSouth}>
          {t('delve.camp.pressSouth')}
        </Button>
      </div>

      {merchantStep === 'shop' && (
        <ShopModal
          gear={gear}
          consumables={consumables}
          legendaryOffer={showLegendary ? legendaryOffer : null}
          purchasedKeys={purchasedKeys ?? NO_SHOP_KEYS}
          goldInPocket={character.goldInPocket}
          purchaseMessage={purchaseMessage}
          onBuyGear={buyGear}
          onBuyConsumable={buyConsumable}
          onBuyLegendary={buyLegendary}
          onClose={() => {
            setMerchantStep('closed');
            setPurchaseMessage(null);
          }}
        />
      )}
    </div>
  );
}

/** Stable empty sold-set so a fresh shop doesn't churn a new array each render. */
const NO_SHOP_KEYS: string[] = [];

interface ShopModalProps {
  gear: GearStock[];
  consumables: Item[];
  legendaryOffer: LegendaryOffer | null;
  /** Bought stock keys for this room (gear slot ids, consumable ids, `legendary`). */
  purchasedKeys: string[];
  goldInPocket: number;
  purchaseMessage: string | null;
  onBuyGear: (stock: GearStock, key: string) => void;
  onBuyConsumable: (itemId: string) => void;
  onBuyLegendary: () => void;
  onClose: () => void;
}

function ShopModal({
  gear,
  consumables,
  legendaryOffer,
  purchasedKeys,
  goldInPocket,
  purchaseMessage,
  onBuyGear,
  onBuyConsumable,
  onBuyLegendary,
  onClose,
}: ShopModalProps) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[var(--color-bg-base)] border-2 border-[var(--color-accent-amber)] p-4 md:p-5">
        <header className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 md:-mx-5 md:-mt-5 md:px-5 md:pt-5 pb-3 mb-4 bg-[var(--color-bg-base)] flex flex-wrap justify-between items-center gap-3 border-b border-[var(--color-border-warm)]">
          <div>
            <h2 className="font-display text-lg text-[var(--color-accent-amber)] uppercase tracking-[0.15em]">
              {t('delve.camp.shop.title')}
            </h2>
            <p className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic mt-1">
              {t('delve.camp.shop.sub')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-2 text-right"
              title={t('delve.common.goldInPocketTitle')}
            >
              <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
                {t('delve.common.gold')}
              </div>
              <div
                className="font-mono text-xl text-[var(--color-accent-gold)] leading-none"
                style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7)' }}
              >
                {goldInPocket}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--color-text-dim)] hover:text-[var(--color-accent-amber)] text-xs uppercase tracking-widest"
            >
              {t('delve.camp.shop.close')}
            </button>
          </div>
        </header>

        {gear.length > 0 && (
          <div className="mb-5">
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
              {t('delve.camp.shop.arms')}
            </div>
            <div className="grid gap-3">
              {gear.map((stock, i) => {
                const key = `gear-${i}`;
                return (
                  <GearWareRow
                    key={key}
                    stock={stock}
                    bought={purchasedKeys.includes(key)}
                    gold={goldInPocket}
                    onBuy={() => onBuyGear(stock, key)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {legendaryOffer && (
          <div className="mb-5">
            <div className="text-[var(--color-accent-gold)] text-[10px] uppercase tracking-[0.3em] mb-2">
              {t('delve.camp.shop.reliquary')}
            </div>
            <div className="grid gap-3">
              <LegendaryWareRow
                offer={legendaryOffer}
                bought={purchasedKeys.includes('legendary')}
                gold={goldInPocket}
                onBuy={onBuyLegendary}
              />
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div className="mb-5">
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
              {t('delve.camp.shop.draughts')}
            </div>
            <div className="grid gap-3">
              {consumables.map((item) => (
                <ConsumableWareRow
                  key={item.id}
                  item={item}
                  bought={purchasedKeys.includes(item.id)}
                  gold={goldInPocket}
                  onBuy={() => onBuyConsumable(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {purchaseMessage && (
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest text-center mb-4">
            {purchaseMessage}
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 -mb-4 px-4 md:-mx-5 md:-mb-5 md:px-5 mt-5 py-3 bg-[var(--color-bg-base)] border-t border-[var(--color-border-warm)] flex justify-end">
          <Button variant="primary" onClick={onClose}>
            {t('delve.camp.shop.done')}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ForkCardState = 'open' | 'active' | 'taken' | 'closed';

interface ForkCardProps {
  title: string;
  flavor: string;
  state: ForkCardState;
  buttonLabel: string;
  onPick: () => void;
  takenSummary?: ReactNode;
  /** Colors the taken-summary: a cost paid (bad) reads blood-red, a boon (good) green. */
  takenTone?: 'good' | 'bad';
  disabled?: boolean;
}

function ForkCard({
  title,
  flavor,
  state,
  buttonLabel,
  onPick,
  takenSummary,
  takenTone = 'good',
  disabled = false,
}: ForkCardProps) {
  const { t } = useT();
  const panelClass = [
    state === 'closed' ? 'opacity-40' : '',
    state === 'active'
      ? 'border-[var(--color-accent-amber)] bg-[#2a1d12]'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Panel className={panelClass || undefined}>
      <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
        ◆ {title}
      </div>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
        {flavor}
      </p>
      {state === 'taken' ? (
        <div
          className={`text-xs uppercase tracking-widest leading-relaxed ${
            takenTone === 'bad'
              ? 'text-[var(--color-accent-blood)]'
              : 'text-[var(--color-status-poison)]'
          }`}
        >
          {takenSummary}
        </div>
      ) : state === 'closed' ? (
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
          {t('delve.camp.fork.passed')}
        </div>
      ) : (
        <Button
          variant={state === 'active' ? 'secondary' : 'primary'}
          disabled={disabled}
          onClick={onPick}
        >
          {state === 'active' ? t('delve.camp.fork.nevermind') : buttonLabel}
        </Button>
      )}
    </Panel>
  );
}
