'use client';

import { useEffect, useRef, useState } from 'react';

const formats = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function VideoRecorder({ onSave, onClose }: { onSave: (file: File) => void; onClose: () => void }) {
  const preview = useRef<HTMLVideoElement>(null);
  const session = useRef<{ stream?: MediaStream; recorder?: MediaRecorder; timer?: number; closed: boolean }>({ closed: false });
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const current: typeof session.current = { closed: false };
    session.current = current;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          throw new Error('Camera recording requires a supported browser and a secure connection.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (current.closed) { stream.getTracks().forEach(track => track.stop()); return; }
        current.stream = stream;
        if (preview.current) preview.current.srcObject = stream;
        const mimeType = formats.find(format => MediaRecorder.isTypeSupported(format));
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        current.recorder = recorder;
        const chunks: Blob[] = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          window.clearTimeout(current.timer);
          setRecording(false);
          setError('The camera could not finish recording.');
        };
        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          window.clearTimeout(current.timer);
          if (!current.closed && chunks.length) {
            const type = (chunks[0].type || recorder.mimeType).split(';')[0];
            onSave(new File(chunks, `customer-video.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type }));
          } else if (!current.closed) {
            setRecording(false);
            setError('The recording was empty.');
          }
        };
        recorder.start(1000);
        setRecording(true);
        current.timer = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 179000);
      } catch (reason) {
        current.stream?.getTracks().forEach(track => track.stop());
        if (!current.closed) setError(reason instanceof Error ? reason.message : 'Unable to open the camera.');
      }
    }
    // This session is tied to the mounted recorder, including its original customer.
    void start();
    return () => {
      current.closed = true;
      window.clearTimeout(current.timer);
      if (current.recorder?.state === 'recording') current.recorder.stop();
      current.stream?.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="space-y-2 rounded-lg border p-3">
    <video ref={preview} autoPlay muted playsInline aria-label="Camera preview" className="max-h-64 w-full rounded-lg bg-slate-900" />
    <p className="text-xs" role="status">{error || (recording ? 'Recording · up to three minutes' : 'Opening camera…')}</p>
    <div className="flex gap-2">
      <button type="button" disabled={!recording} onClick={() => { if (session.current.recorder?.state === 'recording') session.current.recorder.stop(); }} className="rounded-lg bg-blue-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Stop and save</button>
      <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-xs">Cancel recording</button>
    </div>
  </div>;
}
