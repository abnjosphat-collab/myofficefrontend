// app/timesheets/DownloadDialog.tsx — download the roster's timesheet as Excel or PDF, combined for everyone or for one person. The files are
// built in the browser by exportTimesheet.ts; a failure is shown here and the dialog stays open.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, Notice, SAVE_CHECK_MS, Segmented, Select, useActionFeedback } from '@/components/ui-system';
import { makeExporters, type ExportArgs } from './exportTimesheet';
import { fmtPeriod } from './timesheetMeta';

export function DownloadDialog(props: Omit<ExportArgs, 'scope' | 'empId'> & { initialScope?: 'combined' | 'individual'; initialEmpId?: string; onClose: () => void }) {
  const { onClose, initialScope, initialEmpId, ...rest } = props;
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'combined' | 'individual'>(initialScope ?? 'combined');
  const [empId, setEmpId] = useState(initialEmpId ?? '');
  const fb = useActionFeedback(SAVE_CHECK_MS);
  const busy = fb.pending || fb.success;
  const [error, setError] = useState<string | null>(null);
  const generate = () => {
    if (scope === 'individual' && !empId) { setError('Choose which employee to download.'); return; }
    setError(null);
    let ok = false;
    void fb.run(async () => {
      try {
        const ex = makeExporters({ ...rest, scope, empId });
        if (format === 'excel') await ex.downloadExcel(); else await ex.downloadPDF();
        ok = true; toast.success('Download started.');
      } catch (e) { setError(`The download failed: ${(e as Error).message}`); throw e; }
    }).then(() => { if (ok) window.setTimeout(onClose, SAVE_CHECK_MS); });
  };
  return (
    <Dialog
      open onOpenChange={o => { if (!o && !busy) onClose(); }} size="sm" title="Download timesheet" description={fmtPeriod(rest.period)}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" icon="download" pending={fb.pending} success={fb.success} onClick={generate}>Download</Button></>}
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="danger" title="Not downloaded">{error}</Notice>}
        <Segmented label="Format" value={format} onValueChange={v => setFormat(v as 'excel' | 'pdf')} options={[{ value: 'excel', label: 'Excel (.xlsx)' }, { value: 'pdf', label: 'PDF' }]} />
        <Segmented label="Who" value={scope} onValueChange={v => setScope(v as 'combined' | 'individual')} options={[{ value: 'combined', label: `Everyone (${rest.employees.length})` }, { value: 'individual', label: 'One employee' }]} />
        {scope === 'individual' && <Field label="Employee" required><Select aria-label="Employee" value={empId} onValueChange={setEmpId} options={rest.employees.map(e => ({ value: e.id, label: e.name }))} placeholder="Choose an employee" /></Field>}
      </div>
    </Dialog>
  );
}
