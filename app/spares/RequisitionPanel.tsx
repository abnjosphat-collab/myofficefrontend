// app/spares/RequisitionPanel.tsx — the parts requisition builder: who asks and why, the lines (a part from the register and a
// quantity), the total, and what to do with it: save it by name, load or delete a saved one, copy it, or download a PDF. Saves and
// deletes go to the server and say so when they fail; a failed load of the saved list is an error with a retry.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Combobox, DataRegion, Drawer, Field, IconButton, Input, Notice, Segmented, Select, Textarea, deriveDataStatus, isTransientStatus, useConfirm } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { fmtDate, formatCurrency } from '@/components/shared/utils';
import type { ApiListState } from '@/lib/useApiList';
import { apiCreateSavedReq, apiDeleteSavedReq } from './api';
import { downloadRequisitionPdf } from './requisitionPdf';
import { filled, lineValue, linesFromSaved, PRIORITY, requisitionText, requisitionTotal, toSaved } from './stock';
import type { ReqHeader, ReqLine, SavedRequisition, Spare } from './types';

const URGENCY = [{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'emergency', label: 'Emergency' }];
const PRIORITIES = (Object.keys(PRIORITY) as Spare['priority'][]).map(value => ({ value, label: PRIORITY[value].label }));
let counter = 0;
export const newLineId = () => `line-${Date.now()}-${counter++}`;

