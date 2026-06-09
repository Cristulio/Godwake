import type { ReactNode } from 'react';
import { stripDiacritics } from '../../i18n';

type Tone = 'default' | 'warm' | 'glow';

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  default: 'panel-etched',
  warm: 'panel-etched-warm',
  glow: 'panel-etched-warm panel-warm-glow',
};

export function Panel({ children, className = '', title, tone = 'default' }: PanelProps) {
  return (
    <div
      className={`${toneClass[tone]} border border-[var(--color-border-warm)] p-4 ${className}`}
    >
      {title && (
        <h2 className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.2em] mb-3 pb-2 border-b border-[var(--color-border-dim)] flex items-center gap-2">
          <span className="text-[var(--color-accent-gold)]">◆</span>
          {stripDiacritics(title)}
        </h2>
      )}
      {children}
    </div>
  );
}
