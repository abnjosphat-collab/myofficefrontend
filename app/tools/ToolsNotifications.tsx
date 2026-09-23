'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import s from './tools.module.css';

export type ToolAttentionCounts = { overdue: number; attention: number };

export function ToolsNotifications({ counts, open, onOpenChange, onShowOverdue, onShowInspection, duration }: {
  counts: ToolAttentionCounts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowOverdue: () => void;
  onShowInspection: () => void;
  duration: number;
}) {
  const total = counts.overdue + counts.attention;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    const closeAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== 'notifications') onOpenChange(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener(TOOLS_POPOVER_EVENT, closeAnother);
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener(TOOLS_POPOVER_EVENT, closeAnother);
      window.removeEventListener('keydown', closeEscape);
    };
  }, [onOpenChange]);
  const toggle = () => {
    const next = !open;
    if (next) announceToolsPopover('notifications');
    onOpenChange(next);
  };
  return <div ref={root} className={s.notificationShell}>
    <button className={s.notificationButton} data-active={total>0} aria-label={`${total} tool notifications`} aria-expanded={open} aria-controls="tools-notifications" onClick={toggle}><Icon name="bell" size={18}/>{total>0&&<span className={s.notificationBadge}>{total}</span>}</button>
    <AnimatePresence>{open&&<motion.div id="tools-notifications" className={s.notificationPanel} initial={{opacity:0,y:-5,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:.98}} transition={{duration}}>
      <div className={s.notificationHeader}><span><strong>Notifications</strong><small>{total ? `${total} need your attention` : 'You are all caught up'}</small></span><button className={s.iconButton} aria-label="Close notifications" onClick={()=>onOpenChange(false)}><Icon name="close" size={15}/></button></div>
      {total ? <div className={s.notificationItems}>{counts.overdue>0&&<button onClick={onShowOverdue}><span className={s.notificationItemIcon}><Icon name="clock" size={17}/></span><span><strong>{counts.overdue} overdue {counts.overdue===1?'return':'returns'}</strong><small>Review tools past their expected return time.</small></span><Icon name="chevron" size={15}/></button>}{counts.attention>0&&<button onClick={onShowInspection}><span className={s.notificationItemIcon}><Icon name="alert" size={17}/></span><span><strong>{counts.attention} held for inspection</strong><small>Check condition notes before returning to service.</small></span><Icon name="chevron" size={15}/></button>}</div>:<div className={s.notificationEmpty}><Icon name="check" size={20}/><span><strong>Nothing needs attention</strong><small>No overdue returns or inspection holds.</small></span></div>}
      <p className={s.notificationNote}>Notifications follow the selected department.</p>
    </motion.div>}</AnimatePresence>
  </div>;
}
