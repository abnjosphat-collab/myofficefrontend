// app/av/useEquipmentAvailabilityData.ts — the equipment availability page's persistence
// layer. This page has no backend of its own: every record list lives in localStorage,
// seeded from INITIAL_EQUIPMENT/generateSampleData on first load. Split out of page.tsx
// as part of the standing "decompose on touch" convention. One unified load cycle (all 4
// stores behind one `isLoading` flag) — same shape as an API-backed ppe/employees hook,
// just backed by localStorage instead of `api`.
// EQUIPMENT_TYPES/EQUIPMENT_CATEGORIES/STATUS_TYPES are exported (not just used
// internally) because page.tsx also needs them — for STATUS_CONFIG's icon-bearing
// lookup and scattered status/type JSX comparisons — the same cross-file-helper
// promotion used for `calcDays` on the leaves page.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import type {
  EquipmentItem, MaintenanceLog, Reservation, DowntimeRecord, AppSettings,
  MaintenanceLogFormData, ReservationFormData,
} from './types';

export const EQUIPMENT_TYPES = {
  EXCAVATOR: 'excavator', LOADER: 'loader', CRANE: 'crane', COMPRESSOR: 'compressor',
  GENERATOR: 'generator', WELDER: 'welder', PUMP: 'pump', MIXER: 'mixer',
};

export const EQUIPMENT_CATEGORIES = {
  EARTHMOVING: 'earthmoving', LIFTING: 'lifting', POWER: 'power',
  TOOLS: 'tools', PUMPS: 'pumps', CONCRETE: 'concrete',
};

export const STATUS_TYPES = {
  OPERATIONAL: 'operational', MAINTENANCE: 'maintenance', BREAKDOWN: 'breakdown',
  RESERVED: 'reserved', OFFLINE: 'offline',
};

// Plain labels only (no icons) — page.tsx's icon-bearing STATUS_CONFIG builds on
// top of these instead of duplicating the strings, since updateEquipmentStatus's
// toast needs a label without pulling in page.tsx's JSX-bearing config.
export const STATUS_LABELS: Record<string, string> = {
  [STATUS_TYPES.OPERATIONAL]: 'Operational',
  [STATUS_TYPES.MAINTENANCE]: 'Maintenance',
  [STATUS_TYPES.BREAKDOWN]: 'Breakdown',
  [STATUS_TYPES.RESERVED]: 'Reserved',
  [STATUS_TYPES.OFFLINE]: 'Offline',
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

export function useEquipmentAvailabilityData() {
  const [isClient, setIsClient] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ showOffline: true, autoCalculate: true, maintenanceThreshold: 90 });
  const [isLoading, setIsLoading] = useState(true);

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

  const updateEquipmentStatus = useCallback((equipmentId: number, status: string) => {
    saveEquipment(equipment.map(i => i.id === equipmentId ? { ...i, status } : i));
    toast.success(`Equipment status updated to ${STATUS_LABELS[status]}`);
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

  return {
    isClient, isLoading,
    equipment, maintenanceLogs, reservations, downtimeRecords, settings,
    saveEquipment, saveSettings, generateSampleData,
    updateEquipmentStatus, addMaintenanceLog, addReservation, removeEquipment,
  };
}
