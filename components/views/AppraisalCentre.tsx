'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchApi, leadApi } from '@/lib/api';
import { appraisalApi, Appraisal, Archive, Partner, stages, saveJson, uploadInspection } from '@/lib/appraisals';
import { Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { RooftopOptions } from '@/components/ui/RooftopOptions';
import { LoanSignature, Signature } from '@/components/customer/LoanSignature';

const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900';
const button = 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40';
const card = 'rounded-xl border border-slate-200 bg-white p-4 space-y-3';
const money = (cents: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
const label = (value: string) => value.replaceAll('_', ' ');
type Section = { section: string; condition: string; notes: string; photos: { id: string; name: string }[] };
const blankSections = (): Section[] => ['front', 'right', 'rear', 'left', 'interior'].map(section => ({ section, condition: 'unchecked', notes: '', photos: [] }));

export function AppraisalCentre({ rooftop }: { rooftop: string }) {
  const { user } = useAuth();
  const manager = user?.canAllocate || ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'].includes(user?.role || '');
  const [tab, setTab] = useState('appraisals');
  return <div className="view-stack space-y-4">
    <section className={card}>
      <h1 className="text-2xl font-extrabold text-slate-900">Booran Appraisals</h1>
      <p className="text-sm text-slate-600">Vehicle inspections, trade valuations and your dealer network.</p>
      <nav aria-label="Appraisal workspace" className="flex flex-wrap gap-2">
        {['appraisals', 'new inspection', 'partners', ...(manager ? ['legacy archive'] : [])].map(value => <button key={value} type="button" aria-pressed={tab === value}
          className={tab === value ? button : 'rounded-lg border px-3 py-2 text-sm'} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </nav>
    </section>
    {tab === 'appraisals' && <AppraisalList key={rooftop} rooftop={rooftop} manager={!!manager} />}
    {tab === 'new inspection' && <NewInspection key={rooftop} rooftop={rooftop} onSaved={() => setTab('appraisals')} />}
    {tab === 'partners' && <Partners key={rooftop} rooftop={rooftop} manager={!!manager} />}
    {tab === 'legacy archive' && manager && <LegacyArchive key={rooftop} rooftop={rooftop} />}
  </div>;
}

function AppraisalList({ rooftop, manager }: { rooftop: string; manager: boolean }) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [stage, setStage] = useState('');
  const [selected, setSelected] = useState<Appraisal | null>(null);
  const rows = usePaginatedQuery(appraisalApi.list, { rooftop, page, limit: 20, search, ...(stage ? { stage } : {}) }, setPage);
  return <>
    <section className={card}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Search rego, VIN or vehicle<input value={search} className={field} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
        <label className="text-sm">Stage<select value={stage} className={field} onChange={e => { setStage(e.target.value); setPage(1); }}><option value="">All stages</option>{stages.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      </div>
      <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
      {!rows.isLoading && !rows.error && !rows.data.length && <p className="text-sm text-slate-600">No appraisals match this scope.</p>}
      <div className="grid gap-3 md:grid-cols-2">{rows.data.map(row => <button key={row._id} type="button" onClick={() => setSelected(row)} className="rounded-lg border p-3 text-left hover:bg-slate-50">
        <strong>{row.rego || row.vin} · {[row.year, row.make, row.model].filter(Boolean).join(' ')}</strong>
        <span className="block text-sm text-slate-600">{row.dealership} · {label(row.workflow_status || 'ready')}</span>
        {manager && row.final_offer && <span className="text-sm">Final valuation {money(row.final_offer.amount_cents)}</span>}
      </button>)}</div>
      <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="appraisals" />
    </section>
    {selected && <AppraisalDetail key={selected._id} initial={selected} manager={manager} onClose={() => setSelected(null)} />}
  </>;
}

function AppraisalDetail({ initial, manager, onClose }: { initial: Appraisal; manager: boolean; onClose: () => void }) {
  const [row, setRow] = useState(initial), [notes, setNotes] = useState(initial.notes || ''), [stage, setStage] = useState(initial.workflow_status || 'ready');
  const [partners, setPartners] = useState<Partner[]>([]), [partnerId, setPartnerId] = useState(''), [amount, setAmount] = useState(''), [offerNotes, setOfferNotes] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [partnerPage, setPartnerPage] = useState(1), [hasMorePartners, setHasMorePartners] = useState(false);
  const requestId = useRef<string>('');
  useEffect(() => {
    const controller = new AbortController();
    appraisalApi.partners({ rooftop: row.dealership, kind: 'wholesaler', page: partnerPage, limit: 100 }, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setPartners(previous => partnerPage === 1 ? result.data || [] : [...previous, ...result.data || []]);
      setHasMorePartners(partnerPage < (result.pagination?.totalPages || 0));
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [row.dealership, partnerPage]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const update = async (suffix: string, data: unknown, method = 'POST') => {
    const result = await fetchApi<Appraisal>(`/appraisals/${encodeURIComponent(row._id)}${suffix}`, { method, body: JSON.stringify(data) });
    if (result.data) { setRow(result.data); setNotes(result.data.notes || ''); setStage(result.data.workflow_status || 'ready'); }
  };
  return <section className={card} aria-label="Appraisal detail">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-bold">{row.rego || row.vin} · {row.make} {row.model}</h2><button type="button" onClick={onClose}>Close appraisal</button></div>
    <p className="text-sm text-slate-600">{row.dealership} · VIN {row.vin || 'not recorded'} · {row.odometer?.toLocaleString() ?? '—'} km</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={button} type="button" disabled={busy} onClick={() => run(async () => {
        const result = await fetchApi<Appraisal>(`/appraisals/${row._id}`); if (result.data) { setRow(result.data); setNotes(result.data.notes || ''); setStage(result.data.workflow_status || 'ready'); }
      })}>Refresh record</button>
      <button className={button} type="button" onClick={() => saveJson(row, `booran-appraisal-${row._id}.json`)}>Download appraisal JSON</button>
      <button className={button} disabled={busy || !row.vin} type="button" onClick={() => run(async () => {
        const result = await fetchApi<Appraisal['ppsr']>(`/leads/${encodeURIComponent(row.lead_id)}/ppsr`, { method: 'POST', body: JSON.stringify({ appraisalId: row._id }) });
        setRow({ ...row, ppsr: result.data }); if (result.data?.status === 'error') throw new Error(result.data.error || 'PPSR unavailable.');
      })}>Request PPSR</button>
    </div>
    <p className="text-sm">PPSR: {row.ppsr?.status || 'not checked'} {row.ppsr?.reference}</p>
    <div className="grid gap-3 sm:grid-cols-2">{row.inspection?.map(section => <div key={section.section} className="rounded-lg bg-slate-50 p-3 text-sm">
      <h3 className="font-semibold capitalize">{section.section} · {section.condition}</h3><p>{section.notes}</p>
      <div className="flex flex-wrap gap-2">{section.photos.map(photo => <a key={photo.id} href={`/api/leads/${encodeURIComponent(row.lead_id)}/media/${encodeURIComponent(photo.id)}/content`} target="_blank" rel="noreferrer"><img className="h-28 w-36 rounded object-cover" alt={`${section.section} inspection`} src={`/api/leads/${encodeURIComponent(row.lead_id)}/media/${encodeURIComponent(photo.id)}/content`} /></a>)}</div>
    </div>)}</div>
    {row.internalDrive && <p className="text-sm">Internal drive: {row.internalDrive.driver} · {new Date(row.internalDrive.when).toLocaleString()} · {row.internalDrive.notes}</p>}
    {row.loanCar && <p className="text-sm">Loan form: signed by {row.loanCar.signer} on {new Date(row.loanCar.signedAt).toLocaleString()}</p>}
    <label className="block text-sm">Inspection notes<textarea className={field} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    {manager && <label className="block text-sm">Outcome<select value={stage} onChange={e => setStage(e.target.value)} className={field}>{stages.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>}
    <button className={button} type="button" disabled={busy} onClick={() => run(() => update('', { revision: row.revision ?? 0, notes, ...(manager ? { stage } : {}) }, 'PATCH'))}>Save appraisal</button>
    {manager && <section className="space-y-3 border-t pt-4">
      <h3 className="font-bold">Wholesale offers</h3>
      <p className="text-sm text-slate-600">Record requests and offers received from your wholesalers. Selecting a final valuation records your decision.</p>
      {row.final_offer && <p className="font-semibold text-emerald-700">Final valuation: {money(row.final_offer.amount_cents)} · {row.final_offer.name}</p>}
      <label className="block text-sm">Wholesaler<select className={field} value={partnerId} onChange={e => { setPartnerId(e.target.value); requestId.current = ''; }}><option value="">Select wholesaler</option>{partners.filter(partner => partner.active).map(partner => <option key={partner._id} value={partner._id}>{partner.name} {partner.company && `· ${partner.company}`}</option>)}</select></label>
      {hasMorePartners && <button type="button" className="text-sm underline" onClick={() => setPartnerPage(value => value + 1)}>Load more wholesalers</button>}
      <button className={button} disabled={busy || !partnerId} type="button" onClick={() => run(async () => { await update('/offer-requests', { partnerId }); setNotice('Request recorded. Contact the wholesaler using the partner directory.'); })}>Record offer request</button>
      <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Offer (AUD)<input className={field} type="number" min="0" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); requestId.current = ''; }} /></label><label className="text-sm">Offer comments<input className={field} maxLength={2000} value={offerNotes} onChange={e => { setOfferNotes(e.target.value); requestId.current = ''; }} /></label></div>
      <button className={button} disabled={busy || !partnerId || amount === ''} type="button" onClick={() => run(async () => {
        if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error('Enter a valid offer.');
        requestId.current ||= crypto.randomUUID();
        await update('/offers', { partnerId, amountCents: Math.round(Number(amount) * 100), notes: offerNotes, requestId: requestId.current });
        requestId.current = ''; setAmount(''); setOfferNotes('');
      })}>Record received offer</button>
      {row.offer_requests?.map(request => <p key={request.id} className="text-sm text-slate-600">Offer request recorded · {request.name}</p>)}
      {row.offers?.map(offer => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><strong>{money(offer.amount_cents)} · {offer.name}</strong><p>{offer.notes}</p><p className="text-xs text-slate-600">Recorded by {offer.recorded_by} · {new Date(offer.createdAt).toLocaleString()}</p></div>
        <button type="button" disabled={busy || ['archived', 'traded', 'lost'].includes(row.workflow_status || '')} className={button} onClick={() => run(() => update('/final-offer', { offerId: offer.id, revision: row.revision ?? 0 }))}>Set final valuation</button></div>)}
    </section>}
  </section>;
}

function Partners({ rooftop, manager }: { rooftop: string; manager: boolean }) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [kind, setKind] = useState('');
  const [editing, setEditing] = useState<Partial<Partner> | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const rows = usePaginatedQuery(appraisalApi.partners, { rooftop, page, limit: 20, search, ...(kind ? { kind } : {}) }, setPage);
  return <section className={card}>
    <h2 className="text-lg font-bold">Dealers & wholesalers</h2>
    <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Search partners<input className={field} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label><label className="text-sm">Type<select value={kind} className={field} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">All partners</option><option value="dealer">Dealers</option><option value="wholesaler">Wholesalers</option></select></label></div>
    {manager && <button type="button" className={button} onClick={() => { setError(''); setEditing({ kind: 'wholesaler', dealership: rooftop === 'All Locations' ? '' : rooftop, active: true }); }}>Add partner</button>}
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {!rows.isLoading && !rows.error && !rows.data.length && <p className="text-sm text-slate-600">No partners have been added in this scope.</p>}
    <div className="grid gap-3 md:grid-cols-2">{rows.data.map(partner => <article key={partner._id} className="space-y-1 rounded-lg border p-3 text-sm"><strong>{partner.name}</strong><p>{partner.company} · {partner.kind} · {partner.active ? 'Active' : 'Inactive'}</p><p className="text-slate-600">{partner.dealership}</p>{partner.phone && <a className="block underline" href={`tel:${partner.phone}`}>{partner.phone}</a>}{partner.email && <a className="block break-all underline" href={`mailto:${partner.email}`}>{partner.email}</a>}<p>{partner.notes}</p>{manager && <button type="button" className="underline" onClick={() => { setEditing(partner); setError(''); }}>Edit partner</button>}</article>)}</div>
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="partners" />
    {editing && <form className="space-y-3 border-t pt-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try { await fetchApi(`/appraisal-partners${editing._id ? `/${editing._id}` : ''}`, { method: editing._id ? 'PATCH' : 'POST', body: JSON.stringify(editing) }); setEditing(null); }
      catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
    }}>
      <h3 className="font-bold">{editing._id ? 'Edit partner' : 'New partner'}</h3>
      <label className="block text-sm">Dealership<select className={field} required disabled={!!editing._id} value={editing.dealership || ''} onChange={e => setEditing({ ...editing, dealership: e.target.value })}><option value="">Choose dealership</option><RooftopOptions /></select></label>
      <label className="block text-sm">Type<select className={field} disabled={!!editing._id} value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as Partner['kind'] })}><option value="dealer">Dealer</option><option value="wholesaler">Wholesaler</option></select></label>
      <div className="grid gap-2 sm:grid-cols-2">{(['name', 'company', 'email', 'phone', 'licence'] as const).map(key => <label key={key} className="text-sm capitalize">{key}<input className={field} required={key === 'name'} type={key === 'email' ? 'email' : 'text'} value={editing[key] || ''} maxLength={key === 'email' ? 254 : key === 'phone' ? 30 : key === 'licence' ? 100 : 200} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /></label>)}</div>
      <label className="block text-sm">Notes<textarea className={field} maxLength={4000} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} />Active partner</label>
      {error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex gap-3"><button className={button} disabled={busy}>Save partner</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
  </section>;
}

