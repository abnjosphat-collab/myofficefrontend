// app/employees/RosterExportDialog.tsx — choose how the roster is organised (section, trade, or both) and whether it is an Excel
// workbook or a PDF, see how many people land in each group, and download it. A failed export says why and stays open.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, FieldGroup, Notice, SAVE_CHECK_MS, Segmented, useActionFeedback } from '@/components/ui-system';
import { EXPORT_GROUPS, exportRosterExcel, exportRosterPdf, previewGroups, type ExportGroupBy } from './exportRoster';
import type { Employee } from './types';

export function RosterExportDialog({ open, employees, onOpenChange }: { open: boolean; employees: Employee[]; onOpenChange: (open: boolean) => void }) {
  const [by, setBy] = useState<ExportGroupBy>('section_profession');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const fb = useActionFeedback(SAVE_CHECK_MS);
  const busy = fb.pending || fb.success;
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => previewGroups(employees, by), [employees, by]);
  const hint = EXPORT_GROUPS.find(g => g.value === by)?.hint;

  const run = () => {
    setError(null);
    let ok = false;
    void fb.run(async () => {
      try {
        if (format === 'excel') await exportRosterExcel(employees, by); else await exportRosterPdf(employees, by);
        ok = true; toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded, ${employees.length} employees.`);
      } catch (e) { setError(e instanceof Error ? e.message : 'The export failed.'); throw e; }
    }).then(() => { if (ok) window.setTimeout(() => onOpenChange(false), SAVE_CHECK_MS); });
  };

  return (
    <Dialog
      open={open} onOpenChange={o => { if (!busy) onOpenChange(o); }} size="md" title="Download the organised roster" description="Choose how to group it."
      footer={<><Button onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button><Button variant="primary" icon="download" pending={fb.pending} success={fb.success} onClick={run}>Download</Button></>}
    >
      <div className="flex flex-col gap-5">
        <FieldGroup label="Group by" description={hint}><Segmented label="Group by" value={by} onValueChange={setBy} options={EXPORT_GROUPS.map(g => ({ value: g.value, label: g.label }))} /></FieldGroup>
        <FieldGroup label="Format"><Segmented label="Format" value={format} onValueChange={setFormat} options={[{ value: 'excel', label: 'Excel' }, { value: 'pdf', label: 'PDF' }]} /></FieldGroup>
        <section aria-label="Groups in this download" className="flex flex-col gap-2">
          <p className="font-sans text-caption text-ink-muted" role="status">{preview.length} {preview.length === 1 ? 'group' : 'groups'}, {employees.length} people</p>
          <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">{preview.map(g => <li key={g.label} className="min-w-20 rounded-control border border-line bg-surface-subtle px-3 py-2 text-center"><p className="font-sans text-title font-semibold tabular text-ink">{g.count}</p><p className="max-w-[7rem] truncate font-sans text-caption text-ink-muted" title={g.label}>{g.label}</p></li>)}</ul>
        </section>
        {error && <Notice tone="danger" title="The download failed">{error}</Notice>}
      </div>
    </Dialog>
  );
}
