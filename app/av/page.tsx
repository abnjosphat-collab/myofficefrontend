'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatCard, StatusBadge, ProgressBar, FormField, FormActions,
  SearchInput, CenterModal, PrimaryButton, EmptyState, useCollapseSection, SelectField, type Accent,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  Download, Settings, Filter, Search, BarChart3, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, Wrench, Factory, ToolCase, FileText, Plus, Trash2, RefreshCw, Clock, ChevronRight,
} from '@/components/shared/theme';
import { format, addDays, isWithinInterval } from 'date-fns';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EquipmentItem {
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

interface MaintenanceLog {
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

interface Reservation {
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

interface DowntimeRecord {
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

interface AppSettings {
  showOffline: boolean;
  autoCalculate: boolean;
  maintenanceThreshold: number;
}

interface EquipmentFilters {
  location: string;
  category: string;
  type: string;
  status: string;
  search: string;
}

interface MaintenanceLogFormData {
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

interface ReservationFormData {
  equipmentId: number;
  equipmentName: string;
  project: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  notes: string;
}

interface AddEquipmentFormData {
  name: string;
  type: string;
  category: string;
  model: string;
  serial: string;
  location: string;
  status: string;
  utilization: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EQUIPMENT_TYPES = {
  EXCAVATOR: 'excavator', LOADER: 'loader', CRANE: 'crane', COMPRESSOR: 'compressor',
  GENERATOR: 'generator', WELDER: 'welder', PUMP: 'pump', MIXER: 'mixer',
};

const EQUIPMENT_CATEGORIES = {
  EARTHMOVING: 'earthmoving', LIFTING: 'lifting', POWER: 'power',
  TOOLS: 'tools', PUMPS: 'pumps', CONCRETE: 'concrete',
};

const STATUS_TYPES = {
  OPERATIONAL: 'operational', MAINTENANCE: 'maintenance', BREAKDOWN: 'breakdown',
  RESERVED: 'reserved', OFFLINE: 'offline',
};

const STATUS_CONFIG: Record<string, { label: string; hex: string; icon: React.ElementType }> = {
  [STATUS_TYPES.OPERATIONAL]: { label: 'Operational', hex: '#34d399', icon: CheckCircle2 },
  [STATUS_TYPES.MAINTENANCE]: { label: 'Maintenance', hex: '#f97316', icon: Wrench },
  [STATUS_TYPES.BREAKDOWN]: { label: 'Breakdown', hex: '#f43f5e', icon: AlertTriangle },
  [STATUS_TYPES.RESERVED]: { label: 'Reserved', hex: '#60a5fa', icon: Clock },
  [STATUS_TYPES.OFFLINE]: { label: 'Offline', hex: '#94a3b8', icon: XCircle },
};

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  { id: 1, name: 'Excavator CAT 320', type: EQUIPMENT_TYPES.EXCAVATOR, category: EQUIPMENT_CATEGORIES.EARTHMOVING, model: 'CAT 320', serial: 'CAT320-001', location: 'Site A', status: STATUS_TYPES.OPERATIONAL, lastMaintenance: '2024-01-15', nextMaintenance: '2024-02-15', utilization: 85, color: '#60a5fa' },
  { id: 2, name: 'Mobile Crane 50T', type: EQUIPMENT_TYPES.CRANE, category: EQUIPMENT_CATEGORIES.LIFTING, model: 'Liebherr LTM 1050', serial: 'LIE-1050-001', location: 'Site B', status: STATUS_TYPES.OPERATIONAL, lastMaintenance: '2024-01-20', nextMaintenance: '2024-02-20', utilization: 72, color: '#a78bfa' },
  { id: 3, name: 'Generator 150kVA', type: EQUIPMENT_TYPES.GENERATOR, category: EQUIPMENT_CATEGORIES.POWER, model: 'Cummins C150D5', serial: 'CUM-C150-001', location: 'Main Plant', status: STATUS_TYPES.MAINTENANCE, lastMaintenance: '2024-01-10', nextMaintenance: '2024-01-25', utilization: 90, color: '#34d399' },
  { id: 4, name: 'Concrete Pump 42M', type: EQUIPMENT_TYPES.PUMP, category: EQUIPMENT_CATEGORIES.CONCRETE, model: 'Putzmeister 42M', serial: 'PUTZ-42M-001', location: 'Site C', status: STATUS_TYPES.BREAKDOWN, lastMaintenance: '2024-01-05', nextMaintenance: '2024-01-25', utilization: 65, color: '#f472b6' },
  { id: 5, name: 'Wheel Loader', type: EQUIPMENT_TYPES.LOADER, category: EQUIPMENT_CATEGORIES.EARTHMOVING, model: 'Volvo L120H', serial: 'VOL-L120-001', location: 'Site A', status: STATUS_TYPES.RESERVED, lastMaintenance: '2024-01-18', nextMaintenance: '2024-02-18', utilization: 78, color: '#f97316' },
  { id: 6, name: 'Air Compressor 750CFM', type: EQUIPMENT_TYPES.COMPRESSOR, category: EQUIPMENT_CATEGORIES.POWER, model: 'Atlas Copco XAS 750', serial: 'ATLAS-750-001', location: 'Workshop', status: STATUS_TYPES.OPERATIONAL, lastMaintenance: '2024-01-22', nextMaintenance: '2024-02-22', utilization: 60, color: '#f43f5e' },
  { id: 7, name: 'Concrete Mixer 9m³', type: EQUIPMENT_TYPES.MIXER, category: EQUIPMENT_CATEGORIES.CONCRETE, model: 'Schwing Stetter 9m³', serial: 'SCHW-9M3-001', location: 'Batching Plant', status: STATUS_TYPES.OPERATIONAL, lastMaintenance: '2024-01-12', nextMaintenance: '2024-02-12', utilization: 82, color: '#fbbf24' },
  { id: 8, name: 'Welding Machine 400A', type: EQUIPMENT_TYPES.WELDER, category: EQUIPMENT_CATEGORIES.TOOLS, model: 'Lincoln Electric Vantage 400', serial: 'LINCOLN-400-001', location: 'Fabrication Shop', status: STATUS_TYPES.OFFLINE, lastMaintenance: '2024-01-08', nextMaintenance: '2024-02-08', utilization: 45, color: '#818cf8' },
  { id: 9, name: 'Dump Truck 25T', type: EQUIPMENT_TYPES.LOADER, category: EQUIPMENT_CATEGORIES.EARTHMOVING, model: 'CAT 725', serial: 'CAT725-001', location: 'Site B', status: STATUS_TYPES.OPERATIONAL, lastMaintenance: '2024-01-14', nextMaintenance: '2024-02-14', utilization: 88, color: '#2dd4bf' },
  { id: 10, name: 'Tower Crane 16T', type: EQUIPMENT_TYPES.CRANE, category: EQUIPMENT_CATEGORIES.LIFTING, model: 'Potain MDT 189', serial: 'POTAIN-189-001', location: 'Site C', status: STATUS_TYPES.MAINTENANCE, lastMaintenance: '2024-01-16', nextMaintenance: '2024-02-16', utilization: 75, color: '#22d3ee' },
];

const LOCATIONS = ['Site A', 'Site B', 'Site C', 'Main Plant', 'Workshop', 'Batching Plant', 'Fabrication Shop'];
const CATEGORIES = Object.values(EQUIPMENT_CATEGORIES);
const TYPES = Object.values(EQUIPMENT_TYPES);
const EQUIP_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#f97316', '#f43f5e', '#fbbf24', '#818cf8', '#2dd4bf', '#22d3ee'];

function getUtilizationAccent(utilization: number): Accent {
  if (utilization >= 90) return 'blue';
  if (utilization >= 70) return 'emerald';
  if (utilization >= 50) return 'amber';
  return 'cyan';
}
function getUtilizationLabel(utilization: number): string {
  if (utilization >= 90) return 'High';
  if (utilization >= 70) return 'Optimal';
  if (utilization >= 50) return 'Moderate';
  return 'Low';
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'equipment', label: 'Equipment', icon: Factory },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'reports', label: 'Reports', icon: FileText },
] as const;

// ─── MAINTENANCE LOG FORM ───────────────────────────────────────────────────

function MaintenanceLogForm({
  equipment, open, onClose, onAdd,
}: { equipment: EquipmentItem | null; open: boolean; onClose: () => void; onAdd: (data: MaintenanceLogFormData) => void }) {
  const t = useTheme();
  const [form, setForm] = useState<MaintenanceLogFormData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (equipment && open) {
      setForm({
        equipmentId: equipment.id, equipmentName: equipment.name, type: 'scheduled',
        description: '', date: format(new Date(), 'yyyy-MM-dd'), duration: 4, cost: 0, technician: '', notes: '',
      });
    }
  }, [equipment, open]);

  if (!form) return null;
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.technician) { toast.error('Please fill in all required fields'); return; }
    setSaving(true);
    onAdd(form);
    setSaving(false);
    onClose();
  };

  return (
    <CenterModal open={open} onClose={onClose} title={`Log Maintenance — ${equipment?.name ?? ''}`} width="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Maintenance Type">
              <SelectField size="form" value={form.type} title="Maintenance type" onChange={v => setForm({ ...form, type: v })}
                options={[
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'repair', label: 'Repair' },
                  { value: 'inspection', label: 'Inspection' },
                  { value: 'emergency', label: 'Emergency' },
                ]} />
            </FormField>
            <FormField label="Date">
              <input type="date" value={form.date} title="Date" onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Description" required>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the maintenance work…" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Duration (hours)">
              <input type="number" value={form.duration} title="Duration"
                onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} className={inputCls} />
            </FormField>
            <FormField label="Cost ($)">
              <input type="number" step="0.01" value={form.cost} title="Cost"
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Technician" required>
            <input value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })}
              placeholder="Technician name" className={inputCls} />
          </FormField>
          <FormField label="Notes">
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes…" className={inputCls} />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel="Log Maintenance" />
      </form>
    </CenterModal>
  );
}

