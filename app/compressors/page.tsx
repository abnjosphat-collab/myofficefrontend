// app/compressors/page.tsx — the compressors floor.
// One screen built around the daily job: see the fleet, record today's meter readings, see services coming. Depth comes
// from raised surfaces over a 3D backdrop. Nothing loops for ever: things move once, while hovered, or when an event
// arrives (a saved reading, a status change, a unit falling due for service), which also plays a short chime unless
// muted.
'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Button, DataRegion, EmptyState, Icon, IconButton, Input, MetricGrid, MetricTile, Select, deriveDataStatus, isTransientStatus, buttonVariants } from '@/components/ui-system';
import { useLookupList } from '@/hooks/useLookups';
import { formatDate, formatWeekday } from '@/lib/format';
import { AnalyticsTab } from './AnalyticsTab';
import { ManagementTab } from './ManagementTab';
import { ServicesTab } from './ServicesTab';
import { localDateString } from './calcCompressors';
import { STATUS_META, hours } from './meta';
import type { Compressor } from './types';
import { useCompressorsData } from './useCompressorsData';
import { AnimatedText } from '@/components/shared/floor/motion';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { REGISTER_COLUMNS, SERVICES_COLUMNS, registerRows, servicesFromRegister } from './exports';
import { useFloorSignals } from '@/components/shared/floor/signals';
import { serviceLife, statusAccent } from './floorLogic';
import { UnitDrawer } from './UnitDrawer';
import { UnitPod } from './UnitPod';
import { MonthView } from './MonthView';
import { UnitView } from './UnitView';
import s from '@/components/shared/floor/floor.module.css';

const ALL = '__all__';
const RUNWAY_KEY = 'compressors.floor.runwayOpen';
type View = 'floor' | 'month' | 'services' | 'analytics' | 'fleet' | 'unit';
const parseDay = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
const dayLabel = (v: string) => `${formatWeekday(parseDay(v))} ${formatDate(parseDay(v))}`;

