import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { EmaintImportFlow } from './EmaintImportFlow';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { post: postMock } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const INFER = {
  inferred: { asset_id: 'Asset ID', name: 'Asset Description', status: 'Status' },
  confidence: { asset_id: 1, name: 1, status: 0.8 },
  all_columns: ['Asset ID', 'Asset Description', 'Status'],
  raw_rows: [
    { _row: 2, 'Asset ID': 'CRS-9', 'Asset Description': 'New Conveyor', Status: 'Active' },
    { _row: 3, 'Asset ID': 'CRS-1', 'Asset Description': 'Crusher 1', Status: 'Active' },
  ],
  total_rows: 2,
};

const PREVIEW = {
  rows: [
    { row: 2, ref: 'CRS-9', status: 'new', values: { asset_id: 'CRS-9', name: 'New Conveyor', held: { manufacturer: 'BeltCo' } }, errors: [], match: null, note: '' },
    { row: 3, ref: 'CRS-1', status: 'exists', values: { asset_id: 'CRS-1', name: 'Crusher 1', held: {} }, errors: [], match: { id: 7, name: 'Crusher 1', equipment_id: 'CRS-1' }, note: 'Equipment ID CRS-1 is already on the register (Crusher 1)' },
  ],
  summary: { new: 1, exists: 1, close: 0, invalid: 0 },
};

const RESULT = {
  created: 1, skipped: 1, errors: 0, total: 2,
  rows: [
    { row: 2, ref: 'CRS-9', status: 'created', id: 44, reasons: [] },
    { row: 3, ref: 'CRS-1', status: 'exists', id: null, reasons: ['Equipment ID CRS-1 is already on the register (Crusher 1)'] },
  ],
};

function setup(kind: 'assets' | 'schedules' = 'assets') {
  render(<ConfirmProvider><EmaintImportFlow kind={kind} /></ConfirmProvider>);
}

function upload() {
  fireEvent.change(screen.getByLabelText('eMaint assets file', { exact: true }), { target: { files: [new File(['x'], 'assets.csv')] } });
}

async function uploadAndMatch() {
  setup();
  postMock.mockImplementation((path: string) => {
    if (path.endsWith('/infer')) return Promise.resolve(INFER);
    if (path.endsWith('/preview')) return Promise.resolve(PREVIEW);
    return Promise.reject(new Error(`unexpected POST ${path}`));
  });
  upload();
  await screen.findByText('Column mapping');
  fireEvent.click(screen.getByRole('button', { name: 'Check matches' }));
  await screen.findByText('New Conveyor');
}

