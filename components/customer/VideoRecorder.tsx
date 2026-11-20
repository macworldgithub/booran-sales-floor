'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialog } from '@/lib/use-dialog';
import { captureCrop, captureSize, type VideoOrientation } from '@/lib/video-capture';
import { createRecorder, makeRecordedFile, type RecordingDetails } from '@/lib/video-recording';

type Session = { camera?: MediaStream; output?: MediaStream; recorder?: MediaRecorder; timer?: number; frame?: number; closed: boolean; failed?: boolean; startedAt?: number; stoppedAt?: number; hidden?: () => void };

export function VideoRecorder({ onSave, onClose, uploadProgress = '' }: { onSave: (file: File, details: RecordingDetails) => Promise<void>; onClose: () => void; uploadProgress?: string }) {
  const preview = useRef<HTMLVideoElement>(null), session = useRef<Session>({ closed: false });
  const [orientation, setOrientation] = useState<VideoOrientation>(() => typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const [recording, setRecording] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState('');
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false), durationMs = useRef(0);
  const close = () => { if (!saveLock.current) onClose(); };
  const dialog = useDialog(true, close);

  useEffect(() => {
    if (previewUrl) return;
    const current: Session = { closed: false };
    session.current = current;
    setReady(false); setError('');
    const size = captureSize(orientation);
    navigator.mediaDevices?.getUserMedia ? navigator.mediaDevices.getUserMedia({ audio: true,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: size.width }, height: { ideal: size.height },
        aspectRatio: { ideal: size.width / size.height }, frameRate: { ideal: 30, max: 30 } },
    }).then(stream => {
      if (current.closed) { stream.getTracks().forEach(track => track.stop()); return; }
      current.camera = stream;
      if (preview.current) {
        preview.current.onloadedmetadata = () => { if (!current.closed) { void preview.current?.play().catch(() => {}); setReady(true); } };
        preview.current.srcObject = stream;
      }
    }).catch(reason => { if (!current.closed) setError(reason instanceof Error ? reason.message : 'Unable to open the camera.'); })
      : setError('Camera recording requires a supported browser and a secure connection.');
    return () => {
      current.closed = true;
      window.clearTimeout(current.timer);
      if (current.hidden) document.removeEventListener('visibilitychange', current.hidden);
      if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
      if (current.recorder?.state === 'recording') current.recorder.stop();
      current.camera?.getTracks().forEach(track => track.stop());
      current.output?.getTracks().forEach(track => track.stop());
    };
  }, [orientation, retryCount, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reRecord = () => {
    setPreviewUrl(null);
    setRecordedFile(null);
    setRetryCount(c => c + 1);
  };

  const start = () => {
    const current = session.current, video = preview.current;
    if (!ready || !current.camera || !video || current.recorder?.state === 'recording') return;
    setError('');
    try {
      const canvas = document.createElement('canvas'), size = captureSize(orientation);
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context || !canvas.captureStream) throw new Error('This browser cannot record the selected orientation. Use Upload photos / videos instead.');
      const draw = () => {
        if (current.closed) return;
        if (video.videoWidth && video.videoHeight) {
          const crop = captureCrop(video.videoWidth, video.videoHeight, orientation);
          context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
        }
        current.frame = window.requestAnimationFrame(draw);
      };
      draw();
      const output = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...current.camera.getAudioTracks()]);
      current.output = output;
      const recorder = createRecorder(output);
      current.failed = false;
      current.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        current.failed = true;
        if (!current.closed) { setRecording(false); setReady(false); setError('The camera could not finish recording. Close this recorder and try again.'); }
        current.camera?.getTracks().forEach(track => track.stop());
      };
      recorder.onstop = () => {
        window.clearTimeout(current.timer);
        if (current.hidden) document.removeEventListener('visibilitychange', current.hidden);
        if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
        current.output?.getTracks().forEach(track => track.stop());
        current.camera?.getTracks().forEach(track => track.stop());
        if (current.closed || current.failed) return;
        setRecording(false); setReady(false);
        if (!chunks.length) { setError('The recording was empty. Close this recorder and try again.'); return; }
        try {
          const file = makeRecordedFile(chunks, recorder.mimeType, orientation);
          durationMs.current = Math.max(1, Math.min(180000, Math.round((current.stoppedAt ?? performance.now()) - (current.startedAt ?? performance.now()))));
          setRecordedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to finish recording.'); }
      };
      recorder.start(1000); setRecording(true);
      current.startedAt = performance.now();
      const stop = () => { if (recorder.state === 'recording') { current.stoppedAt = performance.now(); recorder.stop(); } };
      current.timer = window.setTimeout(stop, 178000);
      current.hidden = () => { if (document.hidden) stop(); };
      document.addEventListener('visibilitychange', current.hidden);
    } catch (reason) {
      if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
      current.output?.getTracks().filter(track => track.kind === 'video').forEach(track => track.stop());
      setError(reason instanceof Error ? reason.message : 'Unable to start recording.');
    }
  };

  const save = async () => {
    if (!recordedFile || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try { await onSave(recordedFile, { durationMs: durationMs.current }); }
    catch (reason) { setError(`${reason instanceof Error ? reason.message : 'Unable to upload this recording.'} Your recording is still here. Retry the upload or download a copy.`); }
    finally { saveLock.current = false; setSaving(false); }
  };

  return <div ref={dialog} data-app-dialog role="dialog" aria-modal="true" aria-label="Customer video recorder" tabIndex={-1} className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-slate-950 p-4 text-white">
    <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold">{previewUrl ? 'Review recorded video' : 'Record customer video'}</h3>
      <button type="button" disabled={saving} onClick={close} className="rounded-lg border border-white/40 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
    </div>
    {!previewUrl && (
      <label className="flex items-center gap-2 text-sm">Video orientation<select aria-label="Video orientation" disabled={recording} value={orientation} onChange={event => setOrientation(event.target.value as VideoOrientation)} className="rounded-lg border bg-slate-900 p-2"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
    )}
    <div className={`relative w-full overflow-hidden rounded-xl bg-black ${orientation === 'portrait' ? 'max-w-[min(75vw,36dvh)] aspect-[9/16]' : 'max-w-5xl aspect-video'}`}>
      {previewUrl ? (
        <video controls autoPlay playsInline src={previewUrl} aria-label="Recorded video playback" className="h-full w-full object-contain" />
      ) : (
        <video ref={preview} autoPlay muted playsInline aria-label="Camera preview" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
    {error && <p role="alert" className="max-w-xl text-center text-sm text-red-300">{error}</p>}
    {previewUrl ? (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={saving} onClick={reRecord} className="rounded-lg border border-white/60 bg-transparent px-5 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">Re-record video</button>
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Uploading recording…' : error ? 'Retry upload' : 'Use this video'}</button>
        <a href={previewUrl} download={recordedFile?.name} className="text-sm underline">Download recording</a>
        {saving && <p role="status" className="w-full text-center text-sm">{uploadProgress || 'Preparing upload…'} · Keep this page open.</p>}
      </div>
    ) : (
      <>
        <p className="text-center text-sm" role="status">{recording ? `Recording ${orientation} · up to three minutes. Keep this page visible.` : ready ? 'Rotate your device if needed, then start recording. Orientation stays fixed for this clip.' : 'Opening camera…'}</p>
        <button type="button" disabled={recording ? false : !ready} onClick={() => { if (recording) { const current = session.current; if (current.recorder?.state === 'recording') { current.stoppedAt = performance.now(); current.recorder.stop(); } } else start(); }} className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold disabled:opacity-50">{recording ? 'Stop and review' : 'Start recording'}</button>
      </>
    )}
  </div>;
}
