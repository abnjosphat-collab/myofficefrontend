// app/quotations/page.tsx — a quotation generator: type the company, the client and the lines, see the document, and export it as a PDF
// or a Word file. The file is built in this browser and nothing is emailed. The draft being typed and your company details stay in this
// browser; the quotations you choose to Save are kept on the server (`/api/quotations`), shared by everyone who signs in. Quotations a
// browser saved before they were shared are moved to the server once. Nothing is pre-filled.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, DataRegion, EmptyState, MetricGrid, MetricTile, Notice, PageHeader, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, deriveDataStatus, isTransientStatus, useConfirm, usePersistentState, MoreMenu, LoadingPulse } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { exportPdf, exportWord } from './exportQuotation';
import { QuotationPreview } from './QuotationPreview';
import { ClientPanel, CompanyPanel, DetailsPanel, LineItems, Section, TextPanels } from './QuotationPanels';
import { blankCompany, blankDraft, clientLabel, money, problems, readCompany, readDraft, readSaved, totalsOf, usedLines, type Company, type Draft, type Saved } from './quotationLogic';

const PATH = '/api/quotations';
const LOCAL_SAVED_KEY = 'myoffice_quotations_saved';
/** The saved quotations as the server holds them; one the page cannot read back is left out rather than shown half-empty. */
const fetchSaved = async (): Promise<Saved[]> => readSaved(await api.get<unknown>(PATH)) ?? [];
const clearLocalSaved = () => { try { localStorage.removeItem(LOCAL_SAVED_KEY); } catch { /* storage unavailable */ } };

