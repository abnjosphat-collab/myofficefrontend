'use client';

import { useEffect, type ElementType, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ElementType;
  children: ReactNode;
  /** Action buttons shown at the bottom */
  footer?: ReactNode;
  /** 'sm' | 'md' | 'lg' | 'xl' — controls max-width */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Prevent closing when clicking the backdrop */
  static?: boolean;
}

const sizeMap: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function GlassModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  size = 'md',
  static: isStatic = false,
}: GlassModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isStatic) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isStatic, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isStatic ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`oz-glass-dark relative rounded-2xl w-full ${sizeMap[size] ?? sizeMap.md} max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || Icon) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="p-1.5 rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/20">
                  <Icon className="h-4 w-4 text-[#86BBD8]" />
                </div>
              )}
              {title && (
                <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
              )}
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white hover:bg-white/[0.15] transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.07] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
