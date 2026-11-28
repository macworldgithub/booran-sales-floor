'use client';

import { useAuth } from '@/lib/auth';
import { EngagementIndicator } from '@/components/customer/EngagementIndicator';
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
import { DealWorkflowActions } from '@/components/customer/DealWorkflowActions';
import { ConnexLeadActions } from '@/components/customer/ConnexLeadActions';
import { CustomerConsent } from '@/components/customer/CustomerConsent';
import { CustomerActivityFeed } from '@/components/customer/CustomerActivityFeed';
import { CustomerHistoryTab } from '@/components/customer/CustomerHistoryTab';
import { CustomerBusinessTab } from '@/components/customer/CustomerBusinessTab';
import { VirtualYardSourceDetails } from '@/components/customer/VirtualYardSourceDetails';

interface Customer360ModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onLeadMerged?: (primary: Lead) => void;
  onOpenBookDrive?: (lead: Lead) => void;
  onOpenLead?: (targetLead: Lead) => void;
  focusMessages?: boolean;
}

export function Customer360Modal({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onLeadMerged,
  onOpenBookDrive,
  onOpenLead,
  focusMessages = false,
}: Customer360ModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'business'>('profile');
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [requestLost, setRequestLost] = useState(false);
  const [editingSaleDates, setEditingSaleDates] = useState(false);
  const [completeAction, setCompleteAction] = useState(true);
  const noteAttempt=useRef<{note:string;id:string}|null>(null), noteLock=useRef(false);

  const { user } = useAuth();
  const dialogRef = useDialog(isOpen, onClose);
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && focusMessages) messagesRef.current?.scrollIntoView({ block: 'start' });
  }, [isOpen, lead?._id, focusMessages]);

  if (!isOpen || !lead) return null;

  const hasOpenAction = Boolean(lead.next_action && lead.next_action.status !== 'completed');

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isUpdatingStatus || isSubmittingNote || noteLock.current) return;
    noteLock.current=true;
    setMutationError(null);
    setIsSubmittingNote(true);
    try {
      if(noteAttempt.current?.note!==newNote.trim())noteAttempt.current={note:newNote.trim(),id:crypto.randomUUID()};
      const shouldComplete = hasOpenAction && completeAction;
      const res = await leadApi.addNote(lead._id, newNote.trim(), user?.name, noteAttempt.current!.id, shouldComplete);
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        setToastMessage(shouldComplete ? 'Note added and action marked as completed' : 'Note added to customer timeline');
        setNewNote('');
        noteAttempt.current=null;
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      setMutationError(err.message || 'Unable to save note.');
    } finally {
      noteLock.current=false;setIsSubmittingNote(false);
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
        if (newStatus === 'sold' && user?.canAllocate) setEditingSaleDates(true);
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
          <EngagementIndicator engagement={lead.engagement} active={['new_lead', 'following_up', 'returned'].includes(lead.status)} />
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

          {/* Profile / History / Business Tab Bar */}
          <nav aria-label="Customer profile views" role="tablist" className="flex border-b border-slate-200 overflow-x-auto">
            {([
              ['profile', 'Profile'],
              ['history', 'History'],
              ['business', 'Business'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Status & Quick Action Workflow */}
          {activeTab === 'profile' && <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <div>
              <p className="text-xs font-bold text-slate-900 mb-1">CRM Deal Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {['new_lead', 'following_up', 'sold', 'returned', 'lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={isUpdatingStatus || isSubmittingNote || (lead.loss_review?.status === 'pending' && st !== 'sold') || (st === 'lost' && ['lost', 'sold'].includes(lead.status))}
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
          </div>}

          {activeTab === 'profile' && lead.status === 'sold' && (
            <SaleDetailsEditor
              key={`sale-${lead._id}-${lead.sold_at || ''}-${lead.delivery_date || ''}-${lead.deal_number || ''}`}
              lead={lead}
              canEdit={Boolean(user?.canAllocate)}
              initialOpen={editingSaleDates}
              onUpdated={(updated) => {
                setEditingSaleDates(false);
                onLeadUpdated?.(updated);
                setToastMessage('Sale and delivery dates updated');
                setTimeout(() => setToastMessage(null), 3000);
              }}
            />
          )}

          {activeTab === 'profile' && <CustomerDetails key={`details-${lead._id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />}
          {activeTab === 'profile' && (lead.source || lead.business_name) && <div className="space-y-1 text-xs text-slate-600">
            {lead.business_name && <p>{lead.business_name}</p>}
            {lead.source && <p>{[lead.source, lead.source_channel, lead.source_stage].filter(Boolean).join(' · ')}</p>}
            {lead.source_comments && <p className="whitespace-pre-wrap">{lead.source_comments}</p>}
            {lead.external?.id && <p>{lead.source} reference {lead.external.id}{lead.external.opportunity_status ? ` · ${lead.external.opportunity_status}` : ''}{!lead.external.details_revealed && !lead.phone ? ' · Contact details pending' : ''}</p>}
          </div>}
          {activeTab === 'profile' && (lead.external?.virtualyard?.lead_id || lead.source_refs?.some(ref => ref.external?.virtualyard?.lead_id)) &&
            <VirtualYardSourceDetails key={`virtualyard-${lead._id}`} type="leads" id={lead._id} />}
          {activeTab === 'profile' && user?.canAllocate && <LeadAssignment key={`assign-${lead._id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />}
          {activeTab === 'profile' && <ConnexLeadActions key={`connex-${lead._id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} onRequestLost={() => setRequestLost(true)} />}
          {activeTab === 'profile' && !!lead.source_refs?.length && <details className="rounded-xl border p-3 text-xs"><summary className="cursor-pointer font-semibold">Linked source enquiries ({lead.source_refs.length})</summary>{lead.source_refs.map((source, index) => <div className="mt-2 space-y-1" key={`${source.deal_id}-${index}`}><p>{source.source} · {source.deal_id} · {source.sms_campaign?.stage || source.nexgate?.stage}</p>{source.nexgate?.comments && <p className="whitespace-pre-wrap">{source.nexgate.comments}</p>}</div>)}</details>}
          {activeTab === 'profile' && !!(lead.alternate_phones?.length || lead.alternate_emails?.length) && (
            <div className="space-y-1 text-xs text-slate-600">
              {!!lead.alternate_phones?.length && <p>Additional mobiles: {lead.alternate_phones.join(', ')}</p>}
              {!!lead.alternate_emails?.length && <p>Additional emails: {lead.alternate_emails.join(', ')}</p>}
            </div>
          )}
          {activeTab === 'profile' && <LeadFollowUp key={`followup-${lead._id}-${lead.owner_id}`} lead={lead} onUpdated={updated => onLeadUpdated?.(updated)} />}
          {activeTab === 'profile' && <CustomerConsent key={`consent-${lead._id}`} lead={lead} onUpdated={updated=>onLeadUpdated?.(updated)}/>}
          {activeTab === 'profile' && (!lead.next_action||lead.next_action.status==='completed')&&lead.loss_review?.status!=='pending'&&!['sold','lost'].includes(lead.status)&&<p className="rounded-lg bg-blue-50 p-3 text-sm">Next best action: record a customer contact and choose the next follow-up date above.</p>}
          {activeTab === 'profile' && <LostLeadReview key={`loss-${lead._id}`} lead={lead} requestOpen={requestLost} onUpdated={updated => { setRequestLost(false); onLeadUpdated?.(updated); }} />}
          {activeTab === 'profile' && user?.canAllocate && <CustomerMerge key={`merge-${lead._id}`} lead={lead} onMerged={primary => { (onLeadMerged || onLeadUpdated)?.(primary); }} />}
          {activeTab === 'profile' && <WorkflowHistory key={`history-${lead._id}`} leadId={lead._id} />}
          {activeTab === 'profile' && <DealWorkflowActions key={`deal-actions-${lead._id}`} leadId={lead._id} rooftop={lead.dealership} />}
          {activeTab === 'profile' && <div ref={messagesRef}><CustomerMessages key={lead._id} lead={lead} contactBusy={editingPhone} onBusyChange={setSendingMessage} onMessageSent={() => {
            leadApi.getLead(lead._id).then((result) => { if (result.data) onLeadUpdated?.(result.data); }).catch(() => {});
          }} /></div>}

          {/* Timeline & Diary Entries */}
          {activeTab === 'profile' && <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              CRM Activity & Diary Notes
            </h4>

            <CustomerActivityFeed key={`activity-${lead._id}`} lead={lead} onUpdated={onLeadUpdated}/>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="mt-3 space-y-2">
              <div className="flex gap-2">
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
              </div>
              {hasOpenAction && (
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={completeAction}
                    onChange={(e) => setCompleteAction(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    Mark current action as completed ({lead.next_action?.title || 'Next follow-up'})
                  </span>
                </label>
              )}
            </form>
          </div>}

          {activeTab === 'history' && (
            <CustomerHistoryTab
              key={`tab-history-${lead._id}`}
              lead={lead}
              onLeadUpdated={onLeadUpdated}
            />
          )}

          {activeTab === 'business' && (
            <CustomerBusinessTab
              key={`tab-business-${lead._id}`}
              lead={lead}
              onLeadUpdated={onLeadUpdated}
              onOpenLead={onOpenLead}
            />
          )}
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

function melbourneDayInput(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(+date)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function SaleDetailsEditor({ lead, canEdit, initialOpen, onUpdated }: { lead: Lead; canEdit: boolean; initialOpen: boolean; onUpdated: (lead: Lead) => void }) {
  const [open, setOpen] = useState(initialOpen);
  const [soldDate, setSoldDate] = useState(() => melbourneDayInput(lead.sold_at || lead.created_at));
  const [deliveryDate, setDeliveryDate] = useState(() => melbourneDayInput(lead.delivery_date));
  const [dealNumber, setDealNumber] = useState(() => lead.deal_number || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  return (
    <section aria-label="Sale and delivery details" className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5 text-slate-800">
          <p className="font-bold text-emerald-900">Sale &amp; Delivery Record</p>
          <p>
            Sold date: <strong>{lead.sold_at ? melbourneDayInput(lead.sold_at) : 'Today'}</strong>
            {lead.delivery_date ? ` · Delivered: ${melbourneDayInput(lead.delivery_date)}` : ''}
            {lead.deal_number ? ` · Deal: ${lead.deal_number}` : ''}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => { setOpen(!open); setError(''); }}
            className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            {open ? 'Cancel' : 'Correct sale / delivery date'}
          </button>
        )}
      </div>
      {open && canEdit && (
        <form
          className="grid gap-2 pt-2 sm:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!soldDate) { setError('Choose a sold date.'); return; }
            setBusy(true); setError('');
            try {
              const res = await leadApi.updateLead(lead._id, {
                sold_at: soldDate,
                delivery_date: deliveryDate || undefined,
                deal_number: dealNumber.trim(),
              });
              if (res.data) onUpdated(res.data);
              setOpen(false);
            } catch (reason) {
              setError((reason as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="font-semibold text-slate-700">
            Actual Sold Date
            <input
              type="date"
              required
              value={soldDate}
              disabled={busy}
              onChange={(e) => setSoldDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          </label>
          <label className="font-semibold text-slate-700">
            Delivery Date
            <input
              type="date"
              value={deliveryDate}
              disabled={busy}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          </label>
          <label className="font-semibold text-slate-700">
            Deal Number
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. SM29263"
              value={dealNumber}
              disabled={busy}
              onChange={(e) => setDealNumber(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          </label>
          {error && <p role="alert" className="sm:col-span-3 text-red-700">{error}</p>}
          <div className="sm:col-span-3">
            <button type="submit" disabled={busy} className="rounded-lg bg-emerald-800 px-3 py-2 font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save actual sale date'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
