'use client';
import { useEffect, useRef, useState } from 'react';
import { leadApi } from '@/lib/api';
import { oversightApi, type LossAction } from '@/lib/oversight';
import { useAuth } from '@/lib/auth';
import type { Lead } from '@/lib/types';
import { crmApi } from '@/lib/crm-updates';

const DEFAULT_LOST_TEMPLATE =
  "Thank you for considering {dealership} for your vehicle purchase. If you haven't found the right vehicle, please feel free to reach out to us anytime. Otherwise, we'd love the opportunity to help you again one day. All the best.";

function renderTemplate(template: string, lead: Lead) {
  const fullName = String(lead.name || lead.customer_name || '').trim();
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const site = String(lead.dealership || lead.dealership_name || 'us').trim();
  return template
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{customer_name\}/gi, fullName || 'there')
    .replace(/\{dealership\}/gi, site)
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isOlderThan30Days(lead: Lead) {
  const stamp = Date.parse(lead.created_at || '');
  return Number.isFinite(stamp) && (Date.now() - stamp) > 30 * 86400000;
}

export function LostLeadReview({ lead, onUpdated, requestOpen = false }: { lead: Lead; onUpdated: (lead: Lead) => void; requestOpen?: boolean }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const linkedConnex = true; // Standard loss categories apply to every source.
  const [connexReason, setConnexReason] = useState(lead.loss_review?.connex_lost_reason || 'LMS Lost');
  const [connexOptions, setConnexOptions] = useState<string[]>(['LMS Lost']);
  useEffect(() => { let active = true; crmApi.lossCategories().then(result => { if (active && result.data) setConnexOptions(result.data); }).catch(reason => { if (active) setError(reason.message); }); return () => { active = false; }; }, [lead._id]);
  const [notes, setNotes] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [smsNotice, setSmsNotice] = useState('');
  const hasPhone = Boolean((lead.phone || lead.customer_phone || '').trim());
  const olderLead = isOlderThan30Days(lead);
  const canSms = Boolean(hasPhone && !lead.opted_out);
  const [sendFinalSms, setSendFinalSms] = useState(() => canSms && !olderLead);
  const [finalSmsBody, setFinalSmsBody] = useState(() => renderTemplate(DEFAULT_LOST_TEMPLATE, lead));

  useEffect(() => {
    setSendFinalSms(canSms && !olderLead);
    setFinalSmsBody(renderTemplate(DEFAULT_LOST_TEMPLATE, lead));
    setSmsNotice('');
  }, [lead._id, canSms, olderLead]);

  useEffect(() => {
    if (!user?.canAllocate || !lead.dealership) return;
    let active = true;
    crmApi.lostSmsSettings(lead.dealership).then(result => {
      if (!active || !result.data) return;
      setFinalSmsBody(renderTemplate(result.data.template || DEFAULT_LOST_TEMPLATE, lead));
      setSendFinalSms(canSms && !olderLead && result.data.enabled && result.data.smsConfigured);
    }).catch(() => {});
    return () => { active = false; };
  }, [lead._id, lead.dealership, user?.canAllocate, canSms, olderLead]);

  const pending = lead.loss_review?.status === 'pending';
  const section = useRef<HTMLElement>(null);
  useEffect(() => { if (requestOpen) section.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [requestOpen]);
  useEffect(() => {
    if (!pending || !user?.canAllocate) return;
    let active = true;
    leadApi.getAssignees(lead._id).then(result => { if (active) setPeople(result.data || []); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [pending, user?.canAllocate, lead._id]);

  const describeSmsOutcome = (finalSms?: { status: string; reason?: string; error?: string | null }) => {
    if (!finalSms) return;
    if (['queued', 'sent', 'delivered'].includes(finalSms.status)) setSmsNotice('Automated Final SMS queued for customer.');
    else if (finalSms.status === 'skipped') setSmsNotice(`Final SMS skipped (${finalSms.reason?.replaceAll('_', ' ') || 'not eligible'}).`);
    else if (finalSms.error) setSmsNotice(`Final SMS issue: ${finalSms.error}`);
  };

  const run = async (action?: LossAction, approveNow = false) => {
    setBusy(true); setError(''); setSmsNotice('');
    try {
      const smsOptions = user?.canAllocate ? { sendFinalSms, ...(sendFinalSms ? { finalSmsBody } : {}) } : {};
      const result = action && lead.loss_review
        ? await oversightApi.reviewLoss(lead._id, {
            reviewId: lead.loss_review.id,
            action,
            notes,
            assigneeId: assignee || undefined,
            ...(linkedConnex ? { connexLostReason: connexReason } : {}),
            ...(action === 'approve' ? smsOptions : {}),
          })
        : await oversightApi.requestLoss(lead._id, reason, linkedConnex ? connexReason : undefined, approveNow ? { approveNow: true, ...smsOptions } : undefined);
      if (result.finalSms) describeSmsOutcome(result.finalSms);
      if (result.data) onUpdated(result.data);
      setReason(''); setNotes('');
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };

  if (['sold', 'lost'].includes(lead.status) && !lead.loss_review && !lead.lost_final_sms) return null;

  const smsControls = user?.canAllocate && (
    <div className="space-y-2 rounded-lg border border-amber-300/70 bg-white/80 p-2.5 text-xs">
      <label className="flex items-start gap-2 font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={sendFinalSms}
          disabled={!canSms || busy}
          onChange={e => setSendFinalSms(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Send automated &ldquo;Final&rdquo; SMS when marking Lost
          {!hasPhone && <span className="block font-normal text-slate-500">Customer has no mobile number on file.</span>}
          {hasPhone && lead.opted_out && <span className="block font-normal text-red-700">Customer has opted out of SMS.</span>}
          {canSms && olderLead && <span className="block font-normal text-amber-800">Older lead (&gt;30 days) — unchecked by default to protect historical cleanup; check to send.</span>}
        </span>
      </label>
      {sendFinalSms && (
        <label className="block text-[11px] font-medium text-slate-700">
          Final SMS message
          <textarea
            rows={3}
            maxLength={670}
            value={finalSmsBody}
            onChange={e => setFinalSmsBody(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900"
          />
        </label>
      )}
    </div>
  );

  return <section ref={section} aria-label="Lost lead review" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
    <h4 className="font-bold">{pending ? 'Loss awaiting manager approval' : 'Lost lead review'}</h4>
    {lead.loss_review && <p className="text-xs">{lead.loss_review.requested_name}: {lead.loss_review.reason} · {lead.loss_review.status}{lead.loss_review.notes ? ` · ${lead.loss_review.reviewed_name}: ${lead.loss_review.notes}` : ''}</p>}
    {lead.lost_final_sms && (
      <p className="text-xs text-slate-700">
        Final Lost SMS: <strong className="uppercase">{lead.lost_final_sms.status}</strong>
        {lead.lost_final_sms.sent_at ? ` · ${new Date(lead.lost_final_sms.sent_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}` : ''}
        {lead.lost_final_sms.error ? ` · ${lead.lost_final_sms.error}` : ''}
      </p>
    )}
    {(pending && user?.canAllocate || !pending && !['sold', 'lost'].includes(lead.status)) && <label className="block text-xs font-semibold">Loss category<select className="ml-2 min-h-11 max-w-full rounded-lg border p-2" value={connexReason} onChange={event => setConnexReason(event.target.value)}>{connexOptions.map(value => <option key={value}>{value}</option>)}</select><span className="mt-1 block font-normal">Standard categories apply to every lead source; the manager reviews the full reason.</span></label>}
    {pending && user?.canAllocate && <>
      <label className="block text-xs font-semibold">Manager notes<textarea value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      {smsControls}
      <div className="flex flex-wrap gap-2">
        {([['approve', 'Approve loss'], ['call', 'Call customer myself'], ['return', 'Return to salesperson']] as const).map(([action, label]) => <button key={action} disabled={busy || (action !== 'approve' && !notes.trim())} onClick={() => run(action)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{label}</button>)}
      </div>
      <div className="flex flex-wrap gap-2"><select aria-label="Reassign lost lead to" value={assignee} onChange={event => setAssignee(event.target.value)} className="max-w-full rounded-lg border p-2"><option value="">Choose salesperson</option>{people.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select><button disabled={busy || !assignee || !notes.trim()} onClick={() => run('reassign')} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Reassign with notes</button></div>
      {lead.phone && <a href={`tel:${lead.phone}`} className="inline-block font-semibold text-blue-700">Call {lead.phone}</a>}
    </>}
    {!pending && !['sold', 'lost'].includes(lead.status) && <details open={requestOpen || undefined}>
      <summary className="cursor-pointer font-semibold">Mark as LOST / request approval</summary>
      <div className="mt-2 space-y-2">
        <label className="block text-xs">Reason (required)<textarea required value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
        {smsControls}
        <div className="flex flex-wrap gap-2">
          {user?.canAllocate && (
            <button type="button" disabled={busy || !reason.trim()} onClick={() => run(undefined, true)} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              Approve &amp; mark Lost now
            </button>
          )}
          <button type="button" disabled={busy || !reason.trim()} onClick={() => run(undefined, false)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            Submit for approval
          </button>
        </div>
      </div>
    </details>}
    {busy && <p role="status">Saving review…</p>}
    {smsNotice && <p role="status" className="text-xs font-semibold text-emerald-800">{smsNotice}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
