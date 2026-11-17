import { fetchApi } from './api';

export type Partner = { _id: string; dealership: string; kind: 'dealer' | 'wholesaler'; name: string; company: string; email: string; phone: string; licence: string; notes: string; active: boolean; revision: number; source?: string };
export type Offer = { id: string; partner_id: string; name: string; company?: string; amount_cents: number; notes: string; recorded_by: string; createdAt: string };
export type Appraisal = {
  _id: string; lead_id: string; dealership: string; rego: string; vin: string; make: string; model: string; year?: number;
  notes: string; odometer?: number; workflow_status?: string; revision?: number; createdAt: string;
  inspection?: { section: string; condition: string; notes: string; photos: { id: string; name: string }[] }[];
  ppsr?: { status: string; reference?: string; error?: string };
  offers?: Offer[]; offer_requests?: { id: string; name: string; company?: string; status: string }[];
  final_offer?: Offer; licence?: { id: string; name: string }[];
  internal_drives?: { id: string; status: string; driver: string; started_at: string; start_odometer: number; end_odometer?: number; distance_km?: number; duration_seconds?: number; start_notes?: string; end_notes?: string }[];
  internalDrive?: { when: string; notes: string; driver: string };
  loanCar?: { signer: string; signedAt: string; terms: string };
};
export type Archive = { _id: string; source_id: string; kind: string; dealership: string; createdAt: string; source_sha256: string; summary?: { rego?: string; vin?: string; customer?: string; make?: string; model?: string; name?: string }; raw?: Record<string, unknown>; media: { id: string; name: string; size: number }[] };
const query = (params: Record<string, string | number>) => new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
export const appraisalApi = {
  list: (params: Record<string, string | number>, options?: RequestInit) => fetchApi<Appraisal[]>(`/appraisals?${query(params)}`, options),
  partners: (params: Record<string, string | number>, options?: RequestInit) => fetchApi<Partner[]>(`/appraisal-partners?${query(params)}`, options),
  archive: (params: Record<string, string | number>, options?: RequestInit) => fetchApi<Archive[]>(`/iappraise/archive?${query(params)}`, options),
};
export const stages = ['draft', 'ready', 'awaiting_offers', 'valued', 'traded', 'lost', 'archived'];
export function saveJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function uploadInspection(leadId: string, file: File, purpose = 'inspection') {
  const contract = purpose === 'contract';
  if ((!file.type.startsWith('image/') && !(contract && file.type === 'application/pdf')) || file.size > (contract ? 20 : 2) * 1024 * 1024) throw new Error(contract ? 'Choose a PDF or contract image up to 20 MB.' : 'Choose an inspection photo up to 2 MB.');
  const base = `/leads/${encodeURIComponent(leadId)}/media`;
  const prepared = await fetchApi<{ id: string; upload: { chunk_size: number } }>(base, { method: 'POST', body: JSON.stringify({ name: file.name, size: file.size, content_type: file.type, visibility: 'private', purpose }) });
  const media = prepared.data;
  if (!media || !Number.isSafeInteger(media.upload.chunk_size) || media.upload.chunk_size < 1 || media.upload.chunk_size > 2 * 1024 * 1024) throw new Error('Invalid photo upload configuration.');
  for (let offset = 0; offset < file.size; offset += media.upload.chunk_size) {
    await fetchApi(`${base}/${encodeURIComponent(media.id)}/content?offset=${offset}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: file.slice(offset, offset + media.upload.chunk_size), timeoutMs: 90000 });
  }
  await fetchApi(`${base}/${encodeURIComponent(media.id)}/complete`, { method: 'POST', body: '{}' });
  return { id: media.id, name: file.name };
}
