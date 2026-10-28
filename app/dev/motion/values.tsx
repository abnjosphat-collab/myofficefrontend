// app/dev/motion/values.tsx — gallery sections for numbers, presence and
// data loading. Client demos only; no app behaviour lives here.
'use client';

import { useEffect, useState } from 'react';
import {
  Button, DataRegion, MotionList, MotionListItem, NumberTransition, Panel, Presence,
} from '@/components/ui-system';

export function NumberSection() {
  const [value, setValue] = useState(1234);
  return (
    <Panel title="Numbers" description="Digits roll to the new value on motion values (React never re-renders per frame). Screen readers hear the final value only.">
      <div className="flex flex-col gap-4">
        <p className="font-display text-metric tabular">
          <NumberTransition value={value} label={`${value} work orders`} />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setValue(v => v + 1)}>+1</Button>
          <Button size="sm" onClick={() => setValue(v => v + 10)}>+10</Button>
          <Button size="sm" onClick={() => setValue(v => Math.max(0, v - 5))}>−5</Button>
          <Button size="sm" variant="ghost" onClick={() => setValue(1234)}>Reset</Button>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-sans text-body-sm text-ink-muted">
          <p>Decimals: <span className="text-ink tabular"><NumberTransition value={value / 10} decimals={1} /></span></p>
          <p>Prefix and suffix: <span className="text-ink tabular"><NumberTransition value={value} prefix="n=" suffix=" claimed" /></span></p>
        </div>
      </div>
    </Panel>
  );
}

export function PresenceSection() {
  const [items, setItems] = useState([1, 2, 3]);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const [bar, setBar] = useState(true);
  const add = () => {
    const next = (items[items.length - 1] ?? 0) + 1;
    setItems(list => [...list, next]);
    setFresh(new Set([next]));
  };
  const [fadeItems, setFadeItems] = useState([1, 2]);
  return (
    <Panel title="Presence and lists" description="Cards enter with fade + 6 px rise and collapse out; new rows arrive highlighted; table rows only fade.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={add}>Add row</Button>
          <Button size="sm" variant="ghost" onClick={() => setItems([])}>Clear</Button>
          <Button size="sm" variant="ghost" aria-pressed={bar} onClick={() => setBar(v => !v)}>{bar ? 'Hide bar' : 'Show bar'}</Button>
        </div>
        <Presence visible={bar}>
          <p role="status" className="rounded-control border border-line bg-action-soft/50 px-3 py-2 font-sans text-label font-semibold text-ink">
            {items.length} selected
          </p>
        </Presence>
        <MotionList className="flex flex-col gap-2">
          {items.map(id => (
            <MotionListItem key={id} highlight={fresh.has(id)}>
              <div className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface-raised px-3 py-2">
                <span className="font-sans text-body-sm text-ink">Card {id}</span>
                <Button size="sm" variant="ghost" onClick={() => setItems(list => list.filter(row => row !== id))}>Remove</Button>
              </div>
            </MotionListItem>
          ))}
        </MotionList>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="mr-auto font-sans text-label font-medium text-ink">Fade-only rows (tables stay crisp; DataTable wires this internally)</p>
            <Button size="sm" variant="ghost" onClick={() => setFadeItems(list => [...list, (list[list.length - 1] ?? 0) + 1])}>Add fade row</Button>
          </div>
          <MotionList className="flex flex-col overflow-hidden rounded-card border border-line">
            {fadeItems.map(id => (
              <MotionListItem key={id} collapse={false} className="border-b border-line-subtle bg-surface-raised px-3 py-2 last:border-b-0">
                <span className="font-sans text-body-sm text-ink tabular">Fade row {id}</span>
              </MotionListItem>
            ))}
          </MotionList>
        </div>
      </div>
    </Panel>
  );
}

function LoadingDemo() {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  useEffect(() => {
    const timer = setTimeout(() => setStatus('ready'), 1200);
    return () => clearTimeout(timer);
  }, []);
  return (
    <DataRegion status={status} subject="demo records">
      <ul className="flex flex-col gap-2">
        {['First record', 'Second record', 'Third record'].map(name => (
          <li key={name} className="rounded-card border border-line bg-surface-raised px-3 py-2 font-sans text-body-sm text-ink">{name}</li>
        ))}
      </ul>
    </DataRegion>
  );
}

export function DataRegionSection() {
  const [run, setRun] = useState(0);
  return (
    <Panel title="Data loading" description="Skeleton swaps to content with a 0.15 s crossfade (same in both motion modes). Later refreshes never animate.">
      <div className="flex flex-col gap-4">
        <div>
          <Button size="sm" onClick={() => setRun(n => n + 1)}>Replay load</Button>
        </div>
        <LoadingDemo key={run} />
      </div>
    </Panel>
  );
}
