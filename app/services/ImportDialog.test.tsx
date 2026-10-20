import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { ocrExtract } from './useServicesData';
import { ImportDialog } from './ImportDialog';

vi.mock('./useServicesData', async importOriginal => {
  const mod = await importOriginal<typeof import('./useServicesData')>();
  return { ...mod, ocrExtract: vi.fn() };
});

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

function setup() {
  const onOpenChange = vi.fn();
  render(
    <ConfirmProvider>
      <ImportDialog open onOpenChange={onOpenChange} onScanned={() => {}} onImported={() => {}} />
    </ConfirmProvider>,
  );
  return { onOpenChange };
}

const csv = () => new File(['description,supplier\nOil change,Acme\n'], 'jobs.csv', { type: 'text/csv' });

describe('ImportDialog guard', () => {
  it('asks before discarding a parsed preview', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    fireEvent.change(screen.getByLabelText('File to import or scan'), { target: { files: [csv()] } });
    expect(await screen.findByText(/ready to import/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports an oversized scan without calling OCR', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('File to import or scan'), { target: { files: [sized('scan.pdf', 21 * 1024 * 1024)] } });
    expect(await screen.findByText('Larger than the 20 MB limit.')).toBeInTheDocument();
    expect(vi.mocked(ocrExtract)).not.toHaveBeenCalled();
  });

  it('closes silently when pristine', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
