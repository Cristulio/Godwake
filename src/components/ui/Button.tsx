import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] hover:bg-[var(--color-accent-torch)] border-[var(--color-accent-gold)]',
  secondary:
    'bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-panel-hover)] border-[var(--color-border-warm)]',
  danger:
    'bg-[var(--color-accent-blood)] text-[var(--color-text-primary)] hover:opacity-90 border-[var(--color-accent-blood)]',
};

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 border-2 uppercase tracking-wider text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
