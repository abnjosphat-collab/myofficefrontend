// lib/employeeCatalog.ts — canonical personnel designations and helpers for
// consistent naming across Employees, Leaves, PPE, Overtime, and exports.
// Convention: "{Trade} Class {N}" or "{Trade} Assistant" (e.g. Fitter Class 1).

import type { Employee } from '@/app/employees/types';
import { normalizeSection } from '@/lib/sections';

/** Standard designations — single source of truth for the Employees dropdown. */
export const DESIGNATION_ORDER: string[] = [
  'Winder Technician Electrical',
  'Winder Technician Mechanical',
  'Fitter Class 1',
  'Fitter Class 2',
  'Fitter Assistant',
  'Boilermaker Class 1',
  'Boilermaker Class 2',
  'Boilermaker Semi Skilled',
  'Boilermaker Assistant',
  'Rigger Class 1',
  'Rigger Class 2',
  'Rigger Assistant',
  'Compressor Attendant',
  'Lamproom Attendant',
  'Electrician Class 1',
  'Electrician Class 2',
  'Electrician Assistant',
  'Plumber Class 1',
  'Plumber Class 2',
  'Plumber Assistant',
  'Light Vehicle Driver',
  'Bus Driver',
  'Foreman',
  'Supervisor',
  'Engineering Manager',
  'Maintenance Engineer',
];

const DESIGNATION_SET = new Set<string>(DESIGNATION_ORDER);

/** Legacy / typo aliases → canonical designation (keys are lowercased). */
const DESIGNATION_ALIASES: Record<string, string> = {
  'class 1 electrician': 'Electrician Class 1',
  'class 2 electrician': 'Electrician Class 2',
  'electrician class 1': 'Electrician Class 1',
  'electrician class 2': 'Electrician Class 2',
  'electrician class1': 'Electrician Class 1',
  'electrician': 'Electrician Class 1',
  'class 1 fitter': 'Fitter Class 1',
  'class 2 fitter': 'Fitter Class 2',
  'fitter class1': 'Fitter Class 1',
  'fitter class2': 'Fitter Class 2',
  'fitter assistent': 'Fitter Assistant',
  'fitter asst': 'Fitter Assistant',
  "fitter's assistant": 'Fitter Assistant',
  'fitters assistant': 'Fitter Assistant',
  'assistant fitter': 'Fitter Assistant',
  'fitter assistant': 'Fitter Assistant',
  'class 1 boilermaker': 'Boilermaker Class 1',
  'class 2 boilermaker': 'Boilermaker Class 2',
  'boilermaker class1': 'Boilermaker Class 1',
  'boilermaker class2': 'Boilermaker Class 2',
  'boilermaker semi skilled': 'Boilermaker Semi Skilled',
  'semi skilled boilermaker': 'Boilermaker Semi Skilled',
  boilermaker: 'Boilermaker Semi Skilled',
  'boilermaker assistent': 'Boilermaker Assistant',
  "boilermaker's assistant": 'Boilermaker Assistant',
  'assistant boilermaker': 'Boilermaker Assistant',
  'class 1 rigger': 'Rigger Class 1',
  'class 2 rigger': 'Rigger Class 2',
  'rigger class1': 'Rigger Class 1',
  'rigger class2': 'Rigger Class 2',
  'rigger assistent': 'Rigger Assistant',
  'rigger asst': 'Rigger Assistant',
  "rigger's assistant": 'Rigger Assistant',
  'assistant rigger': 'Rigger Assistant',
  'winder technician electrical': 'Winder Technician Electrical',
  'winder technician mechanical': 'Winder Technician Mechanical',
  'winder tech electrical': 'Winder Technician Electrical',
  'winder tech mechanical': 'Winder Technician Mechanical',
  'winder tech': 'Winder Technician Mechanical',
  'mechanical winder technician': 'Winder Technician Mechanical',
  'mechanical winder tech': 'Winder Technician Mechanical',
  'electrical winder technician': 'Winder Technician Electrical',
  'electrical winder tech': 'Winder Technician Electrical',
  'inder technician mechanical': 'Winder Technician Mechanical',
  'inder technician electrical': 'Winder Technician Electrical',
  'compressor attendant': 'Compressor Attendant',
  'lamproom attendant': 'Lamproom Attendant',
  'lamproom atendant': 'Lamproom Attendant',
  'lamp room attendant': 'Lamproom Attendant',
  'lamp room atendant': 'Lamproom Attendant',
  'class 1 plumber': 'Plumber Class 1',
  'class 2 plumber': 'Plumber Class 2',
  'plumber class1': 'Plumber Class 1',
  'plumber assistent': 'Plumber Assistant',
  'assistant plumber': 'Plumber Assistant',
  'class 4 driver': 'Light Vehicle Driver',
  'class 4 drivers': 'Light Vehicle Driver',
  'class iv driver': 'Light Vehicle Driver',
  'class4 driver': 'Light Vehicle Driver',
  'driver class 4': 'Light Vehicle Driver',
  'driver class iv': 'Light Vehicle Driver',
  'driver class4': 'Light Vehicle Driver',
  'stores driver': 'Light Vehicle Driver',
  'store driver': 'Light Vehicle Driver',
  driver: 'Light Vehicle Driver',
  'bus driver': 'Bus Driver',
  'bus drivers': 'Bus Driver',
  'engineering manager': 'Engineering Manager',
  'maintenance engineer': 'Maintenance Engineer',
};

