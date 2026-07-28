// app/equipment/types.ts — the equipment register's data model: the asset record shape.
// Split out of page.tsx as part of the standing "decompose on touch" convention.
// components/EquipmentForm.tsx also imports this type — update its import path if this
// file ever moves. Component *prop* interfaces stay in page.tsx — they're coupled to one
// component, not the page's data contract. STATUS_COLORS/STATUS_LABELS/MAINT_COLORS/
// GROUP_PALETTE also stay in page.tsx (business vocabulary, same as every other page's
// config constants).

export interface EquipmentItem {
  id: number | string;
  equipment_id: string;
  name: string;
  status?: string;
  category?: string;
  location?: string;
  department?: string;
  model?: string;
  serial_number?: string;
  commission_date?: string;
  supplier?: string;
  supplier_contact?: string;
  supplier_phone?: string;
  warranty_info?: string;
  maintenance_interval?: number;
  last_maintenance?: string;
  next_maintenance?: string;
  maintenance_notes?: string;
  purchase_cost?: number;
  current_value?: number;
  depreciation_rate?: number;
  description?: string;
  specifications?: string;
}
