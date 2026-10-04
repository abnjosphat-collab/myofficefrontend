import { describe, expect, it } from 'vitest';
import { NO_FILTERS, fileTypeOf, filterDocuments, formatSize, fromRow, isFiltered, mergeFolders, sortDocuments } from './documentLogic';
import type { DocumentFile } from './types';

const doc = (o: Partial<DocumentFile>): DocumentFile => ({
  id: '1', name: 'A', originalName: 'a.pdf', type: 'pdf', categoryId: '1', categoryName: 'Planning', folder: null, size: 100, starred: false,
  description: '', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', url: '', ...o,
});
const NOW = new Date('2026-10-04T12:00:00Z');

describe('fileTypeOf / formatSize', () => {
  it('types by extension like the server and falls back to file', () => {
    expect(fileTypeOf('Plan.XLSX')).toBe('spreadsheet');
    expect(fileTypeOf('a.b.pdf')).toBe('pdf');
    expect(fileTypeOf('noext')).toBe('file');
    expect(fileTypeOf('x.dwg')).toBe('file');
  });
  it('formats sizes', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('fromRow', () => {
  it('reads a stored row and tolerates missing fields', () => {
    const d = fromRow({ id: 7, name: 'Policy', folder_id: 'Risk Management', file_size: '2048', starred: true });
    expect(d).toMatchObject({ id: '7', name: 'Policy', folder: 'Risk Management', size: 2048, starred: true, type: 'file', url: '' });
    expect(fromRow({ id: 8, name: 'x', folder_id: '' }).folder).toBeNull();
  });
});

describe('mergeFolders', () => {
  it('lists built-in folders first and drops a custom duplicate', () => {
    const out = mergeFolders(['Risk'], [{ id: 'f1', category_id: '3', category_name: 'Planning', name: 'Risk' }, { id: 'f2', category_id: '3', category_name: 'Planning', name: 'Mine' }]);
    expect(out).toEqual([{ name: 'Risk', builtIn: true }, { name: 'Mine', id: 'f2', builtIn: false }]);
  });
});

describe('filterDocuments', () => {
  const docs = [
    doc({ id: 'a', name: 'Budget', size: 500, starred: true, createdAt: '2026-10-04T08:00:00Z', updatedAt: '2026-10-04T08:00:00Z' }),
    doc({ id: 'b', name: 'Photo', type: 'image', size: 5 * 1024 * 1024, createdAt: '2026-09-20T08:00:00Z', updatedAt: '2026-09-20T08:00:00Z', description: 'site visit' }),
    doc({ id: 'c', name: 'Video', type: 'video', size: 20 * 1024 * 1024, createdAt: '2026-08-01T08:00:00Z', updatedAt: '2026-08-01T08:00:00Z' }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>) => filterDocuments(docs, { ...NO_FILTERS, ...f }, NOW).map(d => d.id);
  it('searches name and comment', () => { expect(ids({ search: 'site' })).toEqual(['b']); expect(ids({ search: 'BUD' })).toEqual(['a']); });
  it('filters by view, type, age and size', () => {
    expect(ids({ view: 'starred' })).toEqual(['a']);
    expect(ids({ view: 'recent' })).toEqual(['a']);
    expect(ids({ type: 'image' })).toEqual(['b']);
    expect(ids({ added: 'today' })).toEqual(['a']);
    expect(ids({ added: 'month' })).toEqual(['a', 'b']);
    expect(ids({ size: 'small' })).toEqual(['a']);
    expect(ids({ size: 'medium' })).toEqual(['b']);
    expect(ids({ size: 'large' })).toEqual(['c']);
  });
  it('knows when a filter is on', () => { expect(isFiltered(NO_FILTERS)).toBe(false); expect(isFiltered({ ...NO_FILTERS, search: ' ' })).toBe(false); expect(isFiltered({ ...NO_FILTERS, size: 'large' })).toBe(true); });
});

describe('sortDocuments', () => {
  const docs = [doc({ id: 'a', name: 'beta', size: 2 }), doc({ id: 'b', name: 'Alpha', size: 3 }), doc({ id: 'c', name: 'gamma', size: 1 })];
  it('sorts by name ignoring case, either way, without mutating', () => {
    expect(sortDocuments(docs, 'name', 'asc').map(d => d.id)).toEqual(['b', 'a', 'c']);
    expect(sortDocuments(docs, 'name', 'desc').map(d => d.id)).toEqual(['c', 'a', 'b']);
    expect(docs.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });
  it('sorts by size', () => { expect(sortDocuments(docs, 'size', 'desc').map(d => d.id)).toEqual(['b', 'a', 'c']); });
});
