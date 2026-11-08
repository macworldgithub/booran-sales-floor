'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { staffAdminApi, type StaffAccess, type StaffAccount, type StaffDirectory, type StaffRole } from '@/lib/api';

const roleLabels: Record<StaffRole, string> = {
  dealer_principal: 'Dealer principal', general_manager: 'General manager', sales_manager: 'Sales manager',
  manager: 'Manager', sales_consultant: 'Sales consultant', contractor: 'Contractor',
};
const emptyAccess: StaffAccess = { role: 'sales_consultant', site: '', allowedSites: [], viewCost: false };
const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';

export function StaffAccounts() {
  const [directory, setDirectory] = useState<StaffDirectory | null>(null);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [access, setAccess] = useState(emptyAccess);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    staffAdminApi.list(controller.signal).then(result => {
      if (!controller.signal.aborted && result.data) setDirectory(result.data);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [revision]);

  function selectAccount(account: StaffAccount | null) {
    setEditing(account);
    setAccess(account ? { role: account.role, site: account.site, allowedSites: account.allowedSites, viewCost: account.viewCost } : emptyAccess);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setNotice('');
  }

  const selectedSites = directory?.sites.filter(site => access.allowedSites.includes(site)) ?? [];

  function toggleSite(site: string, checked: boolean) {
    const sites = checked ? [...selectedSites, site] : selectedSites.filter(value => value !== site);
    setAccess({ ...access, allowedSites: sites, site: sites.includes(access.site) ? access.site : sites[0] || '' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...access, allowedSites: selectedSites };
      const result = editing
        ? await staffAdminApi.update(editing.id, payload)
        : await staffAdminApi.create({ ...payload, name, email, password });
      if (!result.data) throw new Error('The server did not return the saved account.');
      const account = result.data;
      setDirectory(previous => previous && {
        ...previous,
        accounts: [...previous.accounts.filter(value => value.id !== account.id), account].sort((a, b) => a.name.localeCompare(b.name)),
      });
      selectAccount(account);
      setNotice(editing ? 'Staff access updated.' : 'Staff account created.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save the staff account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Staff accounts" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-bold text-slate-900">Staff accounts</h3>
      <p className="mt-1 text-sm text-slate-600">Create sign-ins and choose which dealerships each staff member can access.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {!directory && (error
        ? <button type="button" onClick={() => { setError(''); setRevision(value => value + 1); }} className="mt-3 text-sm font-semibold text-red-700">Retry</button>
        : <p className="mt-3 text-sm text-slate-500">Loading accounts…</p>)}
      {directory && <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 p-3">
          <button type="button" disabled={saving} onClick={() => selectAccount(null)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Create staff account
          </button>
          <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
            {directory.accounts.map(account => <li key={account.id}>
              <button type="button" disabled={saving} aria-pressed={editing?.id === account.id} onClick={() => selectAccount(account)}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50 aria-pressed:bg-slate-100">
                <span className="block break-words text-sm font-semibold text-slate-900">{account.name}</span>
                <span className="block break-words text-xs text-slate-600">{account.email}</span>
                <span className="mt-1 block text-xs text-slate-500">{roleLabels[account.role]} · {account.site}{account.active ? '' : ' · Inactive'}</span>
              </button>
            </li>)}
          </ul>
          {!directory.accounts.length && <p className="mt-3 text-sm text-slate-500">No staff accounts yet.</p>}
        </div>
        <form onSubmit={save} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <fieldset disabled={saving} className="min-w-0 space-y-3">
            <legend className="mb-3 text-sm font-bold text-slate-900">{editing ? `Access for ${editing.name}` : 'New staff account'}</legend>
            {!editing && <>
              <label className="block text-sm font-medium">Full name<input className={field} value={name} maxLength={200} onChange={event => setName(event.target.value)} required /></label>
              <label className="block text-sm font-medium">Email<input className={field} type="email" value={email} maxLength={254} onChange={event => setEmail(event.target.value)} required /></label>
              <label className="block text-sm font-medium">Password<input className={field} type="password" value={password} minLength={12} maxLength={256} autoComplete="new-password" onChange={event => setPassword(event.target.value)} required />
                <span className="mt-1 block text-xs text-slate-500">Use at least 12 characters.</span>
              </label>
            </>}
            <label className="block text-sm font-medium">Role
              <select className={field} value={access.role} onChange={event => setAccess({ ...access, role: event.target.value as StaffRole, viewCost: false })}>
                {directory.roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </label>
            <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
              <legend className="px-1 text-sm font-medium">Dealership access</legend>
              <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                {directory.sites.map(site => <label className="flex items-start gap-2 text-sm" key={site}>
                  <input className="mt-1" type="checkbox" checked={selectedSites.includes(site)} onChange={event => toggleSite(site, event.target.checked)} />{site}
                </label>)}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">Home dealership
              <select className={field} value={selectedSites.includes(access.site) ? access.site : ''} onChange={event => setAccess({ ...access, site: event.target.value })} required>
                <option value="">Choose a dealership</option>
                {selectedSites.map(site => <option key={site}>{site}</option>)}
              </select>
            </label>
            {access.role === 'sales_consultant' && <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={access.viewCost} onChange={event => setAccess({ ...access, viewCost: event.target.checked })} />Allow viewing vehicle costs
            </label>}
            <button type="submit" disabled={!selectedSites.includes(access.site)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Save access' : 'Create account'}
            </button>
          </fieldset>
        </form>
      </div>}
    </section>
  );
}
