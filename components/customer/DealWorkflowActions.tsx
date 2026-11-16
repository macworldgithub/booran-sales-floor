'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Workflow = {
  appraisals: { _id: string; rego?: string; vin?: string }[];
  deals: { _id: string; status: string; stockNumber?: string; appraisal_id?: string; exported_at?: string; export_reference?: string }[];
};
const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const button = 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40';
export function DealWorkflowActions({ leadId }: { leadId: string }) {
  const { user } = useAuth();
  const manager = ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'].includes(user?.role || '');
  const [open, setOpen] = useState(false), [workflow, setWorkflow] = useState<Workflow | null>(null), [revision, setRevision] = useState(0);
  const [stockNumber, setStockNumber] = useState(''), [appraisalId, setAppraisalId] = useState(''), [salePrice, setSalePrice] = useState(''), [cost, setCost] = useState('');
  const [notes, setNotes] = useState(''), [dealId, setDealId] = useState(''), [when, setWhen] = useState('');
  const [taskTitle, setTaskTitle] = useState(''), [taskDue, setTaskDue] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchApi<Workflow>(`/leads/${encodeURIComponent(leadId)}/workflows`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setWorkflow(result.data || null); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [leadId, open, revision]);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setError(''); setNotice(''); try { await operation(); setRevision(value => value + 1); setNotice('Saved.'); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  const post = (path: string, body: unknown, method = 'POST') => fetchApi(path, { method, body: JSON.stringify(body) });
  const number = (value: string) => { const amount = Number(value); if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid amount.'); return amount; };
  return <section className="space-y-3 rounded-xl border border-slate-200 p-3 text-sm">
    <button type="button" className="font-semibold" onClick={() => setOpen(!open)}>{open ? 'Hide deal and delivery actions' : 'Create deal, delivery or follow-up'}</button>
    {open && <>
      {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-emerald-700">{notice}</p>}
      {!workflow && !error && <p>Loading linked records…</p>}
      <fieldset disabled={busy || !workflow} className="space-y-3">
        <h3 className="font-bold">Register deal</h3>
        <label className="block">Stock number<input className={field} value={stockNumber} onChange={e => setStockNumber(e.target.value)} placeholder="An available vehicle at this dealership" /></label>
        <label className="block">Related trade appraisal<select className={field} value={appraisalId} onChange={e => setAppraisalId(e.target.value)}><option value="">No linked trade</option>{workflow?.appraisals.map(row => <option key={row._id} value={row._id}>{row.rego || row.vin}</option>)}</select></label>
        <div className="grid gap-2 sm:grid-cols-2"><label>Sale price (AUD)<input className={field} type="number" min={0} step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} /></label>{(manager || user?.viewCost) && <label>Cost (AUD)<input className={field} type="number" min={0} step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></label>}</div>
        <label className="block">Deal / delivery notes<textarea className={field} maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        <button type="button" className={button} disabled={!stockNumber.trim()} onClick={() => run(async () => {
          await post(`/leads/${encodeURIComponent(leadId)}/deals`, { stockNumber, ...(appraisalId ? { appraisalId } : {}), ...(salePrice !== '' ? { salePrice: number(salePrice) } : {}), ...(cost !== '' ? { cost: number(cost) } : {}), notes });
          setStockNumber(''); setSalePrice(''); setCost('');
        })}>Register deal</button>
        {workflow?.deals.map(deal => <div key={deal._id} className="space-y-2 rounded-lg bg-slate-50 p-3"><p className="font-semibold">Deal {deal.stockNumber || deal._id} · {deal.status}</p>{deal.exported_at && <p>Submitted to DMS · {deal.export_reference}</p>}{manager && deal.status === 'registered' && <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => run(async () => { await post(`/deals/${deal._id}/status`, { status: 'completed' }, 'PATCH'); })}>Complete deal</button><button type="button" className={button} onClick={() => run(async () => { await post(`/deals/${deal._id}/status`, { status: 'cancelled' }, 'PATCH'); })}>Cancel deal</button></div>}{manager && deal.status !== 'cancelled' && !deal.exported_at && <button className={button} type="button" onClick={() => run(async () => { await post(`/deals/${deal._id}/export`, {}); })}>Submit to DMS</button>}</div>)}
        <h3 className="border-t pt-3 font-bold">Book delivery</h3>
        <label className="block">Completed deal<select className={field} value={dealId} onChange={e => setDealId(e.target.value)}><option value="">Choose completed deal</option>{workflow?.deals.filter(row => row.status === 'completed').map(row => <option key={row._id} value={row._id}>{row.stockNumber || row._id}</option>)}</select></label>
        <label className="block">Delivery time (your local time)<input className={field} type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /></label>
        <button className={button} type="button" disabled={!dealId || !Number.isFinite(Date.parse(when))} onClick={() => run(async () => { await post(`/leads/${encodeURIComponent(leadId)}/deliveries`, { dealId, when: new Date(when).toISOString(), notes }); })}>Book delivery</button>
        {manager && <><h3 className="border-t pt-3 font-bold">Assign customer follow-up</h3><label className="block">Task title<input className={field} value={taskTitle} maxLength={200} onChange={e => setTaskTitle(e.target.value)} /></label><label className="block">Due (your local time)<input className={field} type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)} /></label><button className={button} type="button" disabled={!taskTitle.trim() || !Number.isFinite(Date.parse(taskDue))} onClick={() => run(async () => { await post(`/leads/${encodeURIComponent(leadId)}/tasks`, { title: taskTitle, dueAt: new Date(taskDue).toISOString(), notes }); setTaskTitle(''); })}>Assign follow-up to lead owner</button></>}
      </fieldset>
    </>}
  </section>;
}
