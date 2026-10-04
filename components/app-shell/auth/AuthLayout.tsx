// components/app-shell/auth/AuthLayout.tsx — the page every sign-in surface shares: a quiet canvas, one centred card with the brand
// mark, a title and a line of context, and an optional link back to Tools & Equipment. Used by /login, /auth/*, the access gate and
// the two-factor prompt, so they cannot drift apart.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, cn } from '@/components/ui-system';

export function BrandMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('inline-flex size-11 items-center justify-center rounded-card bg-action font-display text-title font-semibold text-action-ink', className)}>O</span>;
}

export function AuthCard({ title, description, children, headingId = 'auth-title' }: { title: string; description?: string; children?: ReactNode; headingId?: string }) {
  return (
    <section aria-labelledby={headingId} className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark />
        <div>
          <h1 id={headingId} className="font-display text-section font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 font-sans text-body-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A full-page, centred auth surface. `back` shows the way back to Tools & Equipment, the standalone workspace. */
export function AuthPage({ children, back = false, fixed = true }: { children: ReactNode; back?: boolean; fixed?: boolean }) {
  return (
    <main className={cn('flex flex-col items-center justify-center gap-4 overflow-y-auto bg-canvas px-4 py-8', fixed ? 'fixed inset-0 z-[var(--mo-z-modal)]' : 'min-h-dvh')}>
      {children}
      {back && (
        <Link href="/tools" className="focus-ring touch-target inline-flex items-center gap-1.5 rounded-control px-3 font-sans text-body-sm text-ink-muted hover:text-ink">
          <Icon name="chevron-left" size="sm" />Return to Tools &amp; Equipment
        </Link>
      )}
    </main>
  );
}
