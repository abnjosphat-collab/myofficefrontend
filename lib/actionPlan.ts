// lib/actionPlan.ts — shared progress computation for the SHEQ-style "action
// plan" pattern (pto/ActionPlanItem, vfl/ActionItem, work_stoppage/
// CorrectiveAction): each report carries a list of follow-up actions with a
// Pending/In Progress/Completed status, and every page independently
// recomputed the same total/completed/inProgress/pct shape from it. One
// generic function instead — parameterized by the item shape via T, the
// same "share the computation, not the data model" idea as count_by.

export interface ActionPlanSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  pct: number;
}

export function summarizeActions<T extends { status: 'Pending' | 'In Progress' | 'Completed' }>(
  actions?: T[]
): ActionPlanSummary {
  const total = actions?.length ?? 0;
  const completed = actions?.filter(a => a.status === 'Completed').length ?? 0;
  const inProgress = actions?.filter(a => a.status === 'In Progress').length ?? 0;
  return {
    total, completed, inProgress,
    pending: total - completed - inProgress,
    pct: total ? Math.round((completed / total) * 100) : 0,
  };
}
