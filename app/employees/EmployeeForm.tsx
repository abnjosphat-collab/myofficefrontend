// app/employees/EmployeeForm.tsx — add or edit a person: who they are, their employment (designation, section, supervisor, class,
// licence), their qualifications and records, and whether they are archived. One scrolling form with every problem shown on its
// field. Choosing a designation fills in the section it belongs to. A refused save shows inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox, Combobox, Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import { TagField } from '@/components/shared/TagField';
import {
  designationSelectOptions, driverLicenseSelectOptions, foremanSelectOptions, normalizeEmployeeRoleFields, resolveDriverLicense, sectionForDesignation,
} from '@/lib/employeeCatalog';
import { normalizePhoneField } from '@/lib/phone';
import { sectionSelectOptions } from '@/lib/sections';
import { CLASS_OPTIONS, formProblems, fullName } from './roster';
import type { Employee, EmployeeFormData } from './types';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const EMPTY: EmployeeFormData = {
  employee_id: '', first_name: '', last_name: '', id_number: '', email: '', phone: '', address: '', date_of_engagement: '', designation: '', employee_class: '', employment_type: '', supervisor: '', section: '',
  department: '', grade: '', qualifications: [], drivers_license_class: '', offences: [], awards_recognition: [], other_positions: [], previous_employer: '', archived: false,
};
function fromEmployee(e: Employee): EmployeeFormData {
  const role = normalizeEmployeeRoleFields(e.designation, e.section, e.first_name, e.last_name);
  return {
    employee_id: e.employee_id || '', first_name: e.first_name || '', last_name: e.last_name || '', id_number: e.id_number || '', email: e.email || '', phone: normalizePhoneField(e.phone) || '', address: e.address || '',
    date_of_engagement: e.date_of_engagement || '', designation: role.designation, employee_class: e.employee_class || '', employment_type: (e.employment_type as EmployeeFormData['employment_type']) || '',
    supervisor: e.supervisor || '', section: role.section, department: e.department || '', grade: e.grade || '', qualifications: e.qualifications || [],
    drivers_license_class: resolveDriverLicense(e.drivers_license_class) || e.drivers_license_class || '', offences: e.offences || [], awards_recognition: e.awards_recognition || [],
    other_positions: e.other_positions || [], previous_employer: e.previous_employer || '', archived: !!e.archived,
  };
}
const ETYPES = [{ value: '', label: 'Not set' }, { value: 'NEC', label: 'NEC' }, { value: 'SALARIED', label: 'Salaried' }];
const CLASSES = [{ value: '', label: 'None' }, ...CLASS_OPTIONS.map(c => ({ value: c as string, label: c }))];
const distinct = (values: (string | undefined)[]) => [...new Set(values.map(v => (v || '').trim()).filter(Boolean))].sort();

