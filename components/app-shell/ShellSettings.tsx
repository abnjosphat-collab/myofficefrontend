// components/app-shell/ShellSettings.tsx — the one settings surface (replaces the old Preferences
// panel, the bottom-bar settings menu and the scattered theme / icon-style / font buttons).
// There is a single appearance, so there is no theme or icon-style switch here.
'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import {
  AppearanceFields, Button, Checkbox, Dialog, Field, Select, useAppearance, useConfirm,
} from '@/components/ui-system';
import { clearInputHistory } from '@/lib/inputHistory';
import { getDefaultExpanded, getDefaultView, onPrefsChange, setDefaultExpanded, setDefaultView, type ModuleView } from '@/lib/prefs';
import { toast } from 'sonner';
import { playSound, setMuted, setVoice, useSoundPrefs, VOICES, VOICE_KEYS, type SoundVoice } from '@/lib/notificationSound';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line-subtle pb-5 last:border-b-0 last:pb-0">
      <h3 className="mb-3 font-display text-title font-semibold text-ink">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Cards' },
  { value: 'list', label: 'List' },
];

export function ShellSettings({
  open, onOpenChange, sidebarCollapsed, onSidebarCollapsedChange, onResetCustomizations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  onResetCustomizations: () => void;
}) {
  const { reset } = useAppearance();
  const sound = useSoundPrefs();
  const confirm = useConfirm();
  const defaultView = useSyncExternalStore(onPrefsChange, getDefaultView, () => 'grid' as ModuleView);
  const defaultExpanded = useSyncExternalStore(onPrefsChange, getDefaultExpanded, () => false);

  const resetFavourites = async () => {
    const ok = await confirm({
      title: 'Reset favourites and shortcuts?',
      message: 'Favourites, quick actions and usage history go back to the defaults. Your records are not affected.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!ok) return;
    onResetCustomizations();
    toast.success('Favourites and shortcuts were reset.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" description="Appearance and layout. Changes apply straight away and are saved on this device." size="md">
      <div className="flex flex-col gap-5">
        <Section title="Appearance">
          <AppearanceFields />
        </Section>

        <Section title="Layout">
          <Field label="Default view for module lists">
            <Select aria-label="Default view for module lists" value={defaultView} onValueChange={value => setDefaultView(value as ModuleView)} options={VIEW_OPTIONS} />
          </Field>
          <Checkbox label="Start sections expanded" checked={defaultExpanded} onChange={event => setDefaultExpanded(event.target.checked)} />
          <Checkbox label="Use the compact sidebar on large screens" checked={sidebarCollapsed} onChange={event => onSidebarCollapsedChange(event.target.checked)} />
        </Section>

        <Section title="Notification sound">
          <Field label="Sound" description="Played when something is saved or needs attention, for example on the compressors floor.">
            <Select
              aria-label="Notification sound"
              value={sound.voice}
              disabled={sound.muted}
              onValueChange={value => { setVoice(value as SoundVoice); playSound('saved', value as SoundVoice); }}
              options={VOICE_KEYS.map(k => ({ value: k, label: VOICES[k].label, description: VOICES[k].description }))}
            />
          </Field>
          <Checkbox label="Mute notification sounds" checked={sound.muted} onChange={event => setMuted(event.target.checked)} />
        </Section>

        <Section title="Data on this device">
          <div className="flex flex-wrap gap-2">
            <Button
              icon="reset"
              onClick={() => { clearInputHistory(); toast.success('Typing suggestions were cleared.'); }}
            >
              Clear typing suggestions
            </Button>
            <Button variant="danger-quiet" icon="reset" onClick={resetFavourites}>Reset favourites and shortcuts</Button>
            <Button variant="ghost" onClick={reset}>Restore default appearance</Button>
          </div>
        </Section>
      </div>
    </Dialog>
  );
}
