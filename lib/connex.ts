import { fetchApi } from './api';
export interface ConnexSnapshot {
  recordId: string; url: string; opportunityName: string; name: string; phone: string; email: string;
  vehicle: string; type: string; stage: string; subStatus: string; salesperson: string;
  summary: string; comments: string; latestNote: string; lostReason: string; createdAt?: string; lastModifiedAt?: string;
}
export interface ConnexRecord {
  recordId: string; leadId?: string; mergeRequestId?: string; snapshot: ConnexSnapshot; detailsPending: boolean;
  lastPullAt: string; acceptanceDueAt?: string; acceptanceOverdue: boolean; notAcceptedThreeDays: boolean; openSixWeeks: boolean; notUpdatedFourDays?: boolean; outcome?: string; milestoneError?: string;
}
export interface ConnexJob { id: string; recordId: string; leadId: string; action: string; status: string; error?: string; attempts: number; createdAt: string; dueAt?: string; overdue?: boolean }
export interface ConnexStatus {
  configured: boolean; writesEnabled: boolean; running: boolean; requestedAt?: string; lastPullAt?: string;
  phase?: string; retryAt?: string; errorPhase?: string; errorCode?: string; lastErrorAt?: string; recovering?: boolean;
  milestoneErrors?: number;
  discoveryWarning?: string; activeDiscovered?: number; activeCoverageConfirmed?: boolean;
  complete: boolean; discovered: number; pendingDetails: number; failedPulls: number; error?: string; records: number; imported: number; mergeReviews: number; masked: number;
  acceptanceOverdue: number; notAcceptedThreeDays: number; openSixWeeks: number; jobs: ConnexJob[];
  staff: { id: string; name: string; connexName: string }[];
}
export interface ConnexCustomer { configured: boolean; writesEnabled: boolean; records: ConnexRecord[]; jobs: ConnexJob[]; lostReasons?: string[] }
export interface ConnexFilters { view: string; search: string; stage: string; type: string; salesperson: string; from: string; to: string; sort: string }
export const emptyFilters: ConnexFilters = { view: 'all', search: '', stage: '', type: '', salesperson: '', from: '', to: '', sort: 'newest' };
export interface SavedConnexView { id: string; name: string; filters: ConnexFilters }
export interface ConnexPreferences { newAlerts: boolean; escalations: boolean; email: boolean; sms: boolean; phone: string }
export interface ConnexPreferenceData { preferences: ConnexPreferences; emailAddress: string; emailConfigured: boolean; smsConfigured: boolean; deliveries: {id:string;channel:string;type:string;status:string;createdAt:string;error?:string}[] }
export interface ConnexCalendar { dates: string[]; extraDates: string[]; removedDates: string[]; years: number[]; warning: string; sources: string[] }
export const pendingJob = (job: ConnexJob) => ['queued', 'processing', 'retry'].includes(job.status);
export const connexApi = {
  status: (signal?: AbortSignal) => fetchApi<ConnexStatus>('/connex/status', { signal }),
  records: (filter: ConnexFilters, page: number, signal?: AbortSignal) => fetchApi<ConnexRecord[]>(`/connex/records?${new URLSearchParams({ ...filter, page: String(page) })}`, { signal }) as Promise<Awaited<ReturnType<typeof fetchApi<ConnexRecord[]>>> & {facets?:{types:string[];salespeople:string[]}}>,
  sync: () => fetchApi('/connex/sync', { method: 'POST' }),
  import: (reference: string) => fetchApi('/connex/opportunities', { method: 'POST', body: JSON.stringify({ reference }) }),
  staffMap: (staffMap: Record<string, string>) => fetchApi('/connex/staff-map', { method: 'PUT', body: JSON.stringify({ staffMap }) }),
  customer: (id: string, signal?: AbortSignal) => fetchApi<ConnexCustomer>(`/leads/${encodeURIComponent(id)}/connex`, { signal }),
  action: (id: string, input: { action: string; recordId: string; requestId: string; note?: string; subStatus?: string; lostReason?: string }) =>
    fetchApi<ConnexJob>(`/leads/${encodeURIComponent(id)}/connex/actions`, { method: 'POST', body: JSON.stringify(input) }),
  retry: (id: string) => fetchApi(`/connex/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
  bulk: (input: {recordIds:string[];action:string;requestId:string;subStatus?:string;lostReason?:string}) => fetchApi<{jobs:ConnexJob[];errors:{recordId:string;error:string}[]}>('/connex/bulk-actions',{method:'POST',body:JSON.stringify(input)}),
  options: () => fetchApi<{statuses:string[];lostReasons:string[]}>('/connex/options'),
  views: () => fetchApi<{views:SavedConnexView[];pinnedId:string}>('/connex/views'),
  saveView: (input: {action:string;id?:string;name?:string;filters?:ConnexFilters}) => fetchApi<{views:SavedConnexView[];pinnedId:string}>('/connex/views',{method:'PUT',body:JSON.stringify(input)}),
  preferences: () => fetchApi<ConnexPreferenceData>('/connex/notification-preferences'),
  savePreferences: (input: ConnexPreferences) => fetchApi('/connex/notification-preferences',{method:'PUT',body:JSON.stringify(input)}),
  calendar: () => fetchApi<ConnexCalendar>('/connex/calendar'),
  saveCalendar: (input: {extraDates:string[];removedDates:string[]}) => fetchApi('/connex/calendar',{method:'PUT',body:JSON.stringify(input)}),
  importReferences: (text:string) => fetchApi<{queued:number}>('/connex/import-references',{method:'POST',body:JSON.stringify({text})}),
};
