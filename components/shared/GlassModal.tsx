'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ElementType;
  children: ReactNode;
  footer?: ReactNode;
  /** 'sm' | 'md' | 'lg' | 'xl' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Prevent closing on backdrop click */
  static?: boolean;
}

const sizeMap: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Duration must match CSS animation duration */
const EXIT_MS = 200;

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
  // mounted = DOM is present, closing = exit animation playing
  const [mounted,  setMounted]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Open path
  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setClosing(false);
      setMounted(true);
    }
  }, [isOpen]);

  // Close path — play exit animation, then unmount
  const handleClose = () => {
    if (isStatic) return;
    setClosing(true);
    timerRef.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      onClose();
    }, EXIT_MS);
  };

  // Keyboard
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isStatic]);

  // Sync: if parent forcibly sets isOpen=false while we're open, trigger exit
  useEffect(() => {
    if (!isOpen && mounted && !closing) handleClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!mounted) return null;

  const panelAnim  = closing ? 'oz-modal-panel-out'    : 'oz-modal-panel-in';
  const backdropAnim = closing ? 'oz-modal-backdrop-out' : 'oz-modal-backdrop-in';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/65 backdrop-blur-sm ${backdropAnim}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'oz-modal-title' : undefined}
        className={`oz-glass-dark relative rounded-2xl w-full ${sizeMap[size] ?? sizeMap.md} max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${panelAnim}`}
      >
        {/* Header */}
        {(title || Icon) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="p-1.5 rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/20 shrink-0">
                  <Icon className="h-4 w-4 text-[#86BBD8]" />
                </div>
              )}
              {title && (
                <h2 id="oz-modal-title" className="text-base font-semibold text-white tracking-tight">
                  {title}
                </h2>
              )}
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={handleClose}
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
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.07] shrink-0 w-full">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
