// app/equipment/equipmentLogic.ts — the rules behind the equipment register: asset age, the filters, the status counts and
// how a form turns into the payload. Pure, so what the page states is tested.
import type { EquipmentItem } from './types';

export const STATUSES = ['operational', 'maintenance', 'out_of_service', 'reserved', 'retired'] as const;
export const STATUS_LABELS: Record<string, string> = { operational: 'Operational', maintenance: 'Maintenance', out_of_service: 'Out of service', reserved: 'Reserved', retired: 'Retired' };

/** "2yr 3mo", "<1 mo", "N/A" for no date and "Invalid" for one that cannot be read. */
export function calcAge(date: string | undefined, now: Date = new Date()): string {
  if (!date) return 'N/A';
  const start = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  if (isNaN(start.getTime())) return 'Invalid';
  let y = now.getFullYear() - start.getFullYear();
  let m = now.getMonth() - start.getMonth();
  if (m < 0) { y -= 1; m += 12; }
  if (y < 0) return 'Not yet commissioned';
  if (y === 0 && m === 0) return '<1 mo';
  return [y > 0 ? `${y}yr` : '', m > 0 ? `${m}mo` : ''].filter(Boolean).join(' ');
}

export interface EquipmentFilters { search: string; status: string; category: string; location: string }
export const NO_EQUIPMENT_FILTERS: EquipmentFilters = { search: '', status: 'all', category: 'all', location: 'all' };

export function filterEquipment(items: EquipmentItem[], f: EquipmentFilters): EquipmentItem[] {
  const q = f.search.trim().toLowerCase();
  return items.filter(i =>
    (!q || [i.name, i.equipment_id, i.model, i.category, i.location, i.serial_number].some(s => s?.toLowerCase().includes(q)))
    && (f.status === 'all' || i.status === f.status)
    && (f.category === 'all' || i.category === f.category)
    && (f.location === 'all' || i.location === f.location));
}

export function countByStatus(items: EquipmentItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) { const s = i.status?.toLowerCase() ?? 'unknown'; out[s] = (out[s] ?? 0) + 1; }
  return out;
}

export interface EquipmentForm {
  equipment_id: string; name: string; model: string; manufacturer: string; serial_number: string; category: string; criticality: string;
  description: string; status: string; location: string; department: string; commission_date: string; purchase_cost: string; power_rating: string;
  supplier: string; supplier_contact: string; supplier_phone: string; warranty_info: string; specifications: string; maintenance_interval: string; maintenance_notes: string;
}
export const blankForm = (): EquipmentForm => ({
  equipment_id: '', name: '', model: '', manufacturer: '', serial_number: '', category: '', criticality: '', description: '', status: 'operational', location: '', department: '',
  commission_date: '', purchase_cost: '', power_rating: '', supplier: '', supplier_contact: '', supplier_phone: '', warranty_info: '', specifications: '', maintenance_interval: '', maintenance_notes: '',
});
export function formFromItem(e: EquipmentItem): EquipmentForm {
  return {
    ...blankForm(), equipment_id: e.equipment_id || '', name: e.name || '', model: e.model || '', manufacturer: e.manufacturer || '', serial_number: e.serial_number || '',
    category: e.category || '', criticality: e.criticality || '', description: e.description || '', status: e.status || 'operational', location: e.location || '', department: e.department || '',
    commission_date: (e.commission_date || '').slice(0, 10), // a date-only string, never routed through Date (it would shift a day in UTC+ zones)
    purchase_cost: e.purchase_cost?.toString() || '', power_rating: e.power_rating || '', supplier: e.supplier || '', supplier_contact: e.supplier_contact || '', supplier_phone: e.supplier_phone || '',
    warranty_info: e.warranty_info || '', specifications: e.specifications || '', maintenance_interval: e.maintenance_interval?.toString() || '', maintenance_notes: e.maintenance_notes || '',
  };
}

const OPTIONAL = ['model', 'manufacturer', 'serial_number', 'category', 'criticality', 'description', 'location', 'department', 'power_rating', 'supplier', 'supplier_contact', 'supplier_phone', 'warranty_info', 'specifications', 'maintenance_notes', 'commission_date'] as const;
const num = (s: string): number | null => { if (s.trim() === '') return null; const n = parseFloat(s); return Number.isNaN(n) ? null : n; };

/** An empty optional field is sent as null (so it can be cleared); numbers are numbers or null. */
export function toPayload(f: EquipmentForm): Record<string, unknown> {
  const out: Record<string, unknown> = { ...f };
  for (const k of OPTIONAL) if (f[k] === '') out[k] = null;
  out.purchase_cost = num(f.purchase_cost);
  out.maintenance_interval = num(f.maintenance_interval);
  return out;
}
