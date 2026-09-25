'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, ChevronDown, ChevronUp, Search, X, ShoppingCart,
  LayoutGrid, List, ArrowUpDown, Plus,
} from '@/components/shared/theme';
import {
  useTheme, Collapse, GlowCard, SelectField, StatusBadge,
  staggerContainer, fadeUp, ACCENT_HEX, TYPE_WEIGHT, useConfirm, PrimaryButton,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { formatDate } from '@/lib/format';
import { exportFilename } from '@/lib/exportUtils';
import {
  filterOrderList, sortOrderList, groupOrderList, isExpired, isExpiringSoon,
  type OrderListEntry, type OrderListSortKey, type OrderListUrgency,
} from './calcPPE';
import type { PPETypeInfo } from './types';

interface OrderListPanelProps {
  entries: OrderListEntry[];
  ppeTypes: Record<string, PPETypeInfo>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRemove: (recordId: string) => void;
  onClear: () => void;
  onIssue: (entry: OrderListEntry) => void;
}

const normSize = (size?: string) => (size || '').trim() || 'Unspecified';

export function OrderListPanel({
  entries, ppeTypes, expanded, onToggleExpanded, onRemove, onClear, onIssue,
}: OrderListPanelProps) {
  const t = useTheme();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState<OrderListUrgency>('all');
  const [sortBy, setSortBy] = useState<OrderListSortKey>('expiry');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'cards' | 'grouped'>('cards');

  const sizeOptions = useMemo(() => {
    const sizes = new Set(entries.map(e => normSize(e.size)));
    return [...sizes].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(
    () => filterOrderList(entries, { type: typeFilter, size: sizeFilter, search, urgency: urgencyFilter }),
    [entries, typeFilter, sizeFilter, search, urgencyFilter],
  );
  const sorted = useMemo(() => sortOrderList(filtered, sortBy, sortDir), [filtered, sortBy, sortDir]);
  const orderGroups = useMemo(() => groupOrderList(sorted), [sorted]);
  const poLineCount = useMemo(() => groupOrderList(entries).length, [entries]);

  const orderListColumns: DLColumn[] = [
    { key: 'item_name', label: 'Item', width: 22 },
    { key: 'size', label: 'Size', width: 10 },
    { key: 'count', label: 'Qty', width: 8 },
    { key: 'people', label: 'For (Employees)', width: 44 },
  ];

  const toggleSortDir = () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
  const filtersActive = typeFilter !== 'all' || sizeFilter !== 'all' || !!search || urgencyFilter !== 'all';

  if (entries.length === 0) return null;

  const urgencyBadge = (expiry?: string | null) => {
    if (isExpired(expiry)) return { color: '#f43f5e', label: 'Overdue' };
    if (isExpiringSoon(expiry)) return { color: '#f59e0b', label: 'Expiring soon' };
    return { color: ACCENT_HEX.blue, label: expiry ? 'In date' : 'No expiry' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}
      style={{ boxShadow: '0 20px 50px -24px rgba(37,99,235,0.35), 0 8px 24px -12px rgba(0,0,0,0.25)' }}
    >
      <button type="button" onClick={onToggleExpanded}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${t.hoverBgSoft} transition-all`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${t.chipBg}`}>
            <ClipboardList className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-left">
            <span className={`text-xs ${TYPE_WEIGHT.semibold} ${t.textSecondary} uppercase tracking-wider block`}>Order List</span>
            <span className={`text-[11px] ${t.textFaint} font-normal normal-case tracking-normal`}>
              {entries.length} item{entries.length !== 1 ? 's' : ''} · {poLineCount} PO line{poLineCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} />
          : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
      </button>

      <Collapse open={expanded}>
        <div className={`px-4 pb-4 pt-3 border-t ${t.border} space-y-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px] max-w-52">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${t.textFaint}`} />
              <input type="text" placeholder="Search…" aria-label="Search order list" value={search}
                onChange={e => setSearch(e.target.value)}
                className={`pl-7 pr-7 py-1.5 w-full text-xs rounded-lg ${t.inputBg} transition-all`} />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textFaint} ${t.hoverText}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <SelectField size="filter" value={typeFilter} onChange={setTypeFilter} title="PPE type"
              options={[{ value: 'all', label: 'All Types' }, ...Object.entries(ppeTypes).map(([k, pt]) => ({ value: k, label: pt.name }))]}
              className="w-36" />
            <SelectField size="filter" value={sizeFilter} onChange={setSizeFilter} title="Size"
              options={[{ value: 'all', label: 'All Sizes' }, ...sizeOptions.map(s => ({ value: s, label: s }))]}
              className="w-28" />
            <SelectField size="filter" value={urgencyFilter} onChange={v => setUrgencyFilter(v as OrderListUrgency)} title="Urgency"
              options={[
                { value: 'all', label: 'All urgency' },
                { value: 'overdue', label: 'Overdue only' },
                { value: 'soon', label: 'Expiring soon' },
              ]}
              className="w-32" />
            <SelectField size="filter" value={sortBy} onChange={v => setSortBy(v as OrderListSortKey)} title="Sort by"
              options={[
                { value: 'expiry', label: 'Expiry date' },
                { value: 'employee', label: 'Employee' },
                { value: 'type', label: 'PPE type' },
                { value: 'item', label: 'Item name' },
                { value: 'added', label: 'Date added' },
              ]}
              className="w-32" />
            <button type="button" title="Toggle sort direction" onClick={toggleSortDir}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.textMuted} ${t.hoverBg} transition-all`}>
              <ArrowUpDown className={`h-3.5 w-3.5 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`flex items-center ${t.glassSoft} rounded-lg p-0.5`}>
              {([
                { mode: 'cards' as const, icon: LayoutGrid, label: 'Card view' },
                { mode: 'grouped' as const, icon: List, label: 'PO summary' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button key={mode} type="button" title={label} aria-label={label}
                  onClick={() => setViewMode(mode)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                    viewMode === mode ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <DownloadButton data={orderGroups as unknown as Record<string, unknown>[]} columns={orderListColumns}
                filename={exportFilename('PPE_Order_List')} title="PPE Order List"
                subtitle={`${sorted.length} item${sorted.length !== 1 ? 's' : ''} to order`} />
              <button type="button"
                onClick={async () => {
                  if (await confirm({
                    title: 'Clear the order list?',
                    message: 'This removes every item you’ve added — it does not affect the actual PPE records.',
                    destructive: true, confirmLabel: 'Clear',
                  })) onClear();
                }}
                className={`text-[11px] ${TYPE_WEIGHT.semibold} px-2.5 py-1.5 rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                Clear
              </button>
            </div>
          </div>

          {filtersActive && (
            <p className={`text-[11px] ${t.textFaint}`}>
              Showing {sorted.length} of {entries.length} item{entries.length !== 1 ? 's' : ''}
            </p>
          )}

          {sorted.length === 0 ? (
            <div className={`text-center py-10 rounded-xl ${t.glassSoft}`}>
              <ShoppingCart className={`h-10 w-10 mx-auto mb-2 ${t.textFaint} opacity-50`} />
              <p className={`text-sm ${TYPE_WEIGHT.medium} ${t.textMuted}`}>No items match these filters</p>
            </div>
          ) : viewMode === 'cards' ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {sorted.map(entry => {
                  const info = ppeTypes[entry.ppe_type] || ppeTypes.helmet;
                  const Icon = info.icon;
                  const badge = urgencyBadge(entry.expiry_date);
                  return (
                    <motion.div key={entry.record_id} variants={fadeUp} layout
                      initial={{ opacity: 0, scale: 0.96, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -4 }}
                      whileHover={{ y: -4, scale: 1.015 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 320 }}>
                      <GlowCard color={info.color} className="p-4 h-full"
                        style={{ boxShadow: `0 12px 32px -16px ${info.color}55` }}>
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl shrink-0 border border-white/10"
                            style={{ background: `${info.color}18`, boxShadow: `inset 0 1px 0 ${info.color}33` }}>
                            <Icon className="h-5 w-5" style={{ color: info.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary} truncate`}>{entry.item_name}</p>
                            <p className={`text-[11px] ${t.textFaint} truncate`}>{info.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <StatusBadge color={badge.color} label={badge.label} dot />
                              {entry.size && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${t.chipBg} ${t.textMuted} tabular-nums`}>
                                  Size {normSize(entry.size)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${t.border} space-y-1.5`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase tracking-wide ${t.textFaint} w-14 shrink-0`}>For</span>
                            <span className={`text-xs ${TYPE_WEIGHT.medium} ${t.textPrimary} truncate`}>{entry.employee_name}</span>
                          </div>
                          {entry.expiry_date && (
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase tracking-wide ${t.textFaint} w-14 shrink-0`}>Due</span>
                              <span className={`text-xs tabular-nums ${isExpired(entry.expiry_date) ? 'text-rose-500' : isExpiringSoon(entry.expiry_date) ? 'text-amber-500' : t.textMuted}`}>
                                {formatDate(entry.expiry_date)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <PrimaryButton icon={Plus} fullWidth size="xs" onClick={() => onIssue(entry)}>Issue</PrimaryButton>
                          <button type="button" title="Remove from order list" onClick={() => onRemove(entry.record_id)}
                            className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} hover:text-rose-500 hover:bg-rose-500/10 transition-all`}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </GlowCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className={`rounded-xl ${t.glassSoft} overflow-hidden`}
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div className={`grid grid-cols-[minmax(0,1.2fr)_auto_auto_minmax(0,1fr)_auto] gap-x-3 px-4 py-2.5 text-[10px] uppercase tracking-wide ${t.textFaint} border-b ${t.border} bg-black/5`}>
                <span>Item</span><span className="text-right">Size</span><span className="text-right">Qty</span><span>For</span><span />
              </div>
              <motion.div variants={staggerContainer} initial="hidden" animate="show">
                {orderGroups.map(row => {
                  const info = ppeTypes[row.ppe_type] || ppeTypes.helmet;
                  const Icon = info.icon;
                  return (
                    <motion.div key={`${row.ppe_type}::${row.size}`} variants={fadeUp}
                      className={`grid grid-cols-[minmax(0,1.2fr)_auto_auto_minmax(0,1fr)_auto] gap-x-3 px-4 py-3 text-xs items-center border-b ${t.border} last:border-b-0 ${t.hoverBgSoft} transition-colors`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${info.color}15` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: info.color }} />
                        </div>
                        <span className={`${TYPE_WEIGHT.medium} ${t.textPrimary} truncate`}>{row.item_name}</span>
                      </div>
                      <span className="text-right tabular-nums">{row.size}</span>
                      <span className={`text-right tabular-nums ${TYPE_WEIGHT.bold} text-brand-400`}>{row.count}</span>
                      <span className={`${t.textMuted} truncate`} title={row.people.join(', ')}>{row.people.join(', ')}</span>
                      <span className={`text-[10px] ${t.textFaint} tabular-nums`}>{row.count}×</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      </Collapse>
    </motion.div>
  );
}