/** Canonical section for each standard designation (Foreman/Supervisor excluded). */
const DESIGNATION_SECTION: Record<string, string> = {
  'Winder Technician Electrical': 'Electrical',
  'Electrician Class 1': 'Electrical',
  'Electrician Class 2': 'Electrical',
  'Electrician Assistant': 'Electrical',
  'Winder Technician Mechanical': 'Mechanical',
  'Fitter Class 1': 'Mechanical',
  'Fitter Class 2': 'Mechanical',
  'Fitter Assistant': 'Mechanical',
  'Boilermaker Class 1': 'Mechanical',
  'Boilermaker Class 2': 'Mechanical',
  'Boilermaker Semi Skilled': 'Mechanical',
  'Boilermaker Assistant': 'Mechanical',
  'Rigger Class 1': 'Mechanical',
  'Rigger Class 2': 'Mechanical',
  'Rigger Assistant': 'Mechanical',
  'Compressor Attendant': 'Mechanical',
  'Lamproom Attendant': 'Electrical',
  'Plumber Class 1': 'Mechanical',
  'Plumber Class 2': 'Mechanical',
  'Plumber Assistant': 'Mechanical',
  'Engineering Manager': 'Management',
  'Maintenance Engineer': 'Management',
};

/** Known mis-labelled employees — applied by name during normalize/save (case-insensitive). */
const ROSTER_DESIGNATION_CORRECTIONS: Record<string, string> = {
  'givemore zaronga': 'Winder Technician Mechanical',
  'manias mutova': 'Fitter Class 2',
  'malvin midizi': 'Winder Technician Electrical',
  'malven midizi': 'Winder Technician Electrical',
  'malvin midzi': 'Winder Technician Electrical',
  'malven midzi': 'Winder Technician Electrical',
  'kelvin phambana': 'Winder Technician Electrical',
  'sibanengi bafanato': 'Light Vehicle Driver',
  'sibanengi bafana': 'Light Vehicle Driver',
  'philip antonio': 'Light Vehicle Driver',
  'andrew maendaenda': 'Light Vehicle Driver',
  'raymond kaseke': 'Light Vehicle Driver',
  'maxwell chitumbi': 'Boilermaker Semi Skilled',
  'titosi gapare': 'Lamproom Attendant',
  'edson mavhondo': 'Maintenance Engineer',
};

