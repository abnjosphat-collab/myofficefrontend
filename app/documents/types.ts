// app/documents/types.ts — the document library's data shapes.
export interface DocumentFile {
  id: string;
  /** What people call it. Unique within its folder (the server numbers a repeat: "Report (2).pdf"). */
  name: string;
  /** The file's own name as it was uploaded. */
  originalName: string;
  /** The kind: pdf, document, spreadsheet, presentation, text, image, audio, video, archive, email, drawing, file. */
  type: string;
  ext: string;
  /** The folder it is in; null means Unfiled. */
  folderId: string | null;
  /** The folder's full path, "A > B > C"; empty when unfiled. */
  folderPath: string;
  size: number;
  starred: boolean;
  description: string;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  deletedAt: string | null;
  deletedBy: string;
  /** A search matched this file only by the words written inside it. */
  foundInside: boolean;
  /** A PDF kept with a Word or Excel paper so Print sends the exact pages; '' when it has none. */
  printCopyUrl: string;
  printCopyName: string;
  printCopySize: number;
}

export interface DocFolder {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  /** Part of the Asset Management System structure (as opposed to made by hand). Every folder works the same. */
  seeded: boolean;
  /** The Quick print folder: papers printed often, each with a Print button in the list. */
  quickPrint: boolean;
  description: string;
  createdBy: string;
  /** Files directly in this folder. */
  fileCount: number;
  /** Files in this folder and every folder below it. */
  totalCount: number;
}

export interface FolderNode extends DocFolder {
  children: FolderNode[];
  depth: number;
}

export interface LibraryCounts { all: number; unfiled: number; trashed: number; starred: number; unindexed: number }
export interface Facets {
  types: Record<string, number>;
  exts: { ext: string; count: number }[];
  tags: { tag: string; count: number }[];
  uploaders: { name: string; count: number }[];
}
export interface Overview {
  folders: DocFolder[];
  counts: LibraryCounts;
  facets: Facets;
  /** The Asset Management System root exists. */
  seeded: boolean;
  /** Folders of the AMS structure that do not exist yet. */
  amsMissing: number;
}

export interface SearchResult {
  items: DocumentFile[];
  total: number;
  truncated: boolean;
  /** The words the server understood, for highlighting. */
  terms: string[];
}

/** Where in the library the person is. */
export type Place =
  | { kind: 'home' }
  | { kind: 'recent' }
  | { kind: 'starred' }
  | { kind: 'unfiled' }
  | { kind: 'trash' }
  | { kind: 'folder'; id: string };

export type DatePreset = 'any' | 'today' | 'week' | 'month' | 'year' | 'custom';
export type SizePreset = 'any' | 'small' | 'medium' | 'large';
export type SortId = 'auto' | 'relevance' | 'newest' | 'oldest' | 'updated' | 'name' | 'name-desc' | 'largest' | 'smallest' | 'type';

/** Everything the search bar and filter panel control. */
export interface DocFilters {
  q: string;
  /** In a folder: search the whole library instead of only this folder and below. */
  everywhere: boolean;
  /** In a folder with nothing typed: also list the files of its subfolders. */
  subfolders: boolean;
  /** Match names only, not the words inside files. */
  namesOnly: boolean;
  types: string[];
  exts: string[];
  tags: string[];
  uploader: string;
  starred: boolean;
  added: DatePreset;
  from: string;
  to: string;
  size: SizePreset;
  sort: SortId;
}

export type BulkAction = 'star' | 'unstar' | 'move' | 'tag_add' | 'tag_remove' | 'trash' | 'restore' | 'purge';
export interface BulkResult { done: string[]; failed: { id: string; name?: string; error: string }[] }

export interface ActivityEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
