import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { playSfx } from '../../engine/audio';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Set false to suppress the default ui_click sound. */
  clickSound?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] hover:bg-[var(--color-accent-torch)] border-[var(--color-accent-gold)]',
  secondary:
    'bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-panel-hover)] border-[var(--color-border-warm)] hover:border-[var(--color-accent-amber)]',
  danger:
    'bg-[var(--color-accent-deep-blood)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-blood)] border-[var(--color-accent-blood)]',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel)]/40 border-transparent hover:border-[var(--color-border-dim)]',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
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
      className={`btn-chunky relative border-2 uppercase tracking-wider font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    >
      {children}
    </button>
  );
}