function CompressorFloor() {
  const reduced = useReducedMotion();
  const [date, setDate] = useState(() => localDateString(new Date()));
  const d = useCompressorsData(date);
  const { register, previous } = d;
  const compressors = register.items;
  const lookupLocations = useLookupList('location');
  const [view, setView] = useState<View>('floor');
  const [layout, setLayout] = useState<'pods' | 'list'>('pods');
  const [location, setLocation] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [openId, setOpenId] = useState<number | null>(null);
  // The compressor whose week and month are open, and the view to return to.
  const [unitId, setUnitId] = useState<number | null>(null);
  const showUnit = (id: number) => { setOpenId(null); setUnitId(id); setView('unit'); };
  const [ym, setYm] = useState(() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });
  const [justSaved, setJustSaved] = useState<number | null>(null);
  // Each unit's event count: bumping it spins that unit's fan up once.
  const [kicks, setKicks] = useState<Record<number, number>>({});
  const kick = (id: number) => setKicks(k => ({ ...k, [id]: (k[id] ?? 0) + 1 }));
  const { signal } = useFloorSignals();

  useEffect(() => { if (justSaved == null) return; const t = window.setTimeout(() => setJustSaved(null), 1400); return () => window.clearTimeout(t); }, [justSaved]);

  const locations = useMemo(() => [...new Set([...lookupLocations, ...compressors.map(c => c.location).filter(Boolean)])].sort(), [lookupLocations, compressors]);
  const shown = useMemo(() => compressors.filter(c => (location === ALL || c.location === location) && (statusF === ALL || c.status === statusF)), [compressors, location, statusF]);
  const recorded = new Set(previous.todayIds);
  const dueSoon = useMemo(() => compressors.map(c => ({ c, life: serviceLife(c.total_running_hours) })).filter(x => x.life.next).sort((a, b) => (a.life.hoursLeft ?? 0) - (b.life.hoursLeft ?? 0)), [compressors]);
  const open = compressors.find(c => c.id === openId) ?? null;
  const status = deriveDataStatus({ loaded: register.loaded, loading: register.loading, error: register.error, errorStatus: register.errorStatus, count: shown.length, transient: isTransientStatus(register.errorStatus) });
  const isToday = date === localDateString(new Date());

  // A unit that has just fallen within a week of its service is an event: announce it once.
  const urgentKey = dueSoon.filter(x => x.life.urgent).map(x => x.c.id).join(',');
  const seenUrgent = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!register.loaded) return;
    const now = new Set(urgentKey ? urgentKey.split(',').map(Number) : []);
    const before = seenUrgent.current;
    seenUrgent.current = now;
    const fresh = before ? [...now].filter(id => !before.has(id)) : [...now];
    if (!fresh.length) return;
    signal('alert');
    if (before) {
      const names = compressors.filter(c => fresh.includes(c.id)).map(c => c.name);
      toast.warning(`${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} now due for service within a week.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the urgent set only
  }, [urgentKey, register.loaded]);

  return (
    <div className="relative isolate flex min-h-[calc(100dvh-140px)] flex-col gap-6">
      {/* Header: the place, the day, the one primary action */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <AnimatedText as="h1" text="Compressors" className="font-display text-[30px] font-normal leading-tight tracking-tight text-ink" />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input type="date" aria-label="Reading date" className="w-40" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
          {!isToday && <Button onClick={() => setDate(localDateString(new Date()))}>Today</Button>}
          {compressors.length > 0 && <DownloadButton data={registerRows(compressors, recorded)} columns={REGISTER_COLUMNS} filename={exportFilename('Compressor_Register')} title="Compressor register" subtitle={`Readings for ${dayLabel(date)}`} />}
          <Link href="/equipment" className={buttonVariants({ variant: 'primary' }) + ' max-sm:w-full'}><Icon name="plus" size="sm" />Add in Equipment register</Link>
        </div>
      </header>

      {/* Today, as one quiet row of figures (the app's shared chips). The status chips filter the floor. */}
      <MetricGrid compact>
        <MetricTile compact label="Units" value={register.loaded ? compressors.length : undefined} selected={statusF === ALL} onClick={() => setStatusF(ALL)} loading={!register.loaded && register.loading} />
        {(['running', 'standby', 'maintenance'] as const).map(k => (
          <MetricTile key={k} compact label={STATUS_META[k].label} tone={k === 'running' ? 'success' : k === 'maintenance' ? 'warning' : 'default'}
            value={register.loaded ? compressors.filter(c => c.status === k).length : undefined}
            selected={statusF === k} onClick={() => setStatusF(statusF === k ? ALL : k)} loading={!register.loaded && register.loading} />
        ))}
      </MetricGrid>

      {/* View switch: the floor is the job; the rest are references */}
      <nav aria-label="Compressor views" className="flex flex-wrap items-center justify-between gap-3">
        {/* Scrolls sideways within its own width on a narrow screen rather than widening the page. */}
        <div className="relative flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-[var(--mo-surface-muted)] p-1 shadow-[inset_0_1px_3px_color-mix(in_srgb,var(--mo-ink)_12%,transparent)] [scrollbar-width:none]">
          {([['floor', 'Floor'], ['month', 'Month'], ['services', 'Services'], ['analytics', 'Analytics'], ['fleet', 'Fleet']] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className="relative z-10 shrink-0 rounded-[8px] px-4 py-1.5 font-sans text-body-sm font-medium text-ink-muted transition-colors aria-pressed:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mo-focus)]">
              {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 -z-10 rounded-[8px] bg-[var(--mo-surface-raised)] shadow-[0_4px_12px_-6px_color-mix(in_srgb,var(--mo-ink)_40%,transparent)]" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
              {label}
            </button>
          ))}
        </div>
        {(view === 'floor' || view === 'month') && (
          <div className="flex flex-wrap items-center gap-2">
            <Select className="w-44" aria-label="Location" value={location} onValueChange={setLocation} options={[{ value: ALL, label: 'All locations' }, ...locations.map(l => ({ value: l, label: l }))]} />
            {view === 'floor' && <div className="flex rounded-[8px] border border-[var(--mo-line-subtle)] p-0.5" role="group" aria-label="Layout">
              <IconButton icon="grid-view" size="sm" label="Pods" variant={layout === 'pods' ? 'outline' : 'ghost'} aria-pressed={layout === 'pods'} onClick={() => setLayout('pods')} />
              <IconButton icon="table-view" size="sm" label="List" variant={layout === 'list' ? 'outline' : 'ghost'} aria-pressed={layout === 'list'} onClick={() => setLayout('list')} />
            </div>}
          </div>
        )}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {view === 'floor' && (
            <div className="flex flex-col gap-5">
              <ServiceRunway items={dueSoon} onOpen={setOpenId} />
              <DataRegion
                status={status}
                subject="compressors"
                error={register.error}
                onRetry={() => d.refresh()}
                empty={compressors.length
                  ? <EmptyState icon="search" title="No compressors match" description="Try another location or status." action={<Button onClick={() => { setLocation(ALL); setStatusF(ALL); }}>Show all</Button>} />
                  : <EmptyState icon="compressor" title="No compressors registered" description="Compressors are added in the Equipment register (category Compressors) and appear here." action={<Link href="/equipment" className={buttonVariants({ variant: 'primary' })}><Icon name="plus" size="sm" />Add in Equipment register</Link>} />}
              >
                {layout === 'pods'
                  ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{shown.map((c, i) => <UnitPod key={c.id} compressor={c} index={i} recordedToday={recorded.has(c.id)} justSaved={justSaved === c.id} kick={kicks[c.id] ?? 0} onOpen={() => setOpenId(c.id)} />)}</div>
                  : <UnitList rows={shown} recorded={recorded} onOpen={setOpenId} />}
              </DataRegion>
            </div>
          )}
          {view === 'month' && (
            <MonthView
              compressors={shown}
              history={previous.history}
              loading={previous.loading}
              year={ym.y} month={ym.m}
              today={localDateString(new Date())}
              onMonth={(y, m) => setYm({ y, m })}
              onOpenDay={(id, day) => { setDate(day); setOpenId(id); }}
              onOpenUnit={showUnit}
            />
          )}
          {view === 'unit' && (() => {
            const u = compressors.find(x => x.id === unitId);
            return u ? (
              <UnitView compressor={u} history={previous.history[u.id] ?? []} loading={previous.loading} today={localDateString(new Date())}
                onBack={() => setView('floor')} onOpenDay={day => { setDate(day); setOpenId(u.id); }} />
            ) : null;
          })()}
          {view === 'services' && <div className={s.viewEnter}><ServicesTab services={d.services} compressors={compressors} registerLoaded={register.loaded} onRetry={() => d.refresh()} /></div>}
          {view === 'analytics' && <div className={s.viewEnter}><AnalyticsTab metrics={d.metrics} trends={d.trends} comparison={d.comparison} period={d.period} onPeriod={d.setPeriod} metric={d.metric} onMetric={d.setMetric} onRetry={() => d.refresh()} /></div>}
          {view === 'fleet' && <div className={s.viewEnter}><ManagementTab summary={d.summary} onRetry={() => d.refresh()} /></div>}
        </motion.div>
      </AnimatePresence>

      <UnitDrawer
        compressor={open}
        previous={open ? previous.byId[open.id] : undefined}
        previousUnavailable={open ? previous.failed.includes(open.id) : false}
        previousLoading={previous.loading}
        dateLabel={dayLabel(date)}
        recordedToday={open ? recorded.has(open.id) : false}
        onClose={() => setOpenId(null)}
        onSave={async (id, v) => { await d.saveReading(id, v); setJustSaved(id); kick(id); signal('saved'); }}
        onStatus={async (id, st) => { await d.changeStatus(id, st); kick(id); signal('status'); }}
        onHistory={showUnit}
      />
    </div>
  );
}

/** The dense view: one row per unit. */
function UnitList({ rows, recorded, onOpen }: { rows: Compressor[]; recorded: Set<number>; onOpen: (id: number) => void }) {
  return (
    <div className={`${s.slab} overflow-hidden`}>
      <ul className="divide-y divide-[var(--mo-line-subtle)]">
        {rows.map(c => {
          const life = serviceLife(c.total_running_hours);
          return (
            <li key={c.id} style={{ ['--accent' as string]: statusAccent(c.status) }}>
              <button type="button" onClick={() => onOpen(c.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--mo-surface-subtle)] focus-visible:bg-[var(--mo-surface-subtle)] focus-visible:outline-none sm:grid-cols-[auto_1.4fr_1fr_1fr_auto]">
                <span className={s.lamp} data-state={c.status} />
                <span className="min-w-0"><span className="block truncate font-sans text-body font-medium text-ink">{c.name}</span><span className="block truncate font-sans text-caption text-ink-muted">{c.location}</span></span>
                <span className="hidden font-sans text-body tabular text-ink sm:block">{hours(c.total_running_hours)}</span>
                <span className="hidden font-sans text-caption text-ink-muted sm:block">{life.next ? `${life.next} h in ${life.hoursLeft?.toFixed(0)} h` : 'All passed'}</span>
                <span className="font-sans text-caption font-medium" style={{ color: recorded.has(c.id) ? 'var(--mo-success)' : 'var(--mo-ink-muted)' }}>{recorded.has(c.id) ? 'Recorded' : 'Reading due'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Services coming up, nearest first, as one slim strip. Folded (the default, remembered in this browser) it is a single
 * line: the next service and how many fall within a week and within 30 days. Open, it is a small aligned list: name, a thin
 * bar, hours to go and the service it is heading for. Six rows show; the rest are one click away.
 */
function ServiceRunway({ items, onOpen }: { items: { c: Compressor; life: ReturnType<typeof serviceLife> }[]; onOpen: (id: number) => void }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  // Browser storage is only readable after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading it during render would differ from the server render
    try { if (window.localStorage.getItem(RUNWAY_KEY) === '1') setOpen(true); } catch { /* storage unavailable: stays folded */ }
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { window.localStorage.setItem(RUNWAY_KEY, next ? '1' : '0'); } catch { /* the choice lasts this visit */ }
  };
  const first = items[0];
  const week = items.filter(x => x.life.urgent).length;
  const month = items.filter(x => (x.life.daysLeft ?? Infinity) <= 30).length;
  const shown = all ? items : items.slice(0, 6);
  const bodyId = 'service-runway-list';
  return (
    <section aria-label="Service runway" className={`${s.slab} px-4 py-2`} data-still="">
      <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={toggle}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-[8px] py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mo-focus)]">
        <span className="font-sans text-body-sm font-medium text-ink">Services</span>
        <span className="min-w-0 flex-1 truncate font-sans text-caption text-ink-muted">
          {first ? <>Next: <span className="text-ink">{first.c.name.trim()}</span> in {first.life.hoursLeft?.toFixed(0)} h</> : 'No planned services ahead'}
        </span>
        <span className="font-sans text-caption tabular" style={{ color: week ? 'var(--mo-danger)' : 'var(--mo-ink-muted)' }}>{week} within a week</span>
        <span className="font-sans text-caption tabular text-ink-muted">{month} within 30 days</span>
        <Icon name="chevron-down" size="xs" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={bodyId} key="list"
            initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <ul className="mt-1 divide-y divide-[var(--mo-line-subtle)] border-t border-[var(--mo-line-subtle)]">
              {shown.map(({ c, life }) => (
                <li key={c.id} style={{ ['--accent' as string]: life.tone }}>
                  <button type="button" onClick={() => onOpen(c.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-4 gap-y-1 px-1 py-1.5 text-left hover:bg-[var(--mo-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mo-focus)] sm:grid-cols-[minmax(0,11rem)_1fr_5rem_6.5rem]">
                    <span className="truncate font-sans text-caption text-ink">{c.name.trim()}</span>
                    <span className={`${s.runway} order-last col-span-2 sm:order-none sm:col-span-1`} aria-hidden="true" style={{ height: 4 }}><span className={s.runwayFill} style={{ display: 'block', width: `${Math.max(3, life.fraction * 100)}%`, boxShadow: 'none' }} /></span>
                    <span className="text-right font-sans text-caption tabular" style={{ color: life.urgent ? 'var(--mo-danger)' : 'var(--mo-ink)' }}>{life.hoursLeft?.toFixed(0)} h</span>
                    <span className="hidden text-right font-sans text-caption tabular text-ink-muted sm:block">to {life.next} h</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-1.5">
              {items.length > 6
                ? <button type="button" onClick={() => setAll(a => !a)} className="rounded-[4px] font-sans text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mo-focus)]">{all ? 'Show fewer' : `Show all ${items.length}`}</button>
                : <span />}
              <DownloadButton data={servicesFromRegister(items.map(x => x.c)) as unknown as Record<string, unknown>[]} columns={SERVICES_COLUMNS} filename={exportFilename('Compressor_Upcoming_Services')} title="Upcoming compressor services" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function CompressorFloorPage() {
  return <AppShell migrated><CompressorFloor /></AppShell>;
}
