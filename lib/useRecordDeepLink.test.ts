import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useRecordDeepLink } from './useRecordDeepLink';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/leaves',
  useRouter: () => ({ replace }),
}));

interface Row { id: number; name: string }

const ROWS: Row[] = [{ id: 7, name: 'Ann' }];

function setup(over: Partial<Parameters<typeof useRecordDeepLink<Row>>[0]> = {}) {
  const onOpen = vi.fn();
  const onMissing = vi.fn();
  const merge = vi.fn();
  const fetchById = vi.fn(async (_id: string): Promise<Row | null> => ({ id: 9, name: 'Fetched' }));
  const props = {
    records: ROWS, ready: true, getId: (r: Row) => r.id,
    fetchById, merge, onOpen, onMissing, flags: ['sign'],
    ...over,
  };
  const hook = renderHook((p = props) => useRecordDeepLink(p), { initialProps: props });
  return { ...hook, onOpen, onMissing, merge, fetchById };
}

beforeEach(() => { replace.mockClear(); search = ''; });

describe('useRecordDeepLink', () => {
  it('opens the record from the list and consumes the link', async () => {
    search = 'open=7&sign=approve';
    const { onOpen, fetchById } = setup();
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(ROWS[0], { sign: 'approve' }));
    expect(fetchById).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/leaves', { scroll: false });
  });

  it('waits for the list before resolving', async () => {
    search = 'open=7';
    const { onOpen, rerender } = setup({ ready: false });
    expect(onOpen).not.toHaveBeenCalled();
    rerender({ records: ROWS, ready: true, getId: (r: Row) => r.id, fetchById: vi.fn(), merge: vi.fn(), onOpen, onMissing: vi.fn(), flags: [] });
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(ROWS[0], {}));
  });

  it('fetches, merges and opens when the id is not in the list', async () => {
    search = 'open=9';
    const { onOpen, merge, fetchById } = setup();
    await waitFor(() => expect(fetchById).toHaveBeenCalledWith('9'));
    expect(merge).toHaveBeenCalledWith({ id: 9, name: 'Fetched' });
    expect(onOpen).toHaveBeenCalledWith({ id: 9, name: 'Fetched' }, { sign: null });
    expect(replace).toHaveBeenCalled();
  });

  it('reports gone when the fetch returns null', async () => {
    search = 'open=404';
    const { onOpen, onMissing } = setup({ fetchById: vi.fn(async () => null) });
    await waitFor(() => expect(onMissing).toHaveBeenCalledWith('404', 'gone'));
    expect(onOpen).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalled();
  });

  it('reports error when the fetch throws', async () => {
    search = 'open=9';
    const { onOpen, onMissing } = setup({ fetchById: vi.fn(async () => { throw new Error('down'); }) });
    await waitFor(() => expect(onMissing).toHaveBeenCalledWith('9', 'error'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('without a single-get, a miss is gone — or error when the list itself failed', async () => {
    search = 'open=77';
    const first = setup({ fetchById: undefined });
    await waitFor(() => expect(first.onMissing).toHaveBeenCalledWith('77', 'gone'));
    search = 'open=78';
    const second = setup({ fetchById: undefined, listFailed: true });
    await waitFor(() => expect(second.onMissing).toHaveBeenCalledWith('78', 'error'));
  });

  it('does nothing without a link', () => {
    search = 'q=ann';
    const { onOpen, onMissing, fetchById } = setup();
    expect(onOpen).not.toHaveBeenCalled();
    expect(onMissing).not.toHaveBeenCalled();
    expect(fetchById).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('never refires after consuming', async () => {
    search = 'open=7';
    const { onOpen, rerender } = setup();
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
