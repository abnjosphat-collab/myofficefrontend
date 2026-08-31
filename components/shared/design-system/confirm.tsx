// components/shared/design-system/confirm.tsx — the app's standard confirmation dialog,
// replacing native window.confirm() (which is unthemed, blocking, and off-brand).
//
// Usage: mount <ConfirmProvider> once near the app root, then in any component:
//     const confirm = useConfirm();
//     if (await confirm({ title: 'Delete this?', destructive: true })) { ... }
//
// The promise resolves true on confirm, false on cancel/backdrop/Esc. This mirrors
// window.confirm()'s boolean contract so call sites migrate with a one-line change.
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from './tokens';
import { AlertTriangle } from './icons';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button + warning icon — for deletes and other irreversible actions. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Returns an async confirm() — resolves true if the user confirms, false otherwise. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  const destructive = opts?.destructive;

  // Escape-to-close, wired at the document level rather than an onKeyDown prop on
  // the dialog's non-interactive (role="alertdialog") container — a plain div isn't
  // a keyboard-interactive element, so a JSX keydown handler there both trips
  // jsx-a11y/no-noninteractive-element-interactions and is fragile in practice (it'd
  // only fire while focus happens to be somewhere inside the dialog). A document
  // listener works reliably for as long as the dialog is open, matching how real
  // modal implementations do this.
  useEffect(() => {
    if (!opts) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [opts, close]);

  // Move focus into the dialog on open — WAI-ARIA modal-dialog practice, done via a ref
  // + effect rather than the `autoFocus` JSX prop (which jsx-a11y/no-autofocus flags,
  // since it's disorienting when misused on ordinary page-load form fields; a genuine
  // modal moving focus to itself is the sanctioned exception). Defaults to Cancel, not
  // Confirm/Delete, so an accidental Enter press can't complete a destructive action.
  useEffect(() => {
    if (opts) cancelRef.current?.focus();
  }, [opts]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
          >
            <motion.div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => close(false)}
            />
            <motion.div
              className={`relative w-full max-w-sm ${t.glass} rounded-xl ${t.shadow} p-5`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            >
              <div className="flex items-start gap-3">
                {destructive && (
                  <div className="h-9 w-9 shrink-0 rounded-full bg-rose-500/15 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-semibold ${t.textPrimary}`}>{opts.title}</h3>
                  {opts.message && <p className={`text-xs mt-1 ${t.textMuted}`}>{opts.message}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => close(false)}
                  className={`h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} transition-colors`}
                >
                  {opts.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`h-8 px-3.5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110 ${
                    destructive
                      ? 'bg-gradient-to-br from-rose-500 to-rose-700'
                      : 'bg-gradient-to-br from-brand-500 to-brand-700'
                  }`}
                >
                  {opts.confirmLabel ?? (destructive ? 'Delete' : 'Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