function QuotationsContent() {
  const confirm = useConfirm();
  const [stored, setStored, ready] = usePersistentState<Draft | null>('myoffice_quotation_draft', null, raw => (raw === null ? null : readDraft(raw)));
  const [company, setCompany] = usePersistentState<Company>('myoffice_quotation_company', blankCompany(), readCompany);
  const list = useApiList<Saved>(PATH, undefined, { fetcher: fetchSaved });
  const saved = list.items;
  const fresh = useMemo(() => blankDraft(new Date()), []);
  const draft = stored ?? fresh;
  const [tab, setTab] = useState('edit');
  const [busy, setBusy] = useState<'pdf' | 'word' | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const update = (patch: Partial<Draft>) => { setStored({ ...draft, ...patch }); setBlocked([]); };
  const totals = totalsOf(draft);
  const used = usedLines(draft).length;
  const recent = useMemo(() => { const seen = new Map<string, { label: string; party: Draft['client'] }>(); saved.forEach(s => { const label = clientLabel(s.draft.client); if (label !== 'No client' && !seen.has(label)) seen.set(label, { label, party: s.draft.client }); }); return [...seen.values()].slice(0, 6).map(v => ({ label: v.label, party: v.party })); }, [saved]);

  // Quotations this browser saved before they were shared: put on the server once (saving a number again updates it), then removed here.
  const moved = useRef(false);
  useEffect(() => {
    if (!list.loaded || moved.current) return;
    moved.current = true;
    let local: Saved[] = [];
    try { local = readSaved(JSON.parse(localStorage.getItem(LOCAL_SAVED_KEY) ?? '[]')) ?? []; } catch { local = []; }
    const onServer = new Set(list.items.map(x => x.id));
    const toMove = local.filter(x => !onServer.has(x.id));
    if (toMove.length === 0) { clearLocalSaved(); return; }
    Promise.all(toMove.map(x => api.put(`${PATH}/${encodeURIComponent(x.id)}`, { draft: x.draft, saved_at: x.savedAt })))
      .then(() => { clearLocalSaved(); void list.refetch(); toast.success(`${toMove.length} saved ${toMove.length === 1 ? 'quotation' : 'quotations'} from this browser moved to the shared list.`); })
      .catch(() => { moved.current = false; /* kept in this browser; tried again on the next visit */ });
  }, [list]);

  const run = async (kind: 'pdf' | 'word') => {
    const p = problems(draft);
    if (p.length) { setBlocked(p); toast.error('The quotation is not ready to export.'); return; }
    setBusy(kind);
    try { const name = await (kind === 'pdf' ? exportPdf(draft, company) : exportWord(draft, company)); toast.success(`${name} saved to your downloads.`); }
    catch (e) { toast.error(`The ${kind === 'pdf' ? 'PDF' : 'Word file'} could not be made: ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const save = async () => {
    const entry: Saved = { id: draft.number.trim() || String(Date.now()), savedAt: new Date().toISOString(), draft };
    const existed = saved.some(x => x.id === entry.id);
    list.setItems(prev => [entry, ...prev.filter(x => x.id !== entry.id)]);
    try {
      await api.put(`${PATH}/${encodeURIComponent(entry.id)}`, { draft: entry.draft, saved_at: entry.savedAt });
      toast.success(existed ? `${entry.id} updated.` : `${entry.id} saved for everyone who signs in.`);
    } catch (e) {
      toast.error(`${entry.id} was not saved: ${e instanceof Error ? e.message : 'the server did not accept it.'}`);
      void list.refetch();
    }
  };
  const startNew = async () => {
    const dirty = usedLines(draft).length > 0 || draft.client.name || draft.client.company;
    if (dirty && !await confirm({ title: 'Start a new quotation?', message: 'The current draft is cleared. Save it first if you want to come back to it.', confirmLabel: 'Start new', destructive: true })) return;
    setStored(blankDraft(new Date())); setBlocked([]); setTab('edit');
  };
  const load = (s: Saved) => { setStored(s.draft); setBlocked([]); setTab('edit'); toast.success(`${s.id} loaded.`); };
  const remove = async (s: Saved) => {
    if (!await confirm({ title: 'Delete this saved quotation?', message: `${s.id}, ${clientLabel(s.draft.client)}. It is removed for everyone, not only on this computer.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await api.delete(`${PATH}/${encodeURIComponent(s.id)}`); list.setItems(prev => prev.filter(x => x.id !== s.id)); toast.success(`${s.id} deleted.`); }
    catch (e) { toast.error(`${s.id} was not deleted: ${e instanceof Error ? e.message : 'the server did not accept it.'}`); }
  };

  if (!ready) return <LoadingPulse label="Loading quotations" />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'Quotations' }]}
        title="Quotation generator"
        description="Write a quotation and export it as a PDF or Word file."
        actions={(
          <>
            <Button icon="save" onClick={save}>Save</Button>
            <MoreMenu pending={busy === 'word'} items={[
              { label: 'New', icon: 'plus', onSelect: startNew },
              { label: 'Word', icon: 'download', disabled: busy !== null, onSelect: () => run('word') },
            ]} />
            <Button variant="primary" icon="pdf" pending={busy === 'pdf'} disabled={busy !== null} onClick={() => run('pdf')}>PDF</Button>
          </>
        )}
      />
      <Notice tone="info" title="What is kept where">The draft you are typing and your company details stay in this browser. Quotations you Save are kept on the server, so everyone who signs in can open them. The page cannot email a quotation: export it and send the file yourself.</Notice>
      {blocked.length > 0 && <Notice tone="danger" title="Fix these before exporting"><span className="flex flex-col gap-0.5">{blocked.map(b => <span key={b}>{b}</span>)}</span></Notice>}

      <MetricGrid compact>
        <MetricTile compact label="Line items" value={used} />
        <MetricTile compact label="Subtotal" value={money(totals.subtotal, draft.currency)} />
        <MetricTile compact label="Total" value={money(totals.total, draft.currency)} detail={`Tax ${Number(draft.taxRate) || 0}%, discount ${Number(draft.discount) || 0}%`} />
        <MetricTile compact label="Valid until" value={draft.validUntil ? fmtDate(draft.validUntil) : 'Not set'} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Quotation views">
          <TabsTrigger value="edit" icon="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview" icon="eye">Preview</TabsTrigger>
          <TabsTrigger value="saved" icon="archive">{`Saved${list.loaded ? ` (${saved.length})` : ''}`}</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <DetailsPanel draft={draft} onChange={update} />
              <ClientPanel client={draft.client} onChange={client => update({ client })} recent={recent} />
              <CompanyPanel company={company} onChange={setCompany} />
            </div>
            <div className="flex flex-col gap-4">
              <LineItems lines={draft.lines} currency={draft.currency} onChange={lines => update({ lines })} />
              <TextPanels draft={draft} onChange={update} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4"><QuotationPreview draft={draft} company={company} /></TabsContent>

        <TabsContent value="saved" className="mt-4">
          <DataRegion
            status={deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: saved.length, transient: isTransientStatus(list.errorStatus) })}
            subject="saved quotations" error={list.error} onRetry={() => { void list.refetch(); }}
            empty={<EmptyState icon="archive" title="Nothing saved yet" description="Choose Save to keep a copy of this quotation for everyone to open later." action={<Button icon="save" onClick={save}>Save this quotation</Button>} />}
          >
            <Section title="Saved quotations" description="Shared: everyone who signs in sees these.">
              <ul className="flex flex-col divide-y divide-line-subtle" aria-label="Saved quotations">
                {saved.map(s => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1"><p className="font-sans text-label font-semibold text-ink [overflow-wrap:anywhere]">{s.id} <span className="font-normal text-ink-muted">{clientLabel(s.draft.client)}</span></p><p className="font-sans text-caption text-ink-muted">Saved {s.savedAt ? fmtDate(s.savedAt) : ''}{s.savedBy ? ` by ${s.savedBy}` : ''}, {usedLines(s.draft).length} {usedLines(s.draft).length === 1 ? 'line' : 'lines'}</p></div>
                      <StatusBadge tone="neutral">{money(totalsOf(s.draft).total, s.draft.currency)}</StatusBadge>
                      <Button size="sm" onClick={() => load(s)}>Open</Button>
                      <Button size="sm" variant="ghost" icon="delete" aria-label={`Delete ${s.id}`} onClick={() => remove(s)} />
                  </li>
                ))}
              </ul>
            </Section>
          </DataRegion>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function QuotationsPage() {
  return <AppShell migrated><QuotationsContent /></AppShell>;
}
