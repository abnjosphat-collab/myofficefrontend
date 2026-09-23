'use client';

import { createContext, useContext, useId, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { attachmentError, type Evidence } from './prototype';
import s from './tools.module.css';

export type FontChoice = 'inter' | 'manrope' | 'jakarta';
export type FontSizeChoice = number;
export type EquipmentIconFamily = 'technical' | 'myoffice' | 'tabler' | 'iconoir';
export const ToolsPreferences = createContext({ appearance: 'light', font: 'inter' as FontChoice, fontSize: 100 as FontSizeChoice, equipmentIcons: 'technical' as EquipmentIconFamily, guidance: true });
const scaleStyle = (fontSize: number) => ({ '--font-scale': fontSize / 100 } as CSSProperties);
export function Help({ label, children }: { label: string; children: ReactNode }) {
  const prefs = useContext(ToolsPreferences);
  const [open, setOpen] = useState(false);
  if (!prefs.guidance) return null;
  return <Tooltip.Provider delayDuration={250}><Tooltip.Root open={open} onOpenChange={setOpen}><Tooltip.Trigger asChild><button type="button" className={s.helpButton} aria-label={`Help: ${label}`} onClick={() => setOpen(v => !v)}><Icon name="info" size={16} /></button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content sideOffset={8} className={`${s.surface} ${s.helpTip}`} data-mode={prefs.appearance} data-font={prefs.font} style={scaleStyle(prefs.fontSize)}>{children}<Tooltip.Arrow className={s.helpArrow} /></Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>;
}

export function ActionHint({ label, children }: { label: ReactNode; children: ReactElement }) {
  const prefs = useContext(ToolsPreferences);
  if (!prefs.guidance) return children;
  return <Tooltip.Provider delayDuration={350}><Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="bottom" align="center" sideOffset={9} className={`${s.surface} ${s.helpTip} ${s.actionHelpTip}`} data-mode={prefs.appearance} data-font={prefs.font} style={scaleStyle(prefs.fontSize)}>{label}<Tooltip.Arrow className={s.helpArrow}/></Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>;
}

export function AnimatedText({ children, value }: { children: ReactNode; value: string | number }) {
  const reduced = useReducedMotion();
  return <AnimatePresence initial={false} mode="wait"><motion.span key={value} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : .16 }} className={s.animatedText}>{children}</motion.span></AnimatePresence>;
}

export function ToolsDialog({ open, onClose, title, description, wide = false, children }: { open: boolean; onClose: () => void; title: string; description: string; wide?: boolean; children: ReactNode }) {
  const prefs = useContext(ToolsPreferences);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}><Dialog.Portal><Dialog.Overlay className={s.dialogOverlay} /><Dialog.Content className={`${s.surface} ${s.dialogPanel} ${wide ? s.dialogWide : ''}`} data-mode={prefs.appearance} data-font={prefs.font} style={scaleStyle(prefs.fontSize)}
    onOpenAutoFocus={event => { event.preventDefault(); returnFocus.current = document.activeElement as HTMLElement; titleRef.current?.focus(); }}
    onCloseAutoFocus={event => { event.preventDefault(); const target = returnFocus.current?.isConnected ? returnFocus.current : document.querySelector<HTMLElement>('[aria-label="Tools design prototype"] button'); target?.focus(); }}>
    <div className={s.dialogHeader}><div className={s.eyebrow}>TOOLS &amp; EQUIPMENT</div><Dialog.Title ref={titleRef} tabIndex={-1} className={s.modalTitle}>{title}</Dialog.Title><Dialog.Description className={s.drawerSubtitle}>{description}</Dialog.Description><Dialog.Close asChild><button type="button" className={s.closeButton} aria-label="Close dialog"><Icon name="close" size={20} /></button></Dialog.Close></div>
    <div className={s.dialogBody}>{children}</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export type AddEvidence = (files: File[]) => Evidence[];
