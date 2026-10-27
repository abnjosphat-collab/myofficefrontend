// lib/autoRefreshSilence.test.tsx — a background refresh is silent: no
// "refreshing" state or banner, no scroll/focus/selection/filter/page reset, no
// dialog closed, no overwriting rows in an open form. One harness shaped like a
// register page (useApiList + DataRegion + selection + filter + dialog), driven
// through a real 60 s tick with the server answering changed rows.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DataRegion, deriveDataStatus } from '@/components/ui-system';
import { useApiList } from './useApiList';

vi.mock('@/lib/apiClient', () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn() } };
});
import { api } from '@/lib/apiClient';

interface Row { id: number; name: string }

function Harness() {
  const list = useApiList<Row>('/api/x');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(2);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const status = deriveDataStatus({
    loaded: list.loaded, loading: list.loading, error: list.error,
    errorStatus: list.errorStatus, count: list.items.length,
  });
  const open = (row: Row) => { setOpenId(row.id); setDraft(row.name); }; // the form keeps its loaded copy
  return (
    <div>
      <input aria-label="Filter" value={filter} onChange={e => setFilter(e.target.value)} />
      <p>Page {page}</p>
      <button onClick={() => setPage(3)}>Go to page 3</button>
      <DataRegion status={status} subject="rows" error={list.error}>
        <ul>
          {list.items.map(r => (
            <li key={r.id}>
              <label><input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => setSelected(s => new Set(s).add(r.id))} />{r.name}</label>
              <button onClick={() => open(r)}>Edit {r.name}</button>
            </li>
          ))}
        </ul>
      </DataRegion>
      {openId !== null && (
        <div role="dialog" aria-label="Edit row">
          <input aria-label="Row name" value={draft} onChange={e => setDraft(e.target.value)} />
        </div>
      )}
    </div>
  );
}

describe('a background refresh is silent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.get).mockReset();
  });
  afterEach(() => vi.useRealTimers());

  async function settledHarness() {
    vi.mocked(api.get).mockResolvedValueOnce([{ id: 1, name: 'Ann' }, { id: 2, name: 'Ben' }]);
    render(<Harness />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    screen.getByText('Ann');
    // View state a refresh must not disturb: a selection, a filter, a page, an open dialog with typed text.
    fireEvent.click(screen.getByLabelText('Select Ann'));
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'an' } });
    fireEvent.click(screen.getByText('Go to page 3'));
    fireEvent.click(screen.getByText('Edit Ann'));
    fireEvent.change(screen.getByLabelText('Row name'), { target: { value: 'Annabelle' } });
    screen.getByLabelText('Filter').focus();
  }

  it('shows no refreshing state or banner when the tick lands', async () => {
    await settledHarness();
    vi.mocked(api.get).mockResolvedValue([{ id: 1, name: 'Ann (renamed)' }, { id: 2, name: 'Ben' }, { id: 3, name: 'Cat' }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.queryByText(/Refreshing/)).not.toBeInTheDocument();
    expect(screen.queryByText(/may be out of date/)).not.toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument(); // the new row did arrive
  });

  it('keeps scroll, focus, selection, filter and page', async () => {
    await settledHarness();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    vi.mocked(api.get).mockResolvedValue([{ id: 1, name: 'Ann' }, { id: 2, name: 'Ben' }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Filter'));
    expect(screen.getByLabelText('Select Ann')).toBeChecked();
    expect(screen.getByLabelText('Filter')).toHaveValue('an');
    expect(screen.getByText('Page 3')).toBeInTheDocument();
  });

  it('keeps the dialog open and never overwrites the open form', async () => {
    await settledHarness();
    vi.mocked(api.get).mockResolvedValue([{ id: 1, name: 'Ann (renamed server-side)' }, { id: 2, name: 'Ben' }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole('dialog', { name: 'Edit row' })).toBeInTheDocument();
    expect(screen.getByLabelText('Row name')).toHaveValue('Annabelle');
  });
});