function NewInspection({ rooftop, onSaved }: { rooftop: string; onSaved: () => void }) {
  const [search, setSearch] = useState(''), [leads, setLeads] = useState<Lead[]>([]), [lead, setLead] = useState<Lead | null>(null);
  const [vehicle, setVehicle] = useState({ rego: '', vin: '', make: '', model: '', year: '' }), [state, setState] = useState('VIC');
  const [sections, setSections] = useState(blankSections), [step, setStep] = useState(0), [notes, setNotes] = useState('');
  const [driveNotes, setDriveNotes] = useState(''), [licence, setLicence] = useState('');
  const [loanSigner, setLoanSigner] = useState(''), [loanTerms, setLoanTerms] = useState(''), [signature, setSignature] = useState<Signature>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => leadApi.getLeads({ rooftop, search, limit: 20, page: 1 }, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setLeads(result.data || []); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); }), 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, rooftop]);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setError(''); try { await operation(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  const section = sections[step];
  const change = (fields: Partial<Section>) => setSections(previous => previous.map((item, index) => index === step ? { ...item, ...fields } : item));
  return <section className={card}>
    <h2 className="text-lg font-bold">New vehicle inspection</h2>
    <p className="text-sm text-slate-600">Link the inspection to a customer, then complete the guided walk-around. AI suggestions remain subject to your review.</p>
    <label className="block text-sm">Find customer<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, mobile or email" /></label>
    <label className="block text-sm">Customer<select className={field} disabled={busy} value={lead?._id || ''} onChange={e => { setLead(leads.find(item => item._id === e.target.value) || null); setSections(blankSections()); setLicence(''); setVehicle({ rego: '', vin: '', make: '', model: '', year: '' }); setNotes(''); setDriveNotes(''); setLoanSigner(''); setLoanTerms(''); setSignature([]); }}><option value="">Choose customer (refine search to find more)</option>{leads.map(item => <option key={item._id} value={item._id}>{item.name} · {item.dealership}</option>)}</select></label>
    <fieldset disabled={busy || !lead} className="space-y-3 disabled:opacity-60">
      <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(vehicle) as (keyof typeof vehicle)[]).map(key => <label key={key} className="text-sm capitalize">{key}<input className={field} value={vehicle[key]} type={key === 'year' ? 'number' : 'text'} onChange={e => setVehicle({ ...vehicle, [key]: e.target.value })} /></label>)}
        <label className="text-sm">Registration state<select className={field} value={state} onChange={e => setState(e.target.value)}>{['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <button className={button} type="button" onClick={() => run(async () => {
        const result = await fetchApi<{ rego: string; vin: string; make: string; model: string; year?: number }>(`/vehicle-lookup?rego=${encodeURIComponent(vehicle.rego)}&state=${state}&rooftop=${encodeURIComponent(lead!.dealership)}`);
        if (result.data) setVehicle({ ...result.data, year: result.data.year ? String(result.data.year) : '' });
      })}>Look up Rego → VIN</button>
      <nav aria-label="Walk-around steps" className="flex flex-wrap gap-2">{sections.map((item, index) => <button key={item.section} type="button" aria-pressed={step === index} className={step === index ? button : 'rounded-lg border p-2 text-sm capitalize'} onClick={() => setStep(index)}>{item.section}</button>)}</nav>
      <h3 className="font-bold capitalize">{section.section}</h3>
      <label className="block text-sm">Condition<select className={field} value={section.condition} onChange={e => change({ condition: e.target.value })}>{['unchecked', 'clear', 'damage'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm">Condition notes<textarea className={field} maxLength={2000} value={section.notes} onChange={e => change({ notes: e.target.value })} /></label>
      <label className="block text-sm">Add photo (up to 2 MB, two per side)<input className={field} type="file" accept="image/*" capture="environment" disabled={section.photos.length >= 2} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) run(async () => { const photo = await uploadInspection(lead!._id, file); change({ photos: [...section.photos, photo] }); }); }} /></label>
      {section.photos.map(photo => <div key={photo.id} className="flex flex-wrap gap-2 text-sm"><span>{photo.name}</span><button className="underline" type="button" onClick={() => change({ photos: section.photos.filter(item => item.id !== photo.id) })}>Remove</button><button className="underline" type="button" onClick={() => run(async () => {
        const result = await fetchApi<{ condition: string; notes: string }>(`/leads/${encodeURIComponent(lead!._id)}/appraisals/damage-suggestion`, { method: 'POST', body: JSON.stringify({ photoId: photo.id }) });
        if (result.data) change({ condition: result.data.condition, notes: result.data.notes });
      })}>Suggest damage assessment</button></div>)}
      <label className="block text-sm">Private licence photo (optional, up to 2 MB)<input className={field} type="file" accept="image/*" capture="environment" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) run(async () => setLicence((await uploadInspection(lead!._id, file, 'licence')).id)); }} /></label>{licence && <p className="text-sm">Licence photo attached privately.</p>}
      <label className="block text-sm">Internal test drive notes (optional)<textarea className={field} value={driveNotes} maxLength={2000} onChange={e => setDriveNotes(e.target.value)} /></label>
      <label className="block text-sm">Overall inspection notes<textarea className={field} value={notes} maxLength={5000} onChange={e => setNotes(e.target.value)} /></label>
      <details className="space-y-3 rounded-lg border p-3"><summary className="cursor-pointer font-semibold">Optional loan-car form</summary><label className="block text-sm">Signer name<input className={field} value={loanSigner} maxLength={200} onChange={e => setLoanSigner(e.target.value)} /></label><label className="block text-sm">Loan-car terms<textarea className={field} value={loanTerms} maxLength={4000} onChange={e => setLoanTerms(e.target.value)} /></label><p className="text-sm">The customer signs below to agree to the terms shown above.</p><LoanSignature value={signature} onChange={setSignature} disabled={busy} /></details>
      <button className={button} type="button" onClick={() => run(async () => {
        if ((loanSigner || loanTerms || signature.length) && (!loanSigner.trim() || !loanTerms.trim() || !signature.length)) throw new Error('Complete the signer, terms and signature, or clear the loan-car form.');
        await fetchApi(`/leads/${encodeURIComponent(lead!._id)}/appraisals`, { method: 'POST', body: JSON.stringify({ ...vehicle, ...(vehicle.year ? { year: Number(vehicle.year) } : { year: undefined }), notes,
          walkaround: sections.map(item => ({ section: item.section, condition: item.condition, notes: item.notes, photoIds: item.photos.map(photo => photo.id) })),
          ...(licence ? { licencePhotoId: licence } : {}), ...(driveNotes ? { internalDrive: { when: new Date().toISOString(), notes: driveNotes } } : {}),
          ...(loanSigner ? { loanCar: { signer: loanSigner, terms: loanTerms, signature } } : {}),
        }) }); onSaved();
      })}>Save linked inspection</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

