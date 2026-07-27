// app/av/types.ts — the equipment availability page's data model: the equipment/
// maintenance/reservation/downtime record shapes, app settings, and filter state.
// Split out of page.tsx as part of the standing "decompose on touch" convention.
// Component *prop* interfaces stay in page.tsx — they're coupled to one component,
// not the page's data contract.

export interface EquipmentItem {
  id: number;
  name: string;
  type: string;
  category: string;
  model: string;
  serial: string;
  location: string;
  status: string;
  lastMaintenance: string;
  nextMaintenance: string;
  utilization: number;
  color: string;
}

export interface MaintenanceLog {
  id: number;
  equipmentId: number;
  equipmentName: string;
  type: string;
  description: string;
  date: string;
  duration: number;
  cost: number;
  technician: string;
  status: string;
  notes?: string;
}

export interface Reservation {
  id: number;
  equipmentId: number;
  equipmentName: string;
  project: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
}

export interface DowntimeRecord {
  id: number;
  equipmentId: number;
  equipmentName: string;
  reason: string;
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  status: string;
}

export interface AppSettings {
  showOffline: boolean;
  autoCalculate: boolean;
  maintenanceThreshold: number;
}

export interface EquipmentFilters {
  location: string;
  category: string;
  type: string;
  status: string;
  search: string;
}

export interface MaintenanceLogFormData {
  equipmentId: number;
  equipmentName: string;
  type: string;
  description: string;
  date: string;
  duration: number;
  cost: number;
  technician: string;
  notes: string;
}

export interface ReservationFormData {
  equipmentId: number;
  equipmentName: string;
  project: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface AddEquipmentFormData {
  name: string;
  type: string;
  category: string;
  model: string;
  serial: string;
  location: string;
  status: string;
  utilization: number;
}
