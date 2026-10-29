// app/documents/documentLogic.test.ts — the library page's pure rules: kinds, preview and print, the search request, filters,
// the folder tree, and highlighting.
import { describe, expect, it } from 'vitest';
import {
  activityLabel, buildTree, canPrint, dateRange, descendantIds, downloadName, effectiveSort, extOf, filterChips, fileTypeOf, flattenTree,
  folderFromRow, folderTrail, fromRow, hasFilters, highlightParts, isNarrowed, matchFolders, neighbours, NO_FILTERS, pathLabel, previewKind,
  printRoute, removeChip, searchPath, shortLocation, takesPrintCopy, toggled, uploadProblem,
} from './documentLogic';
import type { DocFilters, DocFolder } from './types';

const NOW = new Date(2026, 9, 19, 12, 0, 0); // 19 October 2026, local
const filters = (patch: Partial<DocFilters> = {}): DocFilters => ({ ...NO_FILTERS, ...patch });
const query = (path: string) => Object.fromEntries(new URL(path, 'http://x').searchParams);
const folder = (id: string, name: string, parentId: string | null = null, sortOrder = 1000): DocFolder =>
  ({ id, name, parentId, sortOrder, seeded: false, quickPrint: false, description: '', createdBy: '', fileCount: 0, totalCount: 0 });

describe('kinds of file', () => {
  it('reads the extension, and none for names without one', () => {
    expect(extOf('Report.PDF')).toBe('pdf');
    expect(extOf('a.b.docx')).toBe('docx');
    expect(['noext', '.hidden', '', '...'].map(extOf)).toEqual(['', '', '', '']);
  });

  it('gives every accepted extension a kind', () => {
    expect(['a.docx', 'a.xlsx', 'a.pptx', 'a.txt', 'a.heic', 'a.m4a', 'a.mp4', 'a.zip', 'a.eml', 'a.dwg', 'a.pdf', 'a.zzz'].map(fileTypeOf))
      .toEqual(['document', 'spreadsheet', 'presentation', 'text', 'image', 'audio', 'video', 'archive', 'email', 'drawing', 'pdf', 'file']);
  });

  it('says why a file cannot be uploaded', () => {
    expect(uploadProblem({ name: 'a.pdf', size: 10 })).toBeNull();
    expect(uploadProblem({ name: 'run.exe', size: 10 })).toMatch(/\.exe files are not accepted/);
    expect(uploadProblem({ name: 'noext', size: 10 })).toMatch(/without an extension/);
    expect(uploadProblem({ name: 'a.pdf', size: 0 })).toMatch(/empty/);
    expect(uploadProblem({ name: 'a.pdf', size: 101 * 1024 * 1024 })).toMatch(/Larger than the 100 MB limit/);
  });
});

describe('preview and print', () => {
  it('decides how each file is shown in the page', () => {
    const kinds = Object.fromEntries(['pdf', 'docx', 'png', 'svg', 'heic', 'mp3', 'mp4', 'avi', 'txt', 'xlsx', 'csv', 'doc', 'pptx', 'zip', 'dwg'].map(e => [e, previewKind(e)]));
    expect(kinds).toEqual({
      pdf: 'pdf', docx: 'docx', png: 'image', svg: 'image', heic: 'none', mp3: 'audio', mp4: 'video', avi: 'none', txt: 'text',
      xlsx: 'sheet', csv: 'sheet', doc: 'office', pptx: 'office', zip: 'none', dwg: 'none',
    });
    expect(previewKind('PDF')).toBe('pdf');
  });

  it('prints what the page can draw itself', () => {
    expect(['image', 'pdf', 'text', 'docx', 'sheet'].every(k => canPrint(k as never))).toBe(true);
    expect(['audio', 'video', 'office', 'none'].some(k => canPrint(k as never))).toBe(false);
  });

  it('keeps the extension on a downloaded name', () => {
    expect(downloadName({ name: 'Pump SOP', ext: 'docx' })).toBe('Pump SOP.docx');
    expect(downloadName({ name: 'Pump SOP.DOCX', ext: 'docx' })).toBe('Pump SOP.DOCX');
    expect(downloadName({ name: 'Notes', ext: '' })).toBe('Notes');
  });
});

