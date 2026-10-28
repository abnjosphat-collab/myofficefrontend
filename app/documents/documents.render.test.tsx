// app/documents/documents.render.test.tsx — the library's building blocks as a person uses them: typing tags, walking the folder tree,
// finding a folder to move to, a list that highlights what matched, the bulk bar, the setup banner, dropping files, and the viewer's
// honest handling of files that cannot be previewed or printed.
import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { BulkBar } from './BulkBar';
import { FileList, type FileActions } from './FileList';
import { FolderPicker } from './FolderPicker';
import { FolderTree } from './FolderTree';
import { SetupBanner } from './SetupBanner';
import { TagField } from './TagField';
import { buildTree, flattenTree } from './documentLogic';
import { needsUpgrade } from './useDocumentsData';
import { nameForPasted, useFileDrop } from './useFileDrop';
import { DocumentViewer, type ViewerActions } from './viewer/DocumentViewer';
import type { DocFolder, DocumentFile } from './types';

vi.mock('@/lib/useApiList', () => ({ useApiList: () => ({ items: [], loading: false, loaded: true, error: null, errorStatus: null, refetch: vi.fn(), setItems: vi.fn() }) }));
vi.mock('./useDocumentsData', async importOriginal => ({ ...(await importOriginal<typeof import('./useDocumentsData')>()), seedAmsFolders: vi.fn(async () => ({ created: 80, adopted: 1, skipped: 5, total: 85 })), reindexAll: vi.fn(async (progress: (n: number) => void) => { progress(0); }) }));

const folder = (id: string, name: string, parentId: string | null = null, sortOrder = 1000, over: Partial<DocFolder> = {}): DocFolder =>
  ({ id, name, parentId, sortOrder, seeded: false, description: '', createdBy: '', fileCount: 0, totalCount: 0, ...over });
const FOLDERS = [folder('r', 'AMS', null, 10, { totalCount: 9 }), folder('s4', '4. Support', 'r', 40, { totalCount: 9 }), folder('d44', '4.4 Documented Information', 's4', 10, { totalCount: 9 }), folder('mine', 'Contracts')];
const TREE = buildTree(FOLDERS);
const FLAT = flattenTree(TREE);
const doc = (id: string, name: string, over: Partial<DocumentFile> = {}): DocumentFile => ({
  id, name, originalName: name, type: 'pdf', ext: 'pdf', folderId: 'd44', folderPath: 'AMS > 4. Support > 4.4 Documented Information', size: 2048, starred: false, description: '',
  tags: [], uploadedBy: 'Edson', createdAt: '2026-10-10T08:00:00Z', updatedAt: '2026-10-10T08:00:00Z', url: `https://files.test/${id}`, deletedAt: null, deletedBy: '', foundInside: false, ...over,
});

