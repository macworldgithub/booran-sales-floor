import { fetchApi } from './api';

export type TradeInSettings = { enabled: boolean; postSale: boolean; lostLead: boolean; service: boolean; channels: ('sms' | 'email')[]; configured?: boolean; sendingEnabled?: boolean; emailConfigured?: boolean };
export type TradeOpportunity = { _id: string; kind: string; customer: string; phone: string; dealership: string; status: string; channels: Record<string, string>; createdAt: string; appraisal_id?: string };
export type ServiceBooking = { _id: string; reference: string; dealership: string; lead_id: string; vehicle: string; starts_at: string; status: string };
export type LostTradeCall = { _id: string; customer: string; phone: string; dealership: string; reason: string; follow_up?: { notes: string; reason: string; by_name: string; at: string } };

export async function customerTradeRequest<T>(token: string, suffix = '', init: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/public/trade-ins/' + encodeURIComponent(token) + suffix, {
    ...init, headers: { ...(init.body instanceof Blob ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }), ...init.headers },
    cache: 'no-store', signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to complete this request. Please retry.');
  return result.data;
}

export async function reduceTradePhoto(file: File): Promise<File> {
  if (file.size <= 2 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file), scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (blob && blob.size <= 2 * 1024 * 1024) return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { /* HEIC decoding is browser dependent. */ }
  throw new Error('This photo is larger than 2 MB. Please choose a smaller JPG or use your phone’s smaller image setting.');
}
export const tradeInApi = {
  settings: (site: string) => fetchApi<TradeInSettings>('/trade-in/settings?rooftop=' + encodeURIComponent(site)),
  saveSettings: (site: string, settings: TradeInSettings) => fetchApi('/trade-in/settings', { method: 'PUT', body: JSON.stringify({ dealership: site, ...settings }) }),
  opportunities: (params: Record<string, string | number>, options?: RequestInit) => fetchApi<TradeOpportunity[]>('/trade-in/opportunities?' + new URLSearchParams(Object.entries(params).map(([k,v]) => [k,String(v)])), options),
};
