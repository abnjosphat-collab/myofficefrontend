import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ConfirmProvider } from '@/components/ui-system';
import { AttachmentsPanel } from './AttachmentsPanel';

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));
vi.mock('./useServicesData', async importOriginal => {
  const mod = await importOriginal<typeof import('./useServicesData')>();
  return {
    ...mod,
    uploadAttachment: uploadMock,
    useAttachments: () => ({ items: [], loaded: true, loading: false, error: null, errorStatus: null, refetch: vi.fn() }),
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('AttachmentsPanel guard', () => {
  beforeEach(() => { uploadMock.mockReset(); vi.mocked(toast.error).mockClear(); });

  it('reports an oversized file without uploading it', async () => {
    render(<ConfirmProvider><AttachmentsPanel serviceId="s1" /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText('File to attach'), { target: { files: [sized('big.pdf', 51 * 1024 * 1024)] } });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('big.pdf was not attached: Larger than the 50 MB limit.');
  });

  it('reports a disallowed type without uploading it', async () => {
    render(<ConfirmProvider><AttachmentsPanel serviceId="s1" /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText('File to attach'), { target: { files: [new File(['x'], 'run.exe')] } });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('run.exe was not attached: .exe files are not accepted here.');
  });
});
