// app/compressors/SectionView.tsx — how one independently loaded block presents loading, failure and stale data.
// A failed load is never shown as "no data": the reason is shown with a retry, and rows already loaded stay visible.
'use client';

import type { ReactNode } from 'react';
import { Button, Notice, LoadingPulse } from '@/components/ui-system';
import type { Section } from './useCompressorsData';

export function SectionView<T>({ section, subject, onRetry, children }: {
  section: Section<T>;
  /** Lower case, used in every message: "performance metrics". */
  subject: string;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}) {
  const cap = subject.charAt(0).toUpperCase() + subject.slice(1);
  if (!section.loaded && section.error) {
    return <Notice tone="danger" title={`${cap} could not be loaded`} action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{section.error}</Notice>;
  }
  if (!section.loaded) return <LoadingPulse label={`Loading ${subject}`} />;
  return (
    <div className="flex flex-col gap-3">
      {section.error && <Notice tone="warning" title={`${cap} may be out of date`} action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{section.error}</Notice>}
      {children(section.data)}
    </div>
  );
}
