// app/tools/ToolsExport.tsx — download the current view as an Excel workbook, a Word document or a PDF.
'use client';

import { Icon } from '@/components/ui-system';
import { exportTable, type ExportTable } from './toolsExports';

const CHOICES = [
  { format: 'xlsx', title: 'Excel workbook', note: 'For filtering, analysis and updates', icon: 'download' },
  { format: 'docx', title: 'Word document', note: 'For reports and review', icon: 'download' },
  { format: 'pdf', title: 'PDF', note: 'For a stable printable record', icon: 'pdf' },
] as const;

export function ToolsExport({ data, onDone }: { data: ExportTable; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-body-sm text-ink-muted">Download the current view in the format that best fits your next task.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {CHOICES.map(choice => (
          <button key={choice.format} type="button" onClick={() => void exportTable(choice.format, data).then(onDone)}
            className="focus-ring flex flex-col items-start gap-1 rounded-card border border-line bg-surface-raised p-4 text-left transition-colors hover:border-action hover:bg-surface-subtle">
            <Icon name={choice.icon} size="md" />
            <strong className="font-sans text-body-sm font-medium text-ink">{choice.title}</strong>
            <span className="font-sans text-caption text-ink-muted">{choice.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
