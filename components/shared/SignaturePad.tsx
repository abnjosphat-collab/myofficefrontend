// components/shared/SignaturePad.tsx — canvas-based digital signature
'use client';
import { useRef, useState } from 'react';
import { Pen, RotateCcw } from 'lucide-react';

export interface SignatureResult {
  dataUrl:    string;   // base64 PNG
  signerName: string;
  signedAt:   string;   // ISO string
}

interface Props {
  signerName:   string;
  actionLabel?: string;
  onSign:       (result: SignatureResult) => void;
  onCancel:     () => void;
}

export function SignaturePad({ signerName, actionLabel = 'Sign & Confirm', onSign, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty,  setIsEmpty]  = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { setDrawing(false); lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const confirm = () => {
    if (isEmpty) return;
    onSign({ dataUrl: canvasRef.current!.toDataURL('image/png'), signerName, signedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Draw your signature</p>
        <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
      </div>

      <div className="rounded-xl border border-white/20 overflow-hidden bg-white/[0.04] relative">
        <canvas
          ref={canvasRef}
          width={480} height={140}
          className="w-full touch-none cursor-crosshair block"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-white/20 text-xs">
              <Pen className="h-4 w-4" /> Sign here with mouse or finger
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70 font-medium">{signerName}</span>
        <span className="text-white/35">{new Date().toLocaleString()}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-white/70 hover:text-white text-sm font-medium transition-all">
          Cancel
        </button>
        <button type="button" onClick={confirm} disabled={isEmpty}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isEmpty ? 'bg-white/[0.04] border-white/10 text-white/20 cursor-not-allowed' : 'bg-emerald-500/25 hover:bg-emerald-500/40 border-emerald-500/35 text-emerald-300'}`}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
