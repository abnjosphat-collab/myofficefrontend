import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { invalidateEmployeesCache } from '@/hooks/useLookups';
import { loadEmployees, saveEmployee } from './useEmployeesData';
import type { EmployeeFormData } from './types';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/hooks/useLookups', () => ({ invalidateEmployeesCache: vi.fn() }));

describe('personnel registry loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the roster and passes a cancellable request signal', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    await expect(loadEmployees(100)).resolves.toEqual([]);
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('ends a stalled load with a retryable error', async () => {
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(() => {}));

    await expect(loadEmployees(5)).rejects.toThrow('Please retry');
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
  });

  it('rejects a malformed successful response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ rows: [] });
    await expect(loadEmployees(100)).rejects.toThrow('unexpected response');
  });
});

describe('personnel save (edit round-trip)', () => {
  const form = (o: Partial<EmployeeFormData> = {}): EmployeeFormData => ({
    employee_id: 'TBA34', first_name: 'Tafadzwa', last_name: 'Matangira', id_number: '08-1234567-A-08',
    designation: 'Clerk', section: 'Management', phone: '', drivers_license_class: '', date_of_engagement: '',
    ...o,
  } as EmployeeFormData);
  beforeEach(() => vi.resetAllMocks());

  it('PUTs the edit to the row id with the picked section intact when the designation implies none', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ id: 38839 });
    await saveEmployee(form(), 38839);
    const [url, payload] = vi.mocked(api.put).mock.calls[0] as [string, EmployeeFormData];
    expect(url).toContain('/api/employees/38839');
    expect(payload.section).toBe('Management');
    expect(payload.designation).toBe('Clerk');
  });
  it('sends the implied section when the designation maps to one, and clears a blank engagement date', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ id: 7 });
    await saveEmployee(form({ designation: 'Maintenance Engineer', section: 'Planning' }), 7);
    const payload = vi.mocked(api.put).mock.calls[0][1] as unknown as { section: string; date_of_engagement: null };
    expect(payload.section).toBe('Management');
    expect(payload.date_of_engagement).toBeNull();
  });
  it('invalidates the shared employee directory after a save so other pages refetch', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ id: 38839 });
    await saveEmployee(form(), 38839);
    expect(vi.mocked(invalidateEmployeesCache)).toHaveBeenCalledTimes(1);
  });
  it('POSTs a new hire without an id', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 99 });
    await saveEmployee(form({ employee_id: 'C999' }));
    expect(vi.mocked(api.post).mock.calls[0][0]).toContain('/api/employees');
    expect(vi.mocked(api.put)).not.toHaveBeenCalled();
  });
});
