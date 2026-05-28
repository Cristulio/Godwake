import { useEffect, useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { BlessingCard } from '../ui/BlessingCard';
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

interface CampRoomProps {
  room: RoomSpec;
  onPressSouth: () => void;
  onMakeForPhandalin: () => void;
}

const MERCHANT_POTION_IDS = [
  'potion-of-healing',
  'potion-of-greater-healing',
  'potion-of-heroism',
  'scroll-of-healing-word',
  'adamantine-shortsword',
  'cloak-of-faerun',
];

export function CampRoom({ room, onPressSouth, onMakeForPhandalin }: CampRoomProps) {
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
  // The blessing id pulled by "A Prayer Whispered". Captured on click so
  // we can echo the exact god back to the player even if blessings change.
  const [prayerGrantedId, setPrayerGrantedId] = useState<string | null>(null);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [blessingOptions, setBlessingOptions] = useState<string[]>([]);
  const [blessingTaken, setBlessingTaken] = useState(false);
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
    if (choice === 'prayer') {
      // Snapshot the granted blessing so the UI can name it. The store's
      // `pickCampChoice('prayer')` would also roll, but it would be a
      // different (unseeded-equivalent) roll — drive it from here instead.
      const [granted] = rollBlessingOptions(getActiveRoller(), 1);
      if (granted) {
        addBlessing(granted);
        setPrayerGrantedId(granted);
      }
      useGameStore.setState((s) =>
        s.delve ? { delve: { ...s.delve, campChoice: 'prayer' } } : s,
      );
      playSfx('shrine_chime');
      return;
    }
    pickCampChoice(choice);
    playSfx('ui_click');
  }

  function openMerchant() {
    if (blessingOptions.length === 0) {
      const roller = getActiveRoller();
      setBlessingOptions(rollBlessingOptions(roller, 3));
    }
    setMerchantOpen(true);
    setPurchaseMessage(null);
  }

  function buyPotion(itemId: string) {
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
    setBlessingTaken(true);
    playSfx('shrine_chime');
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(244,167,66,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {room.title.toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          Camp · A pause on the long road · The deeper dark ahead
        </p>
      </header>

      <Panel className="bg-gradient-to-br from-[#2a1d12] to-[#1a1108]">
        <div className="flex flex-col items-center gap-4 py-4">
          <RoadsideFireScene />
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-xl leading-relaxed">
            {room.flavorText}
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            HP {character.hp.current}/{character.hp.max} · {character.goldInPocket} gp
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
          "Coin in this pocket, comfort in the other. The road keeps going. You'll want both."
        </p>
        <Button variant="secondary" onClick={openMerchant}>
          Trade with him
        </Button>
      </Panel>

      <div className="flex flex-col md:flex-row gap-3 justify-center mt-2">
        <Button variant="primary" onClick={onPressSouth}>
          Press on into the dark →
        </Button>
        <Button variant="secondary" onClick={onMakeForPhandalin}>
          Turn back to Phandalin
        </Button>
      </div>

      {merchantOpen && (
        <MerchantModal
          potionIds={MERCHANT_POTION_IDS}
          goldInPocket={character.goldInPocket}
          blessingOptions={blessingOptions}
          merchantBlessingTaken={merchantBlessingTaken}
          purchaseMessage={purchaseMessage}
          onBuyPotion={buyPotion}
          onPickBlessing={pickMerchantBlessing}
          onClose={() => {
            setMerchantOpen(false);
            setPurchaseMessage(null);
            // The blessing slot can only be claimed once per camp visit; if
            // it was taken, surface the confirmation as the merchant closes.
            if (blessingTaken) {
              setBlessingTaken(false);
            }
          }}
        />
      )}
    </div>
  );
}

interface MerchantModalProps {
  potionIds: string[];
  goldInPocket: number;
  blessingOptions: string[];
  merchantBlessingTaken: boolean;
  purchaseMessage: string | null;
  onBuyPotion: (itemId: string) => void;
  onPickBlessing: (id: string) => void;
  onClose: () => void;
}

function MerchantModal({
  potionIds,
  goldInPocket,
  blessingOptions,
  merchantBlessingTaken,
  purchaseMessage,
  onBuyPotion,
  onPickBlessing,
  onClose,
}: MerchantModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[var(--color-bg-base)] border-2 border-[var(--color-accent-amber)] p-5">
        <header className="flex justify-between items-center pb-3 mb-4 border-b border-[var(--color-border-warm)]">
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

        <div className="grid gap-3 mb-4">
          {potionIds.map((id) => {
            const item = getItem(id);
            const tooDear = goldInPocket < item.cost;
            return (
              <div
                key={id}
                className="border border-[var(--color-border-dim)] p-3 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="text-[var(--color-text-primary)] text-sm uppercase tracking-wider">
                    {item.name}
                  </div>
                  <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
                    {item.description}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[var(--color-accent-gold)] text-sm">{item.cost} gp</div>
                  <Button
                    variant={tooDear ? 'secondary' : 'primary'}
                    disabled={tooDear}
                    onClick={() => onBuyPotion(id)}
                  >
                    {tooDear ? `Need ${item.cost - goldInPocket} more` : 'Buy'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {purchaseMessage && (
          <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest text-center mb-4">
            {purchaseMessage}
          </div>
        )}

        <div className="pt-3 border-t border-[var(--color-border-dim)]">
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
            ◆ Bless me, traveller
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
            "Carry a god's mark with you. Won't cost a copper — only a name to remember the
            road by." (Choose one of three; offered once per camp.)
          </p>
          {merchantBlessingTaken ? (
            <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest">
              The merchant nods. "Walk well, then."
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              {blessingOptions.map((id) => (
                <BlessingCard key={id} blessingId={id} pickable onPick={() => onPickBlessing(id)} />
              ))}
            </div>
          )}
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
          {resolved ? 'Resolved' : 'One pick — for the rest of the delve'}
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

function RoadsideFireScene() {
  return (
    <svg
      viewBox="0 0 320 140"
      className="w-full max-w-md drop-shadow-[0_0_18px_rgba(244,167,66,0.4)]"
      role="img"
      aria-label="A roadside fire under a dusk sky, the road bending south."
    >
      <defs>
        <radialGradient id="camp-fire-glow" cx="0.5" cy="0.65" r="0.6">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#f4a742" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f4a742" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="camp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1322" />
          <stop offset="55%" stopColor="#3a1f1c" />
          <stop offset="100%" stopColor="#5a2a1a" />
        </linearGradient>
        <linearGradient id="camp-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a20" />
          <stop offset="100%" stopColor="#1a1208" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect x="0" y="0" width="320" height="90" fill="url(#camp-sky)" />
      {/* Stars */}
      <circle cx="40" cy="18" r="0.8" fill="#fff8d0" />
      <circle cx="80" cy="30" r="0.6" fill="#fff8d0" opacity="0.7" />
      <circle cx="230" cy="14" r="0.9" fill="#fff8d0" />
      <circle cx="280" cy="32" r="0.6" fill="#fff8d0" opacity="0.7" />
      {/* Distant southern hills */}
      <path d="M0 78 L 60 60 L 110 70 L 170 56 L 230 68 L 320 58 L 320 90 L 0 90 Z" fill="#1a1018" />
      {/* Road bending south */}
      <path
        d="M 0 130 L 110 100 L 170 92 L 220 90 L 320 95 L 320 140 L 0 140 Z"
        fill="url(#camp-road)"
      />
      {/* Milestone */}
      <rect x="195" y="80" width="6" height="14" fill="#3a2a20" stroke="#1a1208" strokeWidth="0.5" />
      <rect x="193" y="79" width="10" height="3" fill="#5a4030" />
      {/* Cart silhouette */}
      <rect x="230" y="80" width="40" height="14" fill="#2a1a10" stroke="#1a1208" strokeWidth="0.5" />
      <rect x="234" y="76" width="32" height="6" fill="#3a2418" />
      <circle cx="238" cy="96" r="4" fill="#1a1208" stroke="#3a2418" strokeWidth="0.5" />
      <circle cx="262" cy="96" r="4" fill="#1a1208" stroke="#3a2418" strokeWidth="0.5" />
      {/* Tarp pegs lines */}
      <line x1="270" y1="80" x2="285" y2="92" stroke="#3a2418" strokeWidth="0.5" />
      {/* Fire glow */}
      <ellipse cx="100" cy="110" rx="55" ry="22" fill="url(#camp-fire-glow)" />
      {/* Fire logs */}
      <rect x="86" y="108" width="28" height="3" fill="#3a2418" />
      <rect x="92" y="112" width="22" height="3" fill="#2a1a10" />
      {/* Fire flames */}
      <path d="M 92 108 Q 96 96 100 108 Q 104 90 108 108 Z" fill="#ffd76a" opacity="0.9" />
      <path d="M 95 108 Q 100 102 105 108 Z" fill="#fff8d0" opacity="0.85" />
      {/* Sitting figure silhouette */}
      <ellipse cx="65" cy="106" rx="6" ry="3" fill="#1a1208" />
      <rect x="62" y="98" width="6" height="8" fill="#1a1208" />
      <circle cx="65" cy="95" r="3" fill="#1a1208" />
      {/* Ox silhouette (unhitched) */}
      <rect x="280" y="100" width="22" height="9" fill="#1a1208" />
      <rect x="280" y="108" width="3" height="6" fill="#1a1208" />
      <rect x="299" y="108" width="3" height="6" fill="#1a1208" />
      <rect x="298" y="96" width="6" height="6" fill="#1a1208" />
    </svg>
  );
}
