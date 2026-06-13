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
  // Continue resumes whatever the autosave holds — including a LIVE New Game+
  // descent, which exists on a save whose base chain is already complete. The
  // old gate (activeSave && !gameCompleted) assumed completed = nothing to
  // resume and stranded mid-NG+ runs at the title (owner-hit, 2026-06-11).
  // A post-victory save with no live run simply resumes at the hub — harmless.
  const canContinue = activeSave;

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
      {/* Dungeon-cell backdrop: dim stone, a far grove-green bleed at the top,
          iron bars (masked clear of the title), torch-lit pools, rising embers,
          and a vignette. The torches + title ride above it at z-10. */}
      {/* Stone wall + mortar courses */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, #0b0908 0%, #15110d 45%, #0e0b09 100%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0 38px, rgba(0,0,0,0.35) 38px 40px), repeating-linear-gradient(90deg, transparent 0 120px, rgba(0,0,0,0.16) 120px 122px)',
        }}
      />
      {/* Far grove-green bleed from the top edge — the green you wake toward */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 32% at 50% -8%, rgba(96,168,104,0.11) 0%, rgba(60,120,72,0.04) 45%, transparent 72%)',
        }}
      />
      {/* Iron cell bars — faded clear of the centre so the logo stays clean */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            'repeating-linear-gradient(90deg, transparent 0 70px, rgba(0,0,0,0.55) 70px 78px, rgba(150,110,70,0.10) 78px 79px)',
          WebkitMaskImage:
            'radial-gradient(ellipse 46% 52% at 50% 45%, transparent 0%, transparent 32%, black 78%)',
          maskImage:
            'radial-gradient(ellipse 46% 52% at 50% 45%, transparent 0%, transparent 32%, black 78%)',
        }}
      />
      {/* Torch light-pools (flicker) */}
      <div
        className="absolute inset-0 pointer-events-none animate-torch-flicker"
        style={{
          background:
            'radial-gradient(circle 260px at 30% 45%, rgba(255,179,71,0.13) 0%, transparent 68%), radial-gradient(circle 260px at 70% 45%, rgba(255,179,71,0.13) 0%, transparent 68%)',
        }}
      />
      {/* Central warm glow under the title */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center 38%, rgba(244,167,66,0.14) 0%, rgba(180,80,30,0.05) 30%, transparent 60%), radial-gradient(ellipse at center 102%, rgba(139,31,27,0.16) 0%, transparent 50%)',
        }}
      />
      <Embers />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 78% 78% at 50% 48%, transparent 42%, rgba(0,0,0,0.55) 100%)',
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

// Soul-motes rising off the two torches. A fixed spread (clustered on the two
// torch columns at ~30% / ~70%) with per-mote duration / drift / climb / delay
// so the handful reads as organic rather than a marching grid.
const EMBERS = Array.from({ length: 16 }, (_, i) => {
  const column = i % 2 === 0 ? 30 : 70;
  return {
    left: column + (((i * 37) % 9) - 4),
    bottom: 30 + ((i * 53) % 22),
    dur: 6 + ((i * 7) % 5),
    delay: (i * 0.9) % 7,
    drift: (i % 2 === 0 ? -1 : 1) * (5 + (i % 4) * 4),
    climb: 180 + ((i * 29) % 120),
    size: i % 3 === 0 ? 3 : 2,
  };
});

function Embers() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="absolute animate-ember-rise"
          style={{
            left: `${e.left}%`,
            bottom: `${e.bottom}%`,
            width: e.size,
            height: e.size,
            background: i % 4 === 0 ? '#ffd479' : '#f4a742',
            boxShadow: '0 0 4px rgba(244,167,66,0.7)',
            animationDelay: `${e.delay}s`,
            ['--ember-dur' as string]: `${e.dur}s`,
            ['--ember-drift' as string]: `${e.drift}px`,
            ['--ember-climb' as string]: `${e.climb}px`,
          }}
        />
      ))}
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
