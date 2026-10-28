import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Icon } from '@/components/ui-system/foundations/Icon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { DetailDialog, NoticeDialog } from './page';
import type { Notice } from './types';

/** The exact svg a state renders, for proving a swap shows the check. */
function glyphHtml(name: 'check'): string {
  const { container, unmount } = render(<Icon name={name} size="sm" />);
  const html = container.querySelector('svg')?.outerHTML ?? '';
  unmount();
  return html;
}

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

describe('DetailDialog copy check', () => {
  const CLIPBOARD_DESCRIPTOR = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
  afterEach(() => {
    if (CLIPBOARD_DESCRIPTOR) Object.defineProperty(window.navigator, 'clipboard', CLIPBOARD_DESCRIPTOR);
  });

  it('shows the check on Copy after the notice is copied', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    const notice: Notice = {
      id: '1', title: 'Pump rota', content: 'Check the pumps.', date: '2026-10-20',
      category: 'Safety', priority: 'High', status: 'Active', is_pinned: false, requires_acknowledgment: false,
    };
    render(<DetailDialog notice={notice} now={Date.now()} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} onTogglePin={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Pump rota\n\nCheck the pumps.');
    const copy = screen.getByRole('button', { name: 'Copy' });
    expect(copy.querySelector('[data-motion-swap="replace"] svg')?.outerHTML).toBe(glyphHtml('check'));
  });
});

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
