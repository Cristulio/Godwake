import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../../stores/audioStore';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  useGameStore,
  getSlotMetadata,
  SAVE_SLOT_IDS,
  type SaveSlotId,
  type SaveSlotMetadata,
} from '../../stores/gameStore';
import { Button } from './Button';
import { useT } from '../../i18n/useT';
import { LOCALES, type Locale } from '../../i18n';

interface SettingsModalProps {
  onClose: () => void;
}

type Section = 'audio' | 'gameplay' | 'language' | 'save';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useT();
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
            <span className="text-[var(--color-accent-gold)]">◆</span> {t('ui.settings.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-amber)] text-lg leading-none"
            aria-label={t('ui.settings.closeAria')}
          >
            ×
          </button>
        </header>

        <nav className="flex gap-2 px-5 py-3 border-b border-[var(--color-border-dim)]">
          <TabButton active={section === 'audio'} onClick={() => setSection('audio')}>{t('ui.settings.tabAudio')}</TabButton>
          <TabButton active={section === 'gameplay'} onClick={() => setSection('gameplay')}>{t('ui.settings.tabGameplay')}</TabButton>
          <TabButton active={section === 'language'} onClick={() => setSection('language')}>{t('ui.settings.tabLanguage')}</TabButton>
          <TabButton active={section === 'save'} onClick={() => setSection('save')}>{t('ui.settings.tabSave')}</TabButton>
        </nav>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          {section === 'audio' && <AudioSection />}
          {section === 'gameplay' && <GameplaySection />}
          {section === 'language' && <LanguageSection />}
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

const LOCALE_LABEL_KEY: Record<Locale, string> = {
  en: 'ui.settings.langEnglish',
  es: 'ui.settings.langSpanish',
};

function LanguageSection() {
  const { t, locale } = useT();
  const setLocale = useSettingsStore((s) => s.setLocale);
  return (
    <div>
      <div className="font-display text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em] mb-4">
        {t('ui.settings.tongue')}
      </div>
      <div className="flex flex-col gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-4 py-2 border-2 text-sm tracking-widest font-bold text-left transition-colors ${
              locale === l
                ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-accent-amber)]'
                : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
            }`}
          >
            {locale === l ? '◆ ' : ''}{t(LOCALE_LABEL_KEY[l])}
          </button>
        ))}
      </div>
      <p className="text-[var(--color-text-muted)] text-[10px] italic mt-3 leading-tight">
        {t('ui.settings.languageHint')}
      </p>
    </div>
  );
}

function AudioSection() {
  const { t } = useT();
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
          {t('ui.settings.soundOutput')}
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
          {muted ? `× ${t('ui.settings.muted')}` : `▸ ${t('ui.settings.soundOn')}`}
        </button>
      </div>
      <SliderRow label={t('ui.settings.master')} value={masterVolume} onChange={setMasterVolume} />
      <SliderRow label={t('ui.settings.sfx')} value={sfxVolume} onChange={setSfxVolume} />
      <SliderRow label={t('ui.settings.music')} value={musicVolume} onChange={setMusicVolume} />
      <p className="text-[var(--color-text-muted)] text-[10px] italic mt-3">
        {t('ui.settings.musicHint')}
      </p>
    </div>
  );
}

function GameplaySection() {
  const { t } = useT();
  const speedMultiplier = useSettingsStore((s) => s.speedMultiplier);
  const setSpeed = useSettingsStore((s) => s.setSpeed);
  const autoEndTurnDelayMs = useSettingsStore((s) => s.autoEndTurnDelayMs);
  const setAutoEndTurnDelay = useSettingsStore((s) => s.setAutoEndTurnDelay);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em]">
          {t('ui.settings.combatSpeed')}
        </span>
        <div className="flex gap-1">
          {[1, 2, 4].map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => setSpeed(mult as 1 | 2 | 4)}
              className={`px-3 py-1 border-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                speedMultiplier === mult
                  ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)] text-[var(--color-accent-amber)]'
                  : 'border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-amber)]'
              }`}
            >
              {t('ui.settings.speedSuffix', { n: mult })}
            </button>
          ))}
        </div>
      </div>
      <SliderRow
        label={t('ui.settings.turnEnd')}
        value={autoEndTurnDelayMs}
        onChange={setAutoEndTurnDelay}
        min={300}
        max={2200}
        step={100}
        formatter={(v) => `${Math.round(v)} ms`}
      />
      <p className="text-[var(--color-text-muted)] text-[10px] italic mt-2 leading-tight">
        {t('ui.settings.turnEndHint')}
      </p>
    </div>
  );
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function formatRelative(iso: string, t: Translate): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return t('ui.settings.justNow');
  if (m < 60) return t('ui.settings.minutesAgo', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('ui.settings.hoursAgo', { n: h });
  const d = Math.round(h / 24);
  return t('ui.settings.daysAgo', { n: d });
}

function SaveDataSection() {
  const { t } = useT();
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
      refresh(t('ui.settings.slotEmpty'));
      return;
    }
    try {
      await navigator.clipboard.writeText(json);
      refresh(t('ui.settings.saveCopied'));
    } catch {
      refresh(t('ui.settings.clipboardBlocked'));
    }
  }

  function handleImport() {
    if (importTarget === null) return;
    const result = importToSlot(importTarget, importText);
    if (result.ok) {
      setImportTarget(null);
      setImportText('');
      refresh(t('ui.settings.importedInto', { n: importTarget }));
    } else {
      refresh(result.reason ?? t('ui.settings.importFailed'));
    }
  }

  return (
    <div>
      <p className="text-[var(--color-text-muted)] text-[10px] italic mb-3 leading-tight">
        {t('ui.settings.saveSlotsHint')}
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
              refresh(r.ok ? t('ui.settings.savedToSlot', { n: id }) : r.reason ?? t('ui.settings.saveFailed'));
            }}
            onLoad={() => {
              const r = loadFromSlot(id);
              refresh(r.ok ? t('ui.settings.loadedSlot', { n: id }) : r.reason ?? t('ui.settings.loadFailed'));
            }}
            onDelete={() => {
              if (window.confirm(t('ui.settings.deleteConfirm', { n: id }))) {
                deleteSlot(id);
                refresh(t('ui.settings.slotCleared', { n: id }));
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
            {t('ui.settings.importInto', { n: importTarget })}
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={t('ui.settings.importPlaceholder')}
            rows={6}
            className="w-full bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] text-[var(--color-text-primary)] text-[11px] font-mono p-2 mb-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportTarget(null)}>
              {t('ui.common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleImport} disabled={!importText.trim()}>
              {t('ui.common.import')}
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
  const { t } = useT();
  const isAuto = slot === 0;
  return (
    <div className="panel-etched border border-[var(--color-border-warm)] p-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.3em] mb-1">
          {t('ui.settings.slot', { n: slot })}{isAuto && <span className="text-[var(--color-text-muted)]"> · {t('ui.settings.autosaveTag')}</span>}
        </div>
        {meta ? (
          <>
            <div className="text-[var(--color-text-primary)] text-sm">
              {meta.characterName}{meta.characterLevel ? ` · L${meta.characterLevel}` : ''} · {meta.location}
            </div>
            <div className="text-[var(--color-text-muted)] text-[10px] font-mono">
              {formatRelative(meta.savedAt, t)}
              {meta.chapterCleared > 0 && ` · ${t('ui.settings.chapterCleared', { n: meta.chapterCleared })}`}
            </div>
          </>
        ) : (
          <div className="text-[var(--color-text-muted)] text-sm italic">{t('ui.settings.empty')}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!isAuto && (
          <Button size="sm" variant="primary" onClick={onSave} disabled={!canSave}>
            {t('ui.settings.saveHere')}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onLoad} disabled={!meta}>
          {t('ui.common.load')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onExport} disabled={!meta}>
          {t('ui.common.export')}
        </Button>
        {onImport && (
          <Button size="sm" variant="ghost" onClick={onImport}>
            {t('ui.common.import')}
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={onDelete} disabled={!meta}>
          {t('ui.common.delete')}
        </Button>
      </div>
    </div>
  );
}
