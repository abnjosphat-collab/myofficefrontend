// app/tools/page.tsx — the Tools workspace: the shared frame (sidebar, top bar, floor backdrop), the open section,
// the tool side panel and the one dialog that carries every form. The rules (data, session, every action) live in
// useToolsWorkspace; each section is its own component.
'use client';

import { useEffect, useRef } from 'react';
import { useAppearance } from '@/components/ui-system';
import { useFloorSignals } from '@/components/shared/floor/signals';
import { ToolDrawer } from './ToolDrawer';
import { ToolsFrame } from './ToolsFrame';
import { ToolsModals } from './ToolsModals';
import { ToolsSections } from './ToolsSections';
import { ToolsPreferences } from './ToolsUI';
import { useToolsWorkspace } from './useToolsWorkspace';

export default function ToolsPage() {
  const w = useToolsWorkspace();
  const { signal } = useFloorSignals();
  const { appearance } = useAppearance();

  // A saved change plays the "saved" signal; an overdue tool (first load, or one that has just become overdue) plays the alert.
  useEffect(() => { if (w.feedback) signal('saved'); }, [w.feedback]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to the message only
  const overdueKey = w.scope.filter(t => !t.archived && t.status === 'overdue').map(t => t.id).sort().join(',');
  const seen = useRef<Set<string> | null>(null);
  const loaded = w.sourceState.tools.loaded;
  useEffect(() => {
    if (!loaded) return;
    const now = new Set(overdueKey ? overdueKey.split(',') : []);
    const before = seen.current;
    seen.current = now;
    if ([...now].some(id => !before || !before.has(id))) signal('alert');
  }, [overdueKey, loaded]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to the overdue set only

  return (
    <ToolsPreferences.Provider value={{ font: appearance.font, fontSize: appearance.fontSize, guidance: appearance.guidance }}>
      <div data-tools-workspace="">
        <ToolsFrame w={w}>
          <div role="status" aria-live="polite" className="sr-only">{w.feedback}</div>
          <ToolsSections w={w} />
        </ToolsFrame>
        <ToolDrawer w={w} />
        <ToolsModals w={w} />
      </div>
    </ToolsPreferences.Provider>
  );
}