export function EvidencePicker({ value, onChange, addFiles, toolPhoto = false }: { value: Evidence[]; onChange: (files: Evidence[]) => void; addFiles: AddEvidence; toolPhoto?: boolean }) {
  const inputId = useId();
  const [error, setError] = useState('');
  function receive(files: File[]) {
    if (value.length + files.length > 6) { setError('Keep up to 6 attachments per record.'); return; }
    const invalid = files.map(attachmentError).find(Boolean);
    if (invalid) { setError(invalid); return; }
    setError(''); onChange([...value, ...addFiles(files)]);
  }
  return <div className={s.evidencePicker}>
    <div className={s.fieldHeading}><span>{toolPhoto ? 'Tool photograph & records' : 'Photos & documents'} <small>Optional</small></span><Help label="Attachments">{toolPhoto ? 'The first uploaded image appears in the register. When no image is available, the equipment icon is used automatically.' : 'Add a photo of the condition or a PDF report. Saved files stay with the equipment record.'}</Help></div>
    <label className={s.uploadZone} htmlFor={inputId}><Icon name={toolPhoto ? 'image' : 'upload'} size={22} /><span><strong>{toolPhoto ? 'Add a tool photograph or PDF' : 'Add photos or a PDF'}</strong><small>{toolPhoto ? 'The first image becomes the register photo · ' : ''}Up to 6 files · original-quality photos</small></span><Icon name="plus" size={18} /><input id={inputId} className={s.fileInput} aria-label="Attach photos or PDF" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf" onChange={e => { receive(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
    {value.length > 0 && <div className={s.evidenceList}>{value.map(file => <div key={file.id} className={s.evidenceRow}><Icon name={file.type === 'application/pdf' ? 'pdf' : 'image'} size={20} /><span><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} className={s.iconButton} onClick={() => onChange(value.filter(f => f.id !== file.id))}><Icon name="close" size={16} /></button></div>)}</div>}
    {error && <p role="alert" className={s.warning}>{error}</p>}
  </div>;
}
export function EvidenceGallery({ files }: { files: Evidence[] }) {
  const prefs = useContext(ToolsPreferences);
  const [preview, setPreview] = useState<Evidence | null>(null);
  const [zoom, setZoom] = useState(1);
  const changeZoom = (amount: number) => setZoom(current => Math.min(4, Math.max(1, Number((current + amount).toFixed(2)))));
  return <>
    <div className={s.evidenceGallery}>{files.map(file => file.type === 'application/pdf'
      ? <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className={s.evidenceLink} aria-label={`Open ${file.name} in a new tab`}><Icon name="pdf" size={28} /><span>{file.name}</span><Icon name="out" size={14} /></a>
      : <button key={file.id} type="button" className={s.evidenceLink} aria-label={`View image ${file.name}`} onClick={() => { setPreview(file); setZoom(1); }}>
        {/* Local object URLs are intentionally not passed to the remote image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.url} alt="" /><span>{file.name}</span><Icon name="zoomIn" size={15} />
      </button>)}</div>
    <Dialog.Root open={!!preview} onOpenChange={open => { if (!open) { setPreview(null); setZoom(1); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.imageViewerOverlay} />
        <Dialog.Content className={`${s.surface} ${s.imageViewer}`} data-mode={prefs.appearance} data-font={prefs.font} style={scaleStyle(prefs.fontSize)}>
          <div className={s.imageViewerHeader}><div><Dialog.Title>{preview?.name || 'Photograph'}</Dialog.Title><Dialog.Description>Attached photograph preview</Dialog.Description></div><Dialog.Close asChild><button type="button" className={s.imageViewerClose} aria-label="Close image viewer"><Icon name="close" size={19}/></button></Dialog.Close></div>
          <div className={s.imageStage} data-zoomed={zoom > 1} role="button" tabIndex={0} aria-label="Image zoom area. Double-click or press Enter to zoom." onWheel={event => { event.preventDefault(); changeZoom(event.deltaY < 0 ? .25 : -.25); }} onDoubleClick={() => setZoom(current => current === 1 ? 2 : 1)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setZoom(current => current === 1 ? 2 : 1); } if (event.key === '+' || event.key === '=') changeZoom(.25); if (event.key === '-') changeZoom(-.25); if (event.key === '0') setZoom(1); }}>
            <div className={s.imageZoomSurface} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
              {preview && /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview.url} alt={`Full view of ${preview.name}`} />}
            </div>
          </div>
          <div className={s.imageViewerControls}><button type="button" disabled={zoom <= 1} aria-label="Zoom out" onClick={() => changeZoom(-.25)}><Icon name="zoomOut" size={18}/></button><button type="button" className={s.zoomValue} onClick={() => setZoom(1)} aria-label="Reset image zoom">{Math.round(zoom * 100)}%</button><button type="button" disabled={zoom >= 4} aria-label="Zoom in" onClick={() => changeZoom(.25)}><Icon name="zoomIn" size={18}/></button><span>Scroll or double-click to zoom</span></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}

