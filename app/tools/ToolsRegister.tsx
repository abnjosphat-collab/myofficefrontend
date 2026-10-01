'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { departmentOf, STATUS, type Tool, type Status, type ActionKind } from './prototype';
import s from './tools.module.css';
export function StatusLabel({ status, archived }: { status: Status; archived?: boolean }) {
  return <span className={s.status} data-status={archived ? 'archived' : status}><i />{archived ? 'Archived' : STATUS[status]}</span>;
}
export function ToolsRegister({ tools, view, onSelect, onAction }: { tools: Tool[]; view: 'grid' | 'list'; onSelect: (id: string) => void; onAction: (kind: ActionKind, tool: Tool) => void }) {
  const reduced = useReducedMotion();
  const listCellVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 5 },
    visible: (index: number) => ({ opacity: 1, y: 0, transition: { duration: reduced ? 0 : .16, ease: [0.16, 1, 0.3, 1] as const, delay: reduced ? 0 : Math.min(index * .018, .09) } }),
  };
  if (view === 'list') return <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Tool</th><th>Status</th><th>Custody / location</th><th>Expected return</th><th><span className={s.srOnly}>Details</span></th></tr></thead><tbody>{tools.map((tool, i) => <motion.tr key={tool.id} className={s.listRow} initial="hidden" animate="visible">
    <motion.td custom={i} variants={listCellVariants}><button aria-label={`View ${tool.name}`} className={s.tableIdentity} onClick={() => onSelect(tool.id)}><span><strong>{tool.name}</strong><small>{tool.id} · {departmentOf(tool)}</small></span></button></motion.td>
    <motion.td custom={i} variants={listCellVariants}><StatusLabel status={tool.status} archived={tool.archived} /></motion.td><motion.td custom={i} variants={listCellVariants}>{tool.holder?.split(' · ')[0] || 'Tool room'}<small>{tool.location}</small></motion.td><motion.td custom={i} variants={listCellVariants} className={tool.status === 'overdue' ? s.late : ''}>{tool.due || '—'}</motion.td><motion.td custom={i} variants={listCellVariants}><button aria-label={`Open ${tool.name} details`} className={s.iconButton} onClick={() => onSelect(tool.id)}><Icon name="out" /></button></motion.td>
  </motion.tr>)}</tbody></table></div>;
  return <div className={s.grid}>{tools.map((tool, i) => <motion.article key={tool.id} className={s.card} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .18, delay: reduced ? 0 : Math.min(i * .025, .15) }}>
    <button className={s.cardMain} aria-label={`View ${tool.name}`} onClick={() => onSelect(tool.id)}>
      <div className={s.cardTop}><span className={s.toolCode}>{tool.id}</span><span className={s.category}>{tool.category}</span></div>
      <div className={s.cardIdentity}><h2>{tool.name}</h2><p>{tool.make}</p></div>
    </button>
    <div className={s.cardBottom}><StatusLabel status={tool.status} archived={tool.archived} /><button aria-label={`${!tool.archived && tool.status === 'available' ? 'Issue' : !tool.archived && ['issued','overdue'].includes(tool.status) ? 'Receive' : 'Details for'} ${tool.name}`} className={s.quickAction} onClick={() => tool.archived || tool.status === 'attention' ? onSelect(tool.id) : onAction(tool.status === 'available' ? 'issue' : 'return', tool)}>{tool.archived || tool.status === 'attention' ? 'Details' : tool.status === 'available' ? 'Issue' : 'Receive'}</button></div>
    <div className={s.cardContext}><span>{tool.holder?.split(' · ')[0] || tool.location}</span>{tool.due && <span className={tool.status === 'overdue' ? s.late : ''}>{tool.due}</span>}{!!tool.evidence?.length && <span aria-label={`${tool.evidence.length} attachments`}>{tool.evidence.length} attachments</span>}</div>
  </motion.article>)}</div>;
}
