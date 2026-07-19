// lib/useEquipment.ts — shared hook: fetches equipment list from the API
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';

export interface EquipmentItem {
  id: number | string;
  equipment_id: string;
  name: string;
  status?: string;       // operational | maintenance | out_of_service | reserved | retired
  category?: string;
  location?: string;
  department?: string;
  model?: string;
  serial_number?: string;
  description?: string;
}

// Map equipment page status → engineering status board status
export type BoardStatus = 'running' | 'degraded' | 'down' | 'planned' | 'standby';

export function toBoardStatus(apiStatus?: string): BoardStatus {
  switch (apiStatus?.toLowerCase()) {
    case 'operational':    return 'running';
    case 'maintenance':    return 'planned';
    case 'out_of_service': return 'down';
    case 'reserved':       return 'standby';
    case 'retired':        return 'standby';
    default:               return 'standby';
  }
}

export function useEquipment() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // authFetch so the read carries the Supabase token (lets /api/equipment be guarded).
      const res = await authFetch(`${API_BASE}/api/equipment`);
      if (!res.ok) throw new Error('Failed to load equipment');
      const data: EquipmentItem[] = await res.json();
      setEquipment(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { equipment, loading, error, refetch: fetch_ };
}
