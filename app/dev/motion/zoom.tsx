// app/dev/motion/zoom.tsx — gallery section for shared-element zoom: a card
// growing into its dialog, a New button growing into its form, a drawer
// zoom, and the missing-source fallback. Client demos only.
'use client';

import { useState } from 'react';
import {
  Button, Checkbox, Dialog, Drawer, Field, FormDialog, Input, Panel, ZoomLink,
} from '@/components/ui-system';

export function ZoomSection() {
  const [order, setOrder] = useState(false);
  const [form, setForm] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [sourceGone, setSourceGone] = useState(false);
  return (
    <Panel title="Zoom" description="This became that: a card grows into its dialog and shrinks back on close. Missing sources fall back to the plain open; reduced motion crossfades.">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-sans text-label font-medium text-ink">Card → dialog</p>
          <ZoomLink zoomId="gallery:order:1024" className="max-w-sm rounded-card border border-line bg-surface-raised shadow-card">
            <button type="button" aria-label="Open order WO-1024" onClick={() => setOrder(true)} className="focus-ring block w-full rounded-card px-4 py-3 text-left">
              <span className="block font-sans text-body font-medium text-ink">WO-1024 · Pump P-7 seal</span>
              <span className="block font-sans text-body-sm text-ink-muted">Routine · Due Friday</span>
            </button>
          </ZoomLink>
        </div>
        <div>
          <p className="mb-2 font-sans text-label font-medium text-ink">New button → form</p>
          <ZoomLink zoomId="gallery:new-order" className="inline-block">
            <Button variant="primary" onClick={() => setForm(true)}>New order</Button>
          </ZoomLink>
        </div>
        <div>
          <p className="mb-2 font-sans text-label font-medium text-ink">Card → drawer</p>
          <ZoomLink zoomId="gallery:drawer:1" className="inline-block">
            <Button size="sm" onClick={() => setDrawer(true)}>Open the zoom drawer</Button>
          </ZoomLink>
        </div>
        <div>
          <p className="mb-2 font-sans text-label font-medium text-ink">Missing source → plain open</p>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox label="Filter the source away" checked={sourceGone} onChange={event => setSourceGone(event.target.checked)} />
            {!sourceGone && (
              <ZoomLink zoomId="gallery:fallback:1" className="inline-block">
                <Button size="sm" variant="ghost" onClick={() => setFallback(true)}>Open record</Button>
              </ZoomLink>
            )}
            <Button size="sm" variant="ghost" onClick={() => setFallback(true)}>Open without source</Button>
          </div>
        </div>
      </div>
      <Dialog open={order} onOpenChange={setOrder} zoomId="gallery:order:1024" title="Order WO-1024" description="Grown out of its card; Escape shrinks it back." footer={<Button size="sm" onClick={() => setOrder(false)}>Close</Button>}>
        <p className="font-sans text-body-sm text-ink">The panel springs from the card&apos;s box on the gentle spring; the scrim fades on quick.</p>
      </Dialog>
      <FormDialog open={form} onOpenChange={setForm} zoomId="gallery:new-order" title="New order" submitLabel="Save" onSubmit={async () => {}}>
        <Field label="Title"><Input /></Field>
      </FormDialog>
      <Drawer open={drawer} onOpenChange={setDrawer} zoomId="gallery:drawer:1" title="Drawer record" description="A right-placed zoom; drag-dismiss is off while zoomed.">
        <p className="font-sans text-body-sm text-ink">Same continuity, drawer placement: the fallback is the edge slide.</p>
      </Drawer>
      <Dialog open={fallback} onOpenChange={setFallback} zoomId="gallery:fallback:1" title="Fallback record" description="Opened with no live source.">
        <p className="font-sans text-body-sm text-ink">No source, no zoom: the placement&apos;s normal open.</p>
      </Dialog>
    </Panel>
  );
}
