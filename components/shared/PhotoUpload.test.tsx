import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/lib/api';
import { PhotoUpload } from './PhotoUpload';

vi.mock('@/lib/api', () => ({ authFetch: vi.fn(), isMutationInFlight: () => false }));
const fetchMock = vi.mocked(authFetch);

const sized = (name: string, size: number) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const pick = (input: HTMLElement, files: File[]) => fireEvent.change(input, { target: { files } });

describe('PhotoUpload guards', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: 'https://cdn.test/n.jpg' }) } as Response);
  });

  it('reports an oversized photo without uploading it', async () => {
    const onChange = vi.fn();
    render(<PhotoUpload label="Photos" photos={[]} onChange={onChange} />);
    pick(screen.getByLabelText('Upload photos'), [sized('big.jpg', 21 * 1024 * 1024)]);
    expect(await screen.findByRole('alert')).toHaveTextContent('big.jpg: Larger than the 20 MB limit.');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a disallowed type without uploading it', async () => {
    const onChange = vi.fn();
    render(<PhotoUpload label="Photos" photos={[]} onChange={onChange} />);
    pick(screen.getByLabelText('Upload photos'), [new File(['x'], 'notes.exe')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('notes.exe: .exe files are not accepted here.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists every failure instead of keeping only the last', async () => {
    render(<PhotoUpload label="Photos" photos={[]} onChange={() => {}} />);
    pick(screen.getByLabelText('Upload photos'), [sized('a.jpg', 21 * 1024 * 1024), new File(['x'], 'b.exe')]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('a.jpg: Larger than the 20 MB limit.');
    expect(alert).toHaveTextContent('b.exe: .exe files are not accepted here.');
  });

  it('says when files were left out over the photo limit', async () => {
    const onChange = vi.fn();
    render(<PhotoUpload label="Photos" photos={['u1']} maxPhotos={2} onChange={onChange} />);
    pick(screen.getByLabelText('Upload photo'), [new File(['x'], 'a.jpg'), new File(['x'], 'b.jpg')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Only 1 of 2 could be taken (2 photo limit).');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['u1', 'https://cdn.test/n.jpg']));
  });

  it('uploads a good photo exactly as before', async () => {
    const onChange = vi.fn();
    render(<PhotoUpload label="Photos" photos={[]} onChange={onChange} />);
    pick(screen.getByLabelText('Upload photos'), [new File(['x'], 'ok.jpg')]);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['https://cdn.test/n.jpg']));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server refusal detail instead of the raw body', async () => {
    fetchMock.mockResolvedValue({ ok: false, text: async () => JSON.stringify({ detail: 'File too large.' }) } as Response);
    render(<PhotoUpload label="Photos" photos={[]} onChange={() => {}} />);
    pick(screen.getByLabelText('Upload photos'), [new File(['x'], 'ok.jpg')]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('ok.jpg: File too large.');
    expect(alert).not.toHaveTextContent('{');
  });
});