describe('rows from the server', () => {
  it('maps a document and survives missing fields', () => {
    const d = fromRow({ id: 'a', name: 'N', original_name: 'n.pdf', file_type: 'pdf', ext: 'pdf', folder_ref: 'f1', folder_path: 'A > B', file_size: 5, tags: ['x'], found_inside: true, deleted_at: null });
    expect(d).toMatchObject({ id: 'a', folderId: 'f1', folderPath: 'A > B', size: 5, tags: ['x'], foundInside: true, deletedAt: null, starred: false });
    expect(fromRow({ id: 'b' })).toMatchObject({ name: 'Untitled', folderId: null, tags: [], type: 'file', url: '' });
  });

  it('maps a folder', () => {
    expect(folderFromRow({ id: 'f', parent_id: 'p', name: 'X', seed_key: 'ams/x', file_count: 2, total_count: 5 })).toMatchObject({ parentId: 'p', seeded: true, fileCount: 2, totalCount: 5 });
    expect(folderFromRow({ id: 'f', name: 'X' })).toMatchObject({ parentId: null, seeded: false, sortOrder: 1000 });
  });

  it('knows the Quick print folder by its key, not its name, and reads a print copy', () => {
    expect(folderFromRow({ id: 'q', name: 'Papers to print', seed_key: 'quick-print' }).quickPrint).toBe(true);
    expect(folderFromRow({ id: 'q', name: 'Quick print' }).quickPrint).toBe(false);
    expect(fromRow({ id: 'a', print_copy_url: 'https://x/c.pdf', print_copy_name: 'c.pdf', print_copy_size: 9 })).toMatchObject({ printCopyUrl: 'https://x/c.pdf', printCopyName: 'c.pdf', printCopySize: 9 });
    expect(fromRow({ id: 'b' })).toMatchObject({ printCopyUrl: '', printCopyName: '', printCopySize: 0 });
  });
});

describe('Quick print', () => {
  it('prints from the print copy first, then a PDF or picture as it is, then the page drawing it', () => {
    expect(printRoute({ ext: 'docx', printCopyUrl: 'https://x/c.pdf' })).toBe('copy');
    expect(printRoute({ ext: 'pptx', printCopyUrl: 'https://x/c.pdf' })).toBe('copy');
    expect(printRoute({ ext: 'pdf', printCopyUrl: '' })).toBe('pdf');
    expect(printRoute({ ext: 'png', printCopyUrl: '' })).toBe('image');
    expect(printRoute({ ext: 'xlsx', printCopyUrl: '' })).toBe('render');
    expect(printRoute({ ext: 'pptx', printCopyUrl: '' })).toBe('none');
    expect(printRoute({ ext: 'zip', printCopyUrl: '' })).toBe('none');
  });

  it('asks for a print copy only for files whose layout the browser cannot keep', () => {
    expect(['docx', 'xlsx', 'csv', 'doc', 'pptx'].every(ext => takesPrintCopy({ ext }))).toBe(true);
    expect(['pdf', 'png', 'txt', 'zip'].some(ext => takesPrintCopy({ ext }))).toBe(false);
  });
});

describe('the folder tree', () => {
  const all = [
    folder('r', 'AMS', null, 10), folder('s2', '2. Leadership', 'r', 20), folder('s1', '1. Context', 'r', 10), folder('x10', '2.10 Ten', 's2', 1000),
    folder('x9', '2.9 Nine', 's2', 1000), folder('mine', 'Contracts', null, 1000),
  ];

  it('orders by the structure, then by name with numbers read as numbers', () => {
    const tree = buildTree(all);
    expect(tree.map(n => n.name)).toEqual(['AMS', 'Contracts']);
    expect(tree[0].children.map(n => n.name)).toEqual(['1. Context', '2. Leadership']);
    expect(tree[0].children[1].children.map(n => n.name)).toEqual(['2.9 Nine', '2.10 Ten']);
    expect(tree[0].children[1].children[0].depth).toBe(2);
  });

  it('keeps a folder whose parent is missing instead of losing it', () => {
    expect(buildTree([folder('a', 'Orphan', 'gone')]).map(n => n.name)).toEqual(['Orphan']);
  });

  it('survives a loop in the data', () => {
    const tree = buildTree([folder('a', 'A', 'b'), folder('b', 'B', 'a')]);
    expect(flattenTree(tree).length).toBeLessThanOrEqual(2);
  });

  it('finds paths, trails and everything below a folder', () => {
    expect(folderTrail(all, 'x9').map(f => f.name)).toEqual(['AMS', '2. Leadership', '2.9 Nine']);
    expect(folderTrail(all, 'nope')).toEqual([]);
    expect(pathLabel(all, 'x9')).toBe('AMS › 2. Leadership › 2.9 Nine');
    expect(pathLabel(all, null)).toBe('Unfiled');
    expect(descendantIds(all, 's2').sort()).toEqual(['s2', 'x10', 'x9']);
  });

  it('shortens a long location to the last two folders', () => {
    expect(shortLocation('')).toBe('Unfiled');
    expect(shortLocation('A')).toBe('A');
    expect(shortLocation('A > B')).toBe('A › B');
    expect(shortLocation('A > B > C > D')).toBe('… › C › D');
  });

  it('finds folders by name and tells two of one name apart by their path', () => {
    const two = [folder('r', 'AMS'), folder('a', 'Fixed Plant', 'r'), folder('b', 'Fixed Plant', 'r')];
    expect(matchFolders(two, 'fixed').map(m => m.path)).toEqual(['AMS › Fixed Plant', 'AMS › Fixed Plant']);
    expect(matchFolders(two, '')).toHaveLength(3);
    expect(matchFolders(two, 'zzz')).toEqual([]);
  });
});

