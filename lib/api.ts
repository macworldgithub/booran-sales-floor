import {
  Lead,
  Vehicle,
  ActionItem,
  Rooftop,
  FeedLog,
  CsvSyncResult,
  Appointment,
  StaffMember,
  UnifiedSummary,
  CustomerMedia,
  CustomerMessage,
  CustomerMessageHistory,
} from './types';

let sessionGeneration = 0;
export function advanceSessionGeneration() { sessionGeneration += 1; }

// Same-origin proxy keeps the HttpOnly session cookie on the frontend origin.
export function getBaseUrl(): string { return '/api'; }

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: import('./use-paginated-query').PageMetadata; error?: string }> {
  const requestGeneration = sessionGeneration;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');


  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      ...options,
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
      headers,
    });

    const json = await response.json().catch(() => null);
    if (requestGeneration === sessionGeneration && response.status === 401 && endpoint !== '/auth/login' && typeof window !== 'undefined') window.dispatchEvent(new Event('booran:unauthorized'));
    if (!response.ok || json?.success === false) {
      const error = new Error(json?.message || json?.error || `Request failed (${response.status}). Please retry.`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    if (!json || Array.isArray(json) || json.success !== true) throw new Error('The server returned an invalid response. Please retry.');
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes((options.method || 'GET').toUpperCase()) && !endpoint.startsWith('/auth/') && typeof window !== 'undefined') window.dispatchEvent(new Event('booran:data-changed'));
    return json;
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password?: string) => {
    const res = await fetchApi<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res;
  },
  me: (options?: RequestInit) => fetchApi<any>('/auth/me', options),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
};

// ─── CRM & LEADS (FLWUP_CRM) ─────────────────────────────────────────────────

export const leadApi = {
  getLeads: (params?: Record<string, string | number>, options?: RequestInit) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Lead[]>(`/leads${query}`, options);
  },
  getLead: (id: string) => fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`),
  createLead: (data: Partial<Lead>) =>
    fetchApi<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) =>
    fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (id: string, note: string, author?: string) =>
    fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ newNote: note, author }) }),
  getCrmStats: () => fetchApi<any>('/crm/stats'),
  getCrmRooftops: (rooftop?: string) => fetchApi<Rooftop[]>(`/crm/rooftops?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  getOrganization: () => fetchApi<any>('/crm/organization'),
  syncFlwup: (options?: { rooftop_id?: string; token?: string }) =>
    fetchApi<any>('/leads/sync-flwup', { method: 'POST', body: JSON.stringify(options || {}) }),
};

export const customerMessageApi = {
  history: (id: string, page = 1, options?: RequestInit) => fetchApi<CustomerMessageHistory>(`/leads/${encodeURIComponent(id)}/messages?page=${page}`, options),
  media: (id: string, options?: RequestInit) => fetchApi<CustomerMedia[]>(`/leads/${encodeURIComponent(id)}/media`, options),
  send: (id: string, data: { body: string; media_ids: string[]; request_id: string }) => fetchApi<CustomerMessage>(`/leads/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  upload: async (id: string, file: File) => {
    const prepared = await fetchApi<{ id: string; upload: { chunk_size: number } }>(`/leads/${encodeURIComponent(id)}/media`, { method: 'POST', body: JSON.stringify({ name: file.name, content_type: file.type, size: file.size }) });
    if (!prepared.data) throw new Error('Unable to prepare this upload.');
    const chunkSize = prepared.data.upload.chunk_size;
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 2 * 1024 * 1024) throw new Error('Invalid upload configuration.');
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
      await fetchApi<{ next_offset: number }>(`/leads/${encodeURIComponent(id)}/media/${encodeURIComponent(prepared.data.id)}/content?offset=${offset}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: chunk });
    }
    return fetchApi<CustomerMedia>(`/leads/${encodeURIComponent(id)}/media/${encodeURIComponent(prepared.data.id)}/complete`, { method: 'POST', body: '{}' });
  },
};

// ─── INVENTORY & CAPITAL TRACKER (BOORAN_INVENTORY_TRACKER) ──────────────────

export const inventoryApi = {
  getVehicles: (params?: Record<string, string | number>, options?: RequestInit) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Vehicle[]>(`/inventory/vehicles${query}`, options);
  },
  getVehicle: (id: string) => fetchApi<Vehicle>(`/inventory/vehicles/${encodeURIComponent(id)}`),
  softHold: (id: string, payload: { prospectName: string; notes?: string; consultant?: string }) =>
    fetchApi<any>(`/inventory/vehicles/${encodeURIComponent(id)}/soft-hold`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  releaseHold: (id: string, expected: { holdId?: string; heldAt?: string }) =>
    fetchApi<Vehicle>(`/inventory/vehicles/${encodeURIComponent(id)}/release-hold`, { method: 'POST', body: JSON.stringify(expected) }),
  getActionItems: (params?: Record<string, string | number>, options?: RequestInit) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<ActionItem[]>(`/inventory/action-items${query}`, options);
  },
  updateActionItem: (id: string, data: { status: string; resolvedNotes?: string }) =>
    fetchApi<any>(`/inventory/action-items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getInventoryRooftops: (rooftop?: string) => fetchApi<Rooftop[]>(`/inventory/rooftops?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  getInventoryStats: () => fetchApi<any>('/inventory/stats'),
  getFeedLogs: (params?: Record<string, string | number>, options?: RequestInit) => fetchApi<FeedLog[]>(`/inventory/feed-logs?${new URLSearchParams(Object.entries(params || {}).map(([key, value]) => [key, String(value)]))}`, options),
  syncCsv: () => fetchApi<CsvSyncResult>('/inventory/sync-csv', { method: 'POST' }),
};

// ─── APPOINTMENTS ────────────────────────────────────────────────────────────

export const appointmentApi = {
  getAppointments: (params?: Record<string, string | number>, options?: RequestInit) => fetchApi<Appointment[]>(`/appointments?${new URLSearchParams(Object.entries(params || {}).map(([key, value]) => [key, String(value)]))}`, options),
  createAppointment: (data: Partial<Appointment>) =>
    fetchApi<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── STAFF ───────────────────────────────────────────────────────────────────

export const staffApi = {
  getStaff: (rooftop?: string, options?: RequestInit) => fetchApi<StaffMember[]>(`/staff?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`, options),
};

// ─── UNIFIED DASHBOARD & SEARCH ──────────────────────────────────────────────

export const unifiedApi = {
  getSummary: (rooftop?: string) => fetchApi<UnifiedSummary>(`/unified/summary?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  search: (query: string, rooftop?: string, options?: RequestInit) =>
    fetchApi<{ leads: Lead[]; vehicles: Vehicle[]; actionItems: ActionItem[] }>(
      `/unified/search?q=${encodeURIComponent(query)}&rooftop=${encodeURIComponent(rooftop || 'All Locations')}`, options
    ),
};