function employeeNameKey(firstName?: string, lastName?: string): string {
  return `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Legacy job-title labels used as designation for drivers — not trade "Class N" roles. */
const LEGACY_CLASS_4_DRIVER_DESIGNATIONS = new Set([
  'class 4',
  'class 4 driver',
  'class 4 drivers',
  'class iv',
  'class iv driver',
  'class4',
  'class4 driver',
  'driver class 4',
  'driver class iv',
  'driver class4',
]);

/**
 * True when designation is the old "Class 4 Driver" job role — not e.g. Fitter Class 4
 * and not a licence note stored elsewhere.
 */
export function isLegacyClass4DriverDesignation(raw?: string | null): boolean {
  const compact = (raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!compact) return false;
  if (LEGACY_CLASS_4_DRIVER_DESIGNATIONS.has(compact)) return true;
  if (/^class\s*(iv|4|four)(\s*(driver|drivers))?\.?$/i.test(compact)) return true;
  return /^driver\s*(s)?\s*class\s*(iv|4|four)\.?$/i.test(compact);
}

/** Reorder "Mechanical Winder Technician" → "Winder Technician Mechanical". */
function reorderWinderPattern(raw: string): string | null {
  const sectionFirst = raw.match(/^(mechanical|electrical)\s+winder\s+(technician|tech)\.?$/i);
  if (sectionFirst) return `Winder Technician ${titleCaseWords(sectionFirst[1])}`;
  const sectionLast = raw.match(/^winder\s+(technician|tech)\s+(mechanical|electrical)\.?$/i);
  if (sectionLast) return `Winder Technician ${titleCaseWords(sectionLast[2])}`;
  return null;
}

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Reorder "Class 1 Electrician" → "Electrician Class 1". */
function reorderClassPattern(raw: string): string | null {
  const classFirst = raw.match(/^class\s+(\d+)\s+(.+)$/i);
  if (classFirst) {
    const trade = titleCaseWords(classFirst[2]);
    return `${trade} Class ${classFirst[1]}`;
  }
  const classLast = raw.match(/^(.+?)\s+class\s+(\d+)$/i);
  if (classLast) {
    const trade = titleCaseWords(classLast[1]);
    return `${trade} Class ${classLast[2]}`;
  }
  const assistantFirst = raw.match(/^assistant\s+(.+)$/i);
  if (assistantFirst) {
    const trade = titleCaseWords(assistantFirst[1].replace(/['']/g, ''));
    return `${trade} Assistant`;
  }
  const assistant = raw.match(/^(.+?)\s+(assistant|assistent|asst)\.?$/i);
  if (assistant) {
    const tradeLower = assistant[1].replace(/['']/g, '').toLowerCase();
    // Avoid inventing "Winder Tech Assistant" from garbled legacy values.
    if (/\bwinder\b/.test(tradeLower)) return null;
    const trade = titleCaseWords(assistant[1].replace(/['']/g, ''));
    return `${trade} Assistant`;
  }
  return null;
}

/** Section implied by a trade/designation — null when ambiguous (Foreman, Supervisor, unknown). */
export function sectionForDesignation(designation?: string | null): string | null {
  const d = normalizeDesignation(designation);
  if (!d) return null;
  return DESIGNATION_SECTION[d] ?? null;
}

/** Apply designation normalization plus section alignment when the trade implies a section. */
export function resolveDesignation(
  raw?: string | null,
  firstName?: string,
  lastName?: string,
): string {
  const key = employeeNameKey(firstName, lastName);
  if (key && ROSTER_DESIGNATION_CORRECTIONS[key]) {
    return ROSTER_DESIGNATION_CORRECTIONS[key];
  }
  return normalizeDesignation(raw) || (raw || '').trim();
}

export function normalizeEmployeeRoleFields(
  designation?: string | null,
  section?: string | null,
  firstName?: string,
  lastName?: string,
): { designation: string; section: string } {
  const des = resolveDesignation(designation, firstName, lastName);
  const implied = sectionForDesignation(des);
  const rawSection = (section || '').trim();
  let sec = rawSection;
  if (implied) {
    sec = implied;
  } else if (rawSection) {
    const n = normalizeSection(rawSection);
    sec = n === 'Unassigned' ? '' : n;
  }
  return { designation: des, section: sec };
}

/** Map free-text designation to the canonical label when possible. */
export function normalizeDesignation(raw?: string | null): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const cleaned = s.replace(/['']/g, '');

  const exact = DESIGNATION_ORDER.find(d => d.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;

  if (isLegacyClass4DriverDesignation(cleaned)) return 'Light Vehicle Driver';

  const alias = DESIGNATION_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;

  const winder = reorderWinderPattern(cleaned);
  if (winder) {
    const match = DESIGNATION_ORDER.find(d => d.toLowerCase() === winder.toLowerCase());
    if (match) return match;
  }

  const reordered = reorderClassPattern(cleaned);
  if (reordered) {
    const match = DESIGNATION_ORDER.find(d => d.toLowerCase() === reordered.toLowerCase());
    if (match) return match;
    return reordered;
  }

  return s;
}

export function isStandardDesignation(value?: string | null): boolean {
  const n = normalizeDesignation(value);
  return !!n && DESIGNATION_SET.has(n);
}

/** Dropdown options — includes legacy value when editing an non-standard record. */
export function designationSelectOptions(current?: string | null): { value: string; label: string }[] {
  const normalized = normalizeDesignation(current);
  const opts: { value: string; label: string }[] = DESIGNATION_ORDER.map(d => ({ value: d, label: d }));
  if (normalized && !DESIGNATION_SET.has(normalized)) {
    opts.unshift({ value: normalized, label: `${normalized} (legacy — select standard role)` });
  }
  return [{ value: '', label: 'Select designation…' }, ...opts];
}

/** Foreman / supervisor names for the dropdown — from roster + existing supervisor field values. */
export function buildForemanOptions(
  employees: Pick<Employee, 'first_name' | 'last_name' | 'designation' | 'supervisor'>[],
): string[] {
  const names = new Set<string>();
  for (const e of employees) {
    if (e.supervisor?.trim()) names.add(e.supervisor.trim());
    const full = `${e.first_name || ''} ${e.last_name || ''}`.trim();
    const des = (e.designation || '').toLowerCase();
    if (full && (
      des.includes('foreman') || des.includes('supervisor')
      || des.includes('engineering manager') || des.includes('maintenance engineer')
    )) names.add(full);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function foremanSelectOptions(
  employees: Pick<Employee, 'first_name' | 'last_name' | 'designation' | 'supervisor'>[],
  current?: string | null,
): { value: string; label: string }[] {
  const opts = buildForemanOptions(employees).map(n => ({ value: n, label: n }));
  const cur = (current || '').trim();
  if (cur && !opts.some(o => o.value.toLowerCase() === cur.toLowerCase())) {
    opts.unshift({ value: cur, label: `${cur} (legacy)` });
  }
  return [{ value: '', label: 'None' }, ...opts];
}

/** Driver's licence categories used on the personnel form. */
export const DRIVER_LICENSE_OPTIONS: string[] = [
  'Light Vehicle Driver',
  'Heavy Vehicle Driver',
  'Articulated Vehicle Driver',
  'Motorcycle',
];

export function normalizeDriverLicense(raw?: string | null): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const compact = s.toLowerCase().replace(/\s+/g, ' ');
  if (/^light\s*veh/i.test(compact) && /driver/i.test(compact)) return 'Light Vehicle Driver';
  const match = DRIVER_LICENSE_OPTIONS.find(o => o.toLowerCase() === compact);
  return match ?? s;
}

/** Canonicalize licence dropdown values only — does not remap Class 4 licence notes. */
export function resolveDriverLicense(raw?: string | null): string {
  return normalizeDriverLicense(raw);
}

export function driverLicenseSelectOptions(current?: string | null): { value: string; label: string }[] {
  const normalized = normalizeDriverLicense(current);
  const opts: { value: string; label: string }[] = DRIVER_LICENSE_OPTIONS.map(o => ({ value: o, label: o }));
  if (normalized && !DRIVER_LICENSE_OPTIONS.includes(normalized)) {
    opts.unshift({ value: normalized, label: `${normalized} (legacy)` });
  }
  return [{ value: '', label: 'None' }, ...opts];
}

/** Filter value for the Artisan designation filter (Class 1 trades + winder techs). */
export const ARTISAN_FILTER_VALUE = '__artisan__';

/** Accordion subcategory label — Class 1 trades and winder technicians. */
export const ARTISAN_SUBCATEGORY = 'Artisan';

/** Accordion subcategory for Foreman and Supervisor roles. */
export const FOREMAN_SUBCATEGORY = 'Foremen';

const ARTISAN_DESIGNATIONS = new Set<string>([
  'Winder Technician Electrical',
  'Winder Technician Mechanical',
]);

export function isArtisanClass1Designation(designation?: string | null): boolean {
  const d = normalizeDesignation(designation);
  if (!d || !DESIGNATION_SET.has(d)) return false;
  if (ARTISAN_DESIGNATIONS.has(d)) return true;
  return / Class 1$/.test(d);
}

export function isForemanDesignation(designation?: string | null): boolean {
  const d = normalizeDesignation(designation);
  return d === 'Foreman' || d === 'Supervisor';
}

/** Subgroup key for section accordions — artisans, foremen, then by designation. */
export function rosterSubgroupLabel(designation?: string | null): string {
  if (isArtisanClass1Designation(designation)) return ARTISAN_SUBCATEGORY;
  if (isForemanDesignation(designation)) return FOREMAN_SUBCATEGORY;
  return normalizeDesignation(designation) || 'Other';
}

/** Hoist Driver roles are archived — Hoist Technician is a separate trade (not archived). */
export function isHoistDriverDesignation(raw?: string | null): boolean {
  const compact = (raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return /^hoist\s+driver(s)?\.?$/.test(compact);
}

export function shouldArchiveEmployee(
  designation?: string | null,
  alreadyArchived?: boolean | null,
): boolean {
  if (alreadyArchived) return true;
  return isHoistDriverDesignation(designation);
}

/** Role/designation filter — canonical list first, then any legacy roles on the roster. */
export function designationFilterOptions(legacyOnRoster: string[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const legacy = legacyOnRoster
    .map(r => (r || '').trim())
    .filter(r => {
      if (!r) return false;
      const n = normalizeDesignation(r);
      if (DESIGNATION_SET.has(n)) return false;
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    })
    .sort();
  return [
    { value: 'all', label: 'All designations' },
    { value: ARTISAN_FILTER_VALUE, label: 'Artisan (Class 1 & Winder Techs)' },
    ...DESIGNATION_ORDER.map(d => ({ value: d, label: d })),
    ...legacy.map(r => ({ value: r, label: `${normalizeDesignation(r) || r} (legacy)` })),
  ];
}
