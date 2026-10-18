// Shared shells for the route error boundaries (app/error.tsx, app/global-error.tsx,
// app/tools/error.tsx) and the 404 page: one plain-English message, the error digest
// as a reference for support, and the way back — never a stack trace.
'use client';

import Link from 'next/link';
import { Button, Notice } from '@/components/ui-system';

export function ErrorShell({ heading, detail, digest, onRetry, homeHref }: {
  heading: string;
  detail: string;
  digest?: string;
  onRetry: () => void;
  /** Where "Back to Home" goes: / for the ERP, /tools for the standalone workspace. */
  homeHref: string;
}) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center gap-4 bg-canvas px-4 py-16">
      <h1 className="font-display text-page font-semibold text-ink">{heading}</h1>
      <Notice tone="danger" title="Your records are safe — nothing was changed.">
        {detail}{digest ? <> If you report this, quote reference <strong className="font-semibold">{digest}</strong>.</> : null}
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="refresh" onClick={onRetry}>Try again</Button>
        <Button asChild><Link href={homeHref}>Back to Home</Link></Button>
      </div>
    </main>
  );
}

export function NotFoundShell({ heading, detail, homeHref }: { heading: string; detail: string; homeHref: string }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center gap-4 bg-canvas px-4 py-16">
      <title>{`${heading} | MyOffice`}</title>
      <h1 className="font-display text-page font-semibold text-ink">{heading}</h1>
      <Notice tone="info" title={detail} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" asChild><Link href={homeHref}>Back to Home</Link></Button>
      </div>
    </main>
  );
}
