import {
  ARTISAN_SUBCATEGORY,
  FOREMAN_SUBCATEGORY,
  normalizeDesignation,
  rosterSubgroupLabel,
} from '@/lib/employeeCatalog';
import { normalizeSection, sectionColor, SECTION_ORDER } from '@/lib/sections';
import type { Employee, SectionGroup } from '@/app/employees/types';

export function groupBySectionAndProfession(list: Employee[]): SectionGroup[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) {
    const key = normalizeSection(e.section);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const rank = (k: string) => {
    if (k === 'Unassigned') return 999;
    const i = SECTION_ORDER.indexOf(k);
    return i === -1 ? 500 : i;
  };
  return [...map.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(section => {
      const employeesInSection = map.get(section)!;
      const subMap = new Map<string, Employee[]>();
      for (const e of employeesInSection) {
        const subKey = rosterSubgroupLabel(e.designation);
        if (!subMap.has(subKey)) subMap.set(subKey, []);
        subMap.get(subKey)!.push(e);
      }
      const subgroups = [...subMap.keys()]
        .sort((a, b) => {
          if (a === ARTISAN_SUBCATEGORY) return -1;
          if (b === ARTISAN_SUBCATEGORY) return 1;
          if (a === FOREMAN_SUBCATEGORY) return -1;
          if (b === FOREMAN_SUBCATEGORY) return 1;
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return a.localeCompare(b);
        })
        .map(designation => ({ designation, employees: subMap.get(designation)! }));
      const hasMeaningfulSubgroups = subgroups.length > 1 && subgroups.some(sg => sg.employees.length > 1);
      return {
        section,
        color: sectionColor(section === 'Unassigned' ? undefined : section),
        employees: employeesInSection,
        subgroups,
        hasMeaningfulSubgroups,
      };
    });
}

export function filterEmployees(
  list: Employee[],
  opts: {
    search: string;
    sectionFilter: string;
    roleFilter: string;
    etypeFilter: string;
    classFilter: string;
    artisansOnly: boolean;
    isArtisan: (d?: string | null) => boolean;
    artisanFilterValue: string;
  },
): Employee[] {
  let out = [...list];
  const { search, sectionFilter, roleFilter, etypeFilter, classFilter, artisansOnly, isArtisan, artisanFilterValue } = opts;
  if (search) {
    const s = search.toLowerCase();
    out = out.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
      e.employee_id?.toLowerCase().includes(s) ||
      (e.designation?.toLowerCase() ?? '').includes(s) ||
      normalizeDesignation(e.designation).toLowerCase().includes(s) ||
      (e.id_number?.toLowerCase() ?? '').includes(s) ||
      (e.section?.toLowerCase() ?? '').includes(s),
    );
  }
  if (classFilter !== 'all') out = out.filter(e => (e.employee_class || 'Unclassified') === classFilter);
  if (etypeFilter !== 'all') out = out.filter(e => (e.employment_type || '') === etypeFilter);
  if (sectionFilter !== 'all') out = out.filter(e => normalizeSection(e.section) === sectionFilter);
  if (artisansOnly || roleFilter === artisanFilterValue) {
    out = out.filter(e => isArtisan(e.designation));
  } else if (roleFilter !== 'all') {
    out = out.filter(e =>
      normalizeDesignation(e.designation) === roleFilter || (e.designation || '').trim() === roleFilter,
    );
  }
  return out;
}
