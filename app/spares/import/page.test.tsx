import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import SpareImportPage from './page';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { post: postMock } }));
vi.mock('@/components/app-shell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('spares import guard', () => {
  beforeEach(() => { postMock.mockReset(); });

  it('reports an oversized spreadsheet without uploading it', async () => {
    render(<ConfirmProvider><SpareImportPage /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText('Spares file', { exact: true }), { target: { files: [sized('big.xlsx', 26 * 1024 * 1024)] } });
    expect(await screen.findByText('Larger than the 25 MB limit.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('reports a non-spreadsheet without uploading it', async () => {
    render(<ConfirmProvider><SpareImportPage /></ConfirmProvider>);
    fireEvent.change(screen.getByLabelText('Spares file', { exact: true }), { target: { files: [new File(['x'], 'notes.pdf')] } });
    expect(await screen.findByText('.pdf files are not accepted here.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
