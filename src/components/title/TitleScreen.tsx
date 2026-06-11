import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { useGameStore, hasAnySave, hasAutosave, getSlotMetadata } from '../../stores/gameStore';
import { playMusic, stopMusic } from '../../engine/audio';
import { useT } from '../../i18n/useT';

export function TitleScreen() {
  const { t } = useT();
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const goToAscensionSelect = useGameStore((s) => s.goToAscensionSelect);
  const gameCompleted = useGameStore((s) => s.gameCompleted);
  const [glow, setGlow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const activeSave = hasAutosave();
  const saveMeta = activeSave ? getSlotMetadata(0) : null;
  // Beating the chain once opens New Game+ — the title-launched run-launcher that
  // lets the soul descend again at a chosen ascension. The mastery persists, so
  // the entry stays even after starting a fresh base game.
  const newGamePlusAvailable = activeSave && gameCompleted;
  // Continue resumes only an UNFINISHED campaign. Once the chain has been cleared
  // the run is over — the way on is New Game+, not resuming a finished (already
  // won) delve. So a completed save routes through the ascension launcher instead
  // of dropping the soul back into a dead run.
  const canContinue = activeSave && !gameCompleted;

  useEffect(() => {
    const t = setTimeout(() => setGlow(true), 200);
    return () => clearTimeout(t);
  }, []);

  // The lonely title statement of the Godwake motif.
  useEffect(() => {
    playMusic('title_theme');
    return () => {
      stopMusic();
    };
  }, []);

  function beginNewGame() {
    const seed = `godwake-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    startNewGame(seed);
  }

  function handleNewGame() {
    if (hasAnySave()) {
      setConfirming(true);
      return;
    }
    beginNewGame();
  }

  function handleContinue() {
    loadFromSlot(0);
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-12 px-4">
      {/* Painted ambient backdrop — concentric warm glow + smoky verticals */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center 35%, rgba(244,167,66,0.16) 0%, rgba(180,80,30,0.06) 30%, transparent 60%), radial-gradient(ellipse at center 100%, rgba(139,31,27,0.18) 0%, transparent 50%)',
        }}
      />
      {/* Vertical smoke lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 animate-torch-flicker"
        style={{
          background:
            'repeating-linear-gradient(180deg, transparent 0px, transparent 30px, rgba(255,179,71,0.04) 30px, rgba(255,179,71,0.04) 31px)',
        }}
      />

      {/* Twin torch icons flanking the title */}
      <div className="relative z-10 text-center animate-fade-in-slow">
        <div className="flex items-center justify-center gap-3 sm:gap-8 mb-2">
          <Torch />
          <h1
            className={`font-display text-4xl sm:text-5xl md:text-7xl tracking-[0.15em] text-[var(--color-accent-amber)] transition-all duration-1000 ${
              glow ? 'drop-shadow-[0_0_42px_rgba(244,167,66,0.55)]' : 'drop-shadow-[0_0_8px_rgba(244,167,66,0.2)]'
            }`}
            style={{ textShadow: '0 0 12px rgba(255,179,71,0.4), 4px 4px 0 rgba(0,0,0,0.85)' }}
          >
            GODWAKE
          </h1>
          <Torch flipped />
        </div>
        <div className="font-narrative italic text-[var(--color-text-secondary)] text-base md:text-lg tracking-wider mt-6 max-w-md mx-auto leading-relaxed">
          {t('ui.title.tagline')}
        </div>
        <div className="font-display text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.4em] mt-4">
          ◆ {t('ui.title.subtitle')} ◆
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 w-80 animate-fade-in-slow">
        {canContinue && (
          <div className="flex flex-col gap-1">
            <Button variant="primary" size="lg" onClick={handleContinue}>
              ▸ {t('ui.title.continue')}
            </Button>
            {saveMeta && (
              <div className="text-center text-[10px] font-display text-[var(--color-text-dim)] tracking-[0.2em] uppercase">
                {t('ui.title.saveSummary', {
                  name: saveMeta.characterName,
                  level: saveMeta.characterLevel,
                  location: saveMeta.location,
                })}
              </div>
            )}
          </div>
        )}
        {newGamePlusAvailable && (
          <Button
            variant={canContinue ? 'ghost' : 'primary'}
            size="lg"
            onClick={goToAscensionSelect}
          >
            ▲ {t('ui.title.newGamePlus')}
          </Button>
        )}
        <Button
          variant={canContinue || newGamePlusAvailable ? 'ghost' : 'primary'}
          size="lg"
          onClick={handleNewGame}
        >
          {activeSave ? `+ ${t('ui.title.newGame')}` : `▸ ${t('ui.title.newGameFresh')}`}
        </Button>
      </div>

      <div className="absolute bottom-4 right-4 text-[var(--color-text-muted)] text-[9px] font-mono tracking-widest uppercase opacity-60">
        v0.1 · {t('ui.title.earlyBuild')}
      </div>
      <div className="absolute bottom-4 left-4 text-[var(--color-text-muted)] text-[9px] font-display tracking-[0.3em] uppercase opacity-40">
        {t('ui.title.madeForFriends')}
      </div>
      {/* CC-BY-4.0 requires this credit for SRD 5.1 mechanics — keep it on the
          title screen so every distributed build carries the attribution. */}
      <div className="absolute bottom-9 inset-x-0 text-center text-[var(--color-text-muted)] text-[8px] font-mono tracking-wide opacity-40 px-4">
        {t('ui.title.srdAttribution')}
      </div>

      {confirming && (
        <NewGameConfirm onCancel={() => setConfirming(false)} onConfirm={beginNewGame} />
      )}
    </div>
  );
}

function NewGameConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useT();
  const meta = getSlotMetadata(0);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const soulLabel = meta
    ? `${meta.characterName} · level ${meta.characterLevel} · ${meta.characterClass ?? '—'}`
    : t('ui.title.confirmNewSoulFallback');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-slow"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="panel-etched-warm border-2 border-[var(--color-border-warm)] p-6 w-[min(90vw,420px)] shadow-2xl animate-scale-in">
        <div className="font-display text-[var(--color-accent-amber)] text-[11px] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
          <span className="text-[var(--color-accent-gold)]">◆</span> {t('ui.title.confirmNewTitle')}
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-2">
          {t('ui.title.confirmNewBody')
            .split("{soul}")
            .flatMap((part, i) =>
              i === 0
                ? [part]
                : [
                    <span key="soul" className="text-[var(--color-text-primary)]">{soulLabel}</span>,
                    part,
                  ],
            )}
        </p>
        <p className="text-[var(--color-text-muted)] text-[11px] italic mb-5">
          {t('ui.title.confirmNewNote')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('ui.common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t('ui.title.begin')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Torch({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 64"
      width="32"
      height="80"
      className={`animate-torch-flicker ${flipped ? '-scale-x-100' : ''}`}
      aria-hidden
    >
      {/* Pole */}
      <rect x="10" y="28" width="4" height="36" fill="#3A2E22" />
      <rect x="10" y="28" width="4" height="36" fill="url(#poleGrad)" opacity="0.5" />
      {/* Crown */}
      <rect x="8" y="24" width="8" height="6" fill="#6B4A2E" />
      {/* Flame */}
      <ellipse cx="12" cy="14" rx="6" ry="10" fill="#FF6B2B" opacity="0.95" />
      <ellipse cx="12" cy="11" rx="4" ry="8" fill="#FFB347" opacity="0.95" />
      <ellipse cx="12" cy="9" rx="2.5" ry="5" fill="#FFD700" />
      <ellipse cx="12" cy="20" rx="3" ry="2" fill="#FF4730" opacity="0.6" />
      {/* Glow */}
      <ellipse cx="12" cy="14" rx="12" ry="14" fill="#FFB347" opacity="0.1" />
      <defs>
        <linearGradient id="poleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0805" />
          <stop offset="100%" stopColor="#3A2E22" />
        </linearGradient>
      </defs>
    </svg>
  );
}
