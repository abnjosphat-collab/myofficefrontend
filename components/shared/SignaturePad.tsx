// components/shared/SignaturePad.tsx
// Canvas signature capture — draw, clear, confirm.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, RefreshCw, Lock, CheckCircle2, Upload } from '@/components/shared/theme';
import { api } from '@/lib/apiClient';

export interface SignatureResult {
  /** Name of the person who signed */
  signerName: string;
  /** ISO timestamp of when the signature was confirmed */
  signedAt: string;
  /** PNG data URL of the signature */
  dataUrl: string;
  /** How this signature was produced at signing time:
   *  'drawn'   — drawn by hand on the pad just now
   *  'scanned' — a photo/scan uploaded just now
   *  'saved'   — a stored signature unlocked with the account password
   *  Only 'drawn' proves someone signed by hand at this moment; the other two
   *  are attributable by password/session, not by the ink. */
  method: 'drawn' | 'scanned' | 'saved';
}

/** Luminance above which a pixel counts as paper rather than ink. Photos of
 *  paper are usually grey rather than white, so this sits well below 1. */
const PAPER_LUMINANCE = 0.62;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Turn a photo/scan of a signature into the same shape a drawn one has:
 * white ink on transparent, cropped to the ink and centred.
 *
 * Scans arrive as dark ink on light paper. Pasted as-is onto the dark UI the
 * paper would be an opaque white block and the ink invisible, so ink is
 * re-coloured white and paper dropped to transparent — matching drawn
 * signatures, which are already white-on-transparent.
 */
