// app/tools/SetTypesView.tsx — the set-types list on the Sets & checks tab: every type with how many
// physical sets sit in store, how many are out, and how many need attention, plus Make more and Issue.
'use client';

import { useState } from 'react';
import { Button, EmptyState, Input, Notice } from '@/components/ui-system';
import type { ServerSetType } from './useToolsWorkspace';

export function SetTypesView({ types, error, onRetry, canManage, onMake, onIssue }: {
  types: ServerSetType[];
  error: string | null;
  onRetry: () => void;
  canManage: boolean;
  onMake: (typeId: string, count: number) => void;
  onIssue: (typeId: string) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  if (error) {
    return <Notice tone="warning" title="Set types unavailable">{error} <Button variant="secondary" onClick={onRetry}>Retry</Button></Notice>;
  }
  if (!types.length) {
    return (
      <EmptyState
        title="No set types yet"
        description="Enter a set's contents once with Add a set, then issue numbered sets to several people."
      />
    );
  }
  return (
    <section aria-label="Set types" className="flex flex-col gap-3">
      <h2 className="font-sans text-title font-semibold text-ink">Set types</h2>
      <ul className="flex flex-col gap-2">
        {types.filter(type => type.active).map(type => (
          <li key={type.id} className="flex flex-col gap-2 rounded-card border border-line-subtle bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <strong className="block font-sans text-body font-semibold text-ink">{type.title}</strong>
              <small className="block font-sans text-caption text-ink-muted">
                {type.line_count} {type.line_count === 1 ? 'piece' : 'pieces'} · {type.in_store} in store · {type.out} out{type.attention ? ` · ${type.attention} need attention` : ''}
                {type.competency_required ? ' · approval required' : ''}
              </small>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Input aria-label={`How many more ${type.title} sets`} value={counts[type.id] ?? '1'} inputMode="numeric" className="w-16"
                  onChange={event => setCounts(current => ({ ...current, [type.id]: event.target.value.replace(/[^0-9]/g, '').slice(0, 2) }))} />
                <Button variant="secondary" onClick={() => onMake(type.id, Math.max(1, Number(counts[type.id] ?? '1') || 1))}>Make more</Button>
                <Button variant="primary" onClick={() => onIssue(type.id)}>Issue</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