function LegacyArchive({ rooftop }: { rooftop: string }) {
  const [page, setPage] = useState(1), [kind, setKind] = useState(''), [search, setSearch] = useState(''), [detail, setDetail] = useState<Archive | null>(null), [error, setError] = useState('');
  const detailVersion = useRef(0);
  useEffect(() => () => { detailVersion.current++; }, []);
  const rows = usePaginatedQuery(appraisalApi.archive, { rooftop, page, limit: 20, search, ...(kind ? { kind } : {}) }, setPage);
  return <section className={card}>
    <h2 className="text-lg font-bold">Historical iAppraise records</h2>
    <label className="block text-sm">Search registration, VIN or customer<input className={field} value={search} onChange={e => { setSearch(e.target.value); setPage(1); detailVersion.current++; setDetail(null); }} /></label>
    <p className="text-sm text-slate-600">Original records and server-stored attachments from verified migration bundles. An empty archive means no historical bundle has been imported in this scope.</p>
    <label className="block text-sm">Record type<select className={field} value={kind} onChange={e => { setKind(e.target.value); setPage(1); setDetail(null); }}><option value="">All records</option>{['appraisal', 'dealer', 'wholesaler'].map(value => <option key={value}>{value}</option>)}</select></label>
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {rows.data.map(row => <button key={row._id} type="button" className="block w-full rounded-lg border p-3 text-left text-sm" onClick={async () => {
      const version = ++detailVersion.current; setError(''); setDetail(null);
      try { const result = await fetchApi<Archive>(`/iappraise/archive/${encodeURIComponent(row._id)}`); if (version === detailVersion.current) setDetail(result.data || null); } catch (reason) { if (version === detailVersion.current) setError((reason as Error).message); }
    }}>{row.kind} · {row.summary?.rego || row.summary?.name || row.source_id} · {row.summary?.customer} · {row.dealership} · {row.media.length} attachments</button>)}
    {!rows.isLoading && !rows.error && !rows.data.length && <p className="text-sm">No legacy records imported yet.</p>}
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="archived records" />
    {detail && <div className="space-y-2 border-t pt-3"><h3 className="font-semibold">Original {detail.kind} · {detail.source_id}</h3><button className={button} type="button" onClick={() => saveJson(detail, `iappraise-${detail._id}.json`)}>Download original record JSON</button><p className="break-all text-xs text-slate-600">SHA-256: {detail.source_sha256}</p>{detail.media.map(file => <a key={file.id} className="block text-sm underline" href={`/api/iappraise/archive/${encodeURIComponent(detail._id)}/media/${encodeURIComponent(file.id)}`}>{file.name} · {(file.size / 1024).toFixed(1)} KB</a>)}<pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(detail.raw, null, 2)}</pre></div>}
  </section>;
}