describe('the search request', () => {
  it('lists everything newest first with nothing chosen', () => {
    expect(query(searchPath({ kind: 'home' }, filters(), NOW))).toEqual({ sort: 'date', dir: 'desc' });
  });

  it('browses a folder by its own files only, and searches it with everything below once anything is typed or chosen', () => {
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters(), NOW))).toMatchObject({ folder_id: 'f1', recursive: 'false' });
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters({ q: 'pump' }), NOW))).toMatchObject({ folder_id: 'f1', recursive: 'true', q: 'pump', sort: 'relevance' });
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters({ types: ['pdf'] }), NOW))).toMatchObject({ recursive: 'true' });
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters({ subfolders: true }), NOW))).toMatchObject({ recursive: 'true' });
  });

  it('searches the whole library when asked to, but only once something is typed or chosen', () => {
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters({ q: 'pump', everywhere: true }), NOW)).folder_id).toBeUndefined();
    expect(query(searchPath({ kind: 'folder', id: 'f1' }, filters({ everywhere: true }), NOW)).folder_id).toBe('f1');
  });

  it('handles the smart views', () => {
    expect(query(searchPath({ kind: 'unfiled' }, filters(), NOW)).unfiled).toBe('true');
    expect(query(searchPath({ kind: 'trash' }, filters(), NOW)).trashed).toBe('true');
    expect(query(searchPath({ kind: 'starred' }, filters(), NOW)).starred).toBe('true');
    expect(query(searchPath({ kind: 'recent' }, filters(), NOW)).added_from).toBe('2026-10-13');
    expect(query(searchPath({ kind: 'recent' }, filters({ added: 'month' }), NOW)).added_from).toBe('2026-09-20'); // the person's own date wins
  });

  it('sends every filter', () => {
    const q = query(searchPath({ kind: 'home' }, filters({
      types: ['pdf', 'image'], exts: ['docx'], tags: ['safety', 'pumps'], uploader: ' Edson ', starred: true, added: 'custom', from: '2026-01-01', to: '2026-02-01', size: 'medium', sort: 'largest',
    }), NOW));
    expect(q).toEqual({
      types: 'pdf,image', exts: 'docx', tags: 'safety,pumps', uploader: 'Edson', starred: 'true', added_from: '2026-01-01', added_to: '2026-02-01',
      min_size: String(1024 * 1024), max_size: String(10 * 1024 * 1024 - 1), sort: 'size', dir: 'desc',
    });
  });

  it('turns date presets into days', () => {
    expect(dateRange({ added: 'today', from: '', to: '' }, NOW)).toEqual({ from: '2026-10-19', to: '2026-10-19' });
    expect(dateRange({ added: 'week', from: '', to: '' }, NOW).from).toBe('2026-10-13');
    expect(dateRange({ added: 'year', from: '', to: '' }, NOW).from).toBe('2026-01-01');
    expect(dateRange({ added: 'any', from: 'x', to: 'y' }, NOW)).toEqual({ from: '', to: '' });
  });

  it('sends names-only only when there are words to match', () => {
    expect(query(searchPath({ kind: 'home' }, filters({ namesOnly: true }), NOW)).names_only).toBeUndefined();
    expect(query(searchPath({ kind: 'home' }, filters({ namesOnly: true, q: 'x' }), NOW)).names_only).toBe('true');
  });

  it('encodes what was typed', () => {
    const path = searchPath({ kind: 'home' }, filters({ q: 'a&b=c "hot work"' }), NOW);
    expect(path).not.toContain('a&b=c');
    expect(query(path).q).toBe('a&b=c "hot work"');
  });

  it('picks the sort: best match while searching, newest otherwise, the person\'s choice when made', () => {
    expect(effectiveSort(filters())).toBe('newest');
    expect(effectiveSort(filters({ q: ' x ' }))).toBe('relevance');
    expect(effectiveSort(filters({ q: 'x', sort: 'name' }))).toBe('name');
  });

  it('knows when a view is narrowed', () => {
    expect(isNarrowed(filters())).toBe(false);
    expect(isNarrowed(filters({ q: '  ' }))).toBe(false);
    expect(isNarrowed(filters({ q: 'a' }))).toBe(true);
    expect(hasFilters(filters({ starred: true }))).toBe(true);
    expect(hasFilters(filters({ q: 'a' }))).toBe(false);
  });
});

