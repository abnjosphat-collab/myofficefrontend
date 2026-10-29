// app/dev/motion/feedback.tsx — gallery sections for the N1 layer pieces:
// selection ticks, progress fills, disclosures, toasts and the sidebar
// collapse. Client demos only.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Checkbox, ChoiceCards, Disclosure, IconButton, NavItem, Panel, Progress, ProgressFill, SidebarFrame,
} from '@/components/ui-system';

export function SelectionSection() {
  const [checked, setChecked] = useState(true);
  const [pick, setPick] = useState('a');
  return (
    <Panel title="Selection ticks" description="The tick draws on with the stroke (snappy) and draws off in reverse; the indeterminate dash scales from the centre. Under reduced motion it flips instantly.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <Checkbox label="Checked" checked={checked} onChange={e => setChecked(e.target.checked)} />
          <Checkbox label="Indeterminate" indeterminate checked={false} onChange={() => {}} />
        </div>
        <ChoiceCards label="Demo choice" value={pick} onValueChange={setPick} options={[
          { value: 'a', title: 'First option', description: 'The selected card keeps its fading ring; the tick draws.' },
          { value: 'b', title: 'Second option', description: 'Switch to see the tick draw across.' },
        ]} />
      </div>
    </Panel>
  );
}

export function ProgressSection() {
  const [value, setValue] = useState(62);
  return (
    <Panel title="Progress fill" description="Fills move by transform, never by width: bars scale on X, rings sweep the dash offset on the smooth spring. The percentage rolls digit by digit. Indeterminate work pulses calmly.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[13, 62, 91].map(v => (
            <Button key={v} size="sm" variant={v === value ? 'primary' : 'secondary'} onClick={() => setValue(v)}>{v}%</Button>
          ))}
        </div>
        <Progress value={value} label="Demo progress" />
        <div className="flex flex-wrap items-center gap-6">
          <ProgressFill variant="ring" fraction={value / 100} size={72} stroke={7} accent="var(--mo-action)" label={`${value}% of the demo goal`}>
            <span className="font-sans text-caption font-semibold text-ink tabular">{value}%</span>
          </ProgressFill>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <span className="font-sans text-caption text-ink-muted">Indeterminate (waiting, not stuck)</span>
            <ProgressFill fraction={0} indeterminate className="h-2 rounded-full bg-action" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function DisclosureSection() {
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Disclosures" description="Show-more in one piece: the chevron rotates 90° on the snappy spring and the content fades in with height on the smooth spring. Reversible mid-flight; a fade under reduced motion.">
      <Disclosure open={open} onOpenChange={setOpen} label="Pressure, temperature and notes">
        <p className="font-sans text-body-sm text-ink-muted">Optional fields fold away until wanted. The same piece drives the compressors runway and the unit drawer.</p>
      </Disclosure>
    </Panel>
  );
}

export function ToastSection() {
  return (
    <Panel title="Toasts" description="The stack enters from the bottom edge and re-flows on the smooth spring; swiping away keeps the release velocity. The success icon appears once, the error icon wiggles once. Fire one and watch.">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => toast.success('Reading saved.', { description: 'Compressor 3 · today' })}>Success toast</Button>
        <Button size="sm" onClick={() => toast.info('Refresh in the background.', { description: 'Lists update themselves quietly.' })}>Info toast</Button>
        <Button size="sm" onClick={() => toast.warning('Service due within a week.', { description: 'Compressor 3 is heading for its 500 h service.' })}>Warning toast</Button>
        <Button size="sm" onClick={() => toast.error('Reading not saved.', { description: 'The previous reading could not be loaded.' })}>Error toast</Button>
      </div>
    </Panel>
  );
}

export function SidebarSection() {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <Panel title="Sidebar collapse" description="Labels crossfade out first on the quick spring; the rail then eases width on one CSS gentle spring. The main content never moves. Toggle it.">
      <div className="flex min-h-56 gap-4 overflow-hidden rounded-card border border-line-subtle">
        <SidebarFrame
          open={navOpen}
          onOpenChange={setNavOpen}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          label="Demo navigation"
          spotlight={<strong className="font-sans text-body-sm text-ink">Demo</strong>}
          strip={<IconButton icon="sidebar" label="Open navigation" variant="ghost" onClick={() => setNavOpen(true)} />}
        >
          <NavItem label="Compressors" icon="compressor" active collapsed={collapsed} />
          <NavItem label="Maintenance" icon="maintenance" collapsed={collapsed} />
        </SidebarFrame>
        <div className="min-w-0 flex-1 p-4">
          <p className="font-sans text-body-sm text-ink-muted">Content settles; it does not animate.</p>
          <p className="mt-1 font-sans text-caption text-ink-muted">Rail: {collapsed ? '68 px icon rail' : '216 px full column'}.</p>
        </div>
      </div>
    </Panel>
  );
}
