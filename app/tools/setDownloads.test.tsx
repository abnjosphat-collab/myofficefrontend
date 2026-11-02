import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const exported: { format: string; title: string }[] = [];
vi.mock('./toolsExports', () => ({
  exportTable: (format: string, data: { title: string }) => {
    exported.push({ format, title: data.title });
    return Promise.resolve();
  },
}));

import { SetTypesView } from './SetTypesView';
import { SetPiecesSection } from './SetPiecesSection';
import type { Tool } from './prototype';

const TYPES = [{
  id: 'type-1', title: 'Gedore socket set', make_model: 'Gedore', category: 'Hand tools',
  competency_required: false, notes: null, active: true,
  line_count: 2, physical_total: 1, in_store: 0, out: 1, attention: 0,
}];

const SET_TOOL = {
  id: 'SET-07', backendId: 's1', name: 'Gedore socket set', make: '', serial: '',
  category: 'Hand tools', kind: 'other-equipment', status: 'issued', location: 'Shaft store',
  condition: 'Good', setTypeId: 'type-1', setTypeTitle: 'Gedore socket set',
  holder: 'A. Moyo · C1001',
  pieces: [
    { id: 'p1', lineNo: 1, pieceNumber: 'SET-07/001', name: 'Spanner 13mm', size: '13', condition: 'Good', status: 'present' as const },
    { id: 'p2', lineNo: 2, pieceNumber: 'SET-07/002', name: 'Spanner 13mm', size: '13', condition: 'Good', status: 'present' as const },
  ],
} as unknown as Tool;

describe('set download wiring', () => {
  it('offers a definition download per set type when lines can be loaded', async () => {
    const user = userEvent.setup();
    const getLines = vi.fn(async () => [
      { id: 'l1', set_type_id: 'type-1', line_no: 1, name: 'Spanner 13mm', size: '13', qty: 1, notes: null },
    ]);
    render(<SetTypesView types={TYPES} error={null} onRetry={() => {}} canManage onMake={() => {}} onIssue={() => {}} getLines={getLines} />);
    await user.click(screen.getByRole('button', { name: 'Definition' }));
    expect(getLines).toHaveBeenCalledWith('type-1');
    await vi.waitFor(() => expect(exported.some(e => e.title.includes('Gedore socket set'))).toBe(true));
  });
  it('shows no definition download without a lines loader', () => {
    render(<SetTypesView types={TYPES} error={null} onRetry={() => {}} canManage onMake={() => {}} onIssue={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Definition' })).not.toBeInTheDocument();
  });
  it('builds a printable checklist from the set pieces', async () => {
    const user = userEvent.setup();
    render(<SetPiecesSection tool={SET_TOOL} manage={false} onEditPiece={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Checklist' }));
    await vi.waitFor(() => expect(exported.some(e => e.title.includes('Inspection checklist SET-07'))).toBe(true));
  });
});
