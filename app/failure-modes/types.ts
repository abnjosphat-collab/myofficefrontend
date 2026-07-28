// app/failure-modes/types.ts — the FMEA failure-mode register's data model. Split
// out of page.tsx as part of the standing "decompose on touch" convention.

export interface FailureModeAPI {
  id: number; equipment_type?: string; component?: string; failure_mode?: string; failure_cause?: string;
  severity?: number; probability?: number; detectability?: number; occurrence_count?: number;
  last_occurred?: string; corrective_action?: string; preventive_action?: string;
}

export interface FailureMode {
  id: number; equipType: string; component: string; failureMode: string; failureCause: string;
  severity: number; probability: number; detectability: number; rpn: number;
  occurrences: number; lastOccurred: string;
  corrective: string; preventive: string;
}
