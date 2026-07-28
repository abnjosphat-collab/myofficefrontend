// app/reports/types.ts — the generated-reports gallery's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Like inventory.tsx
// and av.tsx, this page has no backend — reports are localStorage-persisted, seeded
// from generateSampleReports() on first load. Component prop interfaces
// (ReportCardProps) stay in page.tsx — coupled to the card/list-item components, not
// the page's data contract.

export interface ReportMetadata { totalRecords: number; columns: string[]; }
export interface Report {
  id: string; title: string; type: string; format: string;
  description?: string; generatedAt: string;
  data: Record<string, unknown>[];
  columns?: string[]; metadata?: ReportMetadata;
}
