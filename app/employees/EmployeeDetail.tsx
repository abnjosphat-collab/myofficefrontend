// app/employees/EmployeeDetail.tsx — one person in full: every field the register holds (an empty one reads "Not recorded",
// never hidden), then their records elsewhere in MyOffice: PPE held, leave this year, overtime this month and certifications.
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, Dialog, StatusBadge, Fact, FactList, FactSection, DetailActions, LoadingPulse } from '@/components/ui-system';
import { fmtDate, fmtDateTime } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import { normalizeDesignation, resolveDriverLicense } from '@/lib/employeeCatalog';
import { formatPhoneDisplay, telHref } from '@/lib/phone';
import { formatMineNumber } from '@/lib/registerMatch';
import { normalizeSection } from '@/lib/sections';
import { CLASS_TONE, ETYPE_LABEL, ETYPE_TONE, fullName, tenure } from './roster';
import { usePersonRecords, type PersonSummary } from './personRecords';
import type { Employee } from './types';

/** Register placeholders that mean "none" ("Nil", "Non", "None", "N/A"), so they never read as a real entry. */
const NONE_WORDS = new Set(['nil', 'non', 'none', 'n/a', 'na', '-']);
export const realEntries = (items?: string[]): string[] => (items ?? []).map(s => s.trim()).filter(s => s !== '' && !NONE_WORDS.has(s.toLowerCase()));