describe('filter chips', () => {
  it('lists each filter and removes exactly that one', () => {
    const f = filters({ types: ['pdf', 'image'], exts: ['docx'], tags: ['safety'], uploader: 'Edson', starred: true, added: 'week', size: 'large' });
    const chips = filterChips(f);
    expect(chips.map(c => c.label)).toEqual(['PDFs', 'Images', '.docx', 'Tag: safety', 'Added by Edson', 'Starred', 'Added: last 7 days', 'Over 10 MB']);
    let left = f;
    for (const chip of chips) left = removeChip(left, chip.id);
    expect(left).toEqual(NO_FILTERS);
    expect(removeChip(f, 'type:pdf').types).toEqual(['image']);
  });

  it('describes a custom range, with open ends', () => {
    expect(filterChips(filters({ added: 'custom', from: '2026-01-01' }))[0].label).toBe('Added 2026-01-01 to …');
  });

  it('toggles a value in a list', () => {
    expect(toggled(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggled(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('highlighting', () => {
  it('marks every search word, ignoring case', () => {
    expect(highlightParts('Hot Work Permit', ['work', 'PERMIT'])).toEqual([
      { text: 'Hot ', hit: false }, { text: 'Work', hit: true }, { text: ' ', hit: false }, { text: 'Permit', hit: true },
    ]);
  });

  it('treats punctuation in a word as plain text', () => {
    expect(highlightParts('Cost (R) 100%', ['(r)', '100%']).filter(p => p.hit).map(p => p.text)).toEqual(['(R)', '100%']);
    expect(() => highlightParts('x', ['[', '\\', '*'])).not.toThrow();
  });

  it('returns the text whole when there is nothing to mark', () => {
    expect(highlightParts('abc', [])).toEqual([{ text: 'abc', hit: false }]);
    expect(highlightParts('abc', ['zzz'])).toEqual([{ text: 'abc', hit: false }]);
    expect(highlightParts('', ['a'])).toEqual([{ text: '', hit: false }]);
  });

  it('prefers the longer word where two overlap', () => {
    expect(highlightParts('pumping', ['pump', 'pumping'])).toEqual([{ text: 'pumping', hit: true }]);
  });
});

describe('history and the viewer', () => {
  it('describes what happened in words', () => {
    expect(activityLabel({ action: 'upload', details: { folder: 'A > B' } })).toBe('Uploaded into B');
    expect(activityLabel({ action: 'update', details: { changed: ['name', 'description'] } })).toBe('Edited (name, description)');
    expect(activityLabel({ action: 'move', details: { to: 'A > C' } })).toBe('Moved to C');
    expect(activityLabel({ action: 'trash', details: null })).toBe('Moved to the trash');
    expect(activityLabel({ action: 'mystery', details: {} })).toBe('mystery');
  });

  it('finds the files either side of the open one', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(neighbours(list, 'b')).toEqual({ previous: { id: 'a' }, next: { id: 'c' }, position: 1 });
    expect(neighbours(list, 'a').previous).toBeNull();
    expect(neighbours(list, 'c').next).toBeNull();
    expect(neighbours(list, 'zzz')).toEqual({ previous: null, next: null, position: -1 });
  });
});
