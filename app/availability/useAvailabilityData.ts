// app/availability/useAvailabilityData.ts — the equipment availability page's
// data-fetching layer: a 2-resource (equipment list + stats) Promise.all load,
// falling back to mock data if either call fails (a real backend outage still
// shows a populated demo dashboard rather than an empty one). Split out of
// page.tsx as part of the standing "decompose on touch" convention.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { AvailabilityStats, Equipment } from './types';

export const MOCK_EQUIPMENT: Equipment[] = [
  { id: '1', name: 'CNC Machine 1', category: 'Machinery', department: 'Production', operational_hours: 450.5, breakdown_hours: 12.3, availability: 97.27, status: 'operational', last_maintenance: '2024-01-15', next_maintenance: '2024-02-15', uptime: 438.2, downtime: 12.3, mtbf: 120.5, mttr: 2.5 },
  { id: '2', name: 'Forklift A', category: 'Vehicles', department: 'Logistics', operational_hours: 320.0, breakdown_hours: 8.5, availability: 97.34, status: 'operational', last_maintenance: '2024-01-10', next_maintenance: '2024-02-10', uptime: 311.5, downtime: 8.5, mtbf: 85.3, mttr: 3.2 },
  { id: '3', name: '3D Printer', category: 'Electronics', department: 'R&D', operational_hours: 280.0, breakdown_hours: 24.0, availability: 91.43, status: 'maintenance', last_maintenance: '2024-01-20', next_maintenance: '2024-03-20', uptime: 256.0, downtime: 24.0, mtbf: 65.7, mttr: 6.5 },
  { id: '4', name: 'Laser Cutter', category: 'Machinery', department: 'Production', operational_hours: 500.0, breakdown_hours: 2.5, availability: 99.5, status: 'operational', last_maintenance: '2024-01-05', next_maintenance: '2024-03-05', uptime: 497.5, downtime: 2.5, mtbf: 180.2, mttr: 1.8 },
  { id: '5', name: 'Test Equipment', category: 'Tools', department: 'Quality', operational_hours: 150.0, breakdown_hours: 15.0, availability: 90.0, status: 'breakdown', last_maintenance: '2023-12-15', next_maintenance: '2024-02-15', uptime: 135.0, downtime: 15.0, mtbf: 50.3, mttr: 4.2 },
  { id: '6', name: 'Conveyor Belt', category: 'Machinery', department: 'Production', operational_hours: 600.0, breakdown_hours: 30.0, availability: 95.0, status: 'operational', last_maintenance: '2024-01-25', next_maintenance: '2024-02-25', uptime: 570.0, downtime: 30.0, mtbf: 95.7, mttr: 3.5 },
  { id: '7', name: 'Server Rack', category: 'Electronics', department: 'IT', operational_hours: 720.0, breakdown_hours: 8.0, availability: 98.89, status: 'idle', last_maintenance: '2024-01-18', next_maintenance: '2024-04-18', uptime: 712.0, downtime: 8.0, mtbf: 200.5, mttr: 2.0 },
  { id: '8', name: 'Air Compressor', category: 'Machinery', department: 'Maintenance', operational_hours: 400.0, breakdown_hours: 20.0, availability: 95.0, status: 'maintenance', last_maintenance: '2024-01-30', next_maintenance: '2024-03-30', uptime: 380.0, downtime: 20.0, mtbf: 75.3, mttr: 5.2 },
];

export const MOCK_STATS: AvailabilityStats = {
  totalEquipment: 8, operational: 5, inMaintenance: 2, inBreakdown: 1,
  overallAvailability: 95.43, avgUptime: 410.03, avgDowntime: 15.03,
  totalOperationalHours: 3420.5, totalBreakdownHours: 120.3,
  monthAvailability: 90.66, weekAvailability: 93.52,
};

export function useAvailabilityData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<AvailabilityStats>(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [eq, statsRes] = await Promise.all([
        api.get<Equipment[]>('/api/availabilities').catch(() => null),
        api.get<AvailabilityStats>('/api/availabilities/stats').catch(() => null),
      ]);
      setEquipment(eq ?? MOCK_EQUIPMENT);
      setStats(statsRes ?? MOCK_STATS);
    } catch {
      setEquipment(MOCK_EQUIPMENT);
      setStats(MOCK_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return { equipment, stats, loading, refreshing, fetchData };
}
