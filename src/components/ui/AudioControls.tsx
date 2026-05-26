import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audioStore';

/**
 * Persistent corner widget for mute + volume.
 * Collapsed: a single button. Expanded: a small panel with three sliders.
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
        <div className="mb-2 bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] p-3 w-56 shadow-xl animate-fade-in">
          <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mb-2">
            Audio
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
        </div>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={toggleMuted}
          title={muted ? 'Unmute' : 'Mute'}
          className={`
            px-2 py-1 border-2 text-[10px] uppercase tracking-widest font-bold
            ${muted
              ? 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-dim)]'
              : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)]'}
          `}
        >
          {muted ? '× Muted' : '▸ Audio'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title="Audio settings"
          className="px-2 py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] text-[10px] uppercase tracking-widest font-bold"
        >
          {expanded ? '▾' : '▴'}
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
      <span className="text-[var(--color-text-secondary)] text-[9px] uppercase tracking-widest w-12">
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
      <span className="text-[var(--color-text-dim)] text-[9px] font-mono w-8 text-right">
        {Math.round(value * 100)}
      </span>
    </label>
  );
}