export function EmployeeForm({ open, employee, all, onOpenChange, onSave }: {
  open: boolean; employee: Employee | null; all: Employee[]; onOpenChange: (open: boolean) => void; onSave: (data: EmployeeFormData, id?: number) => Promise<void>;
}) {
  const [form, setForm] = useState<EmployeeFormData>(EMPTY);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, employee?.id), () => { setTouched(false); setForm(employee ? fromEmployee(employee) : { ...EMPTY }); });
  const set = (patch: Partial<EmployeeFormData>) => setForm(f => ({ ...f, ...patch }));
  const problems = formProblems(form);
  const err = (k: keyof typeof problems) => (touched ? problems[k] : undefined);
  const editing = !!employee;

  const designations = useMemo(() => designationSelectOptions(form.designation).filter(o => o.value), [form.designation]);
  const sections = useMemo(() => sectionSelectOptions(form.section), [form.section]);
  const supervisors = useMemo(() => foremanSelectOptions(all, form.supervisor), [all, form.supervisor]);
  const licences = useMemo(() => driverLicenseSelectOptions(form.drivers_license_class), [form.drivers_license_class]);
  const grades = useMemo(() => distinct(all.map(e => e.grade)), [all]);
  const employers = useMemo(() => distinct(all.map(e => e.previous_employer)), [all]);
  const pickDesignation = (v: string) => { const implied = sectionForDesignation(v); set({ designation: v, ...(implied ? { section: implied } : {}) }); };

  const submit = async () => {
    setTouched(true);
    if (Object.keys(problems).length > 0) return false;
    await onSave(form, employee?.id);
    toast.success(editing ? 'Employee updated.' : 'Employee added.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="xl" title={editing ? `Edit ${fullName(employee)}` : 'Add an employee'} description={editing ? `Mine number ${employee.employee_id}` : 'Mine number, name, ID number and designation are required.'} submitLabel={editing ? 'Save changes' : 'Add employee'} onSubmit={submit}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ef-personal" className="flex flex-col gap-3">
          <h3 id="ef-personal" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Personal</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mine number" required error={err('employee_id')}><Input value={form.employee_id} onChange={e => set({ employee_id: e.target.value.toUpperCase() })} placeholder="C1165, PM365" autoComplete="off" /></Field>
            <Field label="ID number" required error={err('id_number')}><Input value={form.id_number} onChange={e => set({ id_number: e.target.value })} placeholder="National ID or passport" autoComplete="off" /></Field>
            <Field label="First name" required error={err('first_name')}><Input value={form.first_name} onChange={e => set({ first_name: e.target.value })} autoComplete="off" /></Field>
            <Field label="Last name" required error={err('last_name')}><Input value={form.last_name} onChange={e => set({ last_name: e.target.value })} autoComplete="off" /></Field>
            <Field label="Email" optional><Input type="email" value={form.email} onChange={e => set({ email: e.target.value })} /></Field>
            <Field label="Phone" optional description="Use / between several numbers."><Input value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="+263 77 123 4567" /></Field>
            <Field label="Address" optional className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={e => set({ address: e.target.value })} /></Field>
          </div>
        </section>

        <section aria-labelledby="ef-emp" className="flex flex-col gap-3">
          <h3 id="ef-emp" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Employment</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Designation" required error={err('designation')} description="Choosing one fills in the section."><Combobox aria-label="Designation" value={form.designation} onValueChange={pickDesignation} options={designations} placeholder="Search or choose a designation" emptyMessage="No matching designation." /></Field>
            <Field label="Section" optional><Select aria-label="Section" value={form.section} onValueChange={v => set({ section: v })} options={sections} /></Field>
            <Field label="Date of engagement" optional><Input type="date" value={form.date_of_engagement} onChange={e => set({ date_of_engagement: e.target.value })} /></Field>
            <Field label="Foreman or supervisor" optional><Select aria-label="Foreman or supervisor" value={form.supervisor} onValueChange={v => set({ supervisor: v })} options={supervisors} /></Field>
            <Field label="Employee class" optional><Select aria-label="Employee class" value={form.employee_class} onValueChange={v => set({ employee_class: v })} options={CLASSES} /></Field>
            <Field label="Employment type" optional><Select aria-label="Employment type" value={form.employment_type} onValueChange={v => set({ employment_type: v as EmployeeFormData['employment_type'] })} options={ETYPES} /></Field>
            <Field label="Grade" optional><Input list="ef-grades" value={form.grade} onChange={e => set({ grade: e.target.value })} autoComplete="off" /><datalist id="ef-grades" aria-label="Grades in use">{grades.map(g => <option key={g} value={g}>{g}</option>)}</datalist></Field>
            <Field label="Previous employer" optional><Input list="ef-employers" value={form.previous_employer} onChange={e => set({ previous_employer: e.target.value })} autoComplete="off" /><datalist id="ef-employers" aria-label="Previous employers in use">{employers.map(g => <option key={g} value={g}>{g}</option>)}</datalist></Field>
            <Field label="Driver's licence class" optional><Select aria-label="Driver's licence class" value={form.drivers_license_class} onValueChange={v => set({ drivers_license_class: v })} options={licences} /></Field>
          </div>
        </section>

        <section aria-labelledby="ef-rec" className="flex flex-col gap-4">
          <h3 id="ef-rec" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Qualifications and records</h3>
          <TagField label="Qualifications" value={form.qualifications} onChange={v => set({ qualifications: v })} placeholder="Add a qualification" />
          <TagField label="Other positions" value={form.other_positions} onChange={v => set({ other_positions: v })} placeholder="Add a position" />
          <TagField label="Awards and recognition" value={form.awards_recognition} onChange={v => set({ awards_recognition: v })} placeholder="Add an award" />
          <TagField label="Offences" value={form.offences} onChange={v => set({ offences: v })} placeholder="Add an offence record" />
          <Checkbox label="Archived" description="Hide from the active roster, for example hoist drivers no longer on site." checked={form.archived} onChange={e => set({ archived: e.target.checked })} />
        </section>
      </div>
    </FormDialog>
  );
}
