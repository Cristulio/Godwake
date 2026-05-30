import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RoomSpec } from '../../types/delve';
import type { Item } from '../../schemas/item';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { BlessingCard } from '../ui/BlessingCard';
import { CampScene } from './CampScene';
import { useGameStore } from '../../stores/gameStore';
import { getBlessing } from '../../content/blessings';
import { getItem } from '../../content/items';
import { playSfx } from '../../engine/audio';
import { getActiveRoller } from '../../engine/dice';
import { rollBlessingOptions } from '../../engine/character/blessings';
import {
  boonsForCampTier,
  type CampBoon,
  type CampBoonTier,
} from '../../content/campBoons';

/** Whether the caravan shop is open. Blessings are granted at shrines, not
 * here — the camp only sells wares. */
type MerchantStep = 'closed' | 'shop';

/** Which branch of the campfire fork the player has expanded but not yet
 * committed. Rest commits on a single click; Attune and Risk reveal a
 * sub-panel first. */
type ForkBranch = 'attune' | 'risk';

interface RiskResult {
  roll: number;
  outcome: 'win' | 'loss';
  blessingId: string | null;
  gold: number;
  damage: number;
}

interface CampRoomProps {
  room: RoomSpec;
  onPressSouth: () => void;
}

/**
 * Caravan stock, scaled by camp depth. STS rule: gold should always have a
 * worthwhile sink, and later shops carry stronger, pricier wares. The roadside
 * stocks cheap arms and the basic draughts; the Athkatla docks add a greater
 * draught, a hand-crossbow, armour and the adamantine blade; the Upperdark
 * smuggler — last coin-stop before the Matron — fences the dearest gear.
 * Stock is cumulative: a deeper merchant carries everything the shallower ones
 * did, plus more. Every id resolves through `getItem`, so nothing here is
 * orphaned and all of it buys through the existing `purchaseFromMerchant` path.
 */
const STOCK_BASE = [
  'potion-of-healing',
  'antitoxin',
  'scroll-of-healing-word',
  'mace',
  'quarterstaff',
  'battleaxe',
  'flail',
];
const STOCK_TIER_2 = [
  'potion-of-greater-healing',
  'hand-crossbow',
  'shield',
  'studded-leather',
  'chain-mail',
  'adamantine-shortsword',
];
const STOCK_TIER_3 = [
  'potion-of-heroism', // "Potion of Vitality" — 3d6+6, the dearest draught
  'half-plate',
  'cloak-of-faerun',
];

export function merchantStockForTier(tier: CampBoonTier | null): string[] {
  const t = tier ?? 1;
  const ids = [...STOCK_BASE];
  if (t >= 2) ids.push(...STOCK_TIER_2);
  if (t >= 3) ids.push(...STOCK_TIER_3);
  return ids;
}

/** Grouped, ordered sections for the shop list. */
const STOCK_GROUPS: Array<{ kind: Item['kind']; label: string }> = [
  { kind: 'consumable', label: 'Draughts & Charms' },
  { kind: 'weapon', label: 'Arms' },
  { kind: 'armor', label: 'Armour' },
];

/** Most wares carry their own flavour; armour pieces don't, so synthesise a
 * short stat line rather than show a blank row. */
function itemBlurb(item: Item): string {
  if (item.description) return item.description;
  if (item.kind === 'weapon') {
    const versatile = item.versatileDamage
      ? `, ${item.versatileDamage} two-handed`
      : '';
    return `${item.damage} ${item.damageType}${versatile}.`;
  }
  if (item.kind === 'armor') {
    if (item.category === 'shield') return `A banded shield. +${item.baseAC} AC.`;
    const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    return `${cat} armour. Base AC ${item.baseAC}.`;
  }
  return '';
}