describe('EmaintImportFlow', () => {
  beforeEach(() => { postMock.mockReset(); });

  it('the upload step offers the template and the expected columns', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Download template' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Expected columns' })).toBeInTheDocument();
    expect(screen.getByText('Asset Description')).toBeInTheDocument();
    expect(screen.getByText(/Blank means Active/)).toBeInTheDocument();
  });

  it('a refused file shows the reason and a wrong extension never uploads', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('eMaint assets file', { exact: true }), { target: { files: [new File(['x'], 'notes.pdf')] } });
    expect(await screen.findByText('.pdf files are not accepted here.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();

    postMock.mockRejectedValue(new Error('Unsupported file (fixture)'));
    fireEvent.change(screen.getByLabelText('eMaint assets file', { exact: true }), { target: { files: [new File(['x'], 'assets.csv')] } });
    expect(await screen.findByText('The file could not be read')).toBeInTheDocument();
    expect(screen.getByText('Unsupported file (fixture)')).toBeInTheDocument();
  });

  it('detected columns are pre-selected with their confidence', async () => {
    postMock.mockResolvedValue(INFER);
    setup();
    upload();
    await screen.findByText('Column mapping');
    expect(screen.getByText('2 rows, 3 columns')).toBeInTheDocument();
    expect(screen.getAllByText('Exact heading').length).toBeGreaterThan(0);
    expect(screen.getByText('Known alias')).toBeInTheDocument();
  });

  it('checking matches previews every row with its outcome', async () => {
    await uploadAndMatch();
    expect(screen.getByText('1 asset to import')).toBeInTheDocument();
    expect(screen.getByText('1 already there')).toBeInTheDocument();
    expect(screen.getByText('Will import')).toBeInTheDocument();
    expect(screen.getByText('Already there — skipped')).toBeInTheDocument();
    expect(screen.getByText(/Held for now: Manufacturer BeltCo/)).toBeInTheDocument();
    const preview = screen.getByRole('table', { name: 'Assets import preview' });
    expect(within(preview).getAllByText('Crusher 1').length).toBeGreaterThan(0);
  });

  it('a failed match check offers a retry that keeps the mapping', async () => {
    postMock.mockImplementation((path: string) => {
      if (path.endsWith('/infer')) return Promise.resolve(INFER);
      return Promise.reject(new Error('Match service down (fixture)'));
    });
    setup();
    upload();
    await screen.findByText('Column mapping');
    fireEvent.click(screen.getByRole('button', { name: 'Check matches' }));
    expect(await screen.findByText('The matches could not be checked')).toBeInTheDocument();

    postMock.mockImplementation((path: string) => Promise.resolve(path.endsWith('/preview') ? PREVIEW : INFER));
    fireEvent.click(screen.getByRole('button', { name: /^Try again/ }));
    expect(await screen.findByText('1 asset to import')).toBeInTheDocument();
  });

  it('importing confirms first, then reports what landed and what did not', async () => {
    const user = userEvent.setup();
    postMock.mockImplementation((path: string) => {
      if (path.endsWith('/infer')) return Promise.resolve(INFER);
      if (path.endsWith('/preview')) return Promise.resolve(PREVIEW);
      if (path.endsWith('/commit')) return Promise.resolve(RESULT);
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });
    setup();
    upload();
    await screen.findByText('Column mapping');
    fireEvent.click(screen.getByRole('button', { name: 'Check matches' }));
    await screen.findByText('New Conveyor');

    await user.click(screen.getByRole('button', { name: 'Import 1 asset' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(postMock.mock.calls.some(([p]) => String(p).endsWith('/commit'))).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Import 1 asset' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('What was not imported')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View the register' })).toHaveAttribute('href', '/equipment');
    const report = screen.getByRole('table', { name: 'Rows not imported' });
    expect(within(report).getByText('Crusher 1')).toBeInTheDocument();
    expect(within(report).getByText('Already there')).toBeInTheDocument();
    const posts = postMock.mock.calls.filter(([p]) => String(p).endsWith('/commit'));
    expect(posts).toHaveLength(1);
    expect(posts[0][1]).toMatchObject({ rows: INFER.raw_rows });
  });

  it('the schedules tab previews rhythm and machine', async () => {
    postMock.mockImplementation((path: string) => {
      if (path.endsWith('/infer')) {
        return Promise.resolve({
          inferred: { title: 'PM Description', frequency: 'Frequency', asset_id: 'Asset ID' },
          confidence: { title: 1, frequency: 1, asset_id: 1 },
          all_columns: ['PM ID', 'Asset ID', 'PM Description', 'Frequency', 'Next Due'],
          raw_rows: [{ _row: 2, 'PM ID': 'PM-101', 'Asset ID': 'CRS-1', 'PM Description': 'Weekly liner check', Frequency: 'Weekly', 'Next Due': '2026-11-06' }],
          total_rows: 1,
        });
      }
      if (path.endsWith('/preview')) {
        return Promise.resolve({
          rows: [{ row: 2, ref: 'PM-101', status: 'new', values: { title: 'Weekly liner check', asset_id: 'CRS-1', asset_name: 'Crusher 1', frequency: 'weekly', next_due: '2026-11-06' }, errors: [], match: { id: 7, name: 'Crusher 1', equipment_id: 'CRS-1' }, note: '' }],
          summary: { new: 1, exists: 0, close: 0, invalid: 0 },
        });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });
    setup('schedules');
    fireEvent.change(screen.getByLabelText('eMaint schedules file', { exact: true }), { target: { files: [new File(['x'], 'pm.csv')] } });
    await screen.findByText('Column mapping');
    fireEvent.click(screen.getByRole('button', { name: 'Check matches' }));
    expect(await screen.findByText('1 PM schedule to import')).toBeInTheDocument();
    expect(screen.getByText('weekly · due 2026-11-06')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 1 PM schedule' })).toBeInTheDocument();
  });
});