// ─── RESERVATION FORM ────────────────────────────────────────────────────────

function ReservationForm({
  equipment, open, onClose, onAdd,
}: { equipment: EquipmentItem | null; open: boolean; onClose: () => void; onAdd: (data: ReservationFormData) => void }) {
  const t = useTheme();
  const [form, setForm] = useState<ReservationFormData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (equipment && open) {
      setForm({
        equipmentId: equipment.id, equipmentName: equipment.name, project: '', requestedBy: '',
        startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), notes: '',
      });
    }
  }, [equipment, open]);

  if (!form) return null;
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || !form.requestedBy) { toast.error('Please fill in all required fields'); return; }
    setSaving(true);
    onAdd(form);
    setSaving(false);
    onClose();
  };

  return (
    <CenterModal open={open} onClose={onClose} title={`Reserve — ${equipment?.name ?? ''}`} width="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4">
          <FormField label="Project" required>
            <input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}
              placeholder="Project name" className={inputCls} />
          </FormField>
          <FormField label="Requested By" required>
            <input value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })}
              placeholder="Requester name" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input type="date" value={form.startDate} title="Start date" onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={form.endDate} title="End date" onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Notes">
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes…" className={inputCls} />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel="Reserve Equipment" />
      </form>
    </CenterModal>
  );
}

