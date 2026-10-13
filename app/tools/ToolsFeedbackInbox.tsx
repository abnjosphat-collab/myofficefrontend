// app/tools/ToolsFeedbackInbox.tsx — the feedback people have sent (written and audio), newest first, each opening to its
// full text and recording.
'use client';

import { useState } from 'react';
import { Button, EmptyState, Icon } from '@/components/ui-system';
import { formatDateTime } from '@/lib/format';
import { ToolsDialog } from './ToolsUI';
import type { FeedbackRecord } from './ToolsAnalytics';

function Audio({ src }: { src: string }) {
  return <audio aria-label="Saved audio feedback" controls preload="metadata" src={src} className="w-full"><track kind="captions" srcLang="en" label="No captions available" /></audio>;
}

export function ToolsFeedbackInbox({ items, onAdd }: { items: FeedbackRecord[]; onAdd: () => void }) {
  const [selected, setSelected] = useState<FeedbackRecord | null>(null);
  return (
    <section className="flex flex-col gap-4" aria-label="Saved feedback">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-body-sm text-ink-muted">{items.length} {items.length === 1 ? 'entry' : 'entries'} · text and audio</p>
        <Button variant="primary" icon="plus" onClick={onAdd}>Send feedback</Button>
      </div>
      {items.length
        ? (
          <ul className="flex flex-col gap-3">
            {items.map(item => (
              <li key={item.id} className="rounded-card border border-[var(--mo-line-subtle)] bg-[var(--mo-surface-raised)]">
                <button type="button" onClick={() => setSelected(item)} aria-label={`Open feedback from ${item.by}`} className="focus-ring flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-[var(--mo-surface-subtle)]">
                  <span className="flex items-center gap-2 font-sans text-body-sm font-medium text-ink"><Icon name={item.audioUrl ? 'attachment' : 'edit'} size="sm" />{item.by}<time className="ml-auto font-normal text-ink-muted">{formatDateTime(item.at)}</time></span>
                  {item.text && <p className="line-clamp-2 font-sans text-body-sm text-ink-muted">{item.text}</p>}
                  <small className="font-sans text-caption text-ink-muted">Open details</small>
                </button>
                {item.audioUrl && <div className="flex flex-col gap-1 border-t border-[var(--mo-line-subtle)] p-3"><span className="font-sans text-caption text-ink-muted">Quick audio preview</span><Audio src={item.audioUrl} /></div>}
              </li>
            ))}
          </ul>
        )
        : <EmptyState icon="edit" title="No feedback saved yet" description="Written suggestions and audio recordings will appear here." />}
      <ToolsDialog open={!!selected} onClose={() => setSelected(null)} title="Feedback details" description={selected ? `${selected.by} · ${formatDateTime(selected.at)}` : ''} wide>
        {selected && (
          <div className="flex flex-col gap-4">
            {selected.text && <section><span className="font-sans text-caption text-ink-muted">Written feedback</span><p className="mt-1 whitespace-pre-wrap font-sans text-body-sm text-ink">{selected.text}</p></section>}
            {selected.audioUrl && <section><span className="font-sans text-caption text-ink-muted">Audio recording</span><div className="mt-1"><Audio src={selected.audioUrl} /></div></section>}
            {!selected.text && !selected.audioUrl && <p className="font-sans text-body-sm text-ink-muted">No feedback content is available.</p>}
          </div>
        )}
      </ToolsDialog>
    </section>
  );
}
