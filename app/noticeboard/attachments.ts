// app/noticeboard/attachments.ts — pure attachment-kind classification, used to pick a
// preview treatment (an actual image thumbnail vs. a type-specific icon) and to keep
// the frontend's `accept` filter in sync with the backend's NOTICE_ATTACHMENT_EXTS
// (backend/app/uploads.py). Split out per the "extract + test business logic"
// standard (app/timesheets/calcTotals.ts precedent) rather than inlined in page.tsx.

export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'document' | 'archive' | 'file';

const KIND_EXTS: Record<Exclude<AttachmentKind, 'file'>, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic'],
  video: ['mp4', 'mov', 'avi', 'webm', 'mkv'],
  audio: ['mp3', 'wav', 'm4a', 'ogg', 'aac'],
  pdf: ['pdf'],
  spreadsheet: ['xls', 'xlsx', 'csv'],
  document: ['doc', 'docx', 'txt', 'rtf', 'odt', 'json', 'xml'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
};

function extOf(nameOrUrl: string): string {
  const clean = nameOrUrl.split(/[?#]/)[0]; // strip query/hash off a URL before reading the extension
  return clean.includes('.') ? clean.split('.').pop()!.toLowerCase() : '';
}

export function attachmentKind(nameOrUrl: string): AttachmentKind {
  const ext = extOf(nameOrUrl);
  for (const [kind, exts] of Object.entries(KIND_EXTS) as [Exclude<AttachmentKind, 'file'>, string[]][]) {
    if (exts.includes(ext)) return kind;
  }
  return 'file';
}

export function isPreviewableImage(nameOrUrl: string): boolean {
  return attachmentKind(nameOrUrl) === 'image';
}

/** The file-input `accept` attribute — advisory pre-filtering only; the backend's
 *  NOTICE_ATTACHMENT_EXTS is the real enforcement. Kept as one flat list here so it's
 *  obvious at a glance that it's meant to mirror that allowlist. */
export const NOTICE_ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,' +
  '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tif,.tiff,.heic,' +
  '.zip,.rar,.7z,.tar,.gz,' +
  '.mp3,.wav,.m4a,.ogg,.aac,' +
  '.mp4,.mov,.avi,.webm,.mkv,' +
  '.json,.xml';
