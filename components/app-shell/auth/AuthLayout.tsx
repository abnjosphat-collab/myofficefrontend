// components/app-shell/auth/AuthLayout.tsx — the page every sign-in surface shares: a deep-space canvas, one centred glass card with the brand
// mark, a title and a line of context, and an optional link back to Tools & Equipment. Used by /login, /auth/*, the access gate and
// the two-factor prompt, so they cannot drift apart.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, cn } from '@/components/ui-system';
import { DeepSpaceStage, deepSpaceGlass } from '@/components/shared/deep-space/DeepSpaceStage';

export function BrandMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('inline-flex size-11 items-center justify-center rounded-card bg-action font-display text-title font-semibold text-action-ink', className)}>O</span>;
}

export function AuthCard({ title, description, children, headingId = 'auth-title', logo }: { title: string; description?: string; children?: ReactNode; headingId?: string; /** An optional mark shown above the title (the Tools sign-in carries the Dallaglio logo). */ logo?: ReactNode }) {
  return (
    <section aria-labelledby={headingId} className={cn('w-full max-w-md p-6 sm:p-12', deepSpaceGlass)}>
      {/* Sign-in screens had the bare "MyOffice" tab title; the card title travels with the card. React 19 hoists this to <head>. */}
      <title>{`${title} | MyOffice`}</title>
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        {logo}
        <div>
          <h1 id={headingId} className="font-display text-section font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 font-sans text-body-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A full-page, centred auth surface over the deep-space field. `back` shows the way back to Tools & Equipment, the standalone workspace.
 */
export function AuthPage({ children, back = false }: { children: ReactNode; back?: boolean }) {
  return (
    <DeepSpaceStage>
      <main className="flex w-full flex-col items-center gap-4">
        {children}
        {back && (
          <Link href="/tools" className="focus-ring touch-target inline-flex items-center gap-1.5 rounded-control px-3 font-sans text-body-sm text-ink-muted hover:text-ink">
            <Icon name="chevron-left" size="sm" />Return to Tools &amp; Equipment
          </Link>
        )}
      </main>
    </DeepSpaceStage>
  );
}
