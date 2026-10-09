// app/employees/EmployeeDetail.tsx — one person in full: contact details, employment, qualifications, awards and other positions.
// Offence records are held on the person and edited in the form, but are not displayed here.
'use client';

import { Button, Dialog, StatusBadge, Fact, FactList } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { normalizeDesignation, resolveDriverLicense } from '@/lib/employeeCatalog';
import { formatPhoneDisplay, telHref } from '@/lib/phone';
import { normalizeSection } from '@/lib/sections';
import { CLASS_TONE, ETYPE_LABEL, ETYPE_TONE, fullName, tenure } from './roster';
import type { Employee } from './types';

function Chips({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <section aria-label={title} className="flex flex-col gap-1.5"><h3 className="font-sans text-label font-semibold text-ink">{title}</h3><ul className="flex flex-wrap gap-1.5">{items.map((q, i) => <li key={`${q}-${i}`}><StatusBadge tone="neutral">{q}</StatusBadge></li>)}</ul></section>;
}

export function EmployeeDetail({ employee: e, onClose, onEdit, onDelete }: { employee: Employee | null; onClose: () => void; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void }) {
  const designation = e ? normalizeDesignation(e.designation) : '';
  const section = e?.section ? normalizeSection(e.section) : '';
  const phone = e?.phone ? formatPhoneDisplay(e.phone) : '';
  const tel = e?.phone ? telHref(e.phone) : '';
  const licence = e ? resolveDriverLicense(e.drivers_license_class) : '';
  return (
    <Dialog
      open={!!e} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={e ? fullName(e) : 'Employee'} description={e ? [e.employee_id, designation].filter(Boolean).join(', ') : undefined}
      footer={e && (<><Button variant="danger" icon="delete" onClick={() => onDelete(e)}>Delete</Button><Button icon="edit" onClick={() => onEdit(e)}>Edit</Button><Button onClick={onClose}>Close</Button></>)}
    >
      {e && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {e.archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
            {section && <StatusBadge tone="info">{section}</StatusBadge>}
            {e.employment_type && <StatusBadge tone={ETYPE_TONE[e.employment_type] ?? 'neutral'}>{ETYPE_LABEL[e.employment_type] ?? e.employment_type}</StatusBadge>}
            {e.employee_class && <StatusBadge tone={CLASS_TONE[e.employee_class] ?? 'neutral'}>{e.employee_class}</StatusBadge>}
          </div>
          <FactList>
            <Fact label="ID number">{e.id_number}</Fact>
            <Fact label="Phone">{phone && (tel ? <a href={tel} className="text-action hover:underline">{phone}</a> : phone)}</Fact>
            <Fact label="Email" wide>{e.email && <a href={`mailto:${e.email}`} className="text-action hover:underline">{e.email}</a>}</Fact>
            {e.address && <Fact label="Address" wide>{e.address}</Fact>}
            <Fact label="Engaged">{e.date_of_engagement && fmtDate(e.date_of_engagement)}</Fact>
            <Fact label="Time with the company">{tenure(e.date_of_engagement)}</Fact>
            <Fact label="Designation">{designation}</Fact>
            <Fact label="Section">{section}</Fact>
            <Fact label="Grade">{e.grade}</Fact>
            <Fact label="Supervisor">{e.supervisor}</Fact>
            {licence && <Fact label="Driver's licence">{licence}</Fact>}
            <Fact label="Previous employer">{e.previous_employer}</Fact>
          </FactList>
          <Chips title="Qualifications" items={e.qualifications} />
          <Chips title="Awards and recognition" items={e.awards_recognition} />
          <Chips title="Other positions" items={e.other_positions} />
        </div>
      )}
    </Dialog>
  );
}
