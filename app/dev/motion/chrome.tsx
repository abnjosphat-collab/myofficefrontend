// app/dev/motion/chrome.tsx — gallery sections for indicators, overlays,
// press feedback and the effect matrix. Client demos only.
'use client';

import { useState } from 'react';
import {
  Button, DataTable, Dialog, Drawer, IconButton, Menu, MenuContent, MenuItem, MenuTrigger,
  Panel, Popover, PopoverContent, PopoverTrigger, Segmented, Tabs, TabsContent, TabsList,
  TabsTrigger, Tooltip, ViewToggle, VIEW_CARDS_TABLE, type Column,
} from '@/components/ui-system';

export function IndicatorSection() {
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  return (
    <Panel title="Selection indicators" description="The selection marker slides on the smooth spring instead of jumping. Try each control.">
      <div className="flex flex-col gap-6">
        <Tabs defaultValue="orders">
          <TabsList aria-label="Demo tabs">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="orders"><p className="font-sans text-body-sm text-ink-muted">Orders panel.</p></TabsContent>
          <TabsContent value="schedule"><p className="font-sans text-body-sm text-ink-muted">Schedule panel.</p></TabsContent>
          <TabsContent value="history"><p className="font-sans text-body-sm text-ink-muted">History panel.</p></TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Demo filter" value={filter} onValueChange={setFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'done', label: 'Done' },
          ]} />
          <span className="font-sans text-body-sm text-ink-muted">Filter: {filter}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
          <span className="font-sans text-body-sm text-ink-muted">View: {view}</span>
        </div>
        <p className="font-sans text-caption text-ink-muted">The nav marker in the sidebar and the mobile strip slides the same way — navigate to another page and back to see it travel.</p>
      </div>
    </Panel>
  );
}

export function OverlaySection() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <Panel title="Overlays" description="Dialogs grow with scale + fade; drawers slide from the edge (drag to dismiss on phones); menus, popovers and tooltips fade with 4 px.">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDialog(true)}>Open dialog</Button>
        <Button size="sm" onClick={() => setDrawer(true)}>Open drawer</Button>
        <Menu>
          <MenuTrigger asChild><Button size="sm">Open menu</Button></MenuTrigger>
          <MenuContent>
            <MenuItem>First action</MenuItem>
            <MenuItem>Second action</MenuItem>
          </MenuContent>
        </Menu>
        <Popover>
          <PopoverTrigger asChild><Button size="sm">Open popover</Button></PopoverTrigger>
          <PopoverContent><p className="font-sans text-body-sm text-ink">A popover panel.</p></PopoverContent>
        </Popover>
        <Tooltip content="A tooltip bubble">
          <IconButton icon="info" label="Show tooltip" />
        </Tooltip>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog} title="Demo dialog" description="Scale 0.98 and fade on the smooth spring." footer={<Button size="sm" onClick={() => setDialog(false)}>Close</Button>}>
        <p className="font-sans text-body-sm text-ink">The panel grows out of the page; the scrim fades on the quick spring.</p>
      </Dialog>
      <Drawer open={drawer} onOpenChange={setDrawer} title="Demo drawer" description="Edge slide on the gentle spring.">
        <p className="font-sans text-body-sm text-ink">On a phone, drag this panel right to dismiss it.</p>
      </Drawer>
    </Panel>
  );
}

export function PressSection() {
  return (
    <Panel title="Press" description="Buttons answer a press by dipping to 0.98 on the snappy spring. Press and hold — nothing moves under reduced motion.">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary">Primary</Button>
        <Button size="sm" variant="secondary">Secondary</Button>
        <Button size="sm" variant="ghost">Ghost</Button>
        <IconButton icon="plus" label="Add" />
        <IconButton icon="close" label="Close" />
      </div>
    </Panel>
  );
}

type MatrixRow = { effect: string; means: string; where: string };

const MATRIX: MatrixRow[] = [
  { effect: 'bounce', means: 'it happened / it arrived', where: '§ Animated icons (bell, check)' },
  { effect: 'wiggle', means: 'a next step you might overlook', where: '§ Animated icons (warning)' },
  { effect: 'pulse', means: 'ongoing activity', where: '§ Animated icons' },
  { effect: 'rotate', means: 'a task in progress (spinners only)', where: '§ Animated icons' },
  { effect: 'connecting', means: 'trying to reach the server', where: '§ Animated icons (signal bars)' },
  { effect: 'scale', means: 'this is the selected one', where: '§ Animated icons' },
  { effect: 'replace', means: 'the state of this control flipped', where: '§ Icon swap (download, export, mute, copy)' },
  { effect: 'appear / disappear', means: 'it came or went', where: '§ Animated icons + § Presence and lists' },
  { effect: 'number roll', means: 'the value changed', where: '§ Numbers' },
  { effect: 'zoom', means: 'this became that', where: '§ Zoom (card → dialog, button → form, drawer, fallback)' },
];

export function MatrixSection() {
  const columns: Array<Column<MatrixRow>> = [
    { id: 'effect', header: 'Effect', cell: row => <strong className="font-medium">{row.effect}</strong> },
    { id: 'means', header: 'Means', cell: row => row.means },
    { id: 'where', header: 'Try it', cell: row => row.where },
  ];
  return (
    <Panel title="Effect matrix" description="One meaning per effect, applied everywhere. Not used, by decision: breathe, bouncy springs, parallax, page transitions, scroll-linked transforms, confetti.">
      <DataTable columns={columns} rows={MATRIX} getRowId={row => row.effect} caption="Motion effect matrix" />
    </Panel>
  );
}
