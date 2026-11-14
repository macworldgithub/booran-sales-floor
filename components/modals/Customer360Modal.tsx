'use client';

import { useAuth } from '@/lib/auth';
import { useDialog } from '@/lib/use-dialog';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Car,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Lead } from '@/lib/types';
import { leadApi } from '@/lib/api';
import { CustomerMessages } from '@/components/customer/CustomerMessages';
import { CustomerPhoneEditor } from '@/components/customer/CustomerPhoneEditor';
import { CustomerEmailEditor } from '@/components/customer/CustomerEmailEditor';
import { CustomerMerge } from '@/components/customer/CustomerMerge';
import { LeadAssignment } from '@/components/customer/LeadAssignment';
import { LostLeadReview } from '@/components/customer/LostLeadReview';
import { LeadFollowUp } from '@/components/customer/LeadFollowUp';
import { WorkflowHistory } from '@/components/customer/WorkflowHistory';
import { ConnexLeadActions } from '@/components/customer/ConnexLeadActions';

interface Customer360ModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onLeadMerged?: (primary: Lead) => void;
  onOpenBookDrive?: (lead: Lead) => void;
  focusMessages?: boolean;
}

export function Customer360Modal({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onLeadMerged,
  onOpenBookDrive,
  focusMessages = false,
}: Customer360ModalProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [requestLost, setRequestLost] = useState(false);

  const { user } = useAuth();
  const dialogRef = useDialog(isOpen, onClose);
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && focusMessages) messagesRef.current?.scrollIntoView({ block: 'start' });
  }, [isOpen, lead?._id, focusMessages]);

  if (!isOpen || !lead) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isUpdatingStatus || isSubmittingNote) return;
    setMutationError(null);
    setIsSubmittingNote(true);
    try {
      const res = await leadApi.addNote(lead._id, newNote.trim(), user?.name);
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        setToastMessage('Note added to customer timeline');
        setNewNote('');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      setMutationError(err.message || 'Unable to save note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'lost') { setRequestLost(true); return; }
    if (isUpdatingStatus || isSubmittingNote) return;
    setMutationError(null);
    setIsUpdatingStatus(true);
    try {
      const res = await leadApi.updateLead(lead._id, { status: newStatus });
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        setToastMessage(`Status updated to ${newStatus}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      setMutationError(err.message || 'Unable to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="Customer360" tabIndex={-1} className="relative w-full max-w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92dvh] sm:max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
              {lead.initials || 'PR'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{lead.name || lead.customer_name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">
                  {lead.deal_id || 'CRM Lead'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                {lead.dealership} · Host: {lead.owner_name || 'Sales Floor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mutationError && <p role="alert" className="bg-red-50 p-4 text-sm text-red-700">{mutationError}</p>}
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-100/80 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-500" />
              <CustomerPhoneEditor key={lead._id} lead={lead} disabled={sendingMessage} onUpdated={(updated) => { onLeadUpdated?.(updated); setToastMessage('Mobile number saved'); }} onEditingChange={setEditingPhone} />
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500" />
              <CustomerEmailEditor key={lead._id} lead={lead} onUpdated={updated => { onLeadUpdated?.(updated); setToastMessage('Email saved'); }} />
            </div>
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-slate-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Vehicle</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {lead.vehicle || `${lead.make} ${lead.model}`}
                </p>
              </div>
            </div>
          </div>

          {/* Status & Quick Action Workflow */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <div>
              <p className="text-xs font-bold text-slate-900 mb-1">CRM Deal Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {['new_lead', 'following_up', 'sold', 'returned', 'lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={isUpdatingStatus || isSubmittingNote || lead.loss_review?.status === 'pending' || (st === 'lost' && ['lost', 'sold'].includes(lead.status))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      lead.status === st
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {onOpenBookDrive && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBookDrive(lead);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Book Test Drive</span>
              </button>
            )}
          </div>

          <CustomerDetails key={lead._id} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />
          {(lead.source || lead.business_name) && <div className="space-y-1 text-xs text-slate-600">
            {lead.business_name && <p>{lead.business_name}</p>}
            {lead.source && <p>{[lead.source, lead.source_channel, lead.source_stage].filter(Boolean).join(' · ')}</p>}
            {lead.source_comments && <p className="whitespace-pre-wrap">{lead.source_comments}</p>}
            {lead.external && <p>{lead.source} reference {lead.external.id}{lead.external.opportunity_status ? ` · ${lead.external.opportunity_status}` : ''}{!lead.external.details_revealed && !lead.phone ? ' · Contact details pending' : ''}</p>}
          </div>}
          {user?.canAllocate && <LeadAssignment key={lead._id} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />}
          <ConnexLeadActions key={`connex-${lead._id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} onRequestLost={() => setRequestLost(true)} />
          {!!lead.source_refs?.length && <details className="rounded-xl border p-3 text-xs"><summary className="cursor-pointer font-semibold">Linked source enquiries ({lead.source_refs.length})</summary>{lead.source_refs.map((source, index) => <div className="mt-2 space-y-1" key={`${source.deal_id}-${index}`}><p>{source.source} · {source.deal_id} · {source.sms_campaign?.stage || source.nexgate?.stage}</p>{source.nexgate?.comments && <p className="whitespace-pre-wrap">{source.nexgate.comments}</p>}</div>)}</details>}
          {!!lead.alternate_phones?.length && <p className="text-xs text-slate-600">Other mobiles from merged enquiries: {lead.alternate_phones.join(', ')}</p>}
          <LeadFollowUp key={`${lead._id}-${lead.owner_id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />
          <LostLeadReview key={`loss-${lead._id}`} lead={lead} requestOpen={requestLost} onUpdated={updated => { setRequestLost(false); onLeadUpdated?.(updated); }} />
          {user?.canAllocate && <CustomerMerge key={`merge-${lead._id}`} lead={lead} onMerged={primary => { (onLeadMerged || onLeadUpdated)?.(primary); }} />}
          <WorkflowHistory key={`history-${lead._id}`} leadId={lead._id} />
          <div ref={messagesRef}><CustomerMessages key={lead._id} lead={lead} contactBusy={editingPhone} onBusyChange={setSendingMessage} onMessageSent={() => {
            leadApi.getLead(lead._id).then((result) => { if (result.data) onLeadUpdated?.(result.data); }).catch(() => {});
          }} /></div>

          {/* Timeline & Diary Entries */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              CRM Activity & Diary Notes
            </h4>

            {lead.diary_entries && lead.diary_entries.length > 0 ? (
              <div className="space-y-2.5">
                {lead.diary_entries.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1 font-mono">
                      <span>{entry.author || 'Consultant'}</span>
                      <span>{entry.date ? new Date(entry.date).toLocaleString('en-AU') : ''}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{entry.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No previous notes recorded for this deal.
              </div>
            )}

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log customer contact notes, callback requests..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={isSubmittingNote || isUpdatingStatus || !newNote.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDetails({ lead, onUpdated }: { lead: Lead; onUpdated: (lead: Lead) => void }) {
  const fields = [
    ['customer_name', 'Customer name', lead.name],
    ['customer_email', 'Email', lead.email],
    ['vehicle_make', 'Vehicle make', lead.make],
    ['vehicle_model', 'Vehicle model / interest', lead.model],
  ] as const;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section className="space-y-2 rounded-xl border p-3 text-xs">
    <button type="button" className="font-semibold text-blue-700" aria-expanded={open} disabled={busy} onClick={() => { setOpen(!open); setError(''); }}>
      {open ? 'Cancel editing' : 'Edit customer details'}
    </button>
    {open && <form className="space-y-2" onSubmit={async event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const changes = Object.fromEntries(fields.map(([key]) => [key, String(values.get(key) ?? '').trim()]).filter(([key, value]) => value !== String(lead[key as keyof Lead] ?? '')));
      if (!Object.keys(changes).length) { setOpen(false); return; }
      setBusy(true); setError('');
      try {
        const result = await leadApi.updateLead(lead._id, changes);
        if (result.data) onUpdated(result.data);
        setOpen(false);
      } catch (reason) { setError((reason as Error).message); }
      finally { setBusy(false); }
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([key, label, value]) => <label key={key}>{label}<input name={key} defaultValue={value || ''}
          type={key === 'customer_email' ? 'email' : 'text'} required={key === 'customer_name'} maxLength={key === 'customer_email' ? 254 : 200}
          disabled={busy} className="mt-1 block w-full rounded-lg border p-2" /></label>)}
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save details'}</button>
    </form>}
  </section>;
}
