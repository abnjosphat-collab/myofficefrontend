'use client';

import { createElement, forwardRef, type ElementType, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2 } from './icons';
import { useTheme, ACCENT, type Accent } from './tokens';
import styles from './dallaglio/controls.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps {
  children?: ReactNode;
  icon?: ElementType;
  iconPosition?: 'start' | 'end';
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  disabled?: boolean;
  submitting?: boolean;
  fullWidth?: boolean;
  href?: string;
  title?: string;
  className?: string;
  accent?: Accent;
  danger?: boolean;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}

function classicClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  t: ReturnType<typeof useTheme>,
  accent: Accent,
  danger: boolean,
  fullWidth: boolean,
) {
  const sizeCls = size === 'md'
    ? (variant === 'icon' ? 'h-10 w-10' : 'py-2.5 px-5 rounded-xl text-sm')
    : size === 'xs'
      ? (variant === 'icon' ? 'h-8 w-8' : 'py-2 px-2.5 rounded-lg text-[12px]')
      : (variant === 'icon' ? 'h-8 w-8' : 'h-8 px-3 rounded-lg text-[13px]');
  const fill = variant === 'danger' || danger
    ? t.ctaDanger
    : variant === 'primary'
      ? `text-white bg-gradient-to-br ${ACCENT[accent].gradient} ${ACCENT[accent].solidGlow} hover:brightness-110`
      : variant === 'subtle'
        ? 'bg-brand-500/15 hover:bg-brand-500/25 text-brand-400'
        : variant === 'ghost' || variant === 'icon'
          ? `${t.textMuted} ${t.hoverText} ${t.hoverBg}`
          : `${t.textMuted} ${t.hoverText} border ${t.border}`;
  const weight = variant === 'primary' || variant === 'danger' || danger ? 'font-semibold' : 'font-medium';
  return `${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center gap-1.5 ${sizeCls} ${weight} transition-all disabled:opacity-50 ${fill}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children, icon: Icon, iconPosition = 'start', variant = 'primary', size = 'sm',
  type = 'button', disabled, submitting, fullWidth = false, href, title, className = '',
  accent = 'violet', danger = false, onClick,
}, ref) {
  const t = useTheme();
  const resolved: ButtonVariant = danger ? 'danger' : variant;
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const glyph = submitting
    ? <Loader2 className={`${iconSize} animate-spin`} />
    : Icon
      ? createElement(Icon, {
          className: iconSize,
          weight: t.design === 'dallaglio' ? 'light' : undefined,
          'aria-hidden': true,
        })
      : null;
  const content = (
    <>
      {iconPosition === 'start' && glyph}
      {children}
      {iconPosition === 'end' && glyph}
    </>
  );

  if (t.design === 'dallaglio') {
    const sizeCls = size === 'md' ? styles.sizeMd : size === 'xs' ? styles.sizeXs : styles.sizeSm;
    const cls = `${styles.btn} ${styles[resolved]} ${sizeCls} ${fullWidth ? 'flex-1 w-full' : ''} ${className}`;
    if (href && !disabled && !submitting) {
      return <Link href={href} onClick={onClick} title={title} data-ds="button" data-variant={resolved} className={cls}>{content}</Link>;
    }
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || submitting}
        title={title}
        data-ds="button"
        data-variant={resolved}
        className={cls}
      >
        {content}
      </button>
    );
  }

  const cls = `${classicClasses(resolved, size, t, accent, danger, fullWidth)} ${className}`;
  if (href && !disabled && !submitting) {
    return <Link href={href} onClick={onClick} title={title} data-ds="cta" className={cls}>{content}</Link>;
  }
  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || submitting}
      title={title}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      data-ds="cta"
      className={cls}
    >
      {content}
    </motion.button>
  );
});
