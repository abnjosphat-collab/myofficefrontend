// app/maintenance/import/emaintImport.ts — M7: the eMaint import's per-kind
// configuration. The template the user downloads and the column guide on the
// page are generated from the same field lists, so they cannot disagree. The
// server re-checks everything (these lists are display copy, not the rule).

export type ImportKind = 'assets' | 'schedules';

export interface ImportField {
  key: string;
  header: string;
  required: boolean;
  help: string;
}

export interface ImportKindConfig {
  kind: ImportKind;
  tabLabel: string;
  title: string;
  description: string;
  /** Where the result step links ("see what landed"). */
  doneHref: string;
  doneLabel: string;
  /** Singular/plural for counts ("3 assets", "1 PM schedule"). */
  unit: [string, string];
  basePath: string;
  templateName: string;
  templateNote: string;
  fields: ImportField[];
}

export const ASSET_FIELDS: ImportField[] = [
  { key: 'asset_id', header: 'Asset ID', required: false, help: 'eMaint\u2019s key for the asset; becomes the register\u2019s Equipment ID. Rows without one get an EQ- number.' },
  { key: 'name', header: 'Asset Description', required: true, help: 'The machine\u2019s name on the register. Required.' },
  { key: 'category', header: 'Asset Type', required: false, help: 'Grouping such as Crushers or Pumps.' },
  { key: 'manufacturer', header: 'Manufacturer', required: false, help: 'Who made it. Held back for now: the register has no Manufacturer column yet, so it is reported but stored nowhere.' },
  { key: 'model', header: 'Model', required: false, help: 'Model name or number.' },
  { key: 'serial_number', header: 'Serial Number', required: false, help: 'Serial number or VIN.' },
  { key: 'location', header: 'Location', required: false, help: 'Where the machine sits.' },
  { key: 'department', header: 'Department', required: false, help: 'Owning department, e.g. Engineering.' },
  { key: 'status', header: 'Status', required: false, help: 'One of: Active, Under Maintenance, Out of Service, Retired, Standby. Blank means Active.' },
  { key: 'criticality', header: 'Criticality', required: false, help: 'High, Medium or Low. Held back for now: the register has no Criticality column yet, so it is reported but stored nowhere.' },
  { key: 'commission_date', header: 'Commission Date', required: false, help: 'YYYY-MM-DD or D/M/YYYY.' },
  { key: 'supplier', header: 'Supplier', required: false, help: 'Who it was bought from.' },
  { key: 'purchase_cost', header: 'Purchase Cost', required: false, help: 'A non-negative number.' },
  { key: 'warranty_info', header: 'Warranty Info', required: false, help: 'Warranty terms in words.' },
  { key: 'notes', header: 'Notes', required: false, help: 'Free text kept on the register.' },
];

export const SCHEDULE_FIELDS: ImportField[] = [
  { key: 'pm_id', header: 'PM ID', required: false, help: 'eMaint\u2019s reference for this PM; echoed in reports, not stored.' },
  { key: 'asset_id', header: 'Asset ID', required: false, help: 'The register machine\u2019s Equipment ID. One of this or Asset Description must name a register machine.' },
  { key: 'asset_name', header: 'Asset Description', required: false, help: 'The register machine\u2019s name. One of this or Asset ID must name a register machine.' },
  { key: 'title', header: 'PM Description', required: true, help: 'What the job is, e.g. Weekly liner check. Required.' },
  { key: 'frequency', header: 'Frequency', required: true, help: 'One of: Daily, Weekly, Biweekly, Monthly, Quarterly, Annual. Required.' },
  { key: 'next_due', header: 'Next Due', required: false, help: 'First due date, YYYY-MM-DD or D/M/YYYY. Blank means the next occurrence from today.' },
  { key: 'last_done', header: 'Last Done', required: false, help: 'Reference only; echoed in reports, not stored.' },
  { key: 'allocated_to', header: 'Assigned To', required: false, help: 'Who does the work.' },
  { key: 'department', header: 'Department', required: false, help: 'Department the jobs go to.' },
  { key: 'priority', header: 'Priority', required: false, help: 'One of: Low, Medium, High, Urgent (Critical counts as Urgent). Blank means Medium.' },
  { key: 'estimated_hours', header: 'Estimated Hours', required: false, help: 'Kept as written, e.g. 2 or 1.5.' },
  { key: 'instructions', header: 'Instructions', required: false, help: 'How the job is done.' },
  { key: 'active', header: 'Active', required: false, help: 'Yes or No (True/False, Active/Inactive work too). Blank means Yes.' },
];

export const IMPORT_CONFIGS: Record<ImportKind, ImportKindConfig> = {
  assets: {
    kind: 'assets',
    tabLabel: 'Assets',
    title: 'Import assets from eMaint',
    description: 'Upload the eMaint asset export. Each row is matched to the register: new machines are added, machines already there are left exactly as they are.',
    doneHref: '/equipment',
    doneLabel: 'View the register',
    unit: ['asset', 'assets'],
    basePath: '/api/emaint-import/assets',
    templateName: 'emaint-assets-template.csv',
    templateNote: 'A CSV with the expected column headings. Fill it in from the eMaint export, or upload the export itself when its headings match.',
    fields: ASSET_FIELDS,
  },
  schedules: {
    kind: 'schedules',
    tabLabel: 'PM schedules',
    title: 'Import PM schedules from eMaint',
    description: 'Upload the eMaint PM export. Each row is matched to a register machine and to the schedules already there: only genuinely new PMs are created.',
    doneHref: '/maintenance',
    doneLabel: 'View schedules',
    unit: ['PM schedule', 'PM schedules'],
    basePath: '/api/emaint-import/schedules',
    templateName: 'emaint-pm-schedules-template.csv',
    templateNote: 'A CSV with the expected column headings. The machine must already be on the register (import the assets first).',
    fields: SCHEDULE_FIELDS,
  },
};

/** The downloadable template: the expected headings, one row, nothing else. */
export function templateCsv(config: ImportKindConfig): string {
  return `${config.fields.map(f => f.header).join(',')}\n`;
}

/** Save small text (a template) straight from the browser — no server round trip. */
export function downloadTextFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function pluralize(n: number, [one, many]: [string, string]): string {
  return `${n} ${n === 1 ? one : many}`;
}
