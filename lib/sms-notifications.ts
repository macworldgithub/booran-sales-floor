import { fetchApi } from './api';
export type SmsReplyNotification = { id: string; kind: 'sms_reply'; leadId: string; customer: string; dealership: string; body: string; createdAt: string; read: boolean };
export type SmsReplyFeed = { items: SmsReplyNotification[]; unreadCount: number; warning: string | null; lastCheckedAt: string | null };
export const smsNotificationsApi = {
  list: (rooftop: string, page: number, unread: boolean, signal?: AbortSignal) => fetchApi<SmsReplyFeed>(`/notifications?rooftop=${encodeURIComponent(rooftop)}&page=${page}&unread=${unread}`, { signal }),
  read: (id: string, rooftop: string) => fetchApi(`/notifications/${encodeURIComponent(id)}/read?rooftop=${encodeURIComponent(rooftop)}`, { method: 'PATCH', body: '{}' }),
  readAll: (rooftop: string) => fetchApi(`/notifications/read-all?rooftop=${encodeURIComponent(rooftop)}`, { method: 'POST', body: '{}' }),
};
