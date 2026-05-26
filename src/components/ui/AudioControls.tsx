import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import { useGameStore } from '../../stores/gameStore';

/**
 * Persistent corner widget for audio mute/volume + key gameplay settings.
 * Collapsed: a single button. Expanded: a small panel with sliders.
 */
export function AudioControls() {
  const muted = useAudioStore((s) => s.muted);
  const masterVolume = useAudioStore((s) => s.masterVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);

  const autoEndTurnDelayMs = useGameStore((s) => s.autoEndTurnDelayMs);
  const setAutoEndTurnDelay = useGameStore((s) => s.setAutoEndTurnDelay);

  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [expanded]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-3 right-3 z-40 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      {expanded && (
        <div className="mb-2 panel-etched-warm border-2 border-[var(--color-border-warm)] p-3 w-64 shadow-xl animate-scale-in">
          <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <span className="text-[var(--color-accent-gold)]">◆</span> Audio
          </div>
          <SliderRow
            label="Master"
            value={masterVolume}
            onChange={setMasterVolume}
          />
          <SliderRow label="SFX" value={sfxVolume} onChange={setSfxVolume} />
          <SliderRow
            label="Music"
            value={musicVolume}
            onChange={setMusicVolume}
          />
          <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mt-3 mb-2 pt-2 border-t border-[var(--color-border-dim)] flex items-center gap-2">
            <span className="text-[var(--color-accent-gold)]">◆</span> Gameplay
          </div>
          <label className="flex items-center gap-2 mb-2">
            <span className="text-[var(--color-text-secondary)] text-[9px] uppercase tracking-widest w-14">
              Turn End
            </span>
            <input
              type="range"
              min={300}
              max={2200}
              step={100}
              value={autoEndTurnDelayMs}
              onChange={(e) => setAutoEndTurnDelay(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--color-accent-amber)]"
              title="Delay before your turn auto-ends when no actions remain (ms)"
            />
            <span className="text-[var(--color-text-dim)] text-[9px] font-mono w-10 text-right">
              {autoEndTurnDelayMs}
            </span>
          </label>
          <div className="text-[var(--color-text-muted)] text-[9px] italic leading-tight">
            Lower = snappier turns. Higher = more time to think.
          </div>
        </div>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={toggleMuted}
          title={muted ? 'Unmute' : 'Mute'}
          className={`
            px-2 py-1 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors
            ${muted
              ? 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-dim)]'
              : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'}
          `}
        >
          {muted ? '× Muted' : '▸ Sound'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title="Settings"
          className="px-2 py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest font-bold transition-colors"
        >
          {expanded ? '▾ Close' : '⚙ Settings'}
        </button>
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, onChange }: SliderRowProps) {
  return (
    <label className="flex items-center gap-2 mb-2 last:mb-0">
      <span className="text-[var(--color-text-secondary)] text-[9px] uppercase tracking-widest w-14">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-[var(--color-accent-amber)]"
      />
      <span className="text-[var(--color-text-dim)] text-[9px] font-mono w-10 text-right">
        {Math.round(value * 100)}
      </span>
    </label>
  );
}
