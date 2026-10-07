// app/maintenance/workflowTypes.ts — the shapes the rebuilt Maintenance screens share (work orders with their links, requests,
// assignments, people with their availability, schedules with assets). They mirror the model in docs/plans/maintenance-workflow.md
// section M, so the prototype's in-memory source and the real API return the same thing. Statuses, priorities and classifications are
// the existing ones from ./types.
import type { RegisterRef } from '@/components/shared/RegisterField';
import type { WOClassification, WorkOrderPriority, WorkOrderStatus } from './types';

export type AvailabilityState = 'available' | 'on_leave' | 'leave_requested' | 'archived';
export interface LeaveInfo { leave_type: string; start_date: string; end_date: string; status: 'approved' | 'pending' }
/** What the server says about one person on one day (plan section M.5). The interface shows it; it never decides it. */
export interface Availability { state: AvailabilityState; leave?: LeaveInfo }

export interface Person { id: number; name: string; designation: string; section: string; availability: Availability }
export interface Machine { id: number; name: string; code: string; section: string; status: string }

export type PermitKey = 'permit_to_work' | 'hot_work' | 'hazardous_work' | 'confined_space' | 'high_voltage_switching' | 'land_disturbance' | 'other';
export type Permits = Record<PermitKey, { required: boolean; reference: string; label?: string }>;

export interface FlowEvent { id: number; at: string; who: string; what: string; signed?: boolean }
export interface FlowComment { id: number; at: string; who: string; body: string }
export interface FlowAssignment { id: number; person: RegisterRef; role: 'lead' | 'assistant'; day: string; hours: number | null; status: 'planned' | 'published' }

export type WorkOrderSource = { kind: 'manual' } | { kind: 'request'; ref: string } | { kind: 'schedule'; ref: string } | { kind: 'breakdown'; ref: string };

export interface FlowOrder {
  id: number; number: string; machine: RegisterRef; description: string; classification: WOClassification; priority: WorkOrderPriority;
  status: WorkOrderStatus; section: RegisterRef; assignee: RegisterRef; foreman: RegisterRef; requestedBy: string;
  scheduled_date: string; due_date: string; est_hours: number; progress: number; source: WorkOrderSource; version: number;
  /** From the server's one transition table; the interface renders exactly these and keeps no copy of the rules. */
  allowed_transitions: WorkOrderStatus[]; awaiting_signoff: boolean; needs_assignment?: boolean; assignee_now_on_leave?: boolean;
  permits: Permits; events: FlowEvent[]; comments: FlowComment[]; assignments: FlowAssignment[];
}

export type RequestStatus = 'open' | 'approved' | 'rejected' | 'cancelled';
export interface FlowRequest {
  id: number; number: string; status: RequestStatus; machine: RegisterRef; description: string; priority: WorkOrderPriority;
  classification: WOClassification; requester: string; department: string; section: string; needed_by: string; created: string;
  foreman: RegisterRef; decision_note?: string; work_order?: { number: string; status: WorkOrderStatus };
}

export interface ProjectionRow { due: string; raise_on: string; machine: string; note?: string; tone?: 'warning' | 'neutral' }
