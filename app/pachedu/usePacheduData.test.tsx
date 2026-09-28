import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { usePacheduData } from './usePacheduData';
import type { PacheduReport, PacheduStats } from './types';

vi.mock('@/lib/apiClient',()=>({api:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),delete:vi.fn()}}));
const report=(id:string):PacheduReport=>({id,location:'Workshop',date:'2026-09-28',activityObserved:'Maintenance',whatDidYouSee:'Safe isolation',reasons:'Good practice',behaviourType:'Intentional',impacts:[],whatDidYouDo:'Recognised the team',observerName:'Audit User',dept:'Engineering',sdwt:'',sectionChoice:'Mechanical',checklist:[],status:'submitted',created_at:'2026-09-28T08:00:00Z'});
const stats:PacheduStats={total:1,bySection:{Mechanical:1,Electrical:0},byDept:{Engineering:1},byBehaviour:{Intentional:1,Unintentional:0},totalImpacts:0,totalChecklist:0,draftCount:0,submittedCount:1,reviewedCount:0,closedCount:0};

describe('Pachedu loading',()=>{
  beforeEach(()=>vi.resetAllMocks());
  it('preserves reports when a quiet refresh fails',async()=>{
    vi.mocked(api.get).mockResolvedValueOnce([report('one')]).mockResolvedValueOnce(stats).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce(stats);
    const {result}=renderHook(()=>usePacheduData());
    await act(async()=>result.current.refresh());
    await act(async()=>result.current.refresh(true));
    expect(result.current.reports[0]?.id).toBe('one');
    expect(result.current.error).toBe('Service unavailable');
  });
  it('keeps reports usable when statistics fail',async()=>{
    vi.mocked(api.get).mockResolvedValueOnce([report('one')]).mockRejectedValueOnce(new Error('Stats unavailable'));
    const {result}=renderHook(()=>usePacheduData());
    await act(async()=>result.current.refresh());
    expect(result.current.reports).toHaveLength(1);
    expect(result.current.statsError).toBe('Stats unavailable');
    expect(result.current.error).toBe('');
  });
  it('ignores an older response after a newer load completes',async()=>{
    let resolveOlder:(value:PacheduReport[])=>void=()=>{};
    vi.mocked(api.get).mockImplementationOnce(()=>new Promise(resolve=>{resolveOlder=resolve;})).mockResolvedValueOnce(stats).mockResolvedValueOnce([report('current')]).mockResolvedValueOnce(stats);
    const {result}=renderHook(()=>usePacheduData());
    const older=result.current.refresh();
    await act(async()=>result.current.refresh());
    await act(async()=>resolveOlder([report('older')]));
    await older;
    expect(result.current.reports[0]?.id).toBe('current');
  });
});
