// lib/registerMatch.ts — does a record (leave, overtime, PPE) point at someone on the employee register?
// Records copy the employee's mine number and name when they are saved; the database does not enforce it,
// so older records can hold a number that matches no one. One rule, used by every page that flags them:
//   linked           the record's employee_id is a mine number on the register
//   number-differs   the number matches no mine number, but the name (or the register's internal row id) does
//   not-on-register  neither the number nor the name matches anyone

export type RegisterMatch = 'linked' | 'number-differs' | 'not-on-register';

type Person = { id?: string | number; employee_id?: string | null; first_name?: string | null; last_name?: string | null; full_name?: string | null; name?: string | null };
type RecordRef = { employee_id?: string | null; employee_name?: string | null };

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const nameOf = (p: Person) => norm(p.full_name || p.name || `${p.first_name ?? ''} ${p.last_name ?? ''}`);

export interface RegisterIndex { numbers: Set<string>; rowIds: Set<string>; names: Set<string> }

export function indexRegister(people: readonly Person[]): RegisterIndex {
  const index: RegisterIndex = { numbers: new Set(), rowIds: new Set(), names: new Set() };
  for (const p of people) {
    if (p.employee_id) index.numbers.add(norm(p.employee_id));
    if (p.id !== undefined && p.id !== null) index.rowIds.add(String(p.id));
    const n = nameOf(p);
    if (n) index.names.add(n);
  }
  return index;
}

export function matchToRegister(record: RecordRef, index: RegisterIndex): RegisterMatch {
  const number = norm(record.employee_id);
  if (number && index.numbers.has(number)) return 'linked';
  if ((record.employee_id && index.rowIds.has(String(record.employee_id).trim())) || index.names.has(norm(record.employee_name))) return 'number-differs';
  return 'not-on-register';
}
