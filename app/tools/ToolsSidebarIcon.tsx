// app/tools/ToolsSidebarIcon.tsx — the sidebar's section icons in a choice of icon packs, and the switch that picks one. The packs
// are libraries the app already carries (Phosphor in four weights, Tabler, Iconoir), so trying them costs nothing extra to load.
'use client';

import { useState } from 'react';
import { IconBox, IconChartLine, IconChecklist, IconHistory, IconHome, IconPalette, IconPencil, IconUpload, IconUser, IconUserCog, IconArrowUpRight } from '@tabler/icons-react';
import { ArrowUpRight, Box, EditPencil, HomeSimple, StatsUpSquare, Upload, User, UserCrown, Check, ClockRotateRight } from 'iconoir-react';
import { ArrowCircleUpRight, ChartBar, ChatCircleText, ClockClockwise, Cube, FileArrowUp, House, ShieldCheck, User as PhosphorUser, UserGear } from '@phosphor-icons/react';
import { ToolsIcon } from './ToolsIcon';
import { ICON_PACKS, type IconPackId } from './sidebarNav';
import s from './tools.module.css';

export type SidebarIconName = 'home' | 'box' | 'out' | 'user' | 'check' | 'history' | 'upload' | 'accounts' | 'analytics' | 'edit';

const tabler = { home: IconHome, box: IconBox, out: IconArrowUpRight, user: IconUser, check: IconChecklist, history: IconHistory, upload: IconUpload, accounts: IconUserCog, analytics: IconChartLine, edit: IconPencil } as const;
const iconoir = { home: HomeSimple, box: Box, out: ArrowUpRight, user: User, check: Check, history: ClockRotateRight, upload: Upload, accounts: UserCrown, analytics: StatsUpSquare, edit: EditPencil } as const;
const PHOSPHOR_WEIGHT = { 'phosphor-regular': 'regular', 'phosphor-light': 'light', 'phosphor-bold': 'bold', 'phosphor-duotone': 'duotone', 'phosphor-fill': 'fill' } as const;
// "Solid": every icon filled, using the glyphs that stay recognisable as solid shapes (arrows and strokes turn into discs, shields and tiles).
const solid = { home: House, box: Cube, out: ArrowCircleUpRight, user: PhosphorUser, check: ShieldCheck, history: ClockClockwise, upload: FileArrowUp, accounts: UserGear, analytics: ChartBar, edit: ChatCircleText } as const;

/** One section icon in the chosen pack. `active` is the highlighted (current) section, drawn heavier. */
export function SidebarIcon({ pack, name, size = 18, active = false }: { pack: IconPackId; name: SidebarIconName; size?: number; active?: boolean }) {
  if (pack === 'tabler') { const Glyph = tabler[name]; return <Glyph size={size} stroke={active ? 2.2 : 1.7} aria-hidden="true" />; }
  if (pack === 'iconoir') { const Glyph = iconoir[name]; return <Glyph width={size} height={size} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />; }
  if (pack === 'phosphor-solid') { const Glyph = solid[name]; return <Glyph size={size} weight="fill" aria-hidden="true" />; }
  return <ToolsIcon name={name} size={size} weight={active ? 'fill' : PHOSPHOR_WEIGHT[pack]} />;
}

const SAMPLE: SidebarIconName[] = ['home', 'box', 'user', 'check'];

/** The switch at the foot of the sidebar: opens a list of packs, each previewed with four of the icons, and applies the pick at once. */
export function SidebarIconSwitch({ pack, onChange, collapsed }: { pack: IconPackId; onChange: (pack: IconPackId) => void; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const current = ICON_PACKS.find(item => item.id === pack)?.label ?? '';
  return <div className={s.packSwitch}>
    <button type="button" className={s.iconsToggle} aria-expanded={open} aria-label={`Icon style: ${current}. Change it`} title={`Icon style: ${current}`} onClick={() => setOpen(value => !value)}>
      <IconPalette size={14} aria-hidden="true" />{!collapsed && <span className={s.navLabel}>Icons</span>}
    </button>
    {open && <div className={s.packList} role="radiogroup" aria-label="Sidebar icon style">
      {ICON_PACKS.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === pack} aria-label={item.label} title={item.label} className={s.packOption} data-selected={item.id === pack || undefined} onClick={() => onChange(item.id)}>
        <span className={s.packSample}>{(collapsed ? SAMPLE.slice(0, 1) : SAMPLE).map(name => <SidebarIcon key={name} pack={item.id} name={name} size={16} />)}</span>
        {!collapsed && <span className={s.packName}>{item.label}</span>}
      </button>)}
    </div>}
  </div>;
}
