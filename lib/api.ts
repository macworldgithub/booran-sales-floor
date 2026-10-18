import {
  Lead,
  Vehicle,
  ActionItem,
  Rooftop,
  FeedLog,
  Appointment,
  StaffMember,
  UnifiedSummary,
} from './types';

// Same-origin proxy keeps the HttpOnly session cookie on the frontend origin.
export function getBaseUrl(): string { return '/api'; }

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: import('./use-paginated-query').PageMetadata; error?: string }> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');


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
    if (response.status === 401 && endpoint !== '/auth/login' && typeof window !== 'undefined') window.dispatchEvent(new Event('booran:unauthorized'));
    if (!response.ok) {
      const error = new Error(json?.message || json?.error || `Request failed (${response.status}). Please retry.`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    if (!json) throw new Error('The server returned an invalid response. Please retry.');
    if (options.method && options.method !== 'GET' && !endpoint.startsWith('/auth/') && typeof window !== 'undefined') window.dispatchEvent(new Event('booran:data-changed'));
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
  me: () => fetchApi<any>('/auth/me'),
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
  getLead: (id: string) => fetchApi<Lead>(`/leads/${id}`),
  createLead: (data: Partial<Lead>) =>
    fetchApi<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) =>
    fetchApi<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (id: string, note: string, author?: string) =>
    fetchApi<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ newNote: note, author }) }),
  getCrmStats: () => fetchApi<any>('/crm/stats'),
  getCrmRooftops: () => fetchApi<Rooftop[]>('/crm/rooftops'),
  getOrganization: () => fetchApi<any>('/crm/organization'),
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
  getVehicle: (id: string) => fetchApi<Vehicle>(`/inventory/vehicles/${id}`),
  softHold: (id: string, payload: { prospectName: string; notes?: string; consultant?: string }) =>
    fetchApi<any>(`/inventory/vehicles/${id}/soft-hold`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  releaseHold: (id: string) =>
    fetchApi<any>(`/inventory/vehicles/${id}/release-hold`, { method: 'POST' }),
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
    fetchApi<any>(`/inventory/action-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getInventoryRooftops: () => fetchApi<Rooftop[]>('/inventory/rooftops'),
  getInventoryStats: () => fetchApi<any>('/inventory/stats'),
  getFeedLogs: (params?: Record<string, string | number>, options?: RequestInit) => fetchApi<FeedLog[]>(`/inventory/feed-logs?${new URLSearchParams(Object.entries(params || {}).map(([key, value]) => [key, String(value)]))}`, options),
};

// ─── APPOINTMENTS ────────────────────────────────────────────────────────────

export const appointmentApi = {
  getAppointments: (params?: Record<string, string | number>, options?: RequestInit) => fetchApi<Appointment[]>(`/appointments?${new URLSearchParams(Object.entries(params || {}).map(([key, value]) => [key, String(value)]))}`, options),
  createAppointment: (data: Partial<Appointment>) =>
    fetchApi<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── STAFF ───────────────────────────────────────────────────────────────────

export const staffApi = {
  getStaff: () => fetchApi<StaffMember[]>('/staff'),
};

// ─── UNIFIED DASHBOARD & SEARCH ──────────────────────────────────────────────

export const unifiedApi = {
  getSummary: (rooftop?: string) => fetchApi<UnifiedSummary>(`/unified/summary?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  search: (query: string) =>
    fetchApi<{ leads: Lead[]; vehicles: Vehicle[]; actionItems: ActionItem[] }>(
      `/unified/search?q=${encodeURIComponent(query)}`
    ),
};
