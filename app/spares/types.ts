// app/spares/types.ts — the spares page's data model: the spare record shape, its
// create/update form payload, the requisition builder's line/header/saved shapes, and
// sort config. Split out of page.tsx as part of the standing "decompose on touch"
// convention. Component *prop* interfaces stay in page.tsx — they're coupled to one
// component, not the page's data contract (e.g. `ComboOption` stays local to
// EntityComboInput, whose fetch/map contract it describes).

export interface Spare {
  id: number; stock_code: string; description: string; category?: string; categories?: string[];
  machine_type?: string; current_quantity: number; min_quantity: number; max_quantity: number;
  unit_price: number; unit_of_measure?: string; priority: 'low' | 'medium' | 'high' | 'critical';
  storage_location?: string; supplier?: string; safety_stock: boolean; notes?: string;
  lead_time_days?: number; last_ordered_date?: string; updated_at?: string;
}

export interface ReqLine { id: string; spare: Spare | null; searchValue: string; qty: number; dropdownOpen: boolean; }
export interface ReqHeader { requester: string; reason: string; urgency: 'routine' | 'urgent' | 'emergency'; priority: 'low' | 'medium' | 'high' | 'critical'; required_for: string; }
export interface SavedRequisition {
  id: string; name: string; saved_at: string; updated_at?: string; header: ReqHeader;
  lines: Array<{ spare_id: number; stock_code: string; description: string; unit_of_measure?: string; unit_price: number; qty: number }>;
  grand_total: number;
}

export interface SpareFormData {
  stock_code: string; description: string; category: string; categories: string[]; machine_type: string;
  current_quantity: number; min_quantity: number; max_quantity: number; unit_price: number;
  unit_of_measure: string; priority: 'low' | 'medium' | 'high' | 'critical'; storage_location: string;
  supplier: string; safety_stock: boolean; notes: string;
}

export interface SortConfig { field: keyof Spare | 'status'; direction: 'asc' | 'desc'; }

export interface StockStatus { label: string; color: string; }
