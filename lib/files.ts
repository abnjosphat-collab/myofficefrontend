// lib/files.ts — client-side mirror of the servers' upload rules. Returns the
// message to show, or null when the file may be sent. Check order
// (extension, empty, size) and wording match the documents upload check;
// the server still enforces its own rule on every file that passes.
import { formatFileSize } from './format';

/** Lowercase extension without the dot; '' when the name has none. */
export function fileExtension(filename: string): string {
  const name = filename.trim().toLowerCase();
  return name.includes('.') && name.replace(/^\.+/, '').includes('.') ? name.split('.').pop()! : '';
}

export function fileProblem(
  file: Pick<File, 'name' | 'size'>,
  rules: { maxBytes: number; extensions?: string[]; emptyMessage?: string },
): string | null {
  const ext = fileExtension(file.name);
  if (rules.extensions && !rules.extensions.includes(ext))
    return ext ? `.${ext} files are not accepted here.` : 'Files without an extension are not accepted.';
  if (file.size === 0) return rules.emptyMessage ?? 'The file is empty.';
  if (file.size > rules.maxBytes) return `Larger than the ${formatFileSize(rules.maxBytes)} limit.`;
  return null;
}
