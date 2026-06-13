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
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(255,206,150,0.03) 0 1px, transparent 1px 42px, rgba(0,0,0,0.5) 42px 44px), repeating-linear-gradient(90deg, transparent 0 116px, rgba(0,0,0,0.28) 116px 118px)',
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
      {/* Rusted iron cell grid — rust-toned vertical bars + two horizontal
          cross-rails (top & bottom), top-lit, with a turbulence rust mottle.
          Masked clear of the centre so the logo stays legible. */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1200 720"
        aria-hidden
        style={{
          opacity: 0.92,
          WebkitMaskImage:
            'radial-gradient(ellipse 40% 40% at 50% 42%, transparent 0%, transparent 14%, black 60%)',
          maskImage:
            'radial-gradient(ellipse 40% 40% at 50% 42%, transparent 0%, transparent 14%, black 60%)',
        }}
      >
        <defs>
          <linearGradient id="rustV" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0c0704" />
            <stop offset="16%" stopColor="#3a2313" />
            <stop offset="40%" stopColor="#7e4d2c" />
            <stop offset="52%" stopColor="#9c633a" />
            <stop offset="72%" stopColor="#532f1c" />
            <stop offset="100%" stopColor="#090503" />
          </linearGradient>
          <linearGradient id="rustH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c0704" />
            <stop offset="22%" stopColor="#7e4d2c" />
            <stop offset="46%" stopColor="#9c633a" />
            <stop offset="72%" stopColor="#452a19" />
            <stop offset="100%" stopColor="#090503" />
          </linearGradient>
          <linearGradient id="barLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.22" />
            <stop offset="42%" stopColor="#ffd9a0" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
          </linearGradient>
          <filter id="rustMottle">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.16" numOctaves="2" seed="11" result="n" />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0.42  0 0 0 0 0.26  0 0 0 0 0.13  0 0 0 0.55 0"
            />
          </filter>
          <pattern id="vbars" width="92" height="720" patternUnits="userSpaceOnUse">
            <rect x="39" y="0" width="15" height="720" fill="url(#rustV)" />
            <rect x="39" y="0" width="15" height="720" filter="url(#rustMottle)" opacity="0.35" style={{ mixBlendMode: 'overlay' }} />
          </pattern>
        </defs>
        {/* Vertical bars */}
        <rect width="1200" height="720" fill="url(#vbars)" />
        {/* Two horizontal cross-rails */}
        <g>
          <rect x="0" y="74" width="1200" height="18" fill="url(#rustH)" />
          <rect x="0" y="74" width="1200" height="18" filter="url(#rustMottle)" opacity="0.35" style={{ mixBlendMode: 'overlay' }} />
          <rect x="0" y="610" width="1200" height="18" fill="url(#rustH)" />
          <rect x="0" y="610" width="1200" height="18" filter="url(#rustMottle)" opacity="0.35" style={{ mixBlendMode: 'overlay' }} />
        </g>
        {/* Whole-grid top lighting */}
        <rect width="1200" height="720" fill="url(#barLight)" style={{ mixBlendMode: 'soft-light' }} />
      </svg>
      {/* Torch light-pools (flicker) — tall warm washes down each torch column */}
      <div
        className="absolute inset-0 pointer-events-none animate-torch-flicker"
        style={{
          background:
            'radial-gradient(ellipse 200px 340px at 19% 38%, rgba(255,179,71,0.15) 0%, transparent 70%), radial-gradient(ellipse 200px 340px at 81% 38%, rgba(255,179,71,0.15) 0%, transparent 70%)',
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

      {/* Tall wall-torches flanking the central column — flame up at the title,
          the pole running the height of the menu down toward New Game. */}
      <TallTorch side="left" />
      <TallTorch side="right" />

      <div className="relative z-10 text-center animate-fade-in-slow">
        <div className="flex items-center justify-center mb-2">
          <h1
            className={`font-display text-4xl sm:text-5xl md:text-7xl tracking-[0.15em] text-[var(--color-accent-amber)] transition-all duration-1000 ${
              glow ? 'drop-shadow-[0_0_42px_rgba(244,167,66,0.55)]' : 'drop-shadow-[0_0_8px_rgba(244,167,66,0.2)]'
            }`}
            style={{ textShadow: '0 0 12px rgba(255,179,71,0.4), 4px 4px 0 rgba(0,0,0,0.85)' }}
          >
            GODWAKE
          </h1>
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

// Soul-motes / ash drifting up across the cell. A fixed spread (full width, a
// touch denser on the two torch columns) with per-mote duration / drift / climb
// / delay so the swarm reads as organic rather than a marching grid.
const EMBERS = Array.from({ length: 34 }, (_, i) => {
  // Every third mote hugs a torch column (~19% / 81%); the rest fill the width.
  const onTorch = i % 3 === 0;
  const left = onTorch
    ? (i % 6 === 0 ? 19 : 81) + (((i * 13) % 7) - 3)
    : 8 + ((i * 167) % 84);
  return {
    left,
    bottom: 16 + ((i * 53) % 42),
    dur: 6 + ((i * 7) % 6),
    delay: (i * 0.6) % 8,
    drift: (i % 2 === 0 ? -1 : 1) * (4 + (i % 5) * 4),
    climb: 200 + ((i * 29) % 170),
    size: i % 4 === 0 ? 3 : 2,
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

// A tall wall-sconce torch: flame at the top (level with the title), a long iron
// pole running down the height of the menu toward New Game, held by a bracket.
function TallTorch({ side }: { side: 'left' | 'right' }) {
  const gid = `poleGrad-${side}`;
  return (
    <svg
      viewBox="0 0 28 240"
      preserveAspectRatio="xMidYMin meet"
      className={`absolute top-[30%] h-[44%] w-auto z-10 pointer-events-none animate-torch-flicker ${
        side === 'left' ? 'left-[15%]' : 'right-[15%] -scale-x-100'
      }`}
      aria-hidden
    >
      {/* Glow */}
      <ellipse cx="14" cy="24" rx="20" ry="30" fill="#FFB347" opacity="0.14" />
      {/* Flame */}
      <ellipse cx="14" cy="24" rx="9" ry="18" fill="#FF6B2B" opacity="0.96" />
      <ellipse cx="14" cy="19" rx="5.6" ry="13" fill="#FFB347" opacity="0.96" />
      <ellipse cx="14" cy="15" rx="3.2" ry="8" fill="#FFD700" />
      <ellipse cx="14" cy="34" rx="4" ry="2.6" fill="#FF4730" opacity="0.6" />
      {/* Sconce cup */}
      <rect x="8" y="40" width="12" height="6" fill="#6B4A2E" />
      <rect x="7" y="46" width="14" height="3" fill="#3A2E22" />
      {/* Long pole — lit warm by the flame near the top, fading dark down the wall */}
      <rect x="11" y="46" width="6" height="194" fill={`url(#${gid})`} />
      {/* Torch-side rim highlight so the iron rod catches the light */}
      <rect x="11" y="46" width="1.4" height="194" fill={`url(#${gid}-rim)`} />
      {/* Iron bracket pinning the pole to the wall partway down */}
      <rect x="5" y="150" width="18" height="4" fill="#4A3826" />
      <rect x="5" y="150" width="18" height="1.5" fill="#7a5836" />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c98a4a" />
          <stop offset="18%" stopColor="#7a5230" />
          <stop offset="100%" stopColor="#241910" />
        </linearGradient>
        <linearGradient id={`${gid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffcf8a" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#d49a5a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d49a5a" stopOpacity="0.08" />
        </linearGradient>
      </defs>
    </svg>
  );
}
