// app/documents/types.ts — the document hub's data shapes.
export interface DocumentFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  categoryId: string;
  categoryName: string;
  /** The folder's NAME (documents tag their folder by name, not by id); null means the category's top level. */
  folder: string | null;
  size: number;
  starred: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface Folder {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  created_at?: string;
}

/** A folder as shown: the built-in ISO 55001 ones cannot be renamed or removed, the custom ones can. */
export interface FolderEntry {
  name: string;
  id?: string;
  builtIn: boolean;
}
