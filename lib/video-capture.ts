export type VideoOrientation = 'landscape' | 'portrait';
export const captureSize = (orientation: VideoOrientation) => orientation === 'portrait'
  ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
export function captureCrop(sourceWidth: number, sourceHeight: number, orientation: VideoOrientation) {
  const { width, height } = captureSize(orientation);
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale, cropHeight = height / scale;
  return { x: (sourceWidth - cropWidth) / 2, y: (sourceHeight - cropHeight) / 2, width: cropWidth, height: cropHeight };
}
