'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '../primitives/Button';
import { Icon } from '../foundations/Icon';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling + warning icon, for deletes and other irreversible actions. */
  destructive?: boolean;
}

/** Opens the shared confirmation and resolves true on confirm, false on cancel / Escape. */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Async confirmation, mirroring window.confirm()'s boolean contract:
 *   if (await confirm({ title: 'Delete this work order?', destructive: true })) { … }
 */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return context;
}

/** Mount once near the root (components/Providers.tsx). Focus starts on Cancel so Enter cannot complete a destructive action. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(next => {
    // A second confirm() while one is open cancels the first rather than orphaning its promise.
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const destructive = options?.destructive;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={open => { if (!open) settle(false); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[var(--mo-z-overlay)] bg-[var(--mo-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--mo-duration-base)]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[var(--mo-z-dialog)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface p-5 font-sans text-ink shadow-dialog outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.985] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--mo-duration-slow)]">
            <div className="flex items-start gap-3">
              {destructive && (
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <Icon name="warning" size="md" weight="emphasis" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <AlertDialog.Title className="font-display text-title font-semibold text-ink">{options?.title}</AlertDialog.Title>
                <AlertDialog.Description className={options?.message ? 'mt-1 text-body-sm text-ink-muted' : 'sr-only'}>
                  {options?.message ?? options?.title}
                </AlertDialog.Description>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">{options?.cancelLabel ?? 'Cancel'}</Button>
              </AlertDialog.Cancel>
              <Button variant={destructive ? 'danger' : 'primary'} onClick={() => settle(true)}>
                {options?.confirmLabel ?? (destructive ? 'Delete' : 'Confirm')}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
