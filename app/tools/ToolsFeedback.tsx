// app/tools/ToolsFeedback.tsx — write a suggestion, or record one by voice, and send it with the signed-in account.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Field, Icon, Textarea } from '@/components/ui-system';

export function ToolsFeedback({ onSubmit, onCancel }: { onSubmit: (text: string, audio?: Blob) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob>();
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { if (!recording) return; const timer = window.setInterval(() => setSeconds(value => value + 1), 1000); return () => window.clearInterval(timer); }, [recording]);
  function removeAudio() { setAudio(undefined); setAudioUrl(''); }
  async function toggleRecording() {
    if (recording) { recorder.current?.requestData(); recorder.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      chunks.current = []; setSeconds(0);
      const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined); recorder.current = next;
      next.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      next.onerror = () => setError('The recording could not be completed. Please try again.');
      next.onstop = () => {
        const type = (next.mimeType || preferred || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type });
        if (blob.size) { setAudio(blob); setAudioUrl(URL.createObjectURL(blob)); setError(''); } else setError('No sound was captured. Check the selected microphone and try again.');
        setRecording(false); stream.getTracks().forEach(track => track.stop());
      };
      next.start(250); setRecording(true); setError('');
    } catch { setError('Microphone access was not available. You can still send written feedback.'); }
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="What should we improve?">
        <Textarea aria-label="Feedback or suggestion" rows={5} value={text} onChange={event => setText(event.target.value)} placeholder="Describe what you were trying to do, what felt difficult, or what would help…" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={recording ? 'danger-quiet' : 'secondary'} icon={recording ? 'warning' : 'attachment'} onClick={toggleRecording}>{recording ? 'Stop recording' : 'Record audio feedback'}</Button>
        {audio && !recording && (
          <span className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />Audio ready · {Math.max(1, Math.round(audio.size / 1024))} KB <Button type="button" variant="ghost" size="sm" onClick={removeAudio}>Remove</Button></span>
        )}
      </div>
      {recording && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 font-sans text-body-sm text-ink">
          <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-danger" /><strong>Recording</strong>
          <time className="tabular text-ink-muted">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</time>
        </div>
      )}
      {audioUrl && (
        <div className="flex flex-col gap-1">
          <strong className="font-sans text-caption text-ink-muted">Review your recording</strong>
          <audio controls preload="metadata" src={audioUrl} aria-label="Recorded feedback preview" className="w-full"><track kind="captions" srcLang="en" label="No captions available" />Your browser does not support audio playback.</audio>
        </div>
      )}
      {error && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{error}</p>}
      <p className="font-sans text-caption text-ink-muted">Play the recording before sending if you want to check it. Feedback is associated with the signed-in prototype account so the product team can follow the context.</p>
      <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
        <Button type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="primary" disabled={!text.trim() && !audio} onClick={() => onSubmit(text.trim(), audio)}>Send feedback</Button>
      </div>
    </div>
  );
}
