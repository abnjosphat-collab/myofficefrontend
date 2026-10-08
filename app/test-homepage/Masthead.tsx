// app/test-homepage/Masthead.tsx — the page's opening row: today's date, a live
// freshness signal, and Tips one tap away. Deliberately static (not sticky): the
// shell's own top bar already owns the sticky Tools-grade strip, so this stays a
// calm editorial masthead instead of competing with it.
'use client';

import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@/components/ui-system';

function Tips() {
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" icon="help">Tips</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <h2 className="font-display text-title font-semibold text-ink">Getting around</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 font-sans text-body-sm text-ink-muted">
          <li>Search from the top bar to jump to any module.</li>
          <li>Pin the ones you always need to Favourites.</li>
          <li>Collapse the directory once you know your way around.</li>
          <li>This is a design concept — the real home page is unchanged.</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function Masthead({ live }: { live: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-subtle pb-4">
      <p className="font-sans text-body text-ink-muted">
        <strong className="font-display text-title font-semibold tracking-tight text-ink">Today</strong>
        {' \u00b7 '}
        {/* The server and the browser disagree on "now"; correct once rendered. */}
        <time suppressHydrationWarning dateTime={new Date().toISOString()}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </time>
      </p>
      <div className="flex items-center gap-3">
        <p role="status" className="flex items-center gap-2 font-sans text-caption text-ink-muted">
          <span className={cn('size-2 rounded-full', live ? 'bg-success' : 'bg-warning motion-safe:animate-pulse')} aria-hidden="true" />
          {live ? 'Live from the records' : 'Updating\u2026'}
        </p>
        <Tips />
      </div>
    </div>
  );
}
