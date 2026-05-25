import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Panel({ children, className = '', title }: PanelProps) {
  return (
    <div
      className={`bg-[var(--color-bg-panel)] border border-[var(--color-border-warm)] p-4 ${className}`}
    >
      {title && (
        <h2 className="text-[var(--color-accent-amber)] text-sm uppercase tracking-wider mb-3 border-b border-[var(--color-border-dim)] pb-2">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
