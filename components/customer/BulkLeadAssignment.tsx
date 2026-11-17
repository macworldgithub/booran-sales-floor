'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { leadApi } from '@/lib/api';
import { crmApi } from '@/lib/crm-updates';
import type { Lead } from '@/lib/types';
export function BulkLeadAssignment({ leads }: {
    leads: Lead[];
}) {
    const { user } = useAuth(), [ids, setIds] = useState<string[]>([]), [people, setPeople] = useState<{
        id: string;
        name: string;
    }[]>([]), [target, setTarget] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const selected = leads.filter(lead => ids.includes(lead._id));
    const first = selected[0]?._id;
    useEffect(() => { let active = true; setTarget(''); setPeople([]); if (first)
        leadApi.getAssignees(first).then(result => { if (active)
            setPeople(result.data || []); }).catch(e => { if (active)
            setMessage(e.message); }); return () => { active = false; }; }, [first]);
    if (!user?.canAllocate)
        return null;
    return <details className="my-3 rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-bold">Bulk reassignment · select customers from this page</summary><p className="my-2 text-xs">Future follow-up dates and history are retained. Open tasks and linked work move to the new assignee. Up to 100 customers per request.</p><div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">{leads.map(lead => <label key={lead._id} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={ids.includes(lead._id)} disabled={busy} onChange={e => setIds(v => e.target.checked ? [...v, lead._id] : v.filter(id => id !== lead._id))}/>{lead.name} · {lead.owner_name}</label>)}</div><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Bulk reassignment recipient" className="min-h-11 max-w-full rounded-lg border p-2" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose salesperson or manager</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button disabled={busy || !selected.length || selected.length > 100 || !target} className="min-h-11 rounded-lg border px-3 font-semibold disabled:opacity-50" onClick={async () => { setBusy(true); try {
        const result = await crmApi.bulkAssign(selected, target);
        if (result.data) {
            setIds(result.data.errors.map(e => e.id));
            setMessage(`${result.data.reassigned.length} customers reassigned.${result.data.errors.map(e => ` ${leads.find(l => l._id === e.id)?.name}: ${e.error}`).join('')}`);
        }
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}>Reassign {selected.length} selected</button></div>{message && <p role="status" className="mt-2 whitespace-pre-wrap text-xs">{message}</p>}</details>;
}
