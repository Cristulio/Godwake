import { useEffect, useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import type { Item } from '../../schemas/item';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { BlessingCard } from '../ui/BlessingCard';
import { CampScene } from './CampScene';
import { useGameStore } from '../../stores/gameStore';
import { getBlessing } from '../../content/blessings';
import { getActiveRoller } from '../../engine/dice';
import { rollBlessingOptions } from '../../engine/character/blessings';
import { getItem } from '../../content/items';
import { playSfx } from '../../engine/audio';
import {
  boonsForCampTier,
  type CampBoon,
  type CampBoonTier,
} from '../../content/campBoons';

type CampChoice = 'rest' | 'sharpen' | 'prayer';

/** Which beat of the caravan visit is showing — shopping and the free
 * god-mark are sequential screens, never the same panel. */
type MerchantStep = 'closed' | 'shop' | 'blessing';

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
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const addBlessing = useGameStore((s) => s.addBlessing);
  const showTaunt = useGameStore((s) => s.showTaunt);

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

  // The blessing id pulled by "A Prayer Whispered". Captured on click so
  // we can echo the exact god back to the player even if blessings change.
  const [prayerGrantedId, setPrayerGrantedId] = useState<string | null>(null);
  const [merchantStep, setMerchantStep] = useState<MerchantStep>('closed');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [blessingOptions, setBlessingOptions] = useState<string[]>([]);
  const [merchantBlessingTaken, setMerchantBlessingTaken] = useState(false);

  // Imoen whispers when the road opens up.
  useEffect(() => {
    const t = setTimeout(() => showTaunt('imoen', 'rest'), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!character) return null;

  function handlePickChoice(choice: CampChoice) {
    if (!character || campChoice) return;
    // Single source of truth: the store does the class-aware roll and returns
    // the granted blessing id so the UI can name the god.
    const granted = pickCampChoice(choice);
    if (choice === 'prayer') {
      if (granted) setPrayerGrantedId(granted);
      playSfx('shrine_chime');
    } else {
      playSfx('ui_click');
    }
  }

  function openShop() {
    // Roll the free god-mark options now so they're ready for the blessing
    // beat that follows the shop.
    if (blessingOptions.length === 0) {
      const roller = getActiveRoller();
      setBlessingOptions(rollBlessingOptions(roller, 3, character?.classId));
    }
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

  function pickMerchantBlessing(id: string) {
    if (merchantBlessingTaken) return;
    addBlessing(id);
    setMerchantBlessingTaken(true);
    playSfx('shrine_chime');
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
        ◆ A single boon — choose one ◆
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <CampChoiceCard
          choiceId="rest"
          title="Make Camp at the Fire"
          flavor="A full night by the coals. Wounds close, dice come home to the hand, and what was spent is yours again before dawn."
          locked={campChoice !== null && campChoice !== 'rest'}
          picked={campChoice === 'rest'}
          pickedSummary="Full rest — HP restored, all resources readied."
          buttonLabel="Make camp"
          onPick={() => handlePickChoice('rest')}
        />
        {character.classId === 'wizard' ? (
          <CampChoiceCard
            choiceId="sharpen"
            title="Whet the Mind"
            flavor="A glyph drawn in ash, a long breath, the road in your thoughts. Your sigils land truer for the rest of this delve."
            locked={campChoice !== null && campChoice !== 'sharpen'}
            picked={campChoice === 'sharpen'}
            pickedSummary="+1 to all spell attack rolls for the rest of the delve."
            buttonLabel="Sharpen the sigil"
            onPick={() => handlePickChoice('sharpen')}
          />
        ) : (
          <CampChoiceCard
            choiceId="sharpen"
            title="Sharpen the Blade"
            flavor="A whetstone, a long breath, the road in your hand. Strike truer for the rest of this delve."
            locked={campChoice !== null && campChoice !== 'sharpen'}
            picked={campChoice === 'sharpen'}
            pickedSummary="+1 to all attack rolls for the rest of the delve."
            buttonLabel="Hone the edge"
            onPick={() => handlePickChoice('sharpen')}
          />
        )}
        <CampChoiceCard
          choiceId="prayer"
          title="A Prayer Whispered"
          flavor="The fire crackles. A name leaves your lips. Something in the dark answers."
          locked={campChoice !== null && campChoice !== 'prayer'}
          picked={campChoice === 'prayer'}
          pickedSummary={
            prayerGrantedId
              ? `${getBlessing(prayerGrantedId).name} — granted.`
              : 'A blessing — granted.'
          }
          buttonLabel="Whisper a prayer"
          onPick={() => handlePickChoice('prayer')}
        />
      </div>

      {campChoice === 'prayer' && prayerGrantedId && (
        <div className="max-w-md mx-auto">
          <BlessingCard blessingId={prayerGrantedId} />
        </div>
      )}

      {campTier !== null && (
        <CampBoonPicker
          tier={campTier}
          options={boonOptions}
          resolution={boonResolution ?? null}
          onPick={(boonId) => {
            pickCampBoon(campTier, boonId);
            playSfx(boonId ? 'shrine_chime' : 'ui_click');
          }}
        />
      )}

      <Panel>
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
          ◆ The Caravan-Merchant
        </div>
        <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
          "Coin in this pocket, comfort in the other. The road keeps going. You'll want both — and I've a god's mark to spare, after."
        </p>
        <Button variant="secondary" onClick={openShop}>
          Step up to the caravan →
        </Button>
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
          onAdvanceToBlessing={() => {
            setMerchantStep('blessing');
            setPurchaseMessage(null);
          }}
        />
      )}

      {merchantStep === 'blessing' && (
        <BlessingOfferModal
          blessingOptions={blessingOptions}
          taken={merchantBlessingTaken}
          onPick={pickMerchantBlessing}
          onClose={() => setMerchantStep('closed')}
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
  onAdvanceToBlessing: () => void;
}

function ShopModal({
  stockIds,
  goldInPocket,
  purchaseMessage,
  onBuy,
  onClose,
  onAdvanceToBlessing,
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

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 px-5 py-3 bg-[var(--color-bg-base)] border-t border-[var(--color-border-warm)] flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-accent-amber)] text-[11px] uppercase tracking-widest italic"
          >
            ← Done trading
          </button>
          <Button variant="primary" onClick={onAdvanceToBlessing}>
            "A god's mark, before you go" →
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BlessingOfferModalProps {
  blessingOptions: string[];
  taken: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** The free god-mark — its own beat after the shop, never a panel sharing the
 * merchant's wares. Blessings are gifts, not stock. */
function BlessingOfferModal({
  blessingOptions,
  taken,
  onPick,
  onClose,
}: BlessingOfferModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[var(--color-bg-base)] border-2 border-[var(--color-accent-gold)] p-5">
        <header className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3 mb-4 bg-[var(--color-bg-base)] flex justify-between items-center border-b border-[var(--color-border-warm)]">
          <div>
            <h2 className="font-display text-lg text-[var(--color-accent-gold)] uppercase tracking-[0.15em]">
              Bless Me, Traveller
            </h2>
            <p className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic mt-1">
              No coin — only a name to remember the road by.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-accent-gold)] text-xs uppercase tracking-widest"
          >
            Close ×
          </button>
        </header>

        <p className="text-[var(--color-text-secondary)] text-xs italic mb-4 leading-relaxed">
          The merchant turns from his wares and presses two fingers to his brow.
          "Carry a god's mark with you. Won't cost a copper. Choose one of the
          three — offered once, here at this fire."
        </p>

        {taken ? (
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest mb-4">
            The merchant nods. "Walk well, then."
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {blessingOptions.map((id) => (
              <BlessingCard key={id} blessingId={id} pickable onPick={() => onPick(id)} />
            ))}
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 px-5 py-3 bg-[var(--color-bg-base)] border-t border-[var(--color-border-warm)] flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Walk on →
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CampChoiceCardProps {
  choiceId: CampChoice;
  title: string;
  flavor: string;
  locked: boolean;
  picked: boolean;
  pickedSummary: string;
  buttonLabel: string;
  onPick: () => void;
}

function CampChoiceCard({
  title,
  flavor,
  locked,
  picked,
  pickedSummary,
  buttonLabel,
  onPick,
}: CampChoiceCardProps) {
  return (
    <Panel className={locked ? 'opacity-40' : undefined}>
      <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
        ◆ {title}
      </div>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
        {flavor}
      </p>
      {picked ? (
        <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest">
          {pickedSummary}
        </div>
      ) : locked ? (
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
          The moment has passed.
        </div>
      ) : (
        <Button variant="primary" onClick={onPick}>
          {buttonLabel}
        </Button>
      )}
    </Panel>
  );
}

interface CampBoonPickerProps {
  tier: CampBoonTier;
  options: CampBoon[];
  resolution: { tier: number; boonId: string | null } | null;
  onPick: (boonId: string | null) => void;
}

function CampBoonPicker({ tier, options, resolution, onPick }: CampBoonPickerProps) {
  const resolved = resolution !== null;
  const pickedBoon = resolved
    ? options.find((b) => b.id === resolution.boonId) ?? null
    : null;
  const skipped = resolved && resolution.boonId === null;

  return (
    <Panel className="bg-gradient-to-br from-[#1e1a2a] to-[#100d18] border-[var(--color-accent-amber)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest">
          ◆ Choose a Boon · Camp {tier}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic">
          {resolved ? 'Taken' : 'One pick — for the rest of the delve'}
        </div>
      </div>

      {!resolved && (
        <>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            The road has marked you. Take one boon to carry south — or walk on
            unburdened.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {options.map((b) => (
              <button
                type="button"
                key={b.id}
                onClick={() => onPick(b.id)}
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
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onPick(null)}
              className="text-[var(--color-text-dim)] hover:text-[var(--color-accent-amber)] text-[11px] uppercase tracking-widest italic"
            >
              Walk on unburdened →
            </button>
          </div>
        </>
      )}

      {resolved && pickedBoon && (
        <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest">
          {pickedBoon.name} — taken. {pickedBoon.description}
        </div>
      )}
      {resolved && skipped && (
        <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest italic">
          You left the boon on the road. The dark is darker for it.
        </div>
      )}
    </Panel>
  );
}
