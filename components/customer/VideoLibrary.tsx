'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { crmApi } from '@/lib/crm-updates';
import type { Lead, CustomerMedia } from '@/lib/types';
export function VideoLibrary({ lead, media, onAttach }: {
    lead: Lead;
    media: CustomerMedia[];
    onAttach: (media: CustomerMedia) => void;
}) {
    const { user } = useAuth(), [clips, setClips] = useState<{
        id: string;
        title: string;
    }[]>([]), [reload, setReload] = useState(0), [title, setTitle] = useState(''), [source, setSource] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { const controller = new AbortController(); crmApi.library(lead.dealership, controller.signal).then(r => { if (!controller.signal.aborted)
        setClips(r.data || []); }).catch(e => { if (!controller.signal.aborted)
        setError(e.message); }); return () => controller.abort(); }, [lead.dealership, reload]);
    async function run(work: () => Promise<unknown>) { if (busy)
        return; setBusy(true); setError(''); try {
        await work();
        setReload(v => v + 1);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-bold">Good Showroom video library · approved template clips</summary><p className="my-2 text-xs">Attach an approved generic clip instantly, then send its customer-specific link in the message above.</p>{!clips.length && <p className="text-xs">No approved clips at this dealership yet.</p>}{clips.map(clip => <div key={clip.id} className="my-2 flex flex-wrap items-center justify-between gap-2"><span>{clip.title}</span><div className="flex gap-2"><button disabled={busy} className="min-h-11 rounded-lg border px-3" onClick={() => run(async () => { const result = await crmApi.attachClip(lead._id, clip.id); if (result.data)
        onAttach(result.data); })}>Attach clip</button>{user?.canAllocate && <button disabled={busy} className="min-h-11 rounded-lg border px-3" onClick={() => run(() => crmApi.withdrawClip(clip.id))}>Withdraw</button>}</div></div>)}
    {user?.canAllocate && <form className="mt-3 space-y-2 border-t pt-3" onSubmit={e => { e.preventDefault(); void run(async () => { await crmApi.publishClip(lead._id, source, title, confirmed); setTitle(''); setConfirmed(false); }); }}><p className="text-xs font-semibold">Approve a reusable generic clip</p><select aria-label="Template source video" required value={source} onChange={e => setSource(e.target.value)} className="min-h-11 w-full rounded-lg border p-2"><option value="">Choose a ready customer upload</option>{media.filter(m => m.content_type.startsWith('video/') && (!m.status || m.status === 'ready')).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><input aria-label="Video template title" required maxLength={200} placeholder="Library clip title" value={title} onChange={e => setTitle(e.target.value)} className="min-h-11 w-full rounded-lg border p-2"/><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I approve this generic clip for reuse and confirm it contains no customer information.</label><button disabled={busy || !source || !title.trim() || !confirmed} className="min-h-11 rounded-lg border px-3 disabled:opacity-50">Approve clip</button></form>}{error && <p role="alert" className="text-red-700">{error}</p>}
  </details>;
}
