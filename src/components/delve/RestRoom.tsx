import { useEffect, useState, type ReactNode } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';
import { getItem } from '../../content/items';
import { enhancementOf } from '../../engine/items';
import { honeableSlots, canHoneSlot } from '../../engine/delve/hone';
import { localizedItemName } from '../inventory/itemDisplay';
import { playSfx } from '../../engine/audio';
import { useT } from '../../i18n/useT';

interface RestRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

export function RestRoom({ room, onContinue }: RestRoomProps) {
  const { t, lr } = useT();
  const character = useGameStore((s) => s.character);
  const restChoice = useGameStore((s) => s.delve?.restChoice ?? null);
  const pickRestChoice = useGameStore((s) => s.pickRestChoice);
  const showTaunt = useGameStore((s) => s.showTaunt);
  const [showStone, setShowStone] = useState(false);

  // Imoen whispers when the player first reaches an alcove — once per soul.
  useEffect(() => {
    if (useMetaStore.getState().seenDialogueBeats.includes('imoen-rest-whisper')) return;
    const id = setTimeout(() => {
      showTaunt('imoen', 'rest');
      useMetaStore.getState().markDialogueBeatSeen('imoen-rest-whisper');
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!character) return null;

  const committed = restChoice !== null;
  const honeSlots = honeableSlots(character);
  const anyHoneable = honeSlots.some((slot) => canHoneSlot(character, slot));

  function handleRest() {
    if (committed) return;
    pickRestChoice('rest');
    setShowStone(false);
    playSfx('heal_chime');
  }

  function toggleStone() {
    if (committed || !anyHoneable) return;
    setShowStone((cur) => !cur);
    playSfx('ui_click');
  }

  function handleHone(slot: (typeof honeSlots)[number]) {
    if (committed || !canHoneSlot(character!, slot)) return;
    pickRestChoice('hone', slot);
    setShowStone(false);
    playSfx('ui_click');
  }

  const honeDisabledNote = anyHoneable
    ? undefined
    : honeSlots.length === 0
      ? t('delve.rest.honeNone')
      : t('delve.rest.honeAllCapped');

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in [background-image:radial-gradient(circle_at_50%_30%,rgba(244,167,66,0.07),transparent_55%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)]">
        <h1 className="text-xl text-[var(--color-accent-amber)] tracking-wider">
          {lr(room.chapter, room.title).toUpperCase()}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
          {t('delve.rest.label')}
        </p>
      </header>

      <Panel className="bg-gradient-to-br from-[#2d2218] to-[#221a14]">
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="text-6xl drop-shadow-[0_0_18px_rgba(244,167,66,0.6)]">🔥</div>
          <p className="text-[var(--color-text-secondary)] text-sm italic text-center max-w-md">
            {lr(room.chapter, room.flavorText)}
          </p>
          <p className="text-[var(--color-text-dim)] text-xs italic text-center max-w-md">
            {t('delve.rest.knits')}
          </p>
          <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]">
            {t('delve.common.hpStat', { current: character.hp.current, max: character.hp.max })}
          </div>
        </div>
      </Panel>

      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest text-center">
        {t('delve.rest.forkIntro')}
      </div>

      <div className="grid md:grid-cols-2 gap-3 items-start">
        <ForkCard
          title={t('delve.rest.option.rest.title')}
          flavor={t('delve.rest.option.rest.flavor')}
          state={restChoice === 'rest' ? 'taken' : committed ? 'closed' : 'open'}
          buttonLabel={t('delve.rest.restButton')}
          onPick={handleRest}
          takenSummary={t('delve.rest.steadied')}
        />
        <ForkCard
          title={t('delve.rest.option.hone.title')}
          flavor={t('delve.rest.option.hone.flavor')}
          state={
            restChoice === 'hone'
              ? 'taken'
              : committed
                ? 'closed'
                : showStone
                  ? 'active'
                  : 'open'
          }
          buttonLabel={t('delve.rest.honeButton')}
          activeLabel={t('delve.rest.honeCancel')}
          disabled={!anyHoneable}
          disabledNote={honeDisabledNote}
          onPick={toggleStone}
          takenSummary={t('delve.rest.honeTaken')}
        />
      </div>

      {!committed && showStone && anyHoneable && (
        <Panel className="bg-gradient-to-br from-[#2a221a] to-[#161210] border-[var(--color-accent-amber)] animate-fade-in">
          <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-3">
            {t('delve.rest.honePrompt')}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {honeSlots.map((slot) => {
              const ref = character.equipped[slot]!;
              const cur = enhancementOf(ref);
              const atCap = !canHoneSlot(character, slot);
              return (
                <button
                  type="button"
                  key={slot}
                  disabled={atCap}
                  onClick={() => handleHone(slot)}
                  className={`text-left border p-3 flex flex-col gap-1 transition-colors ${
                    atCap
                      ? 'border-[var(--color-border-dim)] opacity-50 cursor-not-allowed'
                      : 'border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)] hover:bg-[#2a221a]'
                  }`}
                >
                  <div className="text-[var(--color-text-primary)] text-xs uppercase tracking-wider truncate">
                    {localizedItemName(ref) || getItem(ref.itemId).name}
                  </div>
                  <div
                    className={`text-[11px] tracking-widest ${
                      atCap ? 'text-[var(--color-text-dim)] italic' : 'text-[var(--color-accent-gold)]'
                    }`}
                  >
                    {atCap
                      ? t('delve.rest.honeAtCap')
                      : t('delve.rest.honeUpgrade', { from: cur, to: cur + 1 })}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="flex justify-center mt-2">
        <Button variant={committed ? 'primary' : 'secondary'} onClick={onContinue}>
          {t('delve.common.continueDeeper')}
        </Button>
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
  /** Button label while the card is expanded (the back-out affordance). */
  activeLabel?: string;
  onPick: () => void;
  takenSummary?: ReactNode;
  disabled?: boolean;
  /** In-world line shown instead of the button when the option is disabled. */
  disabledNote?: ReactNode;
}

function ForkCard({
  title,
  flavor,
  state,
  buttonLabel,
  activeLabel,
  onPick,
  takenSummary,
  disabled = false,
  disabledNote,
}: ForkCardProps) {
  const panelClass = [
    state === 'closed' ? 'opacity-40' : '',
    state === 'active' ? 'border-[var(--color-accent-amber)] bg-[#2a221a]' : '',
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
        <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest leading-relaxed animate-fade-in">
          {takenSummary}
        </div>
      ) : disabled && disabledNote && state !== 'closed' ? (
        <div className="text-[var(--color-text-dim)] text-xs italic leading-relaxed">
          {disabledNote}
        </div>
      ) : (
        <Button
          variant={state === 'active' ? 'secondary' : 'primary'}
          disabled={disabled || state === 'closed'}
          onClick={onPick}
        >
          {state === 'active' && activeLabel ? activeLabel : buttonLabel}
        </Button>
      )}
    </Panel>
  );
}