function processScan(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): string | null {
  const work = document.createElement('canvas');
  work.width = img.naturalWidth;
  work.height = img.naturalHeight;
  const wctx = work.getContext('2d');
  if (!wctx) return null;
  wctx.drawImage(img, 0, 0);

  const pixels = wctx.getImageData(0, 0, work.width, work.height);
  const d = pixels.data;
  let minX = work.width, minY = work.height, maxX = -1, maxY = -1;

  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      const i = (y * work.width + x) * 4;
      // Perceptual luminance — a mid-grey pencil line reads darker than a
      // flat RGB average would suggest.
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      if (lum >= PAPER_LUMINANCE) {
        d[i + 3] = 0; // paper → transparent
      } else {
        // Darker ink → more opaque, so anti-aliased edges stay soft.
        const strength = Math.min(1, (PAPER_LUMINANCE - lum) / PAPER_LUMINANCE);
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
        d[i + 3] = Math.round(255 * strength);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // no ink found — blank or over-exposed
  wctx.putImageData(pixels, 0, 0);

  // Crop to the ink, then fit inside the pad preserving aspect ratio.
  const inkW = maxX - minX + 1;
  const inkH = maxY - minY + 1;
  const pad = 10;
  const scale = Math.min((targetW - pad * 2) / inkW, (targetH - pad * 2) / inkH);
  const outW = inkW * scale;
  const outH = inkH * scale;

  const out = document.createElement('canvas');
  out.width = targetW;
  out.height = targetH;
  const octx = out.getContext('2d');
  if (!octx) return null;
  octx.drawImage(
    work,
    minX, minY, inkW, inkH,
    (targetW - outW) / 2, (targetH - outH) / 2, outW, outH,
  );
  return out.toDataURL('image/png');
}

interface SavedInfo {
  has_signature: boolean;
  source?: 'drawn' | 'scanned';
  updated_at?: string;
}

interface SignaturePadProps {
  signerName: string;
  actionLabel?: string;
  onSign: (sig: SignatureResult) => Promise<void> | void;
  onCancel: () => void;
  /** Offer "use my saved signature" and "save for next time". Default true. */
  allowSaved?: boolean;
}

export function SignaturePad({
  signerName,
  actionLabel = 'Sign & Approve',
  onSign,
  onCancel,
  allowSaved = true,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const [mode, setMode] = useState<'draw' | 'unlock'>('draw');
  const [saved, setSaved] = useState<SavedInfo>({ has_signature: false });
  const [saveForNextTime, setSaveForNextTime] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanErr, setScanErr] = useState('');
  // Whether the ink currently on the canvas was drawn or uploaded — decides
  // what `source` a save is recorded under.
  const [inkSource, setInkSource] = useState<'drawn' | 'scanned'>('drawn');

  // Does this user already have a signature on file? (Never returns the image.)
  useEffect(() => {
    if (!allowSaved) return;
    let cancelled = false;
    api.get<SavedInfo>('/api/signatures/me')
      .then(r => { if (!cancelled) setSaved(r); })
      .catch(() => { /* no saved signature, or endpoint unavailable — draw mode still works */ });
    return () => { cancelled = true; };
  }, [allowSaved]);

  // Keep the backing store matched to the element's CSS box. Setting canvas
  // .width/.height wipes the bitmap and resets the context, so re-apply stroke
  // settings and repaint the existing ink each time. Without the observer the
  // canvas keeps its mount-time size and strokes drift from the pointer once
  // the box changes (modal on a rotating phone).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const configure = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const nextW = Math.round(width * ratio);
      const nextH = Math.round(height * ratio);
      if (canvas.width === nextW && canvas.height === nextH) return;

      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
      }

      canvas.width = nextW;
      canvas.height = nextH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      if (snapshot) ctx.drawImage(snapshot, 0, 0, width, height);
    };

    configure();
    const observer = new ResizeObserver(configure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleFile = async (file: File) => {
    setScanErr('');
    if (!file.type.startsWith('image/')) {
      setScanErr('That file is not an image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setScanErr('Image is too large (max 8MB).');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Could not read that image.'));
        i.src = url;
      });
      const { width, height } = canvas.getBoundingClientRect();
      const processed = processScan(img, width, height);
      if (!processed) {
        setScanErr('No signature found — try a sharper photo with darker ink.');
        return;
      }
      const placed = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Could not render that image.'));
        i.src = processed;
      });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      clear();
      ctx.drawImage(placed, 0, 0, width, height);
      setInkSource('scanned');
      setHasInk(true);
    } catch (err) {
      setScanErr(err instanceof Error ? err.message : 'Could not read that image.');
    } finally {
      URL.revokeObjectURL(url);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Drawing over a scan makes it a hand-drawn signature again.
    if (inkSource === 'scanned') setInkSource('drawn');
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pointFrom(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointFrom(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => { drawing.current = false; };

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasInk(false);
    setScanErr('');
  }, []);

  const confirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (saveForNextTime) {
      // Storing the signature is a convenience, not part of this approval.
      // If it fails the signature is still valid, so don't block the sign-off.
      try {
        await api.put('/api/signatures/me', { image_data: dataUrl, source: inkSource });
      } catch {
        /* ignored — see above */
      }
    }

    await onSign({
      signerName,
      signedAt: new Date().toISOString(),
      dataUrl,
      method: inkSource,
    });
  };

  const unlockAndSign = async () => {
    if (!password) return;
    setUnlocking(true);
    setUnlockErr('');
    try {
      const r = await api.post<{ image_data: string }>('/api/signatures/unlock', { password });
      await onSign({
        signerName,
        signedAt: new Date().toISOString(),
        dataUrl: r.image_data,
        method: 'saved',
      });
    } catch (e) {
      setUnlockErr(e instanceof Error ? e.message : 'Could not unlock signature.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <PenLine className="h-4 w-4 text-[#86BBD8]" />
          <span className="text-white/50">Signing as</span>
          <span className="font-semibold text-white">{signerName}</span>
        </div>
        {mode === 'draw' && (
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/50 transition-all hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Mode switch — only when a saved signature actually exists */}
      {allowSaved && saved.has_signature && (
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => { setMode('draw'); setUnlockErr(''); }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'draw' ? 'bg-[#2A4D69]/70 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Draw now
          </button>
          <button
            type="button"
            onClick={() => { setMode('unlock'); setUnlockErr(''); }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'unlock' ? 'bg-[#2A4D69]/70 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Use saved signature
          </button>
        </div>
      )}

      {mode === 'draw' ? (
        <>
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-40 w-full cursor-crosshair touch-none rounded-xl border border-white/15 bg-white/[0.04]"
          />
          {!hasInk && (
            <p className="-mt-2 text-center text-xs text-white/35">
              Draw your signature above, or upload a photo of one
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white"
            >
              <Upload className="h-3.5 w-3.5" /> Upload a scan
            </button>
            {hasInk && inkSource === 'scanned' && (
              <span className="text-xs text-emerald-400/80">Scan cleaned up &amp; centred</span>
            )}
          </div>
          {scanErr && <p className="text-xs text-rose-400">{scanErr}</p>}
          {allowSaved && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50 hover:text-white/70">
              <input
                type="checkbox"
                checked={saveForNextTime}
                onChange={e => setSaveForNextTime(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#86BBD8]"
              />
              {saved.has_signature ? 'Replace my saved signature with this one' : 'Save this signature for next time'}
            </label>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Signature on file{saved.source === 'scanned' ? ' (scanned)' : ''}
          </div>
          <p className="text-xs text-white/40">
            Enter your account password to apply it. This password is what attributes the approval to you.
          </p>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={e => { setPassword(e.target.value); setUnlockErr(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && password && !unlocking) unlockAndSign(); }}
              placeholder="Account password"
              className="w-full rounded-lg border border-white/15 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:outline-none"
            />
          </div>
          {unlockErr && <p className="text-xs text-rose-400">{unlockErr}</p>}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.14] hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={mode === 'draw' ? confirm : unlockAndSign}
          disabled={mode === 'draw' ? !hasInk : !password || unlocking}
          className="flex-1 rounded-xl border border-[#86BBD8]/35 bg-[#2A4D69]/60 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2A4D69]/80 disabled:pointer-events-none disabled:opacity-40"
        >
          {unlocking ? 'Unlocking…' : actionLabel}
        </button>
      </div>
    </div>
  );
}
