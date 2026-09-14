export type NecImportJob = {
  id: string;
  status: string;
  payroll_year: number;
  payroll_month: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
  documents: { id: string; filename: string; sha256: string; duplicate_of_upload?: boolean }[];
  review_json_path: string | null;
  extraction_provider: string | null;
  error: string | null;
};

export type NecImportPreview = {
  period: { start: string; end: string };
  stats: Record<string, number>;
  missing_sheets: { database_id: number; human_code: string | null; name: string }[];
  duplicate_sheet_groups: { key: string; sheet_ids: string[] }[];
  sheet_summaries: {
    sheet_id: string;
    human_code: string | null;
    name: string;
    status: string;
    match_evidence: string;
    database_id: number | null;
  }[];
  line_items: {
    date: string;
    human_code: string;
    kind: string;
    reason: string;
    interpreted?: Record<string, unknown>;
    source?: Record<string, unknown>;
  }[];
};

export type NecImportConfig = {
  extraction_provider: string;
  requires_review_json_upload: boolean;
  env: string;
};
