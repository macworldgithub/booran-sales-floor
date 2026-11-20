import type { VideoOrientation } from './video-capture';

export type RecordingDetails = { durationMs: number };
export const recordingFormats = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

export function createRecorder(stream: MediaStream): MediaRecorder {
  if (typeof MediaRecorder !== 'undefined') {
    for (const mimeType of recordingFormats) {
      if (!MediaRecorder.isTypeSupported(mimeType)) continue;
      try { return new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 }); }
      catch { /* Some devices advertise a format their encoder cannot initialize. */ }
    }
  }
  throw new Error('This browser cannot record video. Use Upload photos / videos instead.');
}

export function makeRecordedFile(chunks: Blob[], mimeType: string, orientation: VideoOrientation): File {
  const type = (mimeType || chunks.find(chunk => chunk.type)?.type || '').split(';')[0].toLowerCase();
  if (!chunks.some(chunk => chunk.size) || !['video/webm', 'video/mp4'].includes(type)) throw new Error('The camera could not finish this recording. Please try again.');
  return new File(chunks, `customer-video-${orientation}.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type });
}
