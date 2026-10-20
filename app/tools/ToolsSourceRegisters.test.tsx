import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SourceRegisterForm } from './ToolsSourceRegisters';

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('SourceRegisterForm guard', () => {
  it('reports an oversized register on the field without saving', async () => {
    const onSave = vi.fn();
    render(<SourceRegisterForm departments={['Engineering']} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Register file'), { target: { files: [sized('big.pdf', 51 * 1024 * 1024)] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload register' }));
    expect(await screen.findByText('Larger than the 50 MB limit.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a good register exactly as before', async () => {
    const onSave = vi.fn();
    render(<SourceRegisterForm departments={['Engineering']} onSave={onSave} onCancel={() => {}} />);
    const file = new File(['x'], 'ok.pdf');
    fireEvent.change(screen.getByLabelText('Register file'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload register' }));
    expect(onSave).toHaveBeenCalledWith(file, 'Engineering', '');
  });
});
