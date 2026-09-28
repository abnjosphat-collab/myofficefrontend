import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useShiftsData } from './useShiftsData';
import type { ShiftAssignment } from './types';

vi.mock('@/lib/apiClient',()=>({api:{get:vi.fn(),post:vi.fn(),put:vi.fn(),delete:vi.fn()}}));

const assignment=(id:number):ShiftAssignment=>({id,employee_id:`E-${id}`,employee_name:'Audit Employee',shift_type:'5-2',cycle_start_date:'2026-09-28',on_days:5,off_days:2,is_active:true,day_overrides:[]});

describe('shift workspace loading',()=>{
  beforeEach(()=>vi.resetAllMocks());

  it('surfaces an assignment failure without false empty data',async()=>{
    vi.mocked(api.get).mockImplementation(async path=>{
      if(path==='/api/standby')throw new Error('Supabase is waking up');
      return [];
    });
    const {result}=renderHook(()=>useShiftsData());
    await waitFor(()=>expect(result.current.loadError).toBe('Supabase is waking up'));
    expect(result.current.assignments).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('preserves assignments when a quiet refresh fails',async()=>{
    vi.mocked(api.get)
      .mockResolvedValueOnce([assignment(1)]).mockResolvedValueOnce([]).mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const {result}=renderHook(()=>useShiftsData());
    await waitFor(()=>expect(result.current.assignments[0]?.id).toBe(1));
    await act(async()=>result.current.refresh(true));
    expect(result.current.assignments[0]?.id).toBe(1);
    expect(result.current.loadError).toBe('Service unavailable');
  });

  it('keeps the roster when only employee or leave context fails',async()=>{
    vi.mocked(api.get)
      .mockResolvedValueOnce([assignment(2)]).mockRejectedValueOnce(new Error('Employees unavailable')).mockRejectedValueOnce(new Error('Leaves unavailable'));
    const {result}=renderHook(()=>useShiftsData());
    await waitFor(()=>expect(result.current.assignments[0]?.id).toBe(2));
    expect(result.current.employeeError).toBe('Employees unavailable');
    expect(result.current.leaveError).toBe('Leaves unavailable');
    expect(result.current.loadError).toBe('');
  });
});
