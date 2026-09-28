import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { apiCreateSavedReq, apiFetchAll, apiGetSavedReqs } from './api';
import type { SavedRequisition } from './types';

vi.mock('@/lib/apiClient',()=>({api:{get:vi.fn(),post:vi.fn(),put:vi.fn(),delete:vi.fn()}}));

const requisition:SavedRequisition={id:'local',name:'Pump service',saved_at:'2026-09-28T08:00:00Z',header:{requester:'Audit User',reason:'Service',urgency:'routine',priority:'medium',required_for:'Pump 1'},lines:[],grand_total:0};

describe('spares API contracts',()=>{
  beforeEach(()=>vi.resetAllMocks());
  it('rejects malformed register responses instead of returning a false empty list',async()=>{
    vi.mocked(api.get).mockResolvedValue({items:null});
    await expect(apiFetchAll()).rejects.toThrow('unexpected response');
  });
  it('propagates saved-requisition load failures',async()=>{
    vi.mocked(api.get).mockRejectedValue(new Error('Service unavailable'));
    await expect(apiGetSavedReqs()).rejects.toThrow('Service unavailable');
  });
  it('propagates saved-requisition persistence failures',async()=>{
    vi.mocked(api.post).mockRejectedValue(new Error('Save failed'));
    await expect(apiCreateSavedReq(requisition)).rejects.toThrow('Save failed');
  });
});
