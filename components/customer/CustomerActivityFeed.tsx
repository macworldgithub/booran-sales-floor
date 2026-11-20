'use client';
import { useState } from 'react';
import type { Lead } from '@/lib/types';
import { ManagerNoteEdit } from './ManagerNoteEdit';
const managers = ['super_admin', 'manager', 'sales_manager', 'dealer_principal', 'general_manager'];
export function CustomerActivityFeed({ lead, onUpdated }: {
    lead: Lead;
    onUpdated?: (lead: Lead) => void;
}) {
    const [role, setRole] = useState('all'), [kind, setKind] = useState('all'), [author, setAuthor] = useState('all');
    const notes = lead.diary_entries || [], entries = notes.filter(entry => (role === 'all' || (role === 'manager' ? managers.includes(entry.author_role || '') : entry.author_role === 'sales_consultant')) && (kind === 'all' || (entry.kind || 'note') === kind) && (author === 'all' || entry.author === author));
    return <div className="space-y-3"><div className="flex flex-wrap gap-2"><label className="text-xs">Author role<select aria-label="Activity author role" className="ml-2 min-h-11 rounded-lg border p-2" value={role} onChange={e => setRole(e.target.value)}><option value="all">All roles</option><option value="manager">Manager</option><option value="salesperson">Salesperson</option></select></label><label className="text-xs">Person<select aria-label="Activity author" className="ml-2 min-h-11 max-w-full rounded-lg border p-2" value={author} onChange={e => setAuthor(e.target.value)}><option value="all">All people</option>{[...new Set(notes.map(entry => entry.author))].sort().map(name => <option key={name}>{name}</option>)}</select></label><label className="text-xs">Activity<select aria-label="Activity type" className="ml-2 min-h-11 rounded-lg border p-2" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All activities</option>{[...new Set([...notes.map(entry => entry.kind || 'note'), 'video_sent', 'video_viewed'])].sort().map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label></div>
    {entries.map((entry, index) => <article key={`${entry.date}-${index}`} className={`rounded-xl border p-3 text-xs ${managers.includes(entry.author_role || '') ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}><div className="mb-1 flex flex-wrap justify-between gap-2 text-slate-600"><span>{entry.author} {managers.includes(entry.author_role || '') && <strong className="ml-1 rounded bg-blue-100 px-2 py-1 text-blue-900">Manager note</strong>} · {(entry.kind || 'note').replaceAll('_', ' ')}</span><time>{entry.date ? new Date(entry.date).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : ''}</time></div><p className="whitespace-pre-wrap break-words text-slate-800">{entry.note}</p>{entry.edited_at && <p className="mt-1 text-slate-600">Edited by {entry.edited_by_name} · {new Date(entry.edited_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</p>}<ManagerNoteEdit leadId={lead._id} entry={entry} onUpdated={onUpdated}/></article>)}
    {!entries.length && <p className="rounded-lg bg-slate-50 p-3 text-xs">No activity matches these filters.</p>}
  </div>;
}
