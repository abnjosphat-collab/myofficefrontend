// app/tools/preview/toolLook.ts — how a tool's custody status reads on the floor: one colour and one plain label.
import { STATUS, type Status, type Tool } from './prototype';

const ACCENT: Record<Status, string> = {
  available: 'var(--mo-success)',
  issued: 'var(--mo-info)',
  overdue: 'var(--mo-danger)',
  attention: 'var(--mo-warning)',
};

export const statusAccent = (status: Status) => ACCENT[status];
export const statusLabel = (status: Status) => STATUS[status];

/** The one-line "where is it" a card shows: the holder while out, the storage place otherwise. */
export const whereIs = (tool: Tool) => (tool.holder ? `With ${tool.holder}` : tool.location || 'No location recorded');

/** The StatusBadge tone for a custody status. */
export const statusTone = (status: Status): 'success' | 'info' | 'danger' | 'warning' =>
  status === 'available' ? 'success' : status === 'issued' ? 'info' : status === 'overdue' ? 'danger' : 'warning';