export function CampRoom({ room, onPressSouth }: CampRoomProps) {
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const campChoice = useGameStore((s) => s.delve?.campChoice ?? null);
  const pickCampChoice = useGameStore((s) => s.pickCampChoice);
  const pickCampBoon = useGameStore((s) => s.pickCampBoon);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const addDelveReward = useGameStore((s) => s.addDelveReward);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const showTaunt = useGameStore((s) => s.showTaunt);
  const goToInventory = useGameStore((s) => s.goToInventory);

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

  const stockIds = useMemo(() => merchantStockForTier(campTier), [campTier]);

  const [expanded, setExpanded] = useState<ForkBranch | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [merchantStep, setMerchantStep] = useState<MerchantStep>('closed');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  // Imoen whispers when the road opens up.
  useEffect(() => {
    const t = setTimeout(() => showTaunt('imoen', 'rest'), 500);
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
    const roller = getActiveRoller();
    const roll = roller.d20();
    playSfx('dice_clack');

    if (roll.total >= 11) {
      // The dark answers: a blessing's whisper, and coin pressed into the palm.
      const [blessingId] = rollBlessingOptions(
        roller,
        1,
        character.classId,
        character.blessings,
      );
      const gold = blessingId ? 15 * riskTier : 50 * riskTier;
      if (blessingId) {
        setCharacter({
          ...character,
          blessings: [...character.blessings, blessingId],
        });
      }
      addDelveReward(gold, 0);
      setRiskResult({
        roll: roll.total,
        outcome: 'win',
        blessingId: blessingId ?? null,
        gold,
        damage: 0,
      });
      playSfx('shrine_chime');
    } else {
      // The dark takes its due. A campfire gamble bleeds you, but never kills.
      const nextCurrent = Math.max(1, character.hp.current - riskDamage);
      setCharacter({
        ...character,
        hp: { ...character.hp, current: nextCurrent },
      });
      setRiskResult({
        roll: roll.total,
        outcome: 'loss',
        blessingId: null,
        gold: 0,
        damage: riskDamage,
      });
      playSfx('hit_thud');
    }
    setExpanded(null);
  }

  function openShop() {
    setMerchantStep('shop');
    setPurchaseMessage(null);
    playSfx('ui_click');
  }

  function buyItem(itemId: string) {
    const r = purchaseFromMerchant(itemId);
    if (r.ok) {
      const item = getItem(itemId);
      setPurchaseMessage(`${item.name} added to your pack.`);
      playSfx('ui_click');
    } else {
      setPurchaseMessage(r.reason ?? 'Cannot purchase.');
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(244,167,66,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
            {room.title.toUpperCase()}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Camp · A pause on the long road · The deeper dark ahead
          </p>
        </div>
        <div
          className="shrink-0 panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
          title="Gold in pocket — what you can spend at the caravan"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
            ◈ Gold
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
          <CampScene tier={campTier} />
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-xl leading-relaxed">
            {room.flavorText}
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            HP {character.hp.current}/{character.hp.max}
          </div>
        </div>
      </Panel>

      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        ◆ The campfire — take one, the other two close ◆
      </div>

      <div className="grid md:grid-cols-3 gap-3 items-start">
        <ForkCard
          title="Make Camp at the Fire"
          flavor="A full night by the coals. Wounds close, dice come home to the hand, and what was spent is yours again before dawn."
          state={
            restTaken ? 'taken' : committed ? 'closed' : 'open'
          }
          buttonLabel="Make camp"
          onPick={handleRest}
          takenSummary="Full rest — HP restored, all resources readied."
        />
        <ForkCard
          title="Attune by the Coals"
          flavor="A long study of what you carry. Bind one lasting boon into yourself — it holds for the rest of this delve."
          state={
            boonTaken
              ? 'taken'
              : committed
                ? 'closed'
                : expanded === 'attune'
                  ? 'active'
                  : 'open'
          }
          buttonLabel={boonOptions.length === 0 ? 'No rite to attune' : 'Choose the rite ↓'}
          disabled={boonOptions.length === 0}
          onPick={() => toggleBranch('attune')}
          takenSummary={
            takenBoon
              ? `${takenBoon.name} — attuned. ${takenBoon.description}`
              : undefined
          }
        />
        <ForkCard
          title="Tempt the Dark"
          flavor="Throw the bones into the fire and speak a name. Something out past the light is always listening — and it does not give for free."
          state={
            riskTaken ? 'taken' : committed ? 'closed' : expanded === 'risk' ? 'active' : 'open'
          }
          buttonLabel="Throw the bones ↓"
          onPick={() => toggleBranch('risk')}
          takenSummary={
            riskResult
              ? riskResult.outcome === 'win'
                ? `The dark answered (rolled ${riskResult.roll}). ${
                    riskResult.blessingId
                      ? `${getBlessing(riskResult.blessingId).name} granted, and `
                      : ''
                  }+${riskResult.gold} gold.`
                : `The dark took its due (rolled ${riskResult.roll}). −${riskResult.damage} HP.`
              : undefined
          }
        />
      </div>

      {!committed && expanded === 'attune' && boonOptions.length > 0 && (
        <Panel className="bg-gradient-to-br from-[#1e1a2a] to-[#100d18] border-[var(--color-accent-amber)] animate-fade-in">
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
            ◆ Attune one boon · Camp {campTier}
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            The road has marked you. Bind one boon to carry south — this is the
            night's whole gift, so choose with the dark in mind.
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
                  {b.name}
                </div>
                <div className="text-[var(--color-text-primary)] text-xs leading-relaxed">
                  {b.description}
                </div>
                <div className="text-[var(--color-text-dim)] text-[11px] italic leading-relaxed mt-1">
                  {b.flavor}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {!committed && expanded === 'risk' && (
        <Panel className="rest-fork-ember bg-gradient-to-br from-[#2a1212] to-[#160a0a] animate-fade-in">
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest mb-2">
            ◆ Tempt the Dark
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            One throw of the bones. No fight, no flight — only the roll and what
            it brings.
          </p>
          <ul className="text-[var(--color-text-primary)] text-xs leading-relaxed mb-4 flex flex-col gap-1">
            <li>
              <span className="text-[var(--color-accent-gold)]">11 or higher</span> — the dark
              answers: a blessing's whisper{` and ${15 * riskTier} gold`} (or {50 * riskTier} gold
              if no blessing is left to give).
            </li>
            <li>
              <span className="text-[var(--color-status-poison)]">10 or lower</span> — it takes
              its due: you lose {riskDamage} HP (a quarter of your health), down to no less than 1.
            </li>
          </ul>
          <Button variant="primary" onClick={resolveRisk}>
            Throw the bones
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
          ◆ The Caravan-Merchant
        </div>
        <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
          "Coin in this pocket, comfort in the other. The road keeps going — best you're well-stocked before the dark."
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openShop}>
            Step up to the caravan →
          </Button>
          <Button variant="ghost" onClick={goToInventory}>
            ◆ Open your pack
          </Button>
        </div>
      </Panel>

      <div className="flex justify-center mt-2">
        <Button variant="primary" onClick={onPressSouth}>
          Press on into the dark →
        </Button>
      </div>

      {merchantStep === 'shop' && (
        <ShopModal
          stockIds={stockIds}
          goldInPocket={character.goldInPocket}
          purchaseMessage={purchaseMessage}
          onBuy={buyItem}
          onClose={() => {
            setMerchantStep('closed');
            setPurchaseMessage(null);
          }}
        />
      )}
    </div>
  );
}

interface ShopModalProps {
  stockIds: string[];
  goldInPocket: number;
  purchaseMessage: string | null;
  onBuy: (itemId: string) => void;
  onClose: () => void;
}

function ShopModal({
  stockIds,
  goldInPocket,
  purchaseMessage,
  onBuy,
  onClose,
}: ShopModalProps) {
  const items = stockIds.map(getItem);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[var(--color-bg-base)] border-2 border-[var(--color-accent-amber)] p-5">
        <header className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3 mb-4 bg-[var(--color-bg-base)] flex justify-between items-center border-b border-[var(--color-border-warm)]">
          <div>
            <h2 className="font-display text-lg text-[var(--color-accent-amber)] uppercase tracking-[0.15em]">
              The Caravan-Merchant
            </h2>
            <p className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic mt-1">
              Coin and a charter, no questions asked.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-2 text-right"
              title="Gold in pocket"
            >
              <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
                ◈ Gold
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
              Close ×
            </button>
          </div>
        </header>

        {STOCK_GROUPS.map((group) => {
          const groupItems = items.filter((it) => it.kind === group.kind);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.kind} className="mb-5">
              <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
                {group.label}
              </div>
              <div className="grid gap-3">
                {groupItems.map((item) => {
                  const tooDear = goldInPocket < item.cost;
                  return (
                    <div
                      key={item.id}
                      className="border border-[var(--color-border-dim)] p-3 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <div className="text-[var(--color-text-primary)] text-sm uppercase tracking-wider">
                          {item.name}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
                          {itemBlurb(item)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[var(--color-accent-gold)] text-sm">{item.cost} gp</div>
                        <Button
                          variant={tooDear ? 'secondary' : 'primary'}
                          disabled={tooDear}
                          onClick={() => onBuy(item.id)}
                        >
                          {tooDear ? `Need ${item.cost - goldInPocket} more` : 'Buy'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {purchaseMessage && (
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest text-center mb-4">
            {purchaseMessage}
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 px-5 py-3 bg-[var(--color-bg-base)] border-t border-[var(--color-border-warm)] flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done trading →
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
  disabled?: boolean;
}

function ForkCard({
  title,
  flavor,
  state,
  buttonLabel,
  onPick,
  takenSummary,
  disabled = false,
}: ForkCardProps) {
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
        <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest leading-relaxed">
          {takenSummary}
        </div>
      ) : state === 'closed' ? (
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
          The moment has passed.
        </div>
      ) : (
        <Button
          variant={state === 'active' ? 'secondary' : 'primary'}
          disabled={disabled}
          onClick={onPick}
        >
          {state === 'active' ? 'Never mind ✕' : buttonLabel}
        </Button>
      )}
    </Panel>
  );
}
