'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialog } from '@/lib/use-dialog';
import { captureCrop, captureSize, type VideoOrientation } from '@/lib/video-capture';

const formats = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];
type Session = { camera?: MediaStream; output?: MediaStream; recorder?: MediaRecorder; timer?: number; frame?: number; closed: boolean; failed?: boolean };

export function VideoRecorder({ onSave, onClose }: { onSave: (file: File) => void; onClose: () => void }) {
  const preview = useRef<HTMLVideoElement>(null), session = useRef<Session>({ closed: false });
  const [orientation, setOrientation] = useState<VideoOrientation>(() => typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const [recording, setRecording] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState('');
  const dialog = useDialog(true, onClose);

  useEffect(() => {
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
      if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
      if (current.recorder?.state === 'recording') current.recorder.stop();
      current.camera?.getTracks().forEach(track => track.stop());
      current.output?.getTracks().forEach(track => track.stop());
    };
  }, [orientation]);

  const start = () => {
    const current = session.current, video = preview.current;
    if (!ready || !current.camera || !video || current.recorder?.state === 'recording') return;
    setError('');
    try {
      if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record video. Use Upload photos / videos instead.');
      const mimeType = formats.find(format => MediaRecorder.isTypeSupported(format));
      if (!mimeType) throw new Error('This browser cannot record MP4 or WebM. Use Upload photos / videos instead.');
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
      const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 });
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
        if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
        current.output?.getTracks().forEach(track => track.stop());
        current.camera?.getTracks().forEach(track => track.stop());
        if (current.closed || current.failed) return;
        setRecording(false); setReady(false);
        if (!chunks.length) { setError('The recording was empty. Close this recorder and try again.'); return; }
        const type = (chunks[0].type || recorder.mimeType).split(';')[0];
        onSave(new File(chunks, `customer-video-${orientation}.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type }));
      };
      recorder.start(1000); setRecording(true);
      current.timer = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 179000);
    } catch (reason) {
      if (current.frame !== undefined) window.cancelAnimationFrame(current.frame);
      current.output?.getTracks().filter(track => track.kind === 'video').forEach(track => track.stop());
      setError(reason instanceof Error ? reason.message : 'Unable to start recording.');
    }
  };

  return <div ref={dialog} data-app-dialog role="dialog" aria-modal="true" aria-label="Customer video recorder" tabIndex={-1} className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-slate-950 p-4 text-white">
    <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Record customer video</h3><button type="button" onClick={onClose} className="rounded-lg border border-white/40 px-3 py-2 text-sm">Cancel recording</button></div>
    <label className="flex items-center gap-2 text-sm">Video orientation<select aria-label="Video orientation" disabled={recording} value={orientation} onChange={event => setOrientation(event.target.value as VideoOrientation)} className="rounded-lg border bg-slate-900 p-2"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
    <div className={`relative w-full overflow-hidden rounded-xl bg-black ${orientation === 'portrait' ? 'max-w-[min(75vw,36dvh)] aspect-[9/16]' : 'max-w-5xl aspect-video'}`}>
      <video ref={preview} autoPlay muted playsInline aria-label="Camera preview" className="absolute inset-0 h-full w-full object-cover" />
    </div>
    <p className="text-center text-sm" role="status">{error || (recording ? `Recording ${orientation} · up to three minutes` : ready ? 'Rotate your device if needed, then start recording. Orientation stays fixed for this clip.' : 'Opening camera…')}</p>
    <button type="button" disabled={recording ? false : !ready} onClick={() => recording ? session.current.recorder?.stop() : start()} className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold disabled:opacity-50">{recording ? 'Stop and save' : 'Start recording'}</button>
  </div>;
}
