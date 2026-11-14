import { fetchApi } from './api';
export interface ConnexSnapshot {
  recordId: string; url: string; opportunityName: string; name: string; phone: string; email: string;
  vehicle: string; type: string; stage: string; subStatus: string; salesperson: string;
  summary: string; comments: string; latestNote: string; lostReason: string;
}
export interface ConnexRecord {
  recordId: string; leadId?: string; mergeRequestId?: string; snapshot: ConnexSnapshot; detailsPending: boolean;
  lastPullAt: string; acceptanceDueAt?: string; acceptanceOverdue: boolean; notAcceptedThreeDays: boolean; openSixWeeks: boolean; outcome?: string;
}
export interface ConnexJob { id: string; recordId: string; leadId: string; action: string; status: string; error?: string; attempts: number; createdAt: string }
export interface ConnexStatus {
  configured: boolean; writesEnabled: boolean; running: boolean; requestedAt?: string; lastPullAt?: string;
  complete: boolean; discovered: number; pendingDetails: number; failedPulls: number; error?: string; records: number; masked: number;
  acceptanceOverdue: number; notAcceptedThreeDays: number; openSixWeeks: number; jobs: ConnexJob[];
  staff: { id: string; name: string; connexName: string }[];
}
export interface ConnexCustomer { configured: boolean; writesEnabled: boolean; records: ConnexRecord[]; jobs: ConnexJob[] }
export const pendingJob = (job: ConnexJob) => ['queued', 'processing', 'retry'].includes(job.status);
export const connexApi = {
  status: (signal?: AbortSignal) => fetchApi<ConnexStatus>('/connex/status', { signal }),
  records: (view: string, page: number, signal?: AbortSignal) => fetchApi<ConnexRecord[]>(`/connex/records?view=${encodeURIComponent(view)}&page=${page}`, { signal }),
  sync: () => fetchApi('/connex/sync', { method: 'POST' }),
  import: (reference: string) => fetchApi('/connex/opportunities', { method: 'POST', body: JSON.stringify({ reference }) }),
  staffMap: (staffMap: Record<string, string>) => fetchApi('/connex/staff-map', { method: 'PUT', body: JSON.stringify({ staffMap }) }),
  customer: (id: string, signal?: AbortSignal) => fetchApi<ConnexCustomer>(`/leads/${encodeURIComponent(id)}/connex`, { signal }),
  action: (id: string, input: { action: string; recordId: string; requestId: string; note?: string; subStatus?: string; lostReason?: string }) =>
    fetchApi<ConnexJob>(`/leads/${encodeURIComponent(id)}/connex/actions`, { method: 'POST', body: JSON.stringify(input) }),
  retry: (id: string) => fetchApi(`/connex/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
};
