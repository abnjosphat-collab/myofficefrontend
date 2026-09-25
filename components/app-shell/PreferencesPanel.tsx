// components/app-shell/PreferencesPanel.tsx — the user Preferences surface.
// Consolidates the appearance/layout settings that were scattered (theme toggle, font
// family) and adds the new ones (font size, default view, default sections expanded).
// Also serves as the first-run setup: pass `welcome` to show the intro copy + a Skip
// action. Each control writes through its provider/pref helper, so changes apply live.
'use client';

import { useState } from 'react';
import {
  useTheme, CenterModal, useFontStyle, FONT_OPTIONS, useFontScale, FONT_SCALE_OPTIONS,
  Moon, Sun, Monitor, Type, LayoutGrid, List, ChevronsDownUp, Check, Palette,
  type ThemePreference, type DesignLanguage,
} from '@/components/shared/theme';
import { clearInputHistory } from '@/lib/inputHistory';
import {
  getDefaultView, setDefaultView, getDefaultExpanded, setDefaultExpanded, markPrefsSeen,
  type ModuleView,
} from '@/lib/prefs';
import { toast } from 'sonner';

function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <div className={`inline-flex items-center gap-0.5 ${t.glassSoft} rounded-lg p-[3px]`}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            className={`px-2.5 py-1 rounded-md text-[12.5px] font-medium tracking-tight transition-colors ${
              active ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.hoverText} ${t.hoverBg}`
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ icon: Icon, label, hint, children }: {
  icon: React.ElementType; label: string; hint?: string; children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${t.textFaint}`} />
        <div className="min-w-0">
          <div className={`text-[13px] font-medium ${t.textPrimary}`}>{label}</div>
          {hint && <div className={`text-[11px] ${t.textFaint} mt-0.5`}>{hint}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function PreferencesPanel({
  open, onClose, welcome = false,
}: { open: boolean; onClose: () => void; welcome?: boolean }) {
  const t = useTheme();
  const { font, setFont } = useFontStyle();
  const { scale, setScale } = useFontScale();
  const [view, setView] = useState<ModuleView>(getDefaultView());
  const [expanded, setExpandedState] = useState<boolean>(getDefaultExpanded());

  const close = () => { markPrefsSeen(); onClose(); };

  return (
    <CenterModal
      open={open}
      onClose={close}
      title={welcome ? 'Welcome — set your preferences' : 'Preferences'}
      subtitle={welcome ? 'Tune the look and feel. You can change these any time from the top bar.' : 'Appearance & layout'}
      accent="violet"
      width="max-w-lg"
    >
      <div className={`px-5 py-2 divide-y ${t.divide}`}>
        <Row
          icon={t.preference === 'system' ? Monitor : t.light ? Sun : Moon}
          label="Theme"
          hint={t.preference === 'system' ? 'Matches your device (light or dark)' : 'Fixed appearance'}
        >
          <Segmented<ThemePreference>
            value={t.preference}
            options={[
              { id: 'system', label: 'System' },
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
            onChange={t.setPreference}
          />
        </Row>

        <Row
          icon={Palette}
          label="Design"
          hint="Classic is the original MyOffice glass language. Dallaglio is the Tools-derived alternative — its own tokens, components, and shell. Appearance (light/dark) is independent. Tools & Equipment keeps its own look."
        >
          <Segmented<DesignLanguage>
            value={t.design}
            options={[
              { id: 'classic', label: 'Classic' },
              { id: 'dallaglio', label: 'Dallaglio' },
            ]}
            onChange={t.setDesign}
          />
        </Row>

        <Row icon={Type} label="Font" hint="Body typeface">
          <Segmented
            value={font}
            options={FONT_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
            onChange={setFont}
          />
        </Row>

        <Row icon={Type} label="Text size" hint="Scales the whole interface">
          <Segmented
            value={scale}
            options={FONT_SCALE_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
            onChange={setScale}
          />
        </Row>

        <Row icon={view === 'list' ? List : LayoutGrid} label="Default view" hint="How lists first appear">
          <Segmented<ModuleView>
            value={view}
            options={[{ id: 'grid', label: 'Grid' }, { id: 'list', label: 'List' }]}
            onChange={v => { setView(v); setDefaultView(v); }}
          />
        </Row>

        <Row icon={ChevronsDownUp} label="Sections start expanded" hint="Show section contents without clicking">
          <Segmented<'yes' | 'no'>
            value={expanded ? 'yes' : 'no'}
            options={[{ id: 'no', label: 'Collapsed' }, { id: 'yes', label: 'Expanded' }]}
            onChange={v => { const on = v === 'yes'; setExpandedState(on); setDefaultExpanded(on); }}
          />
        </Row>

        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className={`text-[13px] font-medium ${t.textPrimary}`}>Typed history</div>
            <div className={`text-[11px] ${t.textFaint} mt-0.5`}>Clear the values suggested in form fields</div>
          </div>
          <button type="button"
            onClick={() => { clearInputHistory(); toast.success('Typed history cleared'); }}
            className={`px-2.5 py-1 rounded-md text-[12.5px] font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} transition-colors`}>
            Clear
          </button>
        </div>
      </div>

      <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${t.border}`}>
        <button type="button" onClick={close}
          className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[13px] font-semibold transition-all ${t.cta}`}>
          {welcome ? <><Check className="h-3.5 w-3.5" /> Done</> : 'Close'}
        </button>
      </div>
    </CenterModal>
  );
}