describe('TagField', () => {
  it('adds a tag on Enter and on a comma, saved lower case without repeats', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TagField value={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Tags' }), '  Pump   House {Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['pump house']);
    rerender(<TagField value={['pump house']} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Tags' }), 'PUMP HOUSE,safety,');
    expect(onChange).toHaveBeenLastCalledWith(['pump house', 'safety']);
  });

  it('offers tags already in use and removes one on request', async () => {
    const onChange = vi.fn();
    render(<TagField value={['a']} onChange={onChange} suggestions={['a', 'safety', 'audit']} />);
    expect(screen.queryByRole('button', { name: 'a' })).toBeNull(); // already chosen
    await userEvent.click(screen.getByRole('button', { name: 'safety' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'safety']);
    await userEvent.click(screen.getByRole('button', { name: /Remove a/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe('FolderTree', () => {
  const counts = { all: 9, unfiled: 2, trashed: 0, starred: 1, unindexed: 0 };

  it('lists the views with counts and the folder tree, and selects what is clicked', async () => {
    const onSelect = vi.fn();
    render(<FolderTree tree={TREE} flat={FLAT} place={{ kind: 'home' }} counts={counts} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /^Unfiled/ })).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: /^Trash/ })).toHaveTextContent('Trash');
    await userEvent.click(screen.getByRole('button', { name: /^4\. Support/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'folder', id: 's4' });
    await userEvent.click(screen.getByRole('button', { name: /^Starred/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'starred' });
  });

  it('opens down to the folder you are in, and a folder can be collapsed', async () => {
    render(<FolderTree tree={TREE} flat={FLAT} place={{ kind: 'folder', id: 'd44' }} counts={counts} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^4\.4 Documented Information/ })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse 4. Support' }));
    expect(screen.queryByRole('button', { name: /^4\.4 Documented Information/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Expand 4. Support' }));
    expect(screen.getByRole('button', { name: /^4\.4 Documented Information/ })).toBeInTheDocument();
  });
});

describe('FolderPicker', () => {
  it('chooses a folder, or no folder, and keeps a blocked folder out of reach', async () => {
    const onChange = vi.fn();
    render(<FolderPicker flat={FLAT} value="mine" onChange={onChange} noneLabel="Unfiled" disabledIds={['s4']} label="Destination" />);
    await userEvent.click(screen.getByRole('button', { name: 'Unfiled' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('button', { name: '4. Support' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '4.4 Documented Information' }));
    expect(onChange).toHaveBeenLastCalledWith('d44');
  });

  it('finds a folder by typing part of its name and shows where it is', async () => {
    render(<FolderPicker flat={FLAT} value={null} onChange={vi.fn()} label="Destination" />);
    await userEvent.type(screen.getByRole('searchbox'), 'documented');
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('4.4 Documented Information');
    expect(option).toHaveTextContent('AMS › 4. Support');
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No folder has that name.')).toBeInTheDocument();
  });
});

describe('FileList', () => {
  const state = { loaded: true, loading: false, error: null, errorStatus: null, refetch: vi.fn(async () => {}) };
  const actions: FileActions = { onOpen: vi.fn(), onStar: vi.fn(), onDownload: vi.fn(), onEdit: vi.fn(), onMove: vi.fn(), onTrash: vi.fn(), onRestore: vi.fn(), onPurge: vi.fn() };
  const props = { terms: ['pump'], state, subject: 'the library', actions, selected: new Set<string>(), onSelectedChange: vi.fn(), showLocation: true, isManager: true, emptyHint: 'Nothing.' };

  it('highlights the matched word, says when a file was found only inside, and shows its folder and tags', () => {
    render(<FileList {...props} view="cards" items={[doc('a', 'Pump SOP.pdf', { tags: ['safety'], foundInside: true })]} />);
    expect(document.querySelector('mark')).toHaveTextContent('Pump');
    expect(screen.getByText('Found inside')).toBeInTheDocument();
    expect(screen.getByText('safety')).toBeInTheDocument();
    expect(screen.getByText(/4\.4 Documented Information/)).toBeInTheDocument();
  });

  it('opens a file when its card is clicked, and ticks it with its own checkbox', async () => {
    const onSelectedChange = vi.fn();
    render(<FileList {...props} onSelectedChange={onSelectedChange} view="cards" items={[doc('a', 'Plan.pdf')]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview Plan.pdf' }));
    expect(actions.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Plan.pdf' }));
    expect(onSelectedChange).toHaveBeenCalledWith(new Set(['a']));
  });

  it('offers restore and delete-for-good, and not edit or move, for a trashed file; delete only to managers', async () => {
    const { rerender } = render(<FileList {...props} view="table" items={[doc('t', 'Old.pdf', { deletedAt: '2026-10-16T08:00:00Z' })]} />);
    await userEvent.click(screen.getByRole('button', { name: 'More actions for Old.pdf' }));
    expect(screen.getByRole('menuitem', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete for good' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Edit details' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    rerender(<FileList {...props} isManager={false} view="table" items={[doc('a', 'Live.pdf')]} />);
    await userEvent.click(screen.getByRole('button', { name: 'More actions for Live.pdf' }));
    expect(screen.getByRole('menuitem', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBeNull();
  });

  it('shows a failed load as an error with a retry, never as an empty folder', async () => {
    render(<FileList {...props} view="cards" items={[]} state={{ ...state, loaded: false, error: 'The service is down (fixture)', errorStatus: 404 }} />);
    expect(screen.getByText(/The service is down \(fixture\)/)).toBeInTheDocument();
    expect(screen.queryByText('No files here')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says there are no files when a load succeeded with none', () => {
    render(<FileList {...props} view="cards" items={[]} />);
    expect(screen.getByText('No files here')).toBeInTheDocument();
  });
});

describe('BulkBar', () => {
  const handlers = { onSelectAll: vi.fn(), onClear: vi.fn(), onMove: vi.fn(), onTags: vi.fn(), onStar: vi.fn(), onUnstar: vi.fn(), onDownload: vi.fn(), onTrash: vi.fn(), onRestore: vi.fn(), onPurge: vi.fn() };

  it('shows nothing until something is ticked', () => {
    const { container } = render(<BulkBar count={0} total={5} trash={false} isManager {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reaches every found file, not just the page, and hides delete from people who cannot use it', async () => {
    const { rerender } = render(<BulkBar count={2} total={40} trash={false} isManager={false} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: 'Select all 40' }));
    expect(handlers.onSelectAll).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    rerender(<BulkBar count={2} total={2} trash={false} isManager {...handlers} />);
    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handlers.onTrash).toHaveBeenCalled();
  });

  it('offers restore and delete-for-good in the trash', async () => {
    render(<BulkBar count={1} total={1} trash isManager {...handlers} />);
    expect(screen.queryByRole('button', { name: 'Move' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(handlers.onRestore).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete for good' })).toBeInTheDocument();
  });

  it('keeps the announced count to one sentence as the tick set changes', () => {
    const { container, rerender } = render(<BulkBar count={2} total={40} trash={false} isManager {...handlers} />);
    const said = () => container.querySelector('.sr-only');
    expect(said()).toHaveTextContent('2 selected');
    rerender(<BulkBar count={5} total={40} trash={false} isManager {...handlers} />);
    expect(said()).toHaveTextContent('5 selected');
  });
});

describe('SetupBanner', () => {
  it('is silent when everything is set up', () => {
    const { container } = render(<SetupBanner isManager amsMissing={0} unindexed={0} onChanged={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lets a manager set up the AMS folders and read old files, and refreshes afterwards', async () => {
    const onChanged = vi.fn();
    render(<SetupBanner isManager amsMissing={80} unindexed={3} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Set up the AMS folders' }));
    await userEvent.click(screen.getByRole('button', { name: 'Read them now' }));
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('tells everyone else what is pending and who can do it, without a button', () => {
    render(<SetupBanner isManager={false} amsMissing={80} unindexed={3} onChanged={vi.fn()} />);
    expect(screen.getAllByText(/A manager can/)).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('dropping files', () => {
  it('names a pasted picture by the time instead of "image.png"', () => {
    const named = nameForPasted(new File(['x'], 'image.png', { type: 'image/png' }));
    expect(named.name).toMatch(/^Pasted image \d{4}-\d{2}-\d{2} \d{2}-\d{2}\.png$/);
    expect(nameForPasted(new File(['x'], 'plan.pdf')).name).toBe('plan.pdf');
  });

  it('reacts to files only, and to nothing while switched off', () => {
    const onFiles = vi.fn();
    const { result, rerender } = renderHook(({ on }) => useFileDrop(on, onFiles), { initialProps: { on: true } });
    const file = new File(['x'], 'a.pdf');
    const event = (type: string, types: string[], files: File[] = []) => { const e = new Event(type, { cancelable: true }) as Event & { dataTransfer?: unknown }; e.dataTransfer = { types, files }; return e; };
    act(() => { window.dispatchEvent(event('dragenter', ['text/plain'])); });
    expect(result.current).toBe(false); // dragging text around the page does nothing
    act(() => { window.dispatchEvent(event('dragenter', ['Files'])); });
    expect(result.current).toBe(true);
    act(() => { window.dispatchEvent(event('drop', ['Files'], [file])); });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(result.current).toBe(false);
    rerender({ on: false });
    act(() => { window.dispatchEvent(event('drop', ['Files'], [file])); });
    expect(onFiles).toHaveBeenCalledTimes(1);
  });
});

describe('needing the upgrade SQL', () => {
  it('recognises the server\'s upgrade message and nothing else', () => {
    expect(needsUpgrade(409, 'The document library needs its one-time upgrade. Ask the administrator...')).toBe(true);
    expect(needsUpgrade(409, 'A folder with this name already exists here.')).toBe(false);
    expect(needsUpgrade(500, 'one-time upgrade')).toBe(false);
    expect(needsUpgrade(null, null)).toBe(false);
  });
});

describe('DocumentViewer', () => {
  const actions: ViewerActions = { onStar: vi.fn(), onEdit: vi.fn(), onMove: vi.fn(), onTrash: vi.fn(), onRestore: vi.fn(), onPurge: vi.fn(), onShowFolder: vi.fn() };
  const view = (d: DocumentFile | null, list: DocumentFile[], isManager = true, onNavigate = vi.fn()) =>
    render(<ConfirmProvider><DocumentViewer doc={d} list={list} onNavigate={onNavigate} onClose={vi.fn()} actions={actions} isManager={isManager} /></ConfirmProvider>);

  it('says plainly that a file with no preview cannot be previewed, and offers the download', () => {
    const d = doc('z', 'Plant.dwg', { type: 'drawing', ext: 'dwg' });
    view(d, [d]);
    const dialog = screen.getByRole('dialog', { name: 'Plant.dwg' });
    expect(within(dialog).getByText(/cannot be previewed in the page/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Print' })).toBeDisabled();
  });

  it('does not offer a download for a file with no stored link', () => {
    const d = doc('z', 'Lost.pdf', { url: '' });
    view(d, [d]);
    const dialog = screen.getByRole('dialog', { name: 'Lost.pdf' });
    expect(within(dialog).getByText(/so it cannot be previewed or downloaded/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled();
  });

  it('moves through the list with the buttons and the arrow keys', async () => {
    const [a, b, c] = [doc('a', 'A.dwg', { ext: 'dwg', type: 'drawing' }), doc('b', 'B.dwg', { ext: 'dwg', type: 'drawing' }), doc('c', 'C.dwg', { ext: 'dwg', type: 'drawing' })];
    const onNavigate = vi.fn();
    view(b, [a, b, c], true, onNavigate);
    expect(screen.getByText(/File 2 of 3 in this list/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next file' }));
    expect(onNavigate).toHaveBeenLastCalledWith('c');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onNavigate).toHaveBeenLastCalledWith('a');
  });

  it('offers older Office files through Microsoft\'s viewer only when asked, and cannot print them here', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const d = doc('o', 'Old.doc', { type: 'document', ext: 'doc' });
    view(d, [d]);
    expect(open).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Microsoft Office online/ }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('view.officeapps.live.com'), '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
    open.mockRestore();
  });

  it('shows restore and delete-for-good for a trashed file, and only managers can delete', async () => {
    const t = doc('t', 'Gone.dwg', { ext: 'dwg', type: 'drawing', deletedAt: '2026-10-16T08:00:00Z', deletedBy: 'Edson' });
    const { unmount } = view(t, [t], false);
    expect(screen.getByText('In the trash')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(actions.onRestore).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Delete for good' })).toBeNull();
    unmount();
    view(t, [t], true);
    expect(screen.getByRole('button', { name: 'Delete for good' })).toBeInTheDocument();
  });
});