export function RequisitionPanel({ open, onOpenChange, spares, saved, header, onHeader, lines, onLines }: {
  open: boolean; onOpenChange: (o: boolean) => void; spares: Spare[]; saved: ApiListState<SavedRequisition>; header: ReqHeader; onHeader: (h: ReqHeader) => void; lines: ReqLine[]; onLines: (l: ReqLine[]) => void;
}) {
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const total = requisitionTotal(lines);
  const usable = filled(lines).length;
  const options = useMemo(() => spares.map(s => ({ value: String(s.id), label: `${s.stock_code} ${s.description}`, description: `${s.unit_of_measure || 'UN'}, ${formatCurrency(s.unit_price)}, ${s.current_quantity} on hand` })), [spares]);
  const status = deriveDataStatus({ loaded: saved.loaded, loading: saved.loading, error: saved.error, errorStatus: saved.errorStatus, count: saved.items.length, transient: isTransientStatus(saved.errorStatus) });
  const set = (patch: Partial<ReqHeader>) => onHeader({ ...header, ...patch });
  const patchLine = (id: string, patch: Partial<ReqLine>) => onLines(lines.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!name.trim() || usable === 0) return;
    setBusy(true);
    try { await apiCreateSavedReq(toSaved(name, header, lines)); toast.success(`Saved "${name.trim()}".`); setName(''); await saved.refetch(); }
    catch (e) { toast.error(`The requisition was not saved: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  const load = (r: SavedRequisition) => { onHeader(r.header); onLines(linesFromSaved(r, spares, newLineId)); toast.success(`Loaded ${r.name}.`); };
  const remove = async (r: SavedRequisition) => {
    if (!await confirm({ title: 'Delete this saved requisition?', message: r.name, confirmLabel: 'Delete', destructive: true })) return;
    try { await apiDeleteSavedReq(r.id); toast.success('Deleted.'); await saved.refetch(); }
    catch (e) { toast.error(`${r.name} was not deleted: ${(e as Error).message}`); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(requisitionText(lines, formatCurrency)); toast.success('Requisition copied.'); } catch { toast.error('The browser would not let this page copy. Download the PDF instead.'); } };
  const pdf = async () => { try { await downloadRequisitionPdf(header, lines); toast.success('PDF downloaded.'); } catch (e) { toast.error(`The PDF failed: ${(e as Error).message}`); } };

  return (
    <Drawer
      open={open} onOpenChange={onOpenChange} title="Parts requisition" description="Build a list of parts, then save, copy or download it."
      footer={<><Button variant="ghost" onClick={() => { onLines([]); onHeader({ requester: '', reason: '', urgency: 'routine', priority: 'medium', required_for: '' }); }} disabled={lines.length === 0}>Clear</Button><Button icon="documents" onClick={copy} disabled={usable === 0}>Copy</Button><Button variant="primary" icon="pdf" onClick={pdf} disabled={usable === 0}>PDF</Button></>}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Requested by" optional><PersonInput value={header.requester} onChange={v => set({ requester: v })} placeholder="Type to search employees" /></Field>
          <Field label="Required for" optional><Input value={header.required_for} onChange={e => set({ required_for: e.target.value })} placeholder="Pump 1 service" /></Field>
          <div className="flex flex-col gap-1.5"><span className="font-sans text-label font-medium text-ink">Urgency</span><Segmented label="Urgency" value={header.urgency} onValueChange={v => set({ urgency: v as ReqHeader['urgency'] })} options={URGENCY} /></div>
          <Field label="Priority"><Select aria-label="Priority" value={header.priority} onValueChange={v => set({ priority: v as ReqHeader['priority'] })} options={PRIORITIES} /></Field>
          <Field label="Reason" optional className="sm:col-span-2"><Textarea rows={2} value={header.reason} onChange={e => set({ reason: e.target.value })} placeholder="Why these parts are needed" /></Field>
        </div>

        <section aria-labelledby="rq-lines" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2"><h3 id="rq-lines" className="font-sans text-label font-semibold text-ink">Parts</h3><Button size="sm" icon="plus" onClick={() => onLines([...lines, { id: newLineId(), spare: null, searchValue: '', qty: 1, dropdownOpen: false }])}>Add a line</Button></div>
          {lines.length === 0 && <p className="font-sans text-body-sm text-ink-muted">No parts yet. Add a line, or use Add to requisition on a part.</p>}
          <ul className="flex flex-col gap-3" aria-label="Requisition lines">
            {lines.map((l, i) => (
              <li key={l.id} className="flex flex-col gap-2 rounded-control border border-line bg-surface-subtle p-3">
                <Field label={`Part ${i + 1}`}>
                  <Combobox aria-label={`Part ${i + 1}`} value={l.spare ? String(l.spare.id) : ''} onValueChange={id => { const s = spares.find(x => String(x.id) === id); if (s) patchLine(l.id, { spare: s, searchValue: s.stock_code }); }} options={options} placeholder="Search the spares register" />
                </Field>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Quantity" className="w-28"><Input type="number" min={1} value={l.qty} onChange={e => patchLine(l.id, { qty: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></Field>
                  <p className="min-w-0 flex-1 pb-2 font-sans text-body-sm text-ink-muted tabular">{l.spare ? `${formatCurrency(l.spare.unit_price)} each, ` : ''}<span className="font-semibold text-ink">{formatCurrency(l.spare ? lineValue(l.qty, l.spare.unit_price) : 0)}</span></p>
                  <IconButton icon="delete" variant="ghost" label={`Remove part ${i + 1}`} onClick={() => onLines(lines.filter(x => x.id !== l.id))} />
                </div>
              </li>
            ))}
          </ul>
          {lines.some(l => !l.spare || l.qty <= 0) && <Notice tone="warning" title="Some lines are not complete">A line needs a part and a quantity above zero to count.</Notice>}
          <p className="text-right font-sans text-body text-ink-muted">Total <span className="font-semibold tabular text-ink">{formatCurrency(total)}</span></p>
        </section>

        <section aria-labelledby="rq-save" className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 id="rq-save" className="font-sans text-label font-semibold text-ink">Saved requisitions</h3>
          <div className="flex items-end gap-2"><Field label="Save this one as" className="flex-1"><Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }} placeholder="Monthly order" /></Field><Button icon="check" pending={busy} disabled={!name.trim() || usable === 0} onClick={save}>Save</Button></div>
          <DataRegion status={status} subject="saved requisitions" error={saved.error} onRetry={() => saved.refetch()} empty={<p className="font-sans text-body-sm text-ink-muted">None saved yet.</p>}>
            <ul className="flex flex-col gap-2" aria-label="Saved requisitions">
              {saved.items.map(r => (
                <li key={r.id} className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-2">
                  <div className="min-w-0 flex-1"><p className="truncate font-sans text-label font-medium text-ink">{r.name}</p><p className="font-sans text-caption text-ink-muted">{[r.header.requester, fmtDate(r.updated_at || r.saved_at), formatCurrency(r.grand_total)].filter(Boolean).join(', ')}</p></div>
                  <Button size="sm" onClick={() => load(r)}>Load</Button>
                  <IconButton icon="delete" size="sm" variant="ghost" label={`Delete the saved requisition ${r.name}`} onClick={() => remove(r)} />
                </li>
              ))}
            </ul>
          </DataRegion>
        </section>
      </div>
    </Drawer>
  );
}
