// app/documents/FilterPanel.tsx — every way to narrow the list: kind of file, extension, tags, who added it, when, how big, starred,
// and whether to match names only. Options come from what is actually in the library (with counts), so nothing offered is empty.
'use client';

import { Button, Checkbox, Field, Input, Select, cn } from '@/components/ui-system';
import { DATE_PRESETS, SIZE_PRESETS, TYPE_ORDER, hasFilters, toggled, typeMeta } from './documentLogic';
import type { DatePreset, DocFilters, Facets, SizePreset } from './types';

const ANYONE = '__anyone';

function Chip({ pressed, onClick, children, count }: { pressed: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      type="button" aria-pressed={pressed} onClick={onClick}
      className={cn('focus-ring touch-target inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-sans text-caption transition-colors', pressed ? 'border-action bg-action-soft font-medium text-ink' : 'border-line-control bg-surface text-ink-muted hover:text-ink')}
    >
      {children}{count !== undefined && <span className="tabular text-ink-muted">{count}</span>}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><p className="font-sans text-label font-medium text-ink">{title}</p>{children}</div>;
}

export function FilterPanel({ filters, facets, inFolder, onChange, onClear }: {
  filters: DocFilters; facets: Facets; inFolder: boolean; onChange: (patch: Partial<DocFilters>) => void; onClear: () => void;
}) {
  const kinds = TYPE_ORDER.filter(t => (facets.types[t] ?? 0) > 0 || filters.types.includes(t));
  const exts = facets.exts.slice(0, 12);
  const tags = facets.tags.slice(0, 16);
  const uploaders = [{ value: ANYONE, label: 'Anyone' }, ...facets.uploaders.map(u => ({ value: u.name, label: `${u.name} (${u.count})` }))];

  return (
    <div className="flex max-h-[min(70dvh,34rem)] flex-col gap-4 overflow-y-auto pr-1">
      <Group title="Kind of file">
        <div className="flex flex-wrap gap-1.5">
          {kinds.length === 0 && <p className="font-sans text-body-sm text-ink-muted">No files yet.</p>}
          {kinds.map(t => <Chip key={t} pressed={filters.types.includes(t)} count={facets.types[t] ?? 0} onClick={() => onChange({ types: toggled(filters.types, t) })}>{typeMeta(t).plural}</Chip>)}
        </div>
      </Group>

      {exts.length > 0 && (
        <Group title="Extension">
          <div className="flex flex-wrap gap-1.5">
            {exts.map(e => <Chip key={e.ext} pressed={filters.exts.includes(e.ext)} count={e.count} onClick={() => onChange({ exts: toggled(filters.exts, e.ext) })}>.{e.ext}</Chip>)}
          </div>
        </Group>
      )}

      {tags.length > 0 && (
        <Group title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => <Chip key={t.tag} pressed={filters.tags.includes(t.tag)} count={t.count} onClick={() => onChange({ tags: toggled(filters.tags, t.tag) })}>{t.tag}</Chip>)}
          </div>
        </Group>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Added"><Select aria-label="Added" value={filters.added} onValueChange={v => onChange({ added: v as DatePreset })} options={DATE_PRESETS} /></Field>
        <Field label="Size"><Select aria-label="Size" value={filters.size} onValueChange={v => onChange({ size: v as SizePreset })} options={SIZE_PRESETS} /></Field>
        {filters.added === 'custom' && (
          <>
            <Field label="From"><Input type="date" value={filters.from} max={filters.to || undefined} onChange={e => onChange({ from: e.target.value })} /></Field>
            <Field label="To"><Input type="date" value={filters.to} min={filters.from || undefined} onChange={e => onChange({ to: e.target.value })} /></Field>
          </>
        )}
        {facets.uploaders.length > 0 && (
          <Field label="Added by" className="sm:col-span-2">
            <Select aria-label="Added by" value={filters.uploader || ANYONE} onValueChange={v => onChange({ uploader: v === ANYONE ? '' : v })} options={uploaders} />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox label="Starred only" checked={filters.starred} onChange={e => onChange({ starred: e.target.checked })} />
        <Checkbox label="Match names only" description="Skip the words written inside files." checked={filters.namesOnly} onChange={e => onChange({ namesOnly: e.target.checked })} />
        {inFolder && <Checkbox label="Include files from subfolders" description="Otherwise a folder lists only the files directly in it." checked={filters.subfolders} onChange={e => onChange({ subfolders: e.target.checked })} />}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line-subtle pt-3">
        <span className="font-sans text-caption text-ink-muted">{hasFilters(filters) ? 'Filters are on.' : 'No filters.'}</span>
        <Button size="sm" variant="ghost" disabled={!hasFilters(filters) && !filters.namesOnly && !filters.subfolders} onClick={onClear}>Clear filters</Button>
      </div>
    </div>
  );
}

/** How many separate filters are on, for the badge on the Filters button. */
export function filterCount(f: DocFilters): number {
  return f.types.length + f.exts.length + f.tags.length + (f.uploader ? 1 : 0) + (f.starred ? 1 : 0) + (f.added !== 'any' ? 1 : 0) + (f.size !== 'any' ? 1 : 0) + (f.namesOnly ? 1 : 0);
}

