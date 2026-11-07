'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

type Photo = { id: string; name: string };
type PPSR = { status: string; reference?: string };
type Records = {
  appraisals: {
    _id: string; rego?: string; vin?: string; notes?: string; ppsr?: PPSR; licence?: Photo[];
    inspection?: { section: string; condition: string; notes?: string; photos: Photo[] }[];
    loanCar?: { signer: string; signedAt: string };
  }[];
  deals: { _id: string; status: string; stockNumber?: string; appraisal_id?: string; ppsr?: PPSR; appraisal_ppsr?: PPSR }[];
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
          {row.notes && <p>{row.notes}</p>}
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
          {row.appraisal_id && <a className="text-xs text-blue-700 underline" href={`#appraisal-${row.appraisal_id}`}>Linked appraisal</a>}
          {row.appraisal_ppsr && <p>Appraisal · {ppsr(row.appraisal_ppsr)}</p>}
        </div>)}
        {records.deliveries.map(row => <p key={row._id}>Delivery · {row.status} · {new Date(row.when).toLocaleString('en-AU')} · {row.accessories.filter(item => !item.completedAt).length} outstanding accessories</p>)}
      </>}
    </>}
  </section>;
}
