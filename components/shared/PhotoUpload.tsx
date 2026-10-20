'use client';

import { useId, useRef, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';
import { fileProblem } from '@/lib/files';
import { Button, Dialog, Icon, IconButton, Progress, useMarkDirty } from '@/components/ui-system';

const API = API_BASE;

// All common image formats including HEIC/HEIF from phone cameras
const ACCEPTED =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,' +
  'image/svg+xml,image/heic,image/heif,image/tiff,image/avif,image/*';

// Mirrors backend/app/routers/photos.py (20 MB, ALLOWED_EXTS): files that fail
// are reported without being sent, so a poor connection never pays for a refusal.
const PHOTO_RULES = {
  maxBytes: 20 * 1024 * 1024,
  extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif', 'tiff', 'tif', 'avif', 'ico', 'raw', 'dng', 'cr2', 'nef', 'arw'],
};

// components/shared/PhotoUpload.tsx — photos for a record: a labelled grid with upload and camera capture, a count against the limit,
// a progress bar while files go up, and a full-size preview. Uploads go to /api/photos/upload and the saved URLs are handed back.
export interface PhotoUploadProps {
  label: string;
  description?: string;
  photos: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoUpload({
  label,
  description,
  photos,
  onChange,
  folder = 'misc',
  maxPhotos = 10,
  disabled = false,
}: PhotoUploadProps) {
  const uid = useId();
  const fileInputId = `photo-upload-file-${uid}`;
  const cameraInputId = `photo-upload-camera-${uid}`;
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [lightbox,   setLightbox]   = useState<string | null>(null);
  const [uploadErrs, setUploadErrs] = useState<string[]>([]);
  const [progress,   setProgress]   = useState(0);
  const markDirty = useMarkDirty();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = maxPhotos - photos.length;
    const picked = Array.from(files);
    const toUpload = picked.slice(0, Math.max(remaining, 0));
    const problems: string[] = [];
    if (toUpload.length === 0) problems.push(`None of the ${picked.length} could be taken (${maxPhotos} photo limit).`);
    else if (picked.length > toUpload.length) problems.push(`Only ${toUpload.length} of ${picked.length} could be taken (${maxPhotos} photo limit).`);
    const good: File[] = [];
    for (const file of toUpload) {
      const problem = fileProblem(file, PHOTO_RULES);
      if (problem) problems.push(`${file.name}: ${problem}`);
      else good.push(file);
    }
    if (good.length === 0) { setUploadErrs(problems); return; }

    setUploading(true);
    setUploadErrs([]);
    setProgress(0);
    const newUrls: string[] = [];
    const failures: string[] = [];
    let done = 0;

    for (const file of good) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const res = await authFetch(`${API}/api/photos/upload`, { method: 'POST', body: fd });
        if (!res.ok) {
          const body = await res.text();
          let message = body;
          try { const parsed = JSON.parse(body) as { detail?: unknown }; if (typeof parsed.detail === 'string') message = parsed.detail; } catch { /* keep the body */ }
          throw new Error(message || `HTTP ${res.status}`);
        }
        const { url } = (await res.json()) as { url: string };
        if (url) newUrls.push(url);
      } catch (e) {
        failures.push(`${file.name}: ${(e as Error).message}`);
      }
      done++;
      setProgress(Math.round((done / good.length) * 100));
    }

    onChange([...photos, ...newUrls]);
    setUploadErrs([...problems, ...failures]);
    setUploading(false);
    setProgress(0);
    // Reset inputs so the same file can be picked again
    if (fileRef.current)   fileRef.current.value   = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  function removePhoto(idx: number) {
    markDirty();
    onChange(photos.filter((_, i) => i !== idx));
  }

  const canAdd = !disabled && !uploading && photos.length < maxPhotos;
  const left = maxPhotos - photos.length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-sans text-label font-medium text-ink"><Icon name="image" size="sm" className="text-ink-muted" />{label}</p>
          {description && <p className="font-sans text-caption text-ink-muted">{description}</p>}
        </div>
        <span className="shrink-0 font-sans text-caption text-ink-muted tabular">{photos.length} / {maxPhotos}</span>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={`${label} photos`}>
          {photos.map((url, idx) => (
            <li key={`${url}-${idx}`} className="relative aspect-square overflow-hidden rounded-card border border-line bg-surface-muted">
              <button type="button" onClick={() => setLightbox(url)} aria-label={`View ${label} photo ${idx + 1} full size`} className="focus-ring absolute inset-0 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${label} attachment ${idx + 1}`} className="size-full object-cover" />
              </button>
              {!disabled && (
                <IconButton icon="delete" size="sm" label={`Remove ${label} photo ${idx + 1}`} onClick={() => removePhoto(idx)} className="absolute right-1 top-1 bg-surface/90 shadow-card" />
              )}
            </li>
          ))}
        </ul>
      )}

      {uploading && <Progress value={progress} label="Uploading photos" />}

      {uploadErrs.length > 0 && (
        <div role="alert" className="flex items-start gap-2 font-sans text-caption font-medium text-danger">
          <Icon name="warning" size="xs" weight="emphasis" className="mt-0.5 shrink-0" />
          <ul className="min-w-0 flex-1">
            {uploadErrs.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <button type="button" onClick={() => setUploadErrs([])} className="focus-ring shrink-0 rounded-xs underline">Dismiss</button>
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <input id={fileInputId} ref={fileRef} type="file" multiple accept={ACCEPTED} aria-label={`Upload photo${left > 1 ? 's' : ''}`} className="hidden" onChange={e => handleFiles(e.target.files)} />
          <input id={cameraInputId} ref={cameraRef} type="file" accept="image/*" capture="environment" aria-label="Take a photo with camera" className="hidden" onChange={e => handleFiles(e.target.files)} />
          <Button className="flex-1 border-dashed" icon="upload" onClick={() => fileRef.current?.click()}>Upload photo{left > 1 ? 's' : ''}</Button>
          <Button icon="camera" onClick={() => cameraRef.current?.click()} aria-label="Take a photo with camera"><span className="max-sm:hidden">Camera</span></Button>
        </div>
      )}

      {photos.length >= maxPhotos && !disabled && <p className="text-center font-sans text-caption text-ink-muted">Maximum {maxPhotos} photos reached</p>}

      <Dialog open={lightbox !== null} onOpenChange={open => { if (!open) setLightbox(null); }} title={label} description="Full size preview" size="lg">
        {lightbox && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lightbox} alt="Full size preview" className="mx-auto max-h-[70dvh] max-w-full rounded-card object-contain" />
        )}
      </Dialog>
    </div>
  );
}
