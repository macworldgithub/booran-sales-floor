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

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }
    // Default production Vercel backend deployment fallback
    return 'https://booran-sales-floor-backend.vercel.app/api';
  }
  return 'http://localhost:5001/api';
}

const TOKEN_KEY = 'booran_auth_token';

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getToken = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY) || '';
  }
  return '';
};

export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: any; error?: string }> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const json = await response.json();
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
  logout: async () => {
    clearToken();
  },
};

// ─── CRM & LEADS (FLWUP_CRM) ─────────────────────────────────────────────────

export const leadApi = {
  getLeads: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Lead[]>(`/leads${query}`);
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
  getVehicles: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Vehicle[]>(`/inventory/vehicles${query}`);
  },
  getVehicle: (id: string) => fetchApi<Vehicle>(`/inventory/vehicles/${id}`),
  softHold: (id: string, payload: { prospectName: string; notes?: string; consultant?: string }) =>
    fetchApi<any>(`/inventory/vehicles/${id}/soft-hold`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  releaseHold: (id: string) =>
    fetchApi<any>(`/inventory/vehicles/${id}/release-hold`, { method: 'POST' }),
  getActionItems: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<ActionItem[]>(`/inventory/action-items${query}`);
  },
  updateActionItem: (id: string, data: { status: string; resolvedNotes?: string }) =>
    fetchApi<any>(`/inventory/action-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getInventoryRooftops: () => fetchApi<Rooftop[]>('/inventory/rooftops'),
  getInventoryStats: () => fetchApi<any>('/inventory/stats'),
  getFeedLogs: () => fetchApi<FeedLog[]>('/inventory/feed-logs'),
};

// ─── APPOINTMENTS ────────────────────────────────────────────────────────────

export const appointmentApi = {
  getAppointments: () => fetchApi<Appointment[]>('/appointments'),
  createAppointment: (data: Partial<Appointment>) =>
    fetchApi<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── STAFF ───────────────────────────────────────────────────────────────────

export const staffApi = {
  getStaff: () => fetchApi<StaffMember[]>('/staff'),
};

// ─── UNIFIED DASHBOARD & SEARCH ──────────────────────────────────────────────

export const unifiedApi = {
  getSummary: () => fetchApi<UnifiedSummary>('/unified/summary'),
  search: (query: string) =>
    fetchApi<{ leads: Lead[]; vehicles: Vehicle[]; actionItems: ActionItem[] }>(
      `/unified/search?q=${encodeURIComponent(query)}`
    ),
};
