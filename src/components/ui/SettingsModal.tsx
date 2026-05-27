import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import {
  useGameStore,
  getSlotMetadata,
  SAVE_SLOT_IDS,
  type SaveSlotId,
  type SaveSlotMetadata,
} from '../../stores/gameStore';
import { Button } from './Button';

interface SettingsModalProps {
  onClose: () => void;
}

type Section = 'audio' | 'gameplay' | 'save';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [section, setSection] = useState<Section>('audio');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="panel-etched-warm border-2 border-[var(--color-border-warm)] p-0 w-[min(96vw,640px)] max-h-[88vh] flex flex-col shadow-2xl animate-scale-in"
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border-warm)] px-5 py-3">
          <h2 className="font-display text-[var(--color-accent-amber)] text-sm uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="text-[var(--color-accent-gold)]">◆</span> Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-amber)] text-lg leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <nav className="flex gap-2 px-5 py-3 border-b border-[var(--color-border-dim)]">
          <TabButton active={section === 'audio'} onClick={() => setSection('audio')}>Audio</TabButton>
          <TabButton active={section === 'gameplay'} onClick={() => setSection('gameplay')}>Gameplay</TabButton>
          <TabButton active={section === 'save'} onClick={() => setSection('save')}>Save Data</TabButton>
        </nav>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          {section === 'audio' && <AudioSection />}
          {section === 'gameplay' && <GameplaySection />}
          {section === 'save' && <SaveDataSection />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
        active
          ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-accent-amber)]'
          : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
      }`}
    >
      {children}
    </button>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  formatter,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatter?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-3 mb-3 last:mb-0">
      <span className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest w-20">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-[var(--color-accent-amber)]"
      />
      <span className="text-[var(--color-text-dim)] text-[10px] font-mono w-14 text-right">
        {formatter ? formatter(value) : Math.round(value * 100)}
      </span>
    </label>
  );
}

function AudioSection() {
  const muted = useAudioStore((s) => s.muted);
  const masterVolume = useAudioStore((s) => s.masterVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em]">
          Sound output
        </span>
        <button
          type="button"
          onClick={toggleMuted}
          className={`px-3 py-1 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
            muted
              ? 'border-[var(--color-accent-blood)] bg-[var(--color-bg-panel)] text-[var(--color-accent-blood)]'
              : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
          }`}
        >
          {muted ? '× Muted' : '▸ Sound on'}
        </button>
      </div>
      <SliderRow label="Master" value={masterVolume} onChange={setMasterVolume} />
      <SliderRow label="SFX" value={sfxVolume} onChange={setSfxVolume} />
      <SliderRow label="Music" value={musicVolume} onChange={setMusicVolume} />
      <p className="text-[var(--color-text-muted)] text-[10px] italic mt-3">
        Music is muted by default. Drag the slider up to wake the ambient bed.
      </p>
    </div>
  );
}

function GameplaySection() {
  const speedMultiplier = useGameStore((s) => s.speedMultiplier);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const autoEndTurnDelayMs = useGameStore((s) => s.autoEndTurnDelayMs);
  const setAutoEndTurnDelay = useGameStore((s) => s.setAutoEndTurnDelay);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em]">
          Combat speed
        </span>
        <div className="flex gap-1">
          {[1, 2].map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => setSpeed(mult as 1 | 2)}
              className={`px-3 py-1 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                speedMultiplier === mult
                  ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-accent-amber)]'
                  : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
              }`}
            >
              {mult}× speed
            </button>
          ))}
        </div>
      </div>
      <SliderRow
        label="Turn end"
        value={autoEndTurnDelayMs}
        onChange={setAutoEndTurnDelay}
        min={300}
        max={2200}
        step={100}
        formatter={(v) => `${Math.round(v)} ms`}
      />
      <p className="text-[var(--color-text-muted)] text-[10px] italic mt-2 leading-tight">
        Delay before your turn auto-ends when no actions remain. Lower = snappier.
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SaveDataSection() {
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const exportSlot = useGameStore((s) => s.exportSlot);
  const importToSlot = useGameStore((s) => s.importToSlot);
  const character = useGameStore((s) => s.character);
  const [bump, setBump] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<1 | 2 | null>(null);
  const [importText, setImportText] = useState('');

  function refresh(msg?: string) {
    setBump((b) => b + 1);
    if (msg) {
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 2500);
    }
  }

  const slots = SAVE_SLOT_IDS.map((id) => ({ id, meta: getSlotMetadata(id) }));
  void bump;

  async function handleExport(slot: SaveSlotId) {
    const json = exportSlot(slot);
    if (!json) {
      refresh('Slot is empty.');
      return;
    }
    try {
      await navigator.clipboard.writeText(json);
      refresh('Save copied to clipboard.');
    } catch {
      refresh('Clipboard blocked — copy manually.');
    }
  }

  function handleImport() {
    if (importTarget === null) return;
    const result = importToSlot(importTarget, importText);
    if (result.ok) {
      setImportTarget(null);
      setImportText('');
      refresh(`Imported into slot ${importTarget}.`);
    } else {
      refresh(result.reason ?? 'Import failed.');
    }
  }

  return (
    <div>
      <p className="text-[var(--color-text-muted)] text-[10px] italic mb-3 leading-tight">
        Slot 0 is the autosave — written on every change. Slots 1 and 2 are manual backups.
      </p>

      <div className="space-y-2">
        {slots.map(({ id, meta }) => (
          <SlotRow
            key={id}
            slot={id}
            meta={meta}
            canSave={!!character}
            onSave={() => {
              const r = saveToSlot(id);
              refresh(r.ok ? `Saved to slot ${id}.` : r.reason ?? 'Save failed.');
            }}
            onLoad={() => {
              const r = loadFromSlot(id);
              refresh(r.ok ? `Loaded slot ${id}.` : r.reason ?? 'Load failed.');
            }}
            onDelete={() => {
              if (window.confirm(`Delete slot ${id}? This cannot be undone.`)) {
                deleteSlot(id);
                refresh(`Slot ${id} cleared.`);
              }
            }}
            onExport={() => handleExport(id)}
            onImport={id === 0 ? undefined : () => { setImportTarget(id as 1 | 2); setImportText(''); }}
          />
        ))}
      </div>

      {feedback && (
        <div className="mt-3 text-[var(--color-accent-amber)] text-[11px] tracking-wider">
          {feedback}
        </div>
      )}

      {importTarget !== null && (
        <div className="mt-4 panel-etched border border-[var(--color-border-warm)] p-3">
          <div className="font-display text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em] mb-2">
            Import into slot {importTarget}
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste the JSON copied from Export here…"
            rows={6}
            className="w-full bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] text-[var(--color-text-primary)] text-[11px] font-mono p-2 mb-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleImport} disabled={!importText.trim()}>
              Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SlotRowProps {
  slot: SaveSlotId;
  meta: SaveSlotMetadata | null;
  canSave: boolean;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport?: () => void;
}

function SlotRow({ slot, meta, canSave, onSave, onLoad, onDelete, onExport, onImport }: SlotRowProps) {
  const isAuto = slot === 0;
  return (
    <div className="panel-etched border border-[var(--color-border-warm)] p-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mb-1">
          Slot {slot}{isAuto && <span className="text-[var(--color-text-muted)]"> · autosave</span>}
        </div>
        {meta ? (
          <>
            <div className="text-[var(--color-text-primary)] text-sm">
              {meta.characterName}{meta.characterLevel ? ` · L${meta.characterLevel}` : ''} · {meta.location}
            </div>
            <div className="text-[var(--color-text-muted)] text-[10px] font-mono">
              {formatRelative(meta.savedAt)}
              {meta.chapterCleared > 0 && ` · Ch I cleared`}
            </div>
          </>
        ) : (
          <div className="text-[var(--color-text-muted)] text-sm italic">Empty</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!isAuto && (
          <Button size="sm" variant="primary" onClick={onSave} disabled={!canSave}>
            Save here
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onLoad} disabled={!meta}>
          Load
        </Button>
        <Button size="sm" variant="ghost" onClick={onExport} disabled={!meta}>
          Export
        </Button>
        {onImport && (
          <Button size="sm" variant="ghost" onClick={onImport}>
            Import
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={onDelete} disabled={!meta}>
          Delete
        </Button>
      </div>
    </div>
  );
}
