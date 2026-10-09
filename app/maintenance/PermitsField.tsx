// app/maintenance/PermitsField.tsx — the permit checklist of a job: tick each permit the job needs and enter its reference once it is issued.
// A ticked permit without a reference stops the job from starting (the server enforces it; this says so before anyone tries).
'use client';

import { Checkbox, Field, Input } from '@/components/ui-system';
import { PERMIT_KEYS, PERMIT_NAMES } from './helpers';
import type { PermitKey, WorkOrder } from './types';

export function PermitsField({ value, onChange }: { value: NonNullable<WorkOrder['permits']>; onChange: (next: NonNullable<WorkOrder['permits']>) => void }) {
  const set = (key: PermitKey, patch: { required?: boolean; reference?: string; label?: string }) => {
    const current = value[key] ?? { required: false, reference: '' };
    const next = { ...current, ...patch };
    const rest = { ...value };
    if (!next.required) delete rest[key]; else rest[key] = next;
    onChange(rest);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-sans text-label font-medium text-ink">Permits <span className="font-normal text-ink-muted">Tick what the job needs. A job cannot start until each ticked permit has a reference.</span></legend>
      <div className="flex flex-col gap-2">
        {PERMIT_KEYS.map(key => {
          const item = value[key];
          const missing = !!item && !item.reference.trim();
          return (
            <div key={key} className="flex flex-col gap-2 rounded-control border border-line-subtle bg-surface-subtle px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
              <Checkbox className="sm:w-72" label={PERMIT_NAMES[key]} checked={!!item} onChange={e => set(key, { required: e.target.checked })} />
              {item && (
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                  {key === 'other' && <Field label="What permit"><Input value={item.label ?? ''} onChange={e => set(key, { label: e.target.value })} placeholder="Crane lift plan" /></Field>}
                  <Field label="Reference" error={missing ? 'Reference needed before the job can start.' : undefined}><Input value={item.reference} onChange={e => set(key, { reference: e.target.value })} placeholder="PTW-0412" /></Field>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
