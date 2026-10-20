import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { NecScanImportPanel } from './NecScanImportPanel';
import type { NecImportJob, NecImportPreview } from './types';
import type { Period } from '../types';

vi.mock('./api', () => ({
  fetchImportConfig: vi.fn(),
  createImportJob: vi.fn(),
  uploadPdf: vi.fn(),
  getImportJob: vi.fn(),
  uploadReviewJson: vi.fn(),
  fetchPreview: vi.fn(),
  applyImport: vi.fn(),
}));

import * as necApi from './api';

const mocked = vi.mocked;
const period: Period = { start: new Date('2026-09-21'), end: new Date('2026-10-20') } as Period;

const job: NecImportJob = {
  id: 'job-1', status: 'created', payroll_year: 2026, payroll_month: 10,
  period_start: '2026-09-21', period_end: '2026-10-20',
  created_at: '', updated_at: '', documents: [], review_json_path: '/review.json',
  extraction_provider: null, error: null,
};

const preview: NecImportPreview = {
  period: { start: '2026-09-21', end: '2026-10-20' },
  stats: { validated_rows: 12, unresolved: 2 },
  missing_sheets: [{ database_id: 3, human_code: 'E3', name: 'C. Mat' }],
  duplicate_sheet_groups: [{ key: 'E5', sheet_ids: ['a', 'b'] }],
  sheet_summaries: [],
  line_items: [],
};

async function toReview(user: ReturnType<typeof userEvent.setup>) {
  render(
    <ConfirmProvider>
      <NecScanImportPanel period={period} open onClose={() => {}} />
    </ConfirmProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Start import for this period' }));
  expect(await screen.findByRole('button', { name: 'Preview changes' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Preview changes' }));
  expect(await screen.findByRole('button', { name: 'Apply validated rows' })).toBeInTheDocument();
}

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

async function toUpload(user: ReturnType<typeof userEvent.setup>) {
  render(
    <ConfirmProvider>
      <NecScanImportPanel period={period} open onClose={() => {}} />
    </ConfirmProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Start import for this period' }));
  expect(await screen.findByLabelText('PDF scans')).toBeInTheDocument();
}

describe('NecScanImportPanel upload guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(necApi.fetchImportConfig).mockResolvedValue({ extraction_provider: 'none', requires_review_json_upload: true, env: 'test' });
    mocked(necApi.createImportJob).mockResolvedValue(job);
    mocked(necApi.getImportJob).mockResolvedValue(job);
  });

  it('reports an oversized PDF without uploading it', async () => {
    const user = userEvent.setup();
    await toUpload(user);
    fireEvent.change(screen.getByLabelText('PDF scans'), { target: { files: [sized('scan.pdf', 81 * 1024 * 1024)] } });
    expect(await screen.findByText(/scan.pdf: Larger than the 80 MB limit/)).toBeInTheDocument();
    expect(mocked(necApi.uploadPdf)).not.toHaveBeenCalled();
  });

  it('reports a non-JSON review file without uploading it', async () => {
    const user = userEvent.setup();
    await toUpload(user);
    fireEvent.change(screen.getByLabelText('Review JSON'), { target: { files: [new File(['x'], 'review.pdf')] } });
    expect(await screen.findByText('.pdf files are not accepted here.')).toBeInTheDocument();
    expect(mocked(necApi.uploadReviewJson)).not.toHaveBeenCalled();
  });

  it('uploads the good PDFs and reports only the skipped ones', async () => {
    const user = userEvent.setup();
    await toUpload(user);
    fireEvent.change(screen.getByLabelText('PDF scans'), { target: { files: [new File(['x'], 'ok.pdf'), sized('big.pdf', 81 * 1024 * 1024)] } });
    expect(mocked(necApi.uploadPdf)).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Skipped: big.pdf: Larger than the 80 MB limit/)).toBeInTheDocument();
  });
});

describe('NecScanImportPanel apply confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(necApi.fetchImportConfig).mockResolvedValue({ extraction_provider: 'none', requires_review_json_upload: true, env: 'test' });
    mocked(necApi.createImportJob).mockResolvedValue(job);
    mocked(necApi.fetchPreview).mockResolvedValue({ job, preview });
    mocked(necApi.applyImport).mockResolvedValue({ stats: { created: 12 } } as never);
  });

  it('apply asks and names the counts', async () => {
    const user = userEvent.setup();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Apply validated rows' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/validated rows 12/)).toBeInTheDocument();
    expect(within(confirm).getByText(/1 employee has no matched sheet/)).toBeInTheDocument();
    expect(within(confirm).getByText(/1 duplicate sheet group/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Apply validated rows' }));
    expect(mocked(necApi.applyImport)).toHaveBeenCalledWith('job-1', false);
    expect(await screen.findByText('Import batch saved')).toBeInTheDocument();
  });

  it('cancel keeps the review open and applies nothing', async () => {
    const user = userEvent.setup();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Apply validated rows' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(mocked(necApi.applyImport)).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Apply validated rows' })).toBeInTheDocument();
  });

  it('dry-run applies without asking', async () => {
    const user = userEvent.setup();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Dry-run apply' }));
    expect(mocked(necApi.applyImport)).toHaveBeenCalledWith('job-1', true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
