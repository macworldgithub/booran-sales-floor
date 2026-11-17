import { fetchApi } from './api';
import type { Lead, CustomerMedia } from './types';
export const crmApi = {
    approvals: (rooftop: string, signal?: AbortSignal) => fetchApi<{
        requests: {
            kind: 'followup' | 'loss' | 'consent';
            lead: Lead;
            review: {
                id: string;
                title?: string;
                due_at?: string;
                reason?: string;
                opt_out?: boolean;
                requested_name: string;
            };
        }[];
        merges: {
            id: string;
        }[];
        limit: number;
    }>(`/manager-approvals?rooftop=${encodeURIComponent(rooftop)}`, { signal }),
    review: (id: string, kind: 'followup' | 'consent', reviewId: string, action: string, notes: string) => fetchApi<Lead>(`/leads/${encodeURIComponent(id)}/${kind === 'followup' ? 'followup-review' : 'consent-review'}`, { method: 'POST', body: JSON.stringify({ reviewId, action, notes }) }),
    consent: (id: string, optOut: boolean, reason: string) => fetchApi<Lead>(`/leads/${encodeURIComponent(id)}/consent`, { method: 'POST', body: JSON.stringify({ optOut, reason }) }),
    lossCategories: () => fetchApi<string[]>('/crm/loss-categories'),
    duplicateCheck: (dealership: string, phone: string, email: string, signal?: AbortSignal) => fetchApi<{
        duplicate: boolean;
        customers: Lead[];
    }>(`/crm/duplicate-check?${new URLSearchParams({ dealership, phone, email })}`, { signal }),
    bulkAssign: (leads: Lead[], assigneeId: string) => fetchApi<{
        reassigned: string[];
        errors: {
            id: string;
            error: string;
        }[];
    }>('/leads/bulk-assignment', { method: 'POST', body: JSON.stringify({ assigneeId, leads: leads.map(lead => ({ id: lead._id, expectedOwnerId: lead.owner_id || null })) }) }),
    library: (rooftop: string, signal?: AbortSignal) => fetchApi<{
        id: string;
        title: string;
        dealership: string;
    }[]>(`/video-library?rooftop=${encodeURIComponent(rooftop)}`, { signal }),
    attachClip: (leadId: string, id: string) => fetchApi<CustomerMedia>(`/leads/${encodeURIComponent(leadId)}/video-library/${encodeURIComponent(id)}/attach`, { method: 'POST', body: '{}' }),
    publishClip: (leadId: string, id: string, title: string, confirmNoCustomerDetails: boolean) => fetchApi(`/leads/${encodeURIComponent(leadId)}/media/${encodeURIComponent(id)}/publish-template`, { method: 'POST', body: JSON.stringify({ title, confirmNoCustomerDetails }) }),
    withdrawClip: (id: string) => fetchApi(`/video-library/${encodeURIComponent(id)}`, { method: 'DELETE', body: '{}' }),
};
export function needsActionToday(lead: Lead, now = new Date()): boolean {
    if (!['new_lead', 'following_up', 'returned'].includes(lead.status) || lead.loss_review?.status === 'pending' || lead.next_action_review?.status === 'pending' || ['completed', 'awaiting_approval'].includes(lead.next_action?.status || ''))
        return false;
    const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    if (!lead.next_action?.due_at)
        return true;
    const due = new Date(lead.next_action.due_at);
    return !Number.isFinite(+due) || day(due) <= day(now);
}
