import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { playSfx } from '../../engine/audio';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** Set false to suppress the default ui_click sound. */
  clickSound?: boolean;
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
  clickSound = true,
  onClick,
  ...rest
}: ButtonProps) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (clickSound && !rest.disabled) playSfx('ui_click');
    onClick?.(e);
  }
  return (
    <button
      {...rest}
      onClick={handleClick}
      className={`px-4 py-2 border-2 uppercase tracking-wider text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
