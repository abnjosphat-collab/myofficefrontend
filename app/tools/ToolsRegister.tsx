'use client';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { departmentOf, STATUS, type Tool, type Status, type ActionKind } from './prototype';
import s from './tools.module.css';
import { Button } from '@/components/ui-system';
export function StatusLabel({ status, archived }: { status: Status; archived?: boolean }) {
  return <span className={s.status} data-status={archived ? 'archived' : status}><i />{archived ? 'Archived' : STATUS[status]}</span>;
}
export function ToolsRegister({ tools, view, onSelect, onAction, onArchiveMany }: { tools: Tool[]; view: 'grid' | 'list'; onSelect: (id: string) => void; onAction: (kind: ActionKind, tool: Tool) => void; onArchiveMany?: (tools: Tool[]) => Promise<void> }) {
  const reduced = useReducedMotion();
  // Archiving many at once: list view only, and only for accounts that may archive. Issued tools must be received first, so they cannot be ticked.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const pickable = tools.filter(tool => !tool.archived && !tool.holder);
  const chosen = pickable.filter(tool => picked.includes(tool.id));
  const stopSelecting = () => { setSelecting(false); setPicked([]); setConfirming(false); };
  const archiveChosen = async () => { setBusy(true); try { await onArchiveMany?.(chosen); stopSelecting(); } finally { setBusy(false); setConfirming(false); } };
  const canSelect = !!onArchiveMany && view === 'list' && pickable.length > 0;
  const bulkBar = canSelect && (selecting
    ? <div className={s.bulkBar} role="toolbar" aria-label="Archive several items">
        <strong role="status">{chosen.length ? `${chosen.length} selected` : 'Tick the equipment to archive'}</strong>
        <Button variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={() => setPicked(chosen.length === pickable.length ? [] : pickable.map(tool => tool.id))}>{chosen.length === pickable.length ? 'Clear selection' : `Select all ${pickable.length}`}</Button>
        <span className={s.bulkSpacer} />
        {confirming
          ? <><span>Archive {chosen.length} {chosen.length === 1 ? 'item' : 'items'}? History is kept and they can be restored.</span><Button variant="secondary" size="lg" className={`${s.sharedButton}`} disabled={busy} onClick={() => setConfirming(false)}>Not yet</Button><Button variant="primary" size="lg" className={`${s.sharedButton}`} disabled={busy} onClick={archiveChosen}>{busy ? 'Archiving…' : 'Yes, archive'}</Button></>
          : <><Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={stopSelecting}>Cancel</Button><Button variant="primary" size="lg" className={`${s.sharedButton}`} disabled={!chosen.length} onClick={() => setConfirming(true)}>Archive{chosen.length ? ` ${chosen.length}` : ''}</Button></>}
      </div>
    : <div className={s.bulkBar}><Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={() => setSelecting(true)}><Icon name="archive" size={16} />Select to archive</Button></div>);
  const listCellVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 5 },
    visible: (index: number) => ({ opacity: 1, y: 0, transition: { duration: reduced ? 0 : .16, ease: [0.16, 1, 0.3, 1] as const, delay: reduced ? 0 : Math.min(index * .018, .09) } }),
  };
  if (view === 'list') return <>{bulkBar}<div className={s.tableWrap}><table className={s.table}><thead><tr>{canSelect && selecting && <th className={s.pickCell}><span className={s.srOnly}>Select</span></th>}<th>Tool</th><th>Status</th><th>Custody / location</th><th>Expected return</th><th><span className={s.srOnly}>Details</span></th></tr></thead><tbody>{tools.map((tool, i) => <motion.tr key={tool.id} className={s.listRow} initial="hidden" animate="visible" data-picked={picked.includes(tool.id) || undefined}>
    {canSelect && selecting && <motion.td custom={i} variants={listCellVariants} className={s.pickCell}><input type="checkbox" aria-label={`Select ${tool.name}`} disabled={!pickable.includes(tool)} title={tool.holder ? 'Receive this tool before archiving it.' : tool.archived ? 'Already archived.' : undefined} checked={picked.includes(tool.id)} onChange={event => setPicked(current => event.target.checked ? [...current, tool.id] : current.filter(id => id !== tool.id))} /></motion.td>}
    <motion.td custom={i} variants={listCellVariants}><button aria-label={`View ${tool.name}`} className={s.tableIdentity} onClick={() => onSelect(tool.id)}><span><strong>{tool.name}</strong><small>{tool.id} · {departmentOf(tool)}</small></span></button></motion.td>
    <motion.td custom={i} variants={listCellVariants}><StatusLabel status={tool.status} archived={tool.archived} /></motion.td><motion.td custom={i} variants={listCellVariants}>{tool.holder?.split(' · ')[0] || 'Tool room'}<small>{tool.location}</small></motion.td><motion.td custom={i} variants={listCellVariants} className={tool.status === 'overdue' ? s.late : ''}>{tool.due || '—'}</motion.td><motion.td custom={i} variants={listCellVariants}><Button aria-label={`Open ${tool.name} details`} variant="ghost" size="sm" className={`${s.sharedIconButton}`} onClick={() => onSelect(tool.id)}><Icon name="out" /></Button></motion.td>
  </motion.tr>)}</tbody></table></div></>;
  return <div className={s.grid}>{tools.map((tool, i) => <motion.article key={tool.id} className={s.card} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .18, delay: reduced ? 0 : Math.min(i * .025, .15) }}>
    <button className={s.cardMain} aria-label={`View ${tool.name}`} onClick={() => onSelect(tool.id)}>
      <div className={s.cardTop}><span className={s.toolCode}>{tool.id}</span><span className={s.category}>{tool.category}</span></div>
      <div className={s.cardIdentity}><h2>{tool.name}</h2><p>{tool.make}</p></div>
    </button>
    <div className={s.cardBottom}><StatusLabel status={tool.status} archived={tool.archived} /><button aria-label={`${!tool.archived && tool.status === 'available' ? 'Issue' : !tool.archived && ['issued','overdue'].includes(tool.status) ? 'Receive' : 'Details for'} ${tool.name}`} className={s.quickAction} onClick={() => tool.archived || tool.status === 'attention' ? onSelect(tool.id) : onAction(tool.status === 'available' ? 'issue' : 'return', tool)}>{tool.archived || tool.status === 'attention' ? 'Details' : tool.status === 'available' ? 'Issue' : 'Receive'}</button></div>
    <div className={s.cardContext}><span>{tool.holder?.split(' · ')[0] || tool.location}</span>{tool.due && <span className={tool.status === 'overdue' ? s.late : ''}>{tool.due}</span>}{!!tool.evidence?.length && <span aria-label={`${tool.evidence.length} attachments`}>{tool.evidence.length} attachments</span>}</div>
  </motion.article>)}</div>;
}
