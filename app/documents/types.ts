// app/documents/types.ts — the document hub's data model: category/folder navigation
// shapes, the document record shape, and the upload/delete/rename working-state shapes.
// Split out of page.tsx as part of the standing "decompose on touch" convention.
// Component *prop* interfaces stay in page.tsx — they're coupled to one component, not
// the page's data contract.
import type { ComponentType, SVGProps } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  description: string;
}

export interface PathItem {
  name: string;
  id: string;
  type: 'category' | 'subfolder';
}

export interface DocumentFile {
  id: string;
  name: string;
  original_name: string;
  type: string;
  categoryId: string;
  categoryName: string;
  folderId: string | null;
  folderPath: string;
  file_size: number;
  starred: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
}

export interface PendingFile {
  file: File;
  name: string;
  description: string;
}

export interface DeleteItem {
  name: string;
  id?: string;
  type?: string;
  categoryId?: string;
  folderId?: string | null;
  storage_path?: string;
}

export interface RenameItem {
  name: string;
  id?: string;
  type?: string;
}

export interface CustomSubfolders {
  [categoryName: string]: string[];
}
