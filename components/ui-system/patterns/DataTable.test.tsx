// DataTable motion wiring: the same table structure, rows inside the motion
// tbody, stillKey accepted. Fades run in full motion (browser-verified);
// reduced mode renders plain rows.
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { lookupZoomSource } from '../motion';
import { DataTable, type Column } from './DataTable';

type Row = { id: string; name: string };
const columns: Array<Column<Row>> = [{ id: 'name', header: 'Name', cell: r => r.name }];

describe('DataTable motion wiring', () => {
  it('renders rows in a tbody and keeps activation working', () => {
    const onRowActivate = vi.fn();
    const { container } = render(
      <DataTable caption="Things" rows={[{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]} columns={columns} getRowId={r => r.id} onRowActivate={onRowActivate} stillKey="all" />,
    );
    expect(container.querySelectorAll('tbody > tr').length).toBe(2);
    fireEvent.click(container.querySelector('tbody > tr') as HTMLElement);
    expect(onRowActivate).toHaveBeenCalledTimes(1);
  });

  it('re-renders calmly across a stillKey change', () => {
    const view = render(
      <DataTable caption="Things" rows={[{ id: 'a', name: 'A' }]} columns={columns} getRowId={r => r.id} stillKey="f1" />,
    );
    view.rerender(
      <DataTable caption="Things" rows={[{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]} columns={columns} getRowId={r => r.id} stillKey="f2" />,
    );
    expect(view.container.querySelectorAll('tbody > tr').length).toBe(2);
  });

  it('registers a row zoom source and marks it on activation', () => {
    const onRowActivate = vi.fn();
    const { container, unmount } = render(
      <DataTable caption="Things" rows={[{ id: 'a', name: 'A' }]} columns={columns} getRowId={r => r.id} onRowActivate={onRowActivate} rowZoomId={r => `thing:${r.id}`} stillKey="all" />,
    );
    const row = container.querySelector('tbody > tr') as HTMLElement;
    fireEvent.click(row);
    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(lookupZoomSource('thing:a')).toBe(row);
    unmount();
    expect(lookupZoomSource('thing:a')).toBeNull();
  });
});