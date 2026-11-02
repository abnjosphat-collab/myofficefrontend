// app/training/calcTrainingBulk.ts — pure bulk-certification-entry logic.
// Extracted beside the page (not inline) so every rule here has a test:
// the server enforces duplicates and scope, but the form warns early, builds
// the payload, and sorts outcomes without trusting its own loaded list.
import { normalizeDesignation } from '@/lib/employeeCatalog';
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { BulkItemResult, BulkPersonOverride, BulkSharedDetails, Certification } from './types';

/** Personnel numbers compare uppercased and trimmed: "c1165" is "C1165". */
export const normalizeEmployeeId = (value: unknown): string =>
  String(value ?? '').trim().toUpperCase();

/** The accidental-duplicate identity: person + certification + training date. */
export const bulkKey = (employeeId: string, certification: string, trainingDate: string): string =>
  `${normalizeEmployeeId(employeeId)}|${certification.trim().toLowerCase()}|${trainingDate}`;

/**
 * A client-side pre-check against the loaded register: who among these people
 * already holds this certification for this date. Advisory only — the server
 * is the authority and the list may be stale or scoped.
 */
export function findExistingDuplicates(
  certs: Certification[], employeeIds: string[], certification: string, trainingDate: string,
): Set<string> {
  if (!certification.trim() || !trainingDate) return new Set();
  const wanted = certification.trim().toLowerCase();
  const ids = new Set(employeeIds.map(normalizeEmployeeId));
  const found = new Set<string>();
  for (const c of certs) {
    if (!ids.has(normalizeEmployeeId(c.employee_id))) continue;
    if ((c.certification_name || '').trim().toLowerCase() !== wanted) continue;
    if ((c.training_date || '') !== trainingDate) continue;
    found.add(normalizeEmployeeId(c.employee_id));
  }
  return found;
}

export interface RegisterFilter {
  query: string;
  designation: string;
  section: string;
  department: string;
}

const personText = (e: EmployeeLookup): string =>
  [e.full_name, e.name, e.first_name, e.last_name, e.employee_id, e.designation, e.position]
    .filter(v => typeof v === 'string' && v.trim())
    .join(' ')
    .toLowerCase();

/**
 * The register narrowed by actual register fields: free text over
 * name/number/designation, plus exact trade (designation, alias-tolerant),
 * section and department filters.
 */
export function filterRegister(employees: EmployeeLookup[], filter: RegisterFilter): EmployeeLookup[] {
  const q = filter.query.trim().toLowerCase();
  const trade = normalizeDesignation(filter.designation).trim().toLowerCase();
  return employees.filter(e => {
    if (!e.employee_id) return false;
    if (q && !personText(e).includes(q) && !String(e.employee_id).toLowerCase().includes(q)) return false;
    if (trade && normalizeDesignation(String(e.designation ?? e.position ?? '')).trim().toLowerCase() !== trade) return false;
    if (filter.section && (e.section ?? '') !== filter.section) return false;
    if (filter.department && (e.department ?? '') !== filter.department) return false;
    return true;
  });
}

export function distinctDesignations(employees: EmployeeLookup[]): string[] {
  return [...new Set(employees.map(e => String(e.designation ?? e.position ?? '').trim()).filter(Boolean))].sort();
}

export function distinctSections(employees: EmployeeLookup[]): string[] {
  return [...new Set(employees.map(e => String(e.section ?? '').trim()).filter(Boolean))].sort();
}

export function distinctDepartments(employees: EmployeeLookup[]): string[] {
  return [...new Set(employees.map(e => String(e.department ?? '').trim()).filter(Boolean))].sort();
}

/** The shared details plus one entry per person, per-person differences kept. */
export function buildBulkPayload(
  shared: BulkSharedDetails, people: { employee_id: string }[],
  overrides: Record<string, BulkPersonOverride | undefined>,
): { shared: BulkSharedDetails; items: BulkPersonOverride[] } {
  const seen = new Set<string>();
  const items: BulkPersonOverride[] = [];
  for (const p of people) {
    const id = normalizeEmployeeId(p.employee_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ employee_id: id, ...(overrides[id] ?? {}) });
  }
  return { shared, items };
}

export interface SplitResults {
  created: BulkItemResult[];
  skipped: BulkItemResult[];
  refused: BulkItemResult[];
  uncertain: BulkItemResult[];
}

/** Successes, already-recorded skips, certain refusals, and uncertain outcomes — never mixed. */
export function splitResults(results: BulkItemResult[]): SplitResults {
  return {
    created: results.filter(r => r.outcome === 'created'),
    skipped: results.filter(r => r.outcome === 'skipped'),
    refused: results.filter(r => r.outcome === 'failed' && !r.uncertain),
    uncertain: results.filter(r => r.outcome === 'failed' && r.uncertain),
  };
}

/**
 * Who stays for a retry: certain refusals (fix and resend) and uncertain
 * outcomes (check the register first — they may already be recorded).
 * Created rows and server-confirmed skips never resubmit.
 */
export function retryIds(results: BulkItemResult[]): string[] {
  return results.filter(r => r.outcome === 'failed').map(r => normalizeEmployeeId(r.employee_id)).filter(Boolean);
}
