// app/test-homepage/Briefing.tsx — the one-line operations verdict and its single
// contextual action. Deliberately compact: a greeting and a wall clock cost a
// full fold without answering anything, while this line answers the only arrival
// question ("do I need to do anything?") and gets out of the way.
'use client';

import Link from 'next/link';
import { Button, Skeleton, cn } from '@/components/ui-system';
import type { Verdict } from './verdict';

const TONE_DOT: Record<Verdict['tone'], string> = {
  clear: 'bg-success',
  attention: 'bg-warning',
  critical: 'bg-danger',
  unknown: 'bg-neutral',
};

export function Briefing({
  verdict,
  onReload,
  onNavigate,
}: {
  /** Null while any backing source is still loading. */
  verdict: Verdict | null;
  onReload: () => void;
  /** Module-open instrumentation for the CTA (keeps usage counts honest). */
  onNavigate: (href: string) => void;
}) {
  return (
    <section aria-label="Operations summary" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {verdict === null ? (
        <div role="status" aria-label="Loading operations summary" className="flex min-w-0 flex-1 items-center">
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
      ) : (
        <p className="flex min-w-0 flex-1 basis-64 items-start gap-2.5 font-sans text-body text-ink">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_DOT[verdict.tone])} aria-hidden="true" />
          <span>
            <strong className="font-semibold">{verdict.headline}</strong>
            {verdict.detail && <span className="text-ink-muted"> {verdict.detail}</span>}
          </span>
        </p>
      )}
      {verdict !== null && (verdict.cta || verdict.suggestReload) && (
        <div className="flex shrink-0 items-center gap-2">
          {verdict.cta && (
            <Button
              asChild
              variant={verdict.tone === 'clear' ? 'secondary' : 'primary'}
              iconAfter="chevron-right"
            >
              <Link href={verdict.cta.href} onClick={() => onNavigate(verdict.cta!.href)}>{verdict.cta.label}</Link>
            </Button>
          )}
          {verdict.suggestReload && (
            <Button variant="secondary" onClick={onReload}>Reload</Button>
          )}
        </div>
      )}
    </section>
  );
}
