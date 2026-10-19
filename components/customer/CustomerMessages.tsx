'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, MessageSquare, RefreshCw, Send, X, Copy, Film, Image as ImageIcon } from 'lucide-react';
import { customerMessageApi } from '@/lib/api';
import { CustomerMedia, CustomerMessageHistory, Lead } from '@/lib/types';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
const buttonClass = 'rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50';

export function CustomerMessages({ lead, onMessageSent, contactBusy = false, onBusyChange }: { lead: Lead; onMessageSent: () => void; contactBusy?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [history, setHistory] = useState<CustomerMessageHistory | null>(null);
  const [media, setMedia] = useState<CustomerMedia[]>([]);
  const [selected, setSelected] = useState<CustomerMedia[]>([]);
  const [body, setBody] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState<{ body: string; media_ids: string[]; request_id: string } | null>(null);
  const active = useRef(true);
  const loadGeneration = useRef(0);
  const mutationPending = useRef(false);
  const refreshPending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const phone = lead.phone || lead.customer_phone;
  const text = [body.trim(), ...selected.map((item) => item.url)].filter(Boolean).join('\n');
  useEffect(() => { onBusyChange?.(sending || !!attempt); }, [sending, attempt, onBusyChange]);

  const refresh = useCallback(async (silent = false) => {
    const generation = ++loadGeneration.current;
    refreshPending.current = true;
    if (!silent) setLoading(true);
    try {
      const [messages, uploads] = await Promise.allSettled([customerMessageApi.history(lead._id, page), customerMessageApi.media(lead._id)]);
      if (!active.current || generation !== loadGeneration.current) return;
      if (messages.status === 'fulfilled') {
        setHistory(messages.value.data || null);
        setTotalPages(messages.value.pagination?.totalPages || 0);
        if (messages.value.pagination?.page && messages.value.pagination.page !== page) setPage(messages.value.pagination.page);
        setHistoryError('');
      } else setHistoryError(messages.reason instanceof Error ? messages.reason.message : 'Unable to load customer messages.');
      if (uploads.status === 'fulfilled') { setMedia(uploads.value.data || []); setMediaError(''); }
      else setMediaError('Photo/video library is temporarily unavailable. SMS history is still shown.');
    } catch (err) {
      if (active.current && generation === loadGeneration.current) setHistoryError(err instanceof Error ? err.message : 'Unable to load customer messages.');
    } finally {
      if (active.current && generation === loadGeneration.current) { setLoading(false); refreshPending.current = false; }
    }
  }, [lead._id, page]);

  useEffect(() => {
    active.current = true;
    void refresh();
    return () => { active.current = false; ++loadGeneration.current; };
  }, [refresh]);
  useRefreshOnResume(() => { void refresh(); });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !refreshPending.current) void refresh(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mutationPending.current || contactBusy || !text || !phone) return;
    mutationPending.current = true;
    setSending(true); setError(''); setNotice('');
    // Keep the same payload and identity after a lost response: checking it cannot double-send.
    const payload = attempt || { body: body.trim(), media_ids: selected.map((item) => item.id), request_id: crypto.randomUUID() };
    setAttempt(payload);
    try {
      const result = await customerMessageApi.send(lead._id, payload);
      if (!active.current) return;
      if (!result.data) throw new Error('Unable to confirm the SMS result.');
      const message = result.data;
      if (['queued', 'sent', 'delivered'].includes(message.status)) {
        setNotice(message.status === 'delivered' ? 'SMS delivered. Saved to this customer.' : 'SMS accepted by Mobile Message. Delivery status updates automatically.');
        setBody(''); setSelected([]);
      } else if (message.status === 'failed') {
        setError(message.error || 'SMS failed. The attempt was saved to this customer.');
      } else {
        setNotice(message.error || 'This send is still being confirmed. Check the message history and Mobile Message before sending again.');
        setBody(''); setSelected([]);
      }
      setAttempt(null);
      if (page !== 1) setPage(1); else void refresh();
      onMessageSent();
    } catch (err) {
      if (active.current) {
        const rejected = err && typeof err === 'object' && 'status' in err && [400, 403, 404, 409].includes(Number(err.status));
        if (rejected) setAttempt(null);
        setError(`${err instanceof Error ? err.message : 'Unable to confirm the SMS.'}${rejected ? '' : ' Use “Check send result” to safely check this attempt.'}`);
      }
    } finally {
      mutationPending.current = false;
      if (active.current) setSending(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || mutationPending.current || attempt) return;
    const list = Array.from(files);
    if (selected.length + list.length > 5) { setError('Attach up to five photos or videos per SMS.'); return; }
    if (list.some((file) => !allowedTypes.includes(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024)) {
      setError('Choose JPG, PNG, WebP, GIF, HEIC, MP4, MOV or WebM files, up to 100 MB each.'); return;
    }
    mutationPending.current = true; setError(''); setNotice('');
    try {
      for (const file of list) {
        setUploading(file.name);
        const result = await customerMessageApi.upload(lead._id, file);
        if (!active.current) return;
        if (!result.data) throw new Error('The upload could not be confirmed.');
        const uploaded = result.data;
        setMedia((previous) => [uploaded, ...previous]);
        setSelected((previous) => [...previous, uploaded]);
      }
      setNotice('Uploaded. The selected photo/video links will be included in your SMS.');
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Unable to upload this file.');
    } finally {
      mutationPending.current = false;
      if (active.current) setUploading('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setNotice('Photo/video link copied.'); }
    catch { setError('Unable to copy. Open the photo/video and copy the link from your browser.'); }
  };

  return (
    <section aria-label="Customer SMS and media" className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare className="h-4 w-4 text-red-600" /> SMS & Photos / Videos</h4>
        <button type="button" aria-label="Refresh messages" disabled={loading} onClick={() => { setError(''); void refresh(); }} className={buttonClass}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {historyError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{historyError}</p>}
      {mediaError && <p role="status" className="text-xs text-amber-700">{mediaError}</p>}
      {history?.history_warning && <p role="status" className="text-xs text-amber-700">{history.history_warning}</p>}
      {notice && <p role="status" className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">{notice}</p>}
      {loading && !history && <p className="text-xs text-slate-500">Loading messages…</p>}
      {history && <>
        {!phone && <p className="text-xs text-amber-700">Add a mobile number to this customer before sending SMS.</p>}
        {!history.sms_available && <p className="text-xs text-amber-700">SMS needs to be configured by an administrator.</p>}
        <form onSubmit={send} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Message to {phone || 'customer'}
            <textarea aria-label="SMS message" value={body} onChange={(e) => setBody(e.target.value)} disabled={sending || !!uploading || !!attempt} rows={4} maxLength={1530} placeholder={`Hi ${(lead.name || '').split(' ')[0]}, `} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-red-500 focus:outline-none disabled:opacity-60" />
          </label>
          {selected.length > 0 && <div className="space-y-1">{selected.map((item) => <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs"><a href={item.url} target="_blank" rel="noreferrer" className="truncate text-red-700 underline">{item.name}</a><button type="button" disabled={sending || !!uploading || !!attempt} aria-label={`Remove ${item.name}`} onClick={() => setSelected((previous) => previous.filter((file) => file.id !== item.id))}><X className="h-3.5 w-3.5" /></button></div>)}</div>}
          <p className={`text-[11px] ${text.length > 1530 ? 'text-red-700' : 'text-slate-500'}`}>{text.length} characters including links. Longer messages use multiple SMS credits; emojis and Unicode reduce characters per part.</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input ref={fileInput} type="file" multiple accept={allowedTypes.join(',')} className="hidden" aria-label="Upload photos or videos" onChange={(e) => { void upload(e.target.files); }} />
            <button type="button" disabled={!history.media_available || sending || !!uploading || !!attempt || selected.length >= 5} onClick={() => fileInput.current?.click()} className={`${buttonClass} flex items-center gap-1.5`}><ImagePlus className="h-4 w-4" />{uploading ? `Uploading ${uploading}…` : 'Upload photos / videos'}</button>
            <button type="submit" disabled={sending || contactBusy || !!uploading || !phone || !history.sms_available || !text || text.length > 1530} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"><Send className="h-3.5 w-3.5" />{sending ? 'Sending…' : attempt ? 'Check send result' : 'Send SMS'}</button>
          </div>
          <p className="text-[11px] text-slate-500">Up to 5 files, 100 MB each. Recipients can open the links without signing in.{!history.media_available ? ` ${history.media_unavailable_reason || 'Photo/video storage is unavailable.'}` : ''}</p>
        </form>
        {media.length > 0 && <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Recent customer uploads ({media.length})</summary>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{media.map((item) => <div key={item.id} className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            {item.content_type.startsWith('video/') ? <Film className="h-4 w-4 shrink-0 text-slate-400" /> : <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" />}
            <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-red-700 underline">{item.name}</a>
            <button type="button" className={buttonClass} aria-label={`Copy link for ${item.name}`} onClick={() => { void copy(item.url); }}><Copy className="h-3 w-3" /></button>
            <button type="button" className={buttonClass} disabled={selected.some((file) => file.id === item.id) || selected.length >= 5 || sending || !!uploading || !!attempt} onClick={() => setSelected((previous) => [...previous, item])}>Attach</button>
          </div>)}</div>
        </details>}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h5 className="text-xs font-bold text-slate-700">Booran Sales Floor SMS history</h5>
          {!history.messages.length && <p className="text-xs text-slate-500">No SMS recorded for this customer yet.</p>}
          {history.messages.map((message) => <article key={message.id} className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>{message.author} · {message.created_at ? new Date(message.created_at).toLocaleString('en-AU') : ''}</span><span className={`rounded-full px-2 py-0.5 font-semibold ${['delivered', 'received'].includes(message.status) ? 'bg-emerald-100 text-emerald-800' : ['failed', 'error'].includes(message.status) ? 'bg-red-100 text-red-700' : ['sent', 'success'].includes(message.status) ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{({ unknown: 'Unconfirmed', pending: 'Confirming', queued: 'Queued', accepted: 'Queued', scheduled: 'Scheduled', sent: 'Sent', success: 'Sent', delivered: 'Delivered', received: 'Received', failed: 'Failed', error: 'Failed', cancelled: 'Cancelled' } as Record<string, string>)[message.status] || 'Unconfirmed'}</span></div>
            <p className="text-[11px] text-slate-500">{message.direction === 'inbound' ? 'From' : 'To'} {message.phone} · {message.source || 'Sales Floor'}{message.dealership ? ` · ${message.dealership}` : ''}</p>
            <p className="whitespace-pre-wrap break-words text-slate-800">{message.body}</p>
            {message.attachments.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block truncate text-red-700 underline">{item.content_type.startsWith('video/') ? 'Video' : 'Photo'}: {item.name}</a>)}
            {message.error && <p className="text-amber-800">{message.error}</p>}
          </article>)}
          {totalPages > 1 && <div className="flex items-center justify-between"><button type="button" className={buttonClass} disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Newer</button><span className="text-xs text-slate-500">Page {page} of {totalPages}</span><button type="button" className={buttonClass} disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Older</button></div>}
        </div>
      </>}
    </section>
  );
}
