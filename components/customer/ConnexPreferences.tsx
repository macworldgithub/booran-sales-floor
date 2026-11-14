'use client';
import { useEffect, useState } from 'react';
import { connexApi, type ConnexPreferenceData, type ConnexPreferences, type ConnexCalendar } from '@/lib/connex';
const button = 'min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50';
export function ConnexPreferences() {
  const [data, setData] = useState<ConnexPreferenceData | null>(null), [draft, setDraft] = useState<ConnexPreferences | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; connexApi.preferences().then(result => { if (active) setData(result.data || null); }).catch(reason => { if (active) setError(reason.message); }); return () => { active = false; }; }, []);
  const values = draft || data?.preferences;
  return <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">My Connex email and SMS alerts</summary>
    <p className="my-2 text-xs text-slate-600">These settings control alerts sent by Sales Floor. Choose new-lead alerts or a daily escalation digest. Salespeople receive alerts for their assigned customers; managers can receive dealership alerts. Saving an enabled channel authorizes delivery to the address or mobile shown here.</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {values && <form className="space-y-2 text-xs" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage(''); try { await connexApi.savePreferences(values); const fresh = await connexApi.preferences(); setData(fresh.data || null); setDraft(null); setMessage('Notification preferences saved.'); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}>
      {([['newAlerts','New Connex leads'],['escalations','Unaccepted for 3 days / open for 6 weeks'],['email',`Email to ${data?.emailAddress || 'my account email'}`],['sms','SMS to my mobile']] as const).map(([key,label]) => <label key={key} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={values[key]} onChange={event => setDraft({...values,[key]:event.target.checked})} />{label}</label>)}
      <label className="block">My mobile number<input type="tel" className="ml-2 min-h-11 rounded-lg border p-2" value={values.phone} onChange={event => setDraft({...values,phone:event.target.value})} /></label>
      <p className="text-slate-500">Email service: {data?.emailConfigured ? 'configured' : 'needs setup'} · SMS service: {data?.smsConfigured ? 'configured' : 'needs setup'}. Existing historical imports do not generate new-lead alerts.</p>
      <button className={button} disabled={busy || !draft}>Save my alert preferences</button>
      {!!data?.deliveries.length && <details><summary className="cursor-pointer">Recent deliveries</summary>{data.deliveries.map(item => <p key={item.id} className="mt-2">{item.channel} · {item.type} · {item.status} · {new Date(item.createdAt).toLocaleString('en-AU')}{item.error && ` · ${item.error}`}</p>)}</details>}
    </form>}
  </details>;
}
export function ConnexHolidayCalendar() {
  const [data, setData] = useState<ConnexCalendar | null>(null), [extra, setExtra] = useState(''), [removed, setRemoved] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; connexApi.calendar().then(result => { if (active && result.data) { setData(result.data); setExtra(result.data.extraDates.join('\n')); setRemoved(result.data.removedDates.join('\n')); } }).catch(reason => { if (active) setError(reason.message); }); return () => { active = false; }; }, []);
  return <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Business-day calendar</summary>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {data && <form className="space-y-2 text-xs" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await connexApi.saveCalendar({extraDates:extra.split(/\s+/).filter(Boolean),removedDates:removed.split(/\s+/).filter(Boolean)}); setMessage('Business-day calendar saved.'); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}>
      <p className="mt-2">Victorian public holidays configured for {data.years.join(' and ')}. Deadlines use Melbourne time and skip weekends and these holidays.</p><p className="text-amber-800">{data.warning}</p>
      <label className="block">Additional non-working dates (YYYY-MM-DD, one per line)<textarea className="mt-1 w-full rounded border p-2" value={extra} onChange={event => setExtra(event.target.value)} /></label>
      <label className="block">Published dates to override (only for an approved local replacement)<textarea className="mt-1 w-full rounded border p-2" value={removed} onChange={event => setRemoved(event.target.value)} /></label>
      <details><summary className="cursor-pointer">Published dates and sources</summary><p className="break-words">{data.dates.join(', ')}</p>{data.sources.map((url,index) => <a key={url} className="mr-3 underline" href={url} target="_blank" rel="noopener noreferrer">Victorian Government {data.years[index]}</a>)}</details><button className={button} disabled={busy}>Save calendar overrides</button>
    </form>}
  </details>;
}
