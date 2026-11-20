'use client';
import { useEffect, useState } from 'react';
import { customerTradeRequest, reduceTradePhoto } from '@/lib/trade-in';

type Photo = { id: string; name: string; section: string; status: string };
type Invitation = { dealership: string; status: string; expiresAt: string; sections: string[]; vehicleTypes: string[]; photos: Photo[] };
const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900';
const button = 'min-h-12 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50';
const views: Record<string, string> = { front: 'Front', right: 'Right side', rear: 'Rear', left: 'Left side', interior: 'Interior / cabin' };

export function TradeInSubmission({ token }: { token: string }) {
  const [info, setInfo] = useState<Invitation | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [view, setView] = useState('front');
  const [vehicle, setVehicle] = useState({ vehicleType: 'car', make: '', model: '', year: '', rego: '', vin: '', odometer: '', notes: '' });
  const load = async () => setInfo(await customerTradeRequest<Invitation>(token));
  useEffect(() => {
    let active = true;
    customerTradeRequest<Invitation>(token).then(data => { if (active) setInfo(data); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [token]);
  const run = async (work: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); try { await work(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  const update = (key: keyof typeof vehicle, value: string) => setVehicle(old => ({ ...old, [key]: value }));
  const upload = async (file: File) => {
    if (!info) return;
    const image = await reduceTradePhoto(file);
    const prepared = await customerTradeRequest<{ id: string; upload: { chunk_size: number } }>(token, '/photos', { method: 'POST', body: JSON.stringify({ name: image.name, size: image.size, content_type: image.type, section: view }) });
    const chunk = prepared.upload.chunk_size;
    if (!Number.isInteger(chunk) || chunk <= 0 || chunk > 2 * 1024 * 1024) throw new Error('The photo upload configuration is unavailable.');
    try {
      for (let offset = 0; offset < image.size; offset += chunk) {
        await customerTradeRequest(token, '/photos/' + prepared.id + '/content?offset=' + offset, { method: 'PUT', body: image.slice(offset, offset + chunk) });
      }
      await customerTradeRequest(token, '/photos/' + prepared.id + '/complete', { method: 'POST', body: '{}' });
    } finally { await load(); }
  };
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 pb-24">
    <header><p className="text-sm font-bold text-red-700">{info?.dealership || 'Booran Motors'}</p>
      <h1 className="mt-2 text-3xl font-bold">Thinking of selling a vehicle?</h1>
      <p className="mt-3 text-slate-600">Cars, caravans, trailers, boats and jet skis are welcome. Share a few details and photos for our valuation team.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {!info ? <p role="status">Loading your invitation…</p> : info.status === 'submitted' || info.status === 'submitting' ? <section className="rounded-xl bg-emerald-50 p-5"><h2 className="text-xl font-bold">Thank you — your vehicle is in our valuation queue.</h2><p className="mt-2">The dealership team will review your photos and details.</p></section> : info.status === 'opted_out' ? <p>You have been opted out.</p> : <>
      <form className="space-y-5" onSubmit={event => { event.preventDefault(); void run(async () => {
        await customerTradeRequest(token, '/submit', { method: 'POST', body: JSON.stringify({
          ...vehicle, year: vehicle.year ? Number(vehicle.year) : undefined, odometer: vehicle.odometer ? Number(vehicle.odometer) : undefined,
          photoIds: info.photos.filter(photo => photo.status === 'ready').map(photo => photo.id),
        }) }); await load();
      }); }}>
        <fieldset disabled={busy} className="space-y-4">
          <legend className="text-lg font-bold">1. Vehicle details</legend>
          <label className="block">Vehicle type<select className={field} value={vehicle.vehicleType} onChange={e => update('vehicleType', e.target.value)}>{info.vehicleTypes.map(value => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Make<input className={field} required maxLength={80} value={vehicle.make} onChange={e => update('make',e.target.value)} /></label>
            <label>Model or description<input className={field} required maxLength={100} value={vehicle.model} onChange={e => update('model',e.target.value)} /></label>
            <label>Year<input className={field} type="number" min="1900" max={new Date().getFullYear()+2} value={vehicle.year} onChange={e => update('year',e.target.value)} /></label>
            <label>Registration (if applicable)<input className={field} maxLength={12} value={vehicle.rego} onChange={e => update('rego',e.target.value.toUpperCase())} /></label>
            <label>VIN / hull ID (optional)<input className={field} maxLength={30} value={vehicle.vin} onChange={e => update('vin',e.target.value.toUpperCase())} /></label>
            <label>Odometer (optional)<input className={field} type="number" min="0" max="10000000" value={vehicle.odometer} onChange={e => update('odometer',e.target.value)} /></label>
          </div>
          <label className="block">Condition and anything else we should know<textarea className={field} rows={3} maxLength={5000} value={vehicle.notes} onChange={e => update('notes',e.target.value)} /></label>
          <h2 className="text-lg font-bold">2. Add photos</h2>
          <p className="text-sm text-slate-600">Follow the views below. At least one photo is required. You can take photos now or choose them from your gallery.</p>
          <nav aria-label="Vehicle photo views" className="flex flex-wrap gap-2">{info.sections.map(section => <button key={section} type="button" aria-pressed={view === section} className={view === section ? button : 'min-h-11 rounded-lg border px-3 py-2'} onClick={() => setView(section)}>{views[section]}</button>)}</nav>
          <label className="block font-semibold">{views[view]} photo<input className={field} type="file" accept="image/*" capture="environment" disabled={info.photos.length >= 10} onChange={e => { const file=e.target.files?.[0]; e.target.value=''; if (file) void run(() => upload(file)); }} /></label>
          {info.photos.map(photo => <div key={photo.id} className="rounded-lg border p-3 text-sm"><p>{views[photo.section]} · {photo.name} · {photo.status === 'ready' ? 'Uploaded' : 'Upload incomplete'}</p>{photo.status !== 'ready' && <button type="button" className="min-h-11 underline" onClick={() => void run(async () => { await customerTradeRequest(token,'/photos/'+photo.id,{method:'DELETE'}); await load(); })}>Remove incomplete upload to try again</button>}</div>)}
          <button className={button} disabled={!info.photos.some(photo => photo.status === 'ready')} type="submit">{busy ? 'Saving…' : '3. Send to valuation team'}</button>
        </fieldset>
      </form>
      <button type="button" disabled={busy} className="min-h-11 text-sm text-slate-600 underline disabled:opacity-50" onClick={() => void run(async () => { await customerTradeRequest(token, '/opt-out', { method: 'POST', body: '{}' }); setInfo({ ...info, status: 'opted_out' }); })}>Opt out of dealership communications</button>
    </>}
  </main>;
}
