// app/equipment/types.ts — the equipment register's data model: the asset record shape.
// Split out of page.tsx as part of the standing "decompose on touch" convention.
// components/EquipmentForm.tsx also imports this type — update its import path if this
// file ever moves. Component *prop* interfaces stay in page.tsx — they're coupled to one
// component, not the page's data contract. STATUS_COLORS/STATUS_LABELS/GROUP_PALETTE
// also stay in page.tsx (business vocabulary, same as every other page's config
// constants). No maintenance-date or valuation fields live here on purpose — maintenance
// scheduling belongs to the maintenance module, valuation/depreciation to accounting,
// not the equipment register.

// EquipmentBase/EquipmentItem mirror the backend's split (backend/app/routers/
// equipment.py) field-for-field: EquipmentBase is the portable "what is this
// asset" contract — shared by the Equipment register AND any other module's
// equipment picker/autofill (EquipmentAutocomplete, a future compressor picker, etc).
// EquipmentItem is kept as a distinct type (currently field-identical) so a future
// register-only field has somewhere to go without pulling other modules' equipment
// pickers along for the ride.
export interface EquipmentBase {
  id: number | string;
  equipment_id?: string;
  name: string;
  description?: string;
  serial_number?: string;
  category?: string;
  subcategory?: string;
  status?: string;
  location?: string;
  department?: string;
  assigned_to?: string;
  model?: string;
  manufacturer?: string;
  power_rating?: string;
  criticality?: string;
  commission_date?: string;
  supplier?: string;
  supplier_contact?: string;
  supplier_phone?: string;
  warranty_info?: string;
  warranty_expiry?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_cost?: number;
  specifications?: string;
  maintenance_interval?: number;
  maintenance_notes?: string;
  condition?: string;
  barcode?: string;
  qr_code?: string;
  image_url?: string;
  notes?: string;
}

export type EquipmentItem = EquipmentBase;
