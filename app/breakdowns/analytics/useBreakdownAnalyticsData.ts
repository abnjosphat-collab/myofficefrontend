// app/breakdowns/analytics/useBreakdownAnalyticsData.ts — the breakdown-analytics
// page's data-fetching layer: filter state (date range/department/machine) plus a
// hook that owns the heatmap-endpoint fetch cycle. Filters trigger an explicit
// re-fetch (Apply/Clear), not a live-reload-on-every-keystroke — timesheets-shaped
// (parameterized load), not a load-once hook.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { HeatmapData } from './types';

export function useBreakdownAnalyticsData() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('');
  const [machineId, setMachineId] = useState('');

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (department) params.append('department', department);
      if (machineId) params.append('machine_id', machineId);

      const result = await api.get<HeatmapData>(`/api/breakdowns/analytics/heatmap?${params}`);
      if (result.success) {
        setData(result);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      toast.error('Failed to load breakdown analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => fetchData();

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDepartment('');
    setMachineId('');
    fetchData();
  };

  const activeFilterCount = [dateFrom, dateTo, department, machineId].filter(Boolean).length;

  return {
    data, loading, refreshing, fetchData,
    dateFrom, setDateFrom, dateTo, setDateTo, department, setDepartment, machineId, setMachineId,
    handleApplyFilters, handleClearFilters, activeFilterCount,
  };
}