// ─── ADD EQUIPMENT FORM ──────────────────────────────────────────────────────

function AddEquipmentForm({
  open, onClose, onAdd,
}: { open: boolean; onClose: () => void; onAdd: (data: AddEquipmentFormData & { lastMaintenance: string; nextMaintenance: string; color: string }) => void }) {
  const t = useTheme();
  const blank: AddEquipmentFormData = { name: '', type: '', category: '', model: '', serial: '', location: '', status: STATUS_TYPES.OPERATIONAL, utilization: 0 };
  const [form, setForm] = useState<AddEquipmentFormData>(blank);
  const [saving, setSaving] = useState(false);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  useEffect(() => { if (open) setForm(blank); }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.category || !form.model) { toast.error('Please fill in all required fields'); return; }
    setSaving(true);
    onAdd({
      ...form,
      lastMaintenance: format(new Date(), 'yyyy-MM-dd'),
      nextMaintenance: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      color: EQUIP_COLORS[Math.floor(Math.random() * EQUIP_COLORS.length)],
    });
    setSaving(false);
    onClose();
  };

  return (
    <CenterModal open={open} onClose={onClose} title="Add New Equipment" width="max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <FormField label="Equipment Name" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Excavator CAT 320" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" required>
              <SelectField size="form" value={form.type} title="Type" onChange={v => setForm({ ...form, type: v })}
                placeholder="Select type"
                options={TYPES.map(ty => ({ value: ty, label: ty.charAt(0).toUpperCase() + ty.slice(1) }))} />
            </FormField>
            <FormField label="Category" required>
              <SelectField size="form" value={form.category} title="Category" onChange={v => setForm({ ...form, category: v })}
                placeholder="Select category"
                options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Model" required>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="CAT 320" className={inputCls} />
            </FormField>
            <FormField label="Serial Number">
              <input value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} placeholder="CAT320-001" className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Location">
              <SelectField size="form" value={form.location} title="Location" onChange={v => setForm({ ...form, location: v })}
                placeholder="Select location"
                options={LOCATIONS.map(l => ({ value: l, label: l }))} />
            </FormField>
            <FormField label="Utilization (%)">
              <input type="number" min={0} max={100} value={form.utilization} title="Utilization"
                onChange={e => setForm({ ...form, utilization: parseInt(e.target.value) || 0 })} className={inputCls} />
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel="Add Equipment" />
      </form>
    </CenterModal>
  );
}

// ─── EQUIPMENT CARD ──────────────────────────────────────────────────────────

