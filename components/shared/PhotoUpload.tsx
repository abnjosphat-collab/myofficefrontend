'use client';

import { useId, useRef, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';
import { Camera, Upload, X, ZoomIn, ImageIcon } from '@/components/shared/theme';

const API = API_BASE;

// All common image formats including HEIC/HEIF from phone cameras
const ACCEPTED =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,' +
  'image/svg+xml,image/heic,image/heif,image/tiff,image/avif,image/*';

export interface PhotoUploadProps {
  label: string;
  description?: string;
  photos: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxPhotos?: number;
  disabled?: boolean;
  accentColor?: string;
}

export function PhotoUpload({
  label,
  description,
  photos,
  onChange,
  folder = 'misc',
  maxPhotos = 10,
  disabled = false,
  accentColor = '#86BBD8',
}: PhotoUploadProps) {
  const uid = useId();
  const fileInputId = `photo-upload-file-${uid}`;
  const cameraInputId = `photo-upload-camera-${uid}`;
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [lightbox,   setLightbox]   = useState<string | null>(null);
  const [uploadErr,  setUploadErr]  = useState('');
  const [progress,   setProgress]   = useState(0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = maxPhotos - photos.length;
    const toUpload  = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setUploadErr('');
    setProgress(0);
    const newUrls: string[] = [];
    let done = 0;

    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const res = await authFetch(`${API}/api/photos/upload`, { method: 'POST', body: fd });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
        const { url } = (await res.json()) as { url: string };
        if (url) newUrls.push(url);
      } catch (e) {
        setUploadErr(`Upload failed: ${(e as Error).message}`);
      }
      done++;
      setProgress(Math.round((done / toUpload.length) * 100));
    }

    onChange([...photos, ...newUrls]);
    setUploading(false);
    setProgress(0);
    // Reset inputs so the same file can be picked again
    if (fileRef.current)   fileRef.current.value   = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  function removePhoto(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  const canAdd = !disabled && !uploading && photos.length < maxPhotos;

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" style={{ color: accentColor }} />
          <p className="text-xs font-semibold text-white/75">{label}</p>
          {description && (
            <span className="text-[10px] text-white/35 ml-1">— {description}</span>
          )}
        </div>
        <span className="text-[10px] text-white/30 tabular-nums">
          {photos.length}&thinsp;/&thinsp;{maxPhotos}
        </span>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-xl overflow-hidden bg-white/[0.04]"
              style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${label} attachment ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  title="View full size"
                  onClick={() => setLightbox(url)}
                  className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/35 transition-colors"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    title="Remove photo"
                    onClick={() => removePhoto(idx)}
                    className="h-7 w-7 rounded-lg bg-red-500/30 flex items-center justify-center hover:bg-red-500/55 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
              {/* Index badge */}
              <span className="absolute top-1.5 left-1.5 h-4 min-w-[1rem] px-1 rounded text-[9px] font-bold text-white/70 bg-black/40 flex items-center justify-center leading-none">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: accentColor }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {uploadErr && (
        <p className="text-[10px] text-red-400 flex items-center gap-1">
          <X className="h-3 w-3 shrink-0" />
          {uploadErr}
          <button type="button" onClick={() => setUploadErr('')} className="underline ml-auto">
            dismiss
          </button>
        </p>
      )}

      {/* Action buttons */}
      {canAdd && (
        <div className="flex gap-2">
          {/* File upload */}
          <label
            htmlFor={fileInputId}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs text-white/45 hover:text-white/75 border-[1.5px] border-dashed border-white/15 bg-white/[0.03] hover:border-[var(--photo-upload-accent)]"
            style={{ '--photo-upload-accent': `${accentColor}50` } as React.CSSProperties}
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>Upload photo{maxPhotos - photos.length > 1 ? 's' : ''}</span>
            <input
              id={fileInputId}
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED}
              aria-label={`Upload photo${maxPhotos - photos.length > 1 ? 's' : ''}`}
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </label>

          {/* Camera capture */}
          <label
            htmlFor={cameraInputId}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs text-white/45 hover:text-white/75 border border-white/[0.12] bg-white/[0.03] hover:border-[var(--photo-upload-accent)]"
            title="Take a photo with camera"
            style={{ '--photo-upload-accent': `${accentColor}40` } as React.CSSProperties}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Camera</span>
            <input
              id={cameraInputId}
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Take a photo with camera"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </label>
        </div>
      )}

      {photos.length >= maxPhotos && !disabled && (
        <p className="text-[10px] text-white/30 text-center py-1">
          Maximum {maxPhotos} photos reached
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <>
          {/* Click-outside scrim to dismiss — a real (unstyled) button so it's a valid
              interactive control; kept out of the tab order since the explicit Close
              button below is the keyboard-equivalent way to dismiss, and this is a
              mouse-only affordance. A separate layer (not a wrapping element) so the
              Close button and image don't need their own stopPropagation. */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close photo preview"
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-sm cursor-default"
          />
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none">
            <button
              type="button"
              title="Close"
              onClick={() => setLightbox(null)}
              className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10 pointer-events-auto"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Full size preview"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl pointer-events-auto"
            />
          </div>
        </>
      )}
    </div>
  );
}