function Chips({ title, items, none }: { title: string; items?: string[]; none: string }) {
  const real = realEntries(items);
  return (
    <FactSection title={title}>
      {real.length > 0
        ? <ul className="flex flex-wrap gap-1.5">{real.map((q, i) => <li key={`${q}-${i}`}><StatusBadge tone="neutral">{q}</StatusBadge></li>)}</ul>
        : <p className="font-sans text-body italic text-ink-muted">{none}</p>}
    </FactSection>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One module's line: what the person has there, with a way to it. */
function Elsewhere({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-control border border-line-subtle px-3 py-2">
      <div className="min-w-0">
        <p className="font-sans text-label font-medium text-ink">{label}</p>
        <p className="font-sans text-body-sm text-ink-muted">{children}</p>
      </div>
      <Button asChild size="sm" variant="ghost" iconAfter="chevron-right"><Link href={href}>Open</Link></Button>
    </div>
  );
}

function AcrossMyOffice({ employeeId, summary, failed }: { employeeId: string; summary: PersonSummary; failed: string[] }) {
  const { ppe, leave, overtime, training } = summary;
  const unread = (name: string) => failed.includes(name);
  const could = 'Could not be read just now.';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Elsewhere label="PPE" href={`/ppe?person=${encodeURIComponent(employeeId)}`}>
        {unread('PPE') ? could : `${plural(ppe.held, 'item')} held${ppe.expired ? `, ${ppe.expired} expired` : ''}${ppe.dueSoon ? `, ${ppe.dueSoon} due within 30 days` : ''}`}
      </Elsewhere>
      <Elsewhere label="Leave" href="/leaves">
        {unread('Leave') ? could : `${plural(leave.daysThisYear, 'day')} approved this year${leave.pending ? `, ${leave.pending} waiting` : ''}`}
      </Elsewhere>
      <Elsewhere label="Overtime" href="/overtime">
        {unread('Overtime') ? could : `${overtime.hoursThisMonth} h this month${overtime.pending ? `, ${overtime.pending} waiting` : ''}`}
      </Elsewhere>
      <Elsewhere label="Training" href="/training">
        {unread('Training') ? could : `${plural(training.certificates, 'certificate')}${training.expired ? `, ${training.expired} expired` : ''}${training.dueSoon ? `, ${training.dueSoon} due soon` : ''}`}
      </Elsewhere>
    </div>
  );
}

export function EmployeeDetail({ employee: e, onClose, onEdit, onDelete }: { employee: Employee | null; onClose: () => void; onEdit: (e: Employee) => void; onDelete: (e: Employee) => void }) {
  const designation = e ? normalizeDesignation(e.designation) : '';
  const section = e?.section ? normalizeSection(e.section) : '';
  const phone = e?.phone ? formatPhoneDisplay(e.phone) : '';
  const tel = e?.phone ? telHref(e.phone) : '';
  const licence = e ? resolveDriverLicense(e.drivers_license_class) : '';
  const records = usePersonRecords(e?.employee_id || null, todayLocal());
  return (
    <Dialog
      open={!!e} onOpenChange={o => { if (!o) onClose(); }} size="lg" title={e ? fullName(e) : 'Employee'} description={e ? [formatMineNumber(e.employee_id), designation].filter(Boolean).join(', ') : undefined}
      footer={e && (<DetailActions onDelete={() => onDelete(e)} onClose={onClose} onEdit={() => onEdit(e)} primary="edit"><Button asChild variant="ghost" icon="ppe"><Link href={`/ppe?person=${encodeURIComponent(e.employee_id)}`}>PPE</Link></Button></DetailActions>)} zoomId={e ? `employees:rec:${e.id}` : undefined}
    >
      {e && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {e.archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
            {section && <StatusBadge tone="info">{section}</StatusBadge>}
            {e.employment_type && <StatusBadge tone={ETYPE_TONE[e.employment_type] ?? 'neutral'}>{ETYPE_LABEL[e.employment_type] ?? e.employment_type}</StatusBadge>}
            {e.employee_class && <StatusBadge tone={CLASS_TONE[e.employee_class] ?? 'neutral'}>{e.employee_class}</StatusBadge>}
          </div>
          <FactSection title="Contact">
            <FactList>
              <Fact label="Phone">{phone && (tel ? <a href={tel} className="text-action hover:underline">{phone}</a> : phone)}</Fact>
              <Fact label="Email">{e.email && <a href={`mailto:${e.email}`} className="text-action hover:underline">{e.email}</a>}</Fact>
              <Fact label="Address" wide>{e.address}</Fact>
            </FactList>
          </FactSection>
          <FactSection title="Personal">
            <FactList>
              <Fact label="First name">{e.first_name}</Fact>
              <Fact label="Last name">{e.last_name}</Fact>
              <Fact label="ID number">{e.id_number}</Fact>
              <Fact label="Driver's licence">{licence}</Fact>
            </FactList>
          </FactSection>
          <FactSection title="Employment">
            <FactList>
              <Fact label="Mine number">{e.employee_id && formatMineNumber(e.employee_id)}</Fact>
              <Fact label="Designation">{designation}</Fact>
              <Fact label="Section">{section}</Fact>
              <Fact label="Department">{e.department}</Fact>
              <Fact label="Discipline">{e.discipline && e.discipline.charAt(0).toUpperCase() + e.discipline.slice(1)}</Fact>
              <Fact label="Grade">{e.grade}</Fact>
              <Fact label="Employment type">{e.employment_type && (ETYPE_LABEL[e.employment_type] ?? e.employment_type)}</Fact>
              <Fact label="Employee class">{e.employee_class}</Fact>
              <Fact label="Supervisor">{e.supervisor}</Fact>
              <Fact label="Engaged">{e.date_of_engagement && fmtDate(e.date_of_engagement)}</Fact>
              <Fact label="Time with the company">{tenure(e.date_of_engagement)}</Fact>
              <Fact label="Previous employer">{e.previous_employer}</Fact>
              <Fact label="Last PPE issue">{e.ppe_issue_date && fmtDate(e.ppe_issue_date)}</Fact>
              <Fact label="Status">{e.archived ? 'Archived' : 'Active'}</Fact>
            </FactList>
          </FactSection>
          <Chips title="Qualifications" items={e.qualifications} none="None recorded." />
          <Chips title="Awards and recognition" items={e.awards_recognition} none="None recorded." />
          <Chips title="Other positions" items={e.other_positions} none="None recorded." />
          <Chips title="Offences" items={e.offences} none="None recorded." />
          <FactSection title="Across MyOffice">
            {records.status === 'ready'
              ? <AcrossMyOffice employeeId={e.employee_id} summary={records.summary} failed={records.failed} />
              : <LoadingPulse compact label="Reading this person's records" detail={['PPE, leave, overtime and training']} />}
          </FactSection>
          <FactSection title="Record">
            <FactList>
              <Fact label="Register key">{e.employee_id_string}</Fact>
              <Fact label="Last updated">{e.updated_at && fmtDateTime(e.updated_at)}</Fact>
            </FactList>
          </FactSection>
        </div>
      )}
    </Dialog>
  );
}
