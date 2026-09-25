'use client';

import { forwardRef } from 'react';
import { X } from './icons';
import { useTheme } from './tokens';
import styles from './dallaglio/controls.module.css';

export type CloseButtonSize = 'sm' | 'md' | 'lg';

export interface CloseButtonProps {
  onClick?: () => void;
  label?: string;
  size?: CloseButtonSize;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton({
  onClick,
  label = 'Close',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
}, ref) {
  const t = useTheme();

  if (t.design === 'dallaglio') {
    const sizeCls = size === 'sm' ? styles.closeSm : size === 'lg' ? styles.closeLg : '';
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        data-ds="close"
        className={`${styles.close} ${sizeCls} ${className}`}
      >
        <X className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      </button>
    );
  }

  const box = size === 'sm' ? 'h-10 w-10 min-h-10 min-w-10' : 'h-12 w-12 min-h-12 min-w-12';
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-ds="close"
      className={`flex ${box} cursor-pointer items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500/50 ${className}`}
    >
      <X className="h-5 w-5 shrink-0 pointer-events-none" aria-hidden />
    </button>
  );
});
