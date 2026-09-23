'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { AnimatedText, Help } from './ToolsUI';
import s from './tools.module.css';

export type ToolCounts = { total: number; available: number; issued: number; overdue: number; attention: number };

export function ToolsOverview({ counts, open, onOpenChange, onShowAll, onShowAvailable, onShowLoans, onShowOverdue, reduced, duration }: {
  counts: ToolCounts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowAll: () => void;
  onShowAvailable: () => void;
  onShowLoans: () => void;
  onShowOverdue: () => void;
  reduced: boolean;
  duration: number;
}) {
  return <div className={s.overviewBlock}><div className={s.sectionCaption}><button className={s.sectionToggle} aria-expanded={open} aria-controls="tools-overview-summary" onClick={()=>onOpenChange(!open)}><span>At a glance</span><motion.span animate={{rotate:open?180:0}} transition={{duration}}><Icon name="down" size={13}/></motion.span></button><Help label="Overview">Counts follow the selected department. Select a number to see the matching tools. Collapse this overview whenever you need more room.</Help></div><AnimatePresence initial={false}>{open&&<motion.div id="tools-overview-summary" className={s.summary} initial={{height:0,opacity:0,y:reduced?0:-4}} animate={{height:'auto',opacity:1,y:0}} exit={{height:0,opacity:0,y:reduced?0:-4}} transition={{duration}}>
    <button onClick={onShowAll}><span>In your register</span><strong><AnimatedText value={counts.total}>{String(counts.total).padStart(2,'0')}</AnimatedText><small>tools</small></strong></button>
    <button onClick={onShowAvailable}><span><i className={s.greenDot}/>Ready to use</span><strong><AnimatedText value={counts.available}>{String(counts.available).padStart(2,'0')}</AnimatedText><Icon name="out" size={17}/></strong></button>
    <button onClick={onShowLoans}><span>With employees</span><strong><AnimatedText value={counts.issued}>{String(counts.issued).padStart(2,'0')}</AnimatedText><Icon name="out" size={17}/></strong></button>
    <button onClick={onShowOverdue}><span><i className={s.amberDot}/>Past return date</span><strong><AnimatedText value={counts.overdue}>{String(counts.overdue).padStart(2,'0')}</AnimatedText><Icon name="out" size={17}/></strong></button>
  </motion.div>}</AnimatePresence></div>;
}
