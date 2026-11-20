'use client';
import {useState} from 'react';
import {useAuth} from '@/lib/auth';
import {oversightApi,type IntakeSource} from '@/lib/oversight';
import type {Lead} from '@/lib/types';
import {LeadIntegrationStatus} from '@/components/customer/LeadIntegrationStatus';
import {ConnexIntegration} from '@/components/customer/ConnexIntegration';
const button='min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50';
export function DailyIntegrationTools({rooftop,revision,onOpenLead}:{rooftop:string;revision:number;onOpenLead:(lead:Lead)=>void}) {
 return <div className="mt-3 space-y-3"><LeadIntegrationStatus rooftop={rooftop} revision={revision}/><ConnexIntegration rooftop={rooftop} revision={revision} onOpenLead={onOpenLead}/><LeadIntake rooftop={rooftop} onImported={onOpenLead}/></div>;
}
export function LeadIntake({ rooftop, onImported }: { rooftop: string; onImported: (lead: Lead) => void }) {
  const [source, setSource] = useState<IntakeSource>('connex');
  const [form, setForm] = useState({ externalId: '', dealership: rooftop === 'All Locations' ? '' : rooftop, name: '', phone: '', email: '', vehicle: '', opportunityStatus: '', notes: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const { locations } = useAuth();
  return <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-bold">Connex / external lead intake</summary><p className="my-2 text-xs text-slate-600">Use Hyundai Connex above for connected South Morang opportunities. This form also supports manually supplied external enquiries; reuse the source reference when updating contact details.</p><form className="grid gap-2 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { const result = await oversightApi.intake(source, form); if (result.data) onImported(result.data); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}>
    <label className="text-xs">Source<select value={source} onChange={event => setSource(event.target.value as IntakeSource)} className="mt-1 block w-full rounded-lg border p-2">{[['connex', 'Connex'], ['drive', 'Drive'], ['socket', 'Socket'], ['website', 'Website'], ['sms', 'SMS campaign']].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label className="text-xs">Dealership<select required value={form.dealership} onChange={event => setForm({ ...form, dealership: event.target.value })} className="mt-1 block w-full rounded-lg border p-2"><option value="">Choose dealership</option>{locations.filter(site => site.toLowerCase() !== 'south morang').map(site => <option key={site}>{site}</option>)}</select></label>
    {([['externalId', 'Source lead reference (required)'], ['name', 'Customer name (when available)'], ['phone', 'Phone (once revealed)'], ['email', 'Email'], ['vehicle', 'Vehicle interest'], ['opportunityStatus', 'Opportunity status'], ['notes', 'Source notes']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<input required={key === 'externalId'} maxLength={key === 'notes' ? 5000 : 200} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="mt-1 block w-full rounded-lg border p-2" /></label>)}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}<button className={button} disabled={busy}>{busy ? 'Saving…' : 'Create / update unassigned lead'}</button>
  </form></details>;
}
