// app/tools/ToolsSidebarIcon.tsx — the sidebar's section icons in the icon style chosen in Settings. Both styles come from libraries the
// app already carries (Phosphor and Tabler), so the choice costs nothing extra to load.
'use client';

import { IconArrowUpRight, IconBox, IconChartLine, IconChecklist, IconHistory, IconHome, IconPencil, IconUpload, IconUser, IconUserCog } from '@tabler/icons-react';
import { ArrowCircleUpRight, ChartBar, ChatCircleText, ClockClockwise, Cube, FileArrowUp, House, ShieldCheck, User as PhosphorUser, UserGear } from '@phosphor-icons/react';
import { ICON_PACKS, type IconPackId } from './sidebarNav';
import s from './tools.module.css';

export type SidebarIconName = 'home' | 'box' | 'out' | 'user' | 'check' | 'history' | 'upload' | 'accounts' | 'analytics' | 'edit';

const tabler = { home: IconHome, box: IconBox, out: IconArrowUpRight, user: IconUser, check: IconChecklist, history: IconHistory, upload: IconUpload, accounts: IconUserCog, analytics: IconChartLine, edit: IconPencil } as const;
// "Solid": every icon filled, using the glyphs that stay recognisable as solid shapes (arrows and strokes turn into discs, shields and tiles).
const solid = { home: House, box: Cube, out: ArrowCircleUpRight, user: PhosphorUser, check: ShieldCheck, history: ClockClockwise, upload: FileArrowUp, accounts: UserGear, analytics: ChartBar, edit: ChatCircleText } as const;

/** One section icon in the chosen style. `active` is the highlighted (current) section, drawn heavier in Tabler. */
export function SidebarIcon({ pack, name, size = 18, active = false }: { pack: IconPackId; name: SidebarIconName; size?: number; active?: boolean }) {
  if (pack === 'tabler') { const Glyph = tabler[name]; return <Glyph size={size} stroke={active ? 2.2 : 1.7} aria-hidden="true" />; }
  const Glyph = solid[name];
  return <Glyph size={size} weight="fill" aria-hidden="true" />;
}

const SAMPLE: SidebarIconName[] = ['home', 'box', 'user', 'check', 'history'];

/** The Settings control: each style previewed with five of the icons, applied at once. */
export function IconPackPicker({ pack, onChange }: { pack: IconPackId; onChange: (pack: IconPackId) => void }) {
  return <div className={s.packList} role="radiogroup" aria-label="Sidebar icon style">
    {ICON_PACKS.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === pack} aria-label={item.label} className={s.packOption} data-selected={item.id === pack || undefined} onClick={() => onChange(item.id)}>
      <span className={s.packSample}>{SAMPLE.map(name => <SidebarIcon key={name} pack={item.id} name={name} size={20} />)}</span>
      <span className={s.packName}>{item.label}</span>
    </button>)}
  </div>;
}
