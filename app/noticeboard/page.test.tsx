import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { NoticeDialog } from './page';

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));
vi.mock('./useNoticeboardData', async importOriginal => {
  const mod = await importOriginal<typeof import('./useNoticeboardData')>();
  return { ...mod, uploadNoticeAttachment: uploadMock };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('notice attachments guard', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ name: 'ok.pdf', url: 'https://cdn.test/ok.pdf' });
  });

  it('reports an oversized attachment without uploading it', async () => {
    render(<ConfirmProvider><NoticeDialog open onOpenChange={() => {}} onSaved={() => {}} /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText(/^Attachments/), { target: { files: [sized('big.pdf', 101 * 1024 * 1024)] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('big.pdf: Larger than the 100 MB limit.');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('uploads the good files and reports only the skipped ones', async () => {
    render(<ConfirmProvider><NoticeDialog open onOpenChange={() => {}} onSaved={() => {}} /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText(/^Attachments/), { target: { files: [new File(['x'], 'ok.pdf'), new File(['x'], 'run.exe')] } });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('alert')).toHaveTextContent('run.exe: .exe files are not accepted here.');
  });
});
