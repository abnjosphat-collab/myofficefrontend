'use client';

import { createContext, useContext, useId, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Dialog as SharedDialog, HelpHint, Tooltip as SharedTooltip, type DialogSkin, type TooltipSkin } from '@/components/ui-system';
import { ToolsIcon as Icon } from './ToolsIcon';
import { attachmentError, type Evidence } from './prototype';
import s from './tools.module.css';

export type FontChoice = 'inter' | 'manrope' | 'jakarta';
export type FontSizeChoice = number;
export const ToolsPreferences = createContext({ font: 'inter' as FontChoice, fontSize: 100 as FontSizeChoice, guidance: true });
const scaleStyle = (fontSize: number) => ({ '--font-scale': fontSize / 100 } as CSSProperties);
// Hints use the shared tooltip behaviour (ui-system) dressed in the workspace's own typeface and text size.
const useHintSkin = (extra = ''): TooltipSkin => {
  const prefs = useContext(ToolsPreferences);
  return { className: `${s.surface} ${s.helpTip} ${extra}`.trim(), arrowClassName: s.helpArrow, attrs: { 'data-font': prefs.font, style: scaleStyle(prefs.fontSize) } };
};

export function Help({ label, children }: { label: string; children: ReactNode }) {
  const prefs = useContext(ToolsPreferences);
  const skin = useHintSkin();
  if (!prefs.guidance) return null;
  return <HelpHint label={label} skin={skin} trigger={{ className: s.helpButton, icon: <Icon name="info" size={16} /> }}>{children}</HelpHint>;
}

export function ActionHint({ label, children }: { label: ReactNode; children: ReactElement }) {
  const prefs = useContext(ToolsPreferences);
  const skin = useHintSkin(s.actionHelpTip);
  if (!prefs.guidance) return children;
  return <SharedTooltip side="bottom" content={label} skin={skin}>{children}</SharedTooltip>;
}

export function AnimatedText({ children, value }: { children: ReactNode; value: string | number }) {
  const reduced = useReducedMotion();
  return <AnimatePresence initial={false} mode="wait"><motion.span key={value} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : .16 }} className={s.animatedText}>{children}</motion.span></AnimatePresence>;
}

/** Shared tile-entrance motion: a fade with a slight rise, staggered per index and capped so long lists settle together.
 *  Mount-only (no exit); instant under reduced motion. Spread onto any motion element. */
export function tileEmergeProps(index = 0, reduced: boolean | null = false) {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.18, delay: reduced ? 0 : Math.min(index * 0.025, 0.15) },
  };
}

/** The shared Dialog (focus trap, focus return, dismissal rules) dressed in the workspace's look, typeface and text size. */
export function ToolsDialog({ open, onClose, title, description, wide = false, dismissible = true, children }: { open: boolean; onClose: () => void; title: string; description: string; wide?: boolean; dismissible?: boolean; children: ReactNode }) {
  const prefs = useContext(ToolsPreferences);
  const skin: DialogSkin = {
    overlay: s.dialogOverlay, panel: `${s.surface} ${s.dialogPanel} ${wide ? s.dialogWide : ''}`, header: s.dialogHeader,
    title: s.modalTitle, description: s.drawerSubtitle, body: s.dialogBody, close: s.closeButton, closeIcon: <Icon name="close" size={20} />,
    attrs: { 'data-font': prefs.font, style: scaleStyle(prefs.fontSize) },
  };
  return <SharedDialog open={open} onOpenChange={value => { if (!value) onClose(); }} dismissible={dismissible} title={title} description={description} focusTitle skin={skin}>{children}</SharedDialog>;
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
    <div className={s.fieldHeading}><span>{toolPhoto ? 'Tool photograph & records' : 'Photos & documents'} <small>Optional</small></span><Help label="Attachments">{toolPhoto ? 'The first uploaded image remains attached to the equipment record.' : 'Add a photo of the condition or a PDF report. Saved files stay with the equipment record.'}</Help></div>
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
        <Dialog.Content className={`${s.surface} ${s.imageViewer}`} data-font={prefs.font} style={scaleStyle(prefs.fontSize)}>
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

