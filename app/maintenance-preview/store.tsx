// app/maintenance-preview/store.tsx — in-memory state shared by the preview pages so an approved request really becomes a work order.
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { INITIAL_ORDERS, INITIAL_REQUESTS, INITIAL_SCHEDULES, dayOffset, type Priority, type Request, type Schedule, type WorkOrder } from './fixtures';

interface Store {
  orders: WorkOrder[]; requests: Request[]; schedules: Schedule[];
  raise: (input: { machine: string; title: string; assignee: string; priority: Priority; type?: WorkOrder['type']; tools?: string[] }) => WorkOrder;
  approve: (id: number, input: { assignee: string; due: string }) => WorkOrder | null;
  reject: (id: number, reason: string) => void;
  request: (input: { machine: string; title: string; priority: Priority }) => void;
  update: (id: number, patch: Partial<WorkOrder>) => void;
  toggleSchedule: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);
export const usePreview = () => { const v = useContext(Ctx); if (!v) throw new Error('usePreview outside provider'); return v; };

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  const nextWo = useCallback(() => Math.max(...orders.map(o => o.id)) + 1, [orders]);

  const raise: Store['raise'] = useCallback(input => {
    const id = nextWo();
    const wo: WorkOrder = { id, number: `WO-${String(id).padStart(5, '0')}`, machine: input.machine, title: input.title, type: input.type ?? 'Corrective', status: 'pending', priority: input.priority, assignees: input.assignee ? [input.assignee] : [], due: dayOffset(3), section: '', raised: dayOffset(0), raisedBy: 'You', tools: input.tools ?? [], description: '' };
    setOrders(prev => [wo, ...prev]);
    return wo;
  }, [nextWo]);

  const approve: Store['approve'] = useCallback((reqId, input) => {
    const req = requests.find(r => r.id === reqId);
    if (!req || req.status !== 'waiting') return null; // approving twice raises one work order
    const id = nextWo();
    const wo: WorkOrder = { id, number: `WO-${String(id).padStart(5, '0')}`, machine: req.machine, title: req.title, type: 'Corrective', status: 'pending', priority: req.priority, assignees: input.assignee ? [input.assignee] : [], due: input.due, section: '', raised: dayOffset(0), raisedBy: req.by, source: req.number, tools: [], description: '' };
    setOrders(prev => [wo, ...prev]);
    setRequests(prev => prev.map(r => (r.id === reqId ? { ...r, status: 'approved', workOrder: wo.number } : r)));
    return wo;
  }, [requests, nextWo]);

  const reject: Store['reject'] = useCallback((id, reason) => setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'rejected', reason } : r))), []);
  const request: Store['request'] = useCallback(input => setRequests(prev => [{ id: Math.max(...prev.map(r => r.id)) + 1, number: `REQ-${String(Math.max(...prev.map(r => r.id)) + 1).padStart(5, '0')}`, by: 'You', when: 'Just now', status: 'waiting', ...input }, ...prev]), []);
  const update: Store['update'] = useCallback((id, patch) => setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o))), []);
  const toggleSchedule: Store['toggleSchedule'] = useCallback(id => setSchedules(prev => prev.map(s => (s.id === id ? { ...s, active: !s.active } : s))), []);

  const value = useMemo(() => ({ orders, requests, schedules, raise, approve, reject, request, update, toggleSchedule }), [orders, requests, schedules, raise, approve, reject, request, update, toggleSchedule]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
