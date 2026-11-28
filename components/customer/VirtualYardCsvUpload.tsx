'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';

const SITE = 'BYD South Morang';
const endpoint = '/integrations/virtualyard/csv';
const button = 'min-h-10 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-50';
type Result = { inserted: number; updated: number; unchanged: number; skipped: number };
type Preview = {
  id: string | null;
  type: 'lead' | 'test_drive';
  file: string;
  rows: number;
  ready: number;
  existing: number;
  duplicates: number;
  issues: number;
  examples: { row: number; message: string }[];
};
type Progress = { processed: number; total: number; done: boolean; result: Result };
type Job = Preview & { progress?: Progress };
const managerRoles = ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'];

export function VirtualYardCsvUpload({ rooftop }: { rooftop: string }) {
  const { user, locations } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rejectedFiles, setRejectedFiles] = useState<{ file: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  if (!user || !managerRoles.includes(user.role) ||
    (user.role !== 'super_admin' && !locations.includes(SITE) && ![user.site, ...(user.allowedSites ?? [])].some(site => [SITE, 'South Morang'].includes(site))) ||
    ![SITE, 'South Morang', 'All Locations'].includes(rooftop)) return null;

  async function preview() {
    setBusy(true);
    setError('');
    setJobs([]);
    setRejectedFiles([]);
    const staged: Job[] = [];
    const rejected: { file: string; message: string }[] = [];
    try {
      for (const file of files) {
        setStatus(`Checking ${file.name}…`);
        try {
          const result = await fetchApi<Preview>(`${endpoint}?file=${encodeURIComponent(file.name)}`, {
            body: file, method: 'POST', headers: { 'Content-Type': 'text/csv' }, timeoutMs: 85000, notifyDataChanged: false,
          });
          if (!result.data) throw new Error('The file preview was unavailable.');
          staged.push(result.data);
        } catch (reason) {
          rejected.push({ file: file.name, message: reason instanceof Error ? reason.message : 'Could not preview the CSV.' });
        }
      }
      setJobs(staged);
      setRejectedFiles(rejected);
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  async function apply() {
    setBusy(true);
    setError('');
    let saved = false;
    try {
      for (const file of jobs) {
        if (!file.id || file.progress?.done) continue;
        let progress = file.progress;
        while (!progress?.done) {
          setStatus(`Importing ${file.file} · ${progress?.processed ?? 0} of ${file.ready}`);
          const response = await fetchApi<Progress>(`${endpoint}/${encodeURIComponent(file.id)}/apply`, {
            method: 'POST', body: '{}', timeoutMs: 85000, notifyDataChanged: false,
          });
          if (!response.data) throw new Error('Could not confirm the import progress.');
          progress = response.data;
          saved = true;
          setJobs(current => current.map(job => job.id === file.id ? { ...job, progress } : job));
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The import paused. Select Resume import to continue.');
    } finally {
      setBusy(false);
      setStatus('');
      if (saved) window.dispatchEvent(new Event('booran:data-changed'));
    }
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">Import Virtual Yard CSV</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-600">Upload Leads or Test Drives exports for BYD South Morang. Files can be up to 2 MB each.</p>
        <label className="block text-xs font-semibold">
          Virtual Yard CSV files
          <input type="file" accept=".csv,text/csv" multiple disabled={busy} className="mt-1 block max-w-full"
            onChange={event => {
              const selected = Array.from(event.target.files ?? []).sort((a, b) => a.name.localeCompare(b.name));
              setJobs([]);
              setRejectedFiles([]);
              if (selected.length > 12 || selected.some(file => !/\.csv$/i.test(file.name) || file.size > 2 * 1024 * 1024)) {
                setFiles([]);
                setError('Select up to 12 CSV files of 2 MB each.');
              } else {
                setFiles(selected);
                setError('');
              }
            }} />
        </label>
        <button type="button" className={button} disabled={busy || !files.length} onClick={() => void preview()}>Preview files</button>
        {status && <p role="status" className="text-xs text-slate-600">{status}</p>}
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        {rejectedFiles.length > 0 && (
          <ul className="space-y-1 text-xs text-red-700" aria-label="Files that need review">
            {rejectedFiles.map((item, i) => <li key={i}><strong>{item.file}</strong> · {item.message}</li>)}
          </ul>
        )}
        {jobs.map((job, index) => (
          <div key={job.id || `${job.file}-${index}`} className="space-y-1 rounded-lg border border-slate-200 p-3 text-xs">
            <p className="break-words font-semibold">{job.file} · {job.type === 'lead' ? 'Leads' : 'Test Drives'}</p>
            <p>{job.ready.toLocaleString()} ready · {job.existing.toLocaleString()} matching Virtual Yard IDs · {job.duplicates.toLocaleString()} repeated rows · {job.issues.toLocaleString()} issues</p>
            {job.examples.length > 0 && (
              <details><summary className="cursor-pointer font-semibold">Rows that need review</summary>
                <ul className="mt-1 list-disc space-y-1 pl-4">{job.examples.map((issue, i) => <li key={i}>Row {issue.row} · {issue.message}</li>)}</ul>
              </details>
            )}
            {job.progress && (
              <p className="font-semibold">{job.progress.done ? 'Import complete' : `${job.progress.processed} of ${job.progress.total} processed`} · {job.progress.result.inserted.toLocaleString()} inserted · {job.progress.result.updated.toLocaleString()} updated · {job.progress.result.unchanged.toLocaleString()} unchanged · {job.progress.result.skipped.toLocaleString()} skipped</p>
            )}
          </div>
        ))}
        {jobs.some(job => job.id && !job.progress?.done) && (
          <button type="button" className={`${button} bg-slate-900 text-white`} disabled={busy} onClick={() => void apply()}>
            {error || jobs.some(job => job.progress) ? 'Resume import' : 'Apply import'}
          </button>
        )}
      </div>
    </details>
  );
}
