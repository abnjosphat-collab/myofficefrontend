'use client';

import type { CSSProperties, ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, Plus } from '../icons';
import { useTheme, usePrefersReducedMotion, type Accent } from '../tokens';
import { handleModalEscapeKeyDown } from '../dialog-shared';
import { DsIcon } from '../DsIcon';
import type { IconMeaning } from '../shared/icon-meanings';
import { Button } from '../Button';
import { CloseButton } from '../CloseButton';

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

export function DallaglioCard({
  className = '', surface, onClick, style, children,
}: {
  color?: string;
  className?: string;
  surface?: string;
  onClick?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  forceGlow?: boolean;
  elevated?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <motion.div
      data-ds="card"
      onClick={onClick}
      style={style}
      initial={false}
      whileHover={{ y: -4 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`${surface ?? `${t.glass} rounded-[13px]`} ${t.shadow} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function DallaglioEmptyState({
  icon: Icon, meaning, title, message, action,
}: {
  icon: ElementType; meaning?: IconMeaning; title: string; message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const t = useTheme();
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {meaning ? <DsIcon name={meaning} size={32} className={t.textFaint} /> : <Icon className={`h-8 w-8 ${t.textFaint}`} weight="light" />}
      <div className={`mt-4 text-[23px] font-normal tracking-[-0.04em] ${t.textPrimary}`}>{title}</div>
      {message && <div className={`text-[12px] mt-2 mb-4 max-w-xs ${t.textFaint}`}>{message}</div>}
      {action && (
        <Button type="button" size="md" icon={Plus} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function DallaglioCenterModal({
  open, onClose, title, subtitle, width = 'max-w-md', children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  accent?: Accent; width?: string; children: ReactNode;
}) {
  const t = useTheme();
  const reduced = usePrefersReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      {open && (
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-[rgba(27,22,43,0.38)] backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            />
          </Dialog.Overlay>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content asChild aria-describedby={undefined} onEscapeKeyDown={handleModalEscapeKeyDown}>
              <motion.div
                data-ds="modal"
                className={`relative w-full ${width} max-h-[85vh] ${t.glass} rounded-[18px] flex flex-col overflow-hidden focus:outline-none`}
                style={{ boxShadow: '0 28px 90px #19102938' }}
                initial={reduced ? false : { opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={`relative px-[30px] pt-[26px] pb-[21px] border-b ${t.border} shrink-0`}>
                  <Dialog.Close asChild>
                    <CloseButton className="absolute top-[18px] right-[18px] z-20" />
                  </Dialog.Close>
                  <Dialog.Title asChild>
                    <h2 className={`pr-14 text-[28px] font-normal leading-tight tracking-[-0.045em] ${t.textPrimary}`}>{title}</h2>
                  </Dialog.Title>
                  {subtitle && (
                    <p className={`relative ${t.textSecondary} text-[12px] mt-1.5 pr-14 leading-relaxed`}>{subtitle}</p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-[30px] py-6">{children}</div>
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}

export function DallaglioStatusBadge({ color, label }: { color: string; label: string; dot?: boolean }) {
  const t = useTheme();
  return (
    <span data-ds="badge" className={`inline-flex items-center gap-1.5 text-[11px] font-normal ${t.textSecondary}`}>
      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export function DallaglioSearchInput({
  value, onChange, placeholder = 'Search…', className = '',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const t = useTheme();
  return (
    <div data-ds="search" className={`relative ${className}`}>
      <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textFaint}`}>
        <DsIcon name="search" />
      </span>
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        name="search"
        className={`w-full h-[42px] pl-9 pr-3 rounded-[9px] text-[12px] ${t.inputBg} focus:outline-none focus:shadow-[0_0_0_3px_var(--d-focus)]`}
      />
    </div>
  );
}

export function DallaglioViewToggle<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; icon?: React.ElementType; meaning?: IconMeaning; label: string }[];
}) {
  const t = useTheme();
  return (
    <div data-ds="toggle" className={`flex items-center gap-0.5 p-[3px] rounded-[9px] border ${t.border} ${t.glass}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          aria-label={opt.label}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-[33px] w-[33px] grid place-items-center rounded-[6px] transition-colors ${
            value === opt.value ? `${t.chipBg} ${t.linkText}` : `${t.textFaint} ${t.hoverText}`
          }`}
        >
          {opt.meaning ? <DsIcon name={opt.meaning} /> : opt.icon ? <opt.icon className="h-4 w-4" weight="light" /> : null}
        </button>
      ))}
    </div>
  );
}

export function DallaglioPageHero({
  icon: Icon, meaning, crumbs, title, description, actions, statsOpen, children,
}: {
  icon: React.ElementType; meaning?: IconMeaning; accent?: Accent; iconTone?: string;
  crumbs?: string[]; title: string; description?: string;
  actions?: ReactNode; statsOpen?: boolean; children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <div data-ds="hero" className="px-0 py-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {crumbs && crumbs.length > 0 && (
            <nav className={`flex items-center gap-1.5 text-[11px] ${t.textFaint} mb-2`}>
              {crumbs.map((crumb, i) => (
                <span key={crumb} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span>{crumb}</span>
                </span>
              ))}
            </nav>
          )}
          <p className={`text-[11px] tracking-[0.14em] font-medium uppercase ${t.textFaint}`}>MyOffice</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`grid h-[31px] w-[31px] place-items-center rounded-[9px] border ${t.border} ${t.glass} ${t.shadow}`}>
              {meaning ? <DsIcon name={meaning} size={19} className={t.textPrimary} /> : <Icon className={`h-[19px] w-[19px] ${t.textPrimary}`} weight="light" />}
            </span>
            <h1 className={`text-[clamp(28px,3.2vw,43px)] font-normal tracking-[-0.055em] leading-tight ${t.textPrimary}`}>{title}</h1>
          </div>
          {description && (
            <p className={`text-[12px] ${t.textFaint} mt-2 max-w-2xl`}>{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && (
        <Collapse open={statsOpen !== false}>
          <div className={`mt-5 ${t.glass} rounded-[12px] ${t.shadow}`}>{children}</div>
        </Collapse>
      )}
    </div>
  );
}

export function DallaglioStatStrip({
  items, className = '',
}: {
  items: { label: string; value: string | number; suffix?: string; href?: string }[];
  className?: string;
}) {
  const t = useTheme();
  return (
    <div data-ds="strip" className={`grid grid-cols-2 md:grid-cols-4 ${className}`}>
      {items.map((stat, i) => {
        const inner = (
          <>
            <span className={`flex items-center gap-1.5 text-[11px] ${t.textFaint}`}>{stat.label}</span>
            <strong className={`block text-[25px] font-normal tracking-[-0.04em] tabular-nums ${t.textPrimary}`}>
              {stat.value}{stat.suffix}
            </strong>
          </>
        );
        return (
          <div key={stat.label} className={`px-5 py-3 ${i > 0 ? `border-l ${t.border}` : ''}`}>
            {stat.href ? <Link href={stat.href} className="block">{inner}</Link> : inner}
          </div>
        );
      })}
    </div>
  );
}

export function dallaglioInfoCardStyle(light: boolean): CSSProperties {
  return {
    backgroundColor: light ? '#ffffff' : '#111113',
    borderColor: light ? '#e6e3ee' : '#2d2d32',
  };
}