function EquipmentCard({
  item, onLogMaintenance, onReserve, onRemove,
}: { item: EquipmentItem; onLogMaintenance: () => void; onReserve: () => void; onRemove: () => void }) {
  const t = useTheme();
  const status = STATUS_CONFIG[item.status];
  const daysUntilMaintenance = item.nextMaintenance
    ? Math.ceil((new Date(item.nextMaintenance).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg shrink-0" style={{ background: `${item.color}20`, border: `1px solid ${item.color}35` }}>
            <Factory className="h-4 w-4" style={{ color: item.color }} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${t.textPrimary}`}>{item.name}</p>
            <p className={`text-[11px] truncate ${t.textFaint}`}>{item.model} · {item.location}</p>
          </div>
        </div>
        <StatusBadge color={status.hex} label={status.label} />
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <ProgressBar value={item.utilization} color={t.light ? '#2563eb' : '#60a5fa'} label={`Utilization · ${getUtilizationLabel(item.utilization)}`} />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className={t.textFaint}>Last Maintenance</span>
            <span className={t.textMuted}>{item.lastMaintenance || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={t.textFaint}>Next Maintenance</span>
            <span className={`flex items-center gap-1.5 ${daysUntilMaintenance !== null && daysUntilMaintenance <= 7 ? 'text-amber-500 font-medium' : t.textMuted}`}>
              {item.nextMaintenance || 'N/A'}
              {daysUntilMaintenance !== null && daysUntilMaintenance <= 7 && <StatusBadge color="#f59e0b" label="Soon" />}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 pt-1">
          <button type="button" onClick={onLogMaintenance}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-1`}>
            <Wrench className="h-3 w-3" /> Log Maintenance
          </button>
          <button type="button" onClick={onReserve}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-1`}>
            <Clock className="h-3 w-3" /> Reserve
          </button>
          <button type="button" title="Remove equipment" onClick={onRemove}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function EquipmentAvailabilityContent() {
  const t = useTheme();
  const [isClient, setIsClient] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('dashboard');
  const [settings, setSettings] = useState<AppSettings>({ showOffline: true, autoCalculate: true, maintenanceThreshold: 90 });
  const [filters, setFilters] = useState<EquipmentFilters>({ location: 'all', category: 'all', type: 'all', status: 'all', search: '' });
  const [isLoading, setIsLoading] = useState(true);

  const [logTarget, setLogTarget] = useState<EquipmentItem | null>(null);
  const [reserveTarget, setReserveTarget] = useState<EquipmentItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const saveData = useCallback((key: string, data: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { toast.error('Failed to save changes'); }
  }, []);

  const saveEquipment = useCallback((n: EquipmentItem[]) => { setEquipment(n); saveData('equipment-data', n); }, [saveData]);
  const saveMaintenanceLogs = useCallback((n: MaintenanceLog[]) => { setMaintenanceLogs(n); saveData('equipment-maintenance', n); }, [saveData]);
  const saveReservations = useCallback((n: Reservation[]) => { setReservations(n); saveData('equipment-reservations', n); }, [saveData]);
  const saveDowntimeRecords = useCallback((n: DowntimeRecord[]) => { setDowntimeRecords(n); saveData('equipment-downtime', n); }, [saveData]);
  const saveSettings = useCallback((n: AppSettings) => { setSettings(n); saveData('equipment-settings', n); }, [saveData]);

  const generateSampleData = useCallback((equipList: EquipmentItem[]) => {
    const sampleMaintenance: MaintenanceLog[] = [];
    const sampleReservations: Reservation[] = [];
    const sampleDowntime: DowntimeRecord[] = [];
    const today = new Date();

    equipList.forEach(item => {
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 30));
        sampleMaintenance.push({
          id: Date.now() + i + item.id, equipmentId: item.id, equipmentName: item.name, type: 'scheduled',
          description: `Routine maintenance ${i + 1}`, date: date.toISOString().split('T')[0],
          duration: 4, cost: 500 + (i * 100), technician: `Tech ${i + 1}`, status: 'completed',
        });
      }
      if (item.status === STATUS_TYPES.RESERVED) {
        const startDate = new Date(today);
        const endDate = new Date(today); endDate.setDate(endDate.getDate() + 7);
        sampleReservations.push({
          id: Date.now() + item.id, equipmentId: item.id, equipmentName: item.name, project: 'Project Alpha',
          requestedBy: 'John Smith', startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], status: 'approved',
        });
      }
      if (item.status === STATUS_TYPES.BREAKDOWN || item.status === STATUS_TYPES.MAINTENANCE) {
        const startDate = new Date(today); startDate.setDate(startDate.getDate() - 2);
        sampleDowntime.push({
          id: Date.now() + item.id, equipmentId: item.id, equipmentName: item.name,
          reason: item.status === STATUS_TYPES.BREAKDOWN ? 'Hydraulic failure' : 'Scheduled maintenance',
          startDate: startDate.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0],
          duration: 48, cost: 2500, status: item.status === STATUS_TYPES.MAINTENANCE ? 'completed' : 'in-progress',
        });
      }
    });

    setMaintenanceLogs(sampleMaintenance);
    setReservations(sampleReservations);
    setDowntimeRecords(sampleDowntime);
    saveData('equipment-maintenance', sampleMaintenance);
    saveData('equipment-reservations', sampleReservations);
    saveData('equipment-downtime', sampleDowntime);
  }, [saveData]);

  const loadAllData = useCallback(() => {
    try {
      setIsLoading(true);
      const savedEquipment = localStorage.getItem('equipment-data');
      const equipList: EquipmentItem[] = savedEquipment ? JSON.parse(savedEquipment) : INITIAL_EQUIPMENT;
      if (!savedEquipment) saveData('equipment-data', INITIAL_EQUIPMENT);
      setEquipment(equipList);

      const savedMaintenance = localStorage.getItem('equipment-maintenance');
      setMaintenanceLogs(savedMaintenance ? JSON.parse(savedMaintenance) : []);
      const savedReservations = localStorage.getItem('equipment-reservations');
      setReservations(savedReservations ? JSON.parse(savedReservations) : []);
      const savedDowntime = localStorage.getItem('equipment-downtime');
      setDowntimeRecords(savedDowntime ? JSON.parse(savedDowntime) : []);
      const savedSettings = localStorage.getItem('equipment-settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      if (!savedMaintenance || !savedReservations || !savedDowntime) generateSampleData(equipList);
    } catch (error) {
      console.error('Failed to load data:', error);
      setEquipment(INITIAL_EQUIPMENT);
      generateSampleData(INITIAL_EQUIPMENT);
    } finally { setIsLoading(false); }
  }, [saveData, generateSampleData]);

  useEffect(() => { setIsClient(true); loadAllData(); }, [loadAllData]);

  const stats = useMemo(() => {
    const totalEquipment = equipment.length;
    const operationalEquipment = equipment.filter(i => i.status === STATUS_TYPES.OPERATIONAL).length;
    const unavailableEquipment = equipment.filter(i => [STATUS_TYPES.MAINTENANCE, STATUS_TYPES.BREAKDOWN, STATUS_TYPES.OFFLINE].includes(i.status)).length;
    const availabilityRate = totalEquipment > 0 ? (operationalEquipment / totalEquipment) * 100 : 0;
    const utilizationRate = totalEquipment > 0 ? equipment.reduce((s, i) => s + i.utilization, 0) / totalEquipment : 0;
    const today = new Date(); const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
    const maintenanceDue = equipment.filter(i => {
      if (!i.nextMaintenance) return false;
      const d = new Date(i.nextMaintenance);
      return d <= nextWeek && d >= today;
    }).length;
    return { totalEquipment, operationalEquipment, unavailableEquipment, availabilityRate: parseFloat(availabilityRate.toFixed(1)), utilizationRate: parseFloat(utilizationRate.toFixed(1)), maintenanceDue };
  }, [equipment]);

  const categoryStats = useMemo(() => {
    const out: Record<string, { total: number; operational: number; availability: number; utilization: number }> = {};
    CATEGORIES.forEach(category => {
      const list = equipment.filter(i => i.category === category);
      const operational = list.filter(i => i.status === STATUS_TYPES.OPERATIONAL).length;
      const total = list.length;
      out[category] = { total, operational, availability: total > 0 ? parseFloat(((operational / total) * 100).toFixed(1)) : 0, utilization: total > 0 ? list.reduce((s, i) => s + i.utilization, 0) / total : 0 };
    });
    return out;
  }, [equipment]);

  const updateEquipmentStatus = useCallback((equipmentId: number, status: string) => {
    saveEquipment(equipment.map(i => i.id === equipmentId ? { ...i, status } : i));
    toast.success(`Equipment status updated to ${STATUS_CONFIG[status].label}`);
  }, [equipment, saveEquipment]);

  const addMaintenanceLog = useCallback((logData: MaintenanceLogFormData) => {
    saveMaintenanceLogs([...maintenanceLogs, { id: Date.now(), ...logData, status: 'completed' }]);
    saveEquipment(equipment.map(i => i.id === logData.equipmentId
      ? { ...i, lastMaintenance: logData.date, nextMaintenance: format(addDays(new Date(logData.date), 30), 'yyyy-MM-dd'), status: STATUS_TYPES.OPERATIONAL }
      : i));
    saveDowntimeRecords(downtimeRecords.map(r => r.equipmentId === logData.equipmentId && r.status === 'in-progress' ? { ...r, endDate: logData.date, status: 'completed' } : r));
    toast.success('Maintenance log added successfully');
  }, [maintenanceLogs, saveMaintenanceLogs, equipment, saveEquipment, downtimeRecords, saveDowntimeRecords]);

  const addReservation = useCallback((data: ReservationFormData) => {
    saveReservations([...reservations, { id: Date.now(), ...data, status: 'approved' }]);
    updateEquipmentStatus(data.equipmentId, STATUS_TYPES.RESERVED);
    toast.success('Equipment reserved successfully');
  }, [reservations, saveReservations, updateEquipmentStatus]);

  const removeEquipment = useCallback((item: EquipmentItem) => {
    if (!confirm(`Are you sure you want to remove ${item.name}?`)) return;
    saveEquipment(equipment.filter(e => e.id !== item.id));
  }, [equipment, saveEquipment]);

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Category', 'Location', 'Status', 'Utilization %', 'Last Maintenance', 'Next Maintenance'];
    const data = equipment.map(item => [item.name, item.type, item.category, item.location, STATUS_CONFIG[item.status].label, item.utilization, item.lastMaintenance, item.nextMaintenance]);
    const csvContent = [headers.join(','), ...data.map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment-availability-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success('CSV report exported successfully');
  };

  const exportToPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFillColor(30, 64, 175); doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(16);
      doc.text('EQUIPMENT AVAILABILITY REPORT', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, 105, 22, { align: 'center' });
      doc.setTextColor(0, 0, 0); doc.setFontSize(14);
      doc.text('SUMMARY', 20, 40); doc.setFontSize(10);
      doc.text(`Total Equipment: ${stats.totalEquipment}`, 20, 50);
      doc.text(`Operational: ${stats.operationalEquipment}`, 20, 57);
      doc.text(`Availability Rate: ${stats.availabilityRate}%`, 20, 64);
      doc.text(`Utilization Rate: ${stats.utilizationRate}%`, 20, 71);
      doc.text(`Maintenance Due: ${stats.maintenanceDue}`, 20, 78);
      let yPos = 90;
      doc.setFontSize(14); doc.text('CATEGORY BREAKDOWN', 20, yPos); yPos += 10;
      Object.entries(categoryStats).forEach(([category, cs]) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFontSize(10);
        doc.text(`${category.toUpperCase()}: ${cs.operational}/${cs.total} operational (${cs.availability}%)`, 20, yPos);
        yPos += 7;
      });
      doc.save(`equipment-availability-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report exported successfully');
    }).catch(() => toast.error('Failed to generate PDF report'));
  };

  const filteredEquipment = useMemo(() => equipment.filter(item => {
    if (filters.location !== 'all' && item.location !== filters.location) return false;
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (!settings.showOffline && item.status === STATUS_TYPES.OFFLINE) return false;
    return true;
  }), [equipment, filters, settings.showOffline]);

  const selectCls = `h-9 px-3 rounded-lg text-xs outline-none transition-colors ${t.inputBg}`;

  if (!isClient || isLoading) {
    return (
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className={`flex items-center justify-center py-24 ${t.textFaint} gap-2`}>
          <RefreshCw className="h-5 w-5 animate-spin" /> Loading Equipment Availability System…
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Factory}
        accent="violet"
        crumbs={['Equipment', 'Availability']}
        title="Equipment Availability"
        description="Track and manage equipment utilization, downtime, and maintenance schedules."
        statsOpen
        actions={<PrimaryButton icon={Plus} accent="cyan" onClick={() => setAddOpen(true)}>Add Equipment</PrimaryButton>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatTile icon={Factory} color="#60a5fa" label="Total Equipment" value={stats.totalEquipment} />
          <StatTile icon={CheckCircle2} color="#34d399" label="Operational" value={stats.operationalEquipment} />
          <StatTile icon={TrendingUp} color="#a78bfa" label="Availability" value={`${stats.availabilityRate}%`} />
          <StatTile icon={BarChart3} color="#f97316" label="Utilization" value={`${stats.utilizationRate}%`} />
          <StatTile icon={AlertTriangle} color="#f43f5e" label="Maintenance Due" value={stats.maintenanceDue} />
        </div>
      </PageHero>

      <div className={`${t.glassSoft} rounded-xl p-1 flex gap-1 flex-wrap`}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-cyan-500/15 text-cyan-500' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
              <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Availability Overview</h3>
              <p className={`text-xs mb-4 ${t.textFaint}`}>Current equipment status and utilization</p>
              <p className={`text-sm font-semibold mb-3 ${t.textMuted}`}>Equipment Status</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                  const count = equipment.filter(i => i.status === statusKey).length;
                  return <StatCard key={statusKey} icon={config.icon} accent={statusKey === STATUS_TYPES.OPERATIONAL ? 'emerald' : statusKey === STATUS_TYPES.BREAKDOWN ? 'blue' : 'cyan'} label={config.label} value={count} />;
                })}
              </div>
              <p className={`text-sm font-semibold mb-3 ${t.textMuted}`}>Category Performance</p>
              <div className="space-y-2">
                {Object.entries(categoryStats).map(([category, cs]) => (
                  <div key={category} className={`flex items-center justify-between p-3 rounded-lg ${t.chipBg}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-cyan-500/20"><ToolCase className="w-4 h-4 text-cyan-500" /></div>
                      <div>
                        <div className={`font-medium capitalize text-sm ${t.textPrimary}`}>{category}</div>
                        <div className={`text-xs ${t.textFaint}`}>{cs.operational}/{cs.total} operational</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-sm ${t.textPrimary}`}>{cs.availability}%</div>
                      <div className={`text-xs ${t.textFaint}`}>Availability</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${t.glass} rounded-2xl ${t.shadow} p-5 space-y-3`}>
              <h3 className={`font-semibold ${t.textPrimary}`}>Quick Insights</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div><div className="font-semibold text-sm text-emerald-500">Good Availability</div><div className={`text-xs ${t.textMuted}`}>{stats.availabilityRate}% of equipment is operational</div></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div><div className="font-semibold text-sm text-amber-500">Maintenance Due</div><div className={`text-xs ${t.textMuted}`}>{stats.maintenanceDue} equipment due for maintenance</div></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <TrendingUp className="w-5 h-5 text-brand-500 shrink-0" />
                <div><div className="font-semibold text-sm text-brand-500">Optimal Utilization</div><div className={`text-xs ${t.textMuted}`}>Average utilization at {stats.utilizationRate}%</div></div>
              </div>
            </div>

            <div className={`${t.glass} rounded-2xl ${t.shadow} p-5 space-y-2`}>
              <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Quick Actions</h3>
              <PrimaryButton icon={Plus} accent="cyan" size="md" fullWidth onClick={() => setAddOpen(true)}>Add New Equipment</PrimaryButton>
              <button type="button" onClick={exportToCSV}
                className={`w-full py-2.5 rounded-xl text-sm ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-2`}>
                <Download className="h-4 w-4" /> Export Report
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex flex-wrap items-center gap-2`}>
            <SearchInput value={filters.search} onChange={v => setFilters(p => ({ ...p, search: v }))} placeholder="Search equipment…" className="w-56" />
            <SelectField size="filter" value={filters.location} title="Location filter" onChange={v => setFilters(p => ({ ...p, location: v }))}
              options={[{ value: 'all', label: 'All Locations' }, ...LOCATIONS.map(l => ({ value: l, label: l }))]} />
            <SelectField size="filter" value={filters.category} title="Category filter" onChange={v => setFilters(p => ({ ...p, category: v }))}
              options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
            <SelectField size="filter" value={filters.status} title="Status filter" onChange={v => setFilters(p => ({ ...p, status: v }))}
              options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))]} />
          </div>

          {filteredEquipment.length === 0 ? (
            <div className={`${t.glass} rounded-2xl overflow-hidden`}>
              <EmptyState icon={Factory} title="No equipment found" message="Try adjusting your filters or add new equipment."
                action={{ label: 'Add First Equipment', onClick: () => setAddOpen(true) }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEquipment.map(item => (
                <EquipmentCard key={item.id} item={item}
                  onLogMaintenance={() => setLogTarget(item)}
                  onReserve={() => setReserveTarget(item)}
                  onRemove={() => removeEquipment(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`font-semibold ${t.textPrimary}`}>Maintenance Logs</h3>
            <p className={`text-xs mb-4 ${t.textFaint}`}>Recent maintenance activities</p>
            <div className="space-y-2.5">
              {maintenanceLogs.slice(0, 10).map(log => (
                <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg ${t.chipBg}`}>
                  <div className="min-w-0">
                    <div className={`font-medium text-sm truncate ${t.textPrimary}`}>{log.equipmentName}</div>
                    <div className={`text-xs truncate ${t.textMuted}`}>{log.description}</div>
                    <div className={`text-[10px] mt-0.5 ${t.textFaint}`}>{log.date} · {log.duration}h · ${log.cost}</div>
                  </div>
                  <StatusBadge color="#94a3b8" label={log.type} />
                </div>
              ))}
              {maintenanceLogs.length === 0 && (
                <div className={`text-center py-8 ${t.textFaint}`}>
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No maintenance logs yet</p>
                </div>
              )}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`font-semibold ${t.textPrimary}`}>Upcoming Maintenance</h3>
            <p className={`text-xs mb-4 ${t.textFaint}`}>Equipment due for maintenance</p>
            <div className="space-y-2.5">
              {equipment
                .filter(item => {
                  if (!item.nextMaintenance) return false;
                  return Math.ceil((new Date(item.nextMaintenance).getTime() - Date.now()) / 86400000) <= 14;
                })
                .sort((a, b) => new Date(a.nextMaintenance).getTime() - new Date(b.nextMaintenance).getTime())
                .map(item => {
                  const daysUntil = Math.ceil((new Date(item.nextMaintenance).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${t.chipBg}`}>
                      <div><div className={`font-medium text-sm ${t.textPrimary}`}>{item.name}</div><div className={`text-xs ${t.textFaint}`}>Due: {item.nextMaintenance}</div></div>
                      <StatusBadge color={daysUntil <= 7 ? '#f43f5e' : '#94a3b8'} label={`${daysUntil} days`} />
                    </div>
                  );
                })}
              {equipment.filter(item => item.nextMaintenance && Math.ceil((new Date(item.nextMaintenance).getTime() - Date.now()) / 86400000) <= 14).length === 0 && (
                <div className={`text-center py-8 ${t.textFaint}`}>
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No upcoming maintenance</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5 space-y-4`}>
            <div>
              <h3 className={`font-semibold ${t.textPrimary}`}>Export Reports</h3>
              <p className={`text-xs ${t.textFaint}`}>Generate equipment availability reports</p>
            </div>
            <button type="button" onClick={exportToCSV}
              className={`w-full py-2.5 rounded-xl text-sm ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-2`}>
              <FileText className="h-4 w-4" /> Export to CSV
            </button>
            <button type="button" onClick={exportToPDF}
              className={`w-full py-2.5 rounded-xl text-sm ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-2`}>
              <Download className="h-4 w-4" /> Export to PDF
            </button>
            <div className={`text-xs p-3 rounded-lg ${t.chipBg} ${t.textMuted}`}>
              <p className="font-semibold mb-1">Current Statistics:</p>
              <p>• Total Equipment: {stats.totalEquipment}</p>
              <p>• Availability Rate: {stats.availabilityRate}%</p>
              <p>• Utilization Rate: {stats.utilizationRate}%</p>
              <p>• Maintenance Due: {stats.maintenanceDue}</p>
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5 space-y-4`}>
            <div>
              <h3 className={`font-semibold ${t.textPrimary}`}>System Settings</h3>
              <p className={`text-xs ${t.textFaint}`}>Configure equipment tracking preferences</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold text-sm ${t.textPrimary}`}>Show Offline Equipment</p>
                <p className={`text-xs ${t.textFaint}`}>Display offline equipment in lists</p>
              </div>
              <button type="button" title="Toggle show offline equipment"
                onClick={() => saveSettings({ ...settings, showOffline: !settings.showOffline })}
                className={`h-6 w-11 rounded-full transition-colors relative ${settings.showOffline ? 'bg-cyan-500' : t.chipBg}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.showOffline ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <FormField label="Maintenance Alert Threshold (days)">
              <input type="number" value={settings.maintenanceThreshold} title="Maintenance alert threshold"
                onChange={e => saveSettings({ ...settings, maintenanceThreshold: parseInt(e.target.value) || 90 })}
                className={`w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`} />
            </FormField>
            <button type="button" onClick={() => { generateSampleData(equipment); toast.success('Sample data generated successfully'); }}
              className={`w-full py-2.5 rounded-xl text-sm ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all inline-flex items-center justify-center gap-2 border-t ${t.border} pt-4`}>
              <RefreshCw className="h-4 w-4" /> Generate Sample Data
            </button>
          </div>
        </div>
      )}

      <MaintenanceLogForm equipment={logTarget} open={!!logTarget} onClose={() => setLogTarget(null)} onAdd={addMaintenanceLog} />
      <ReservationForm equipment={reserveTarget} open={!!reserveTarget} onClose={() => setReserveTarget(null)} onAdd={addReservation} />
      <AddEquipmentForm open={addOpen} onClose={() => setAddOpen(false)} onAdd={(data) => { saveEquipment([...equipment, { ...data, id: Date.now() }]); toast.success('Equipment added successfully'); }} />
    </main>
  );
}

export default function AVPage() {
  return <AppShell><EquipmentAvailabilityContent /></AppShell>;
}
