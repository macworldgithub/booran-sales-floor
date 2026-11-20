'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

type Photo = { id: string; name: string };
type PPSR = { status: string; reference?: string };
type Records = {
  appraisals: {
    _id: string; rego?: string; vin?: string; notes?: string; ppsr?: PPSR; licence?: Photo[];
    valuation?: { amount_cents: number; valued_by_name: string; valued_at: string };
    inspection?: { section: string; condition: string; notes?: string; photos: Photo[] }[];
    internal_drives?: { id: string; status: string; driver: string; started_at: string; ended_at?: string; distance_km?: number }[];
    loanCar?: { signer: string; signedAt: string };
  }[];
  deals: { _id: string; status: string; stockNumber?: string; appraisal_id?: string; ppsr?: PPSR; appraisal_ppsr?: PPSR; contract?: { reference: string; signed_at: string; media_id: string } }[];
  deliveries: { _id: string; when: string; status: string; accessories: { id: string; completedAt?: string }[] }[];
};

export function WorkflowHistory({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<Records | null>(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchApi<Records>(`/leads/${encodeURIComponent(leadId)}/workflows`).then(result => {
      if (active) setRecords(result.data || null);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [open, leadId]);

  const photoLink = (picture: Photo, label: string) => <button type="button" className="text-xs text-blue-700 underline" key={picture.id}
    onClick={() => setPhoto(photo === picture.id ? '' : picture.id)}>{photo === picture.id ? 'Hide photo' : label}</button>;
  const ppsr = (result?: PPSR) => result ? `PPSR ${result.status}${result.reference ? ` · ${result.reference}` : ''}` : 'PPSR not checked';

  return <section className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
    <button type="button" onClick={() => { setOpen(!open); setError(''); setPhoto(''); }} className="font-semibold text-slate-900">
      {open ? 'Hide deal and inspection history' : 'Show deal and inspection history'}
    </button>
    {open && <>
      {error ? <p role="alert" className="text-red-700">{error}</p> : !records ? <p>Loading history…</p> : <>
        {!records.appraisals.length && !records.deals.length && !records.deliveries.length && <p>No inspection, deal or delivery records yet.</p>}
        {records.appraisals.map(row => <div key={row._id} id={`appraisal-${row._id}`} className="space-y-1 rounded-lg bg-slate-50 p-2">
          <h4 className="font-semibold">I-Appraise · {row.rego || row.vin}</h4>
          <p>{ppsr(row.ppsr)}</p>
          {row.valuation && <p className="font-semibold">Customer valuation {new Intl.NumberFormat('en-AU', {style:'currency',currency:'AUD'}).format(row.valuation.amount_cents/100)} · Valued by {row.valuation.valued_by_name} · {new Date(row.valuation.valued_at).toLocaleString('en-AU')}</p>}
          {row.notes && <p>{row.notes}</p>}
          {row.internal_drives?.map(drive => <p key={drive.id}>Internal drive · {drive.driver} · {drive.status} · {new Date(drive.started_at).toLocaleString()}{drive.ended_at && ` → ${new Date(drive.ended_at).toLocaleString()} · ${drive.distance_km} km`}</p>)}
          {row.loanCar && <p>Loan-car form signed by {row.loanCar.signer}</p>}
          {row.inspection?.map(section => <div key={section.section} className="flex flex-wrap gap-2">
            <span>{section.section} · {section.condition} {section.notes}</span>
            {section.photos.map(picture => photoLink(picture, picture.name))}
          </div>)}
          {row.licence?.map(picture => photoLink(picture, 'View private licence photo'))}
        </div>)}
        {photo && <img alt="Private inspection attachment" className="max-h-80 w-full object-contain"
          src={`/api/leads/${encodeURIComponent(leadId)}/media/${encodeURIComponent(photo)}/content`} />}
        {records.deals.map(row => <div key={row._id} className="rounded-lg bg-slate-50 p-2">
          <h4 className="font-semibold">Deal · {row.status} {row.stockNumber}</h4>
          <p>{ppsr(row.ppsr)}</p>
          {row.contract && <p>Signed contract · {row.contract.reference} · {new Date(row.contract.signed_at).toLocaleString()} · <a className="underline" target="_blank" rel="noreferrer" href={`/api/leads/${leadId}/media/${row.contract.media_id}/content`}>View document</a></p>}
          {row.appraisal_id && <a className="text-xs text-blue-700 underline" href={`#appraisal-${row.appraisal_id}`}>Linked appraisal</a>}
          {row.appraisal_ppsr && <p>Appraisal · {ppsr(row.appraisal_ppsr)}</p>}
        </div>)}
        {records.deliveries.map(row => <p key={row._id}>Delivery · {row.status} · {new Date(row.when).toLocaleString('en-AU')} · {row.accessories.filter(item => !item.completedAt).length} outstanding accessories</p>)}
      </>}
    </>}
  </section>;
}
