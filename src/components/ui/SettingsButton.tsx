import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useAudioStore } from '../../stores/audioStore';
import { SettingsModal } from './SettingsModal';

/**
 * Fixed top-right gear button. Hidden on the title screen so it doesn't
 * fight with the painted backdrop. A short mute pill sits next to it for
 * one-tap silencing without opening the modal.
 */
export function SettingsButton() {
  const screen = useGameStore((s) => s.screen);
  const muted = useAudioStore((s) => s.muted);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const [open, setOpen] = useState(false);

  if (screen === 'title') return null;

  return (
    <>
      <div className="fixed top-3 right-3 z-40 flex items-center gap-1 select-none">
        <button
          type="button"
          onClick={toggleMuted}
          title={muted ? 'Unmute' : 'Mute'}
          className={`px-2 py-1 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
            muted
              ? 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-dim)]'
              : 'bg-[var(--color-bg-panel)] border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'
          }`}
        >
          {muted ? '× Muted' : '▸ Sound'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Settings"
          aria-label="Settings"
          className="px-2 py-1 border-2 border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest font-bold transition-colors"
        >
          ⚙ Settings
        </button>
      </div>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
