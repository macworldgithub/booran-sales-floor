'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';

const SITE = 'BYD South Morang';
const endpoint = '/integrations/virtualyard/csv';
const MAX_FILES = 16;
const MAX_FILE_MB = 4;
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

  async function checkFiles() {
    setJobs([]);
    setRejectedFiles([]);
    const checkedFiles: Job[] = [];
    for (const [index, file] of files.entries()) {
      setStatus(`Checking file ${index + 1} of ${files.length} · ${file.name}`);
      try {
        const { data } = await fetchApi<Preview>(`${endpoint}?file=${encodeURIComponent(file.name)}`, {
          body: file, method: 'POST', headers: { 'Content-Type': 'text/csv' }, timeoutMs: 85000, notifyDataChanged: false,
        });
        if (!data) throw new Error('The file check was unavailable.');
        checkedFiles.push(data);
        setJobs(current => [...current, data]);
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Could not check the CSV.';
        setRejectedFiles(current => [...current, { file: file.name, message }]);
      }
    }
    return checkedFiles;
  }

  async function runImport(resume = false) {
    setBusy(true);
    setError('');
    let saved = false;
    try {
      const checkedFiles = resume ? jobs : await checkFiles();
      const importable = checkedFiles.filter(file => file.id);
      for (const [index, file] of importable.entries()) {
        if (!file.id || file.progress?.done) continue;
        let progress = file.progress;
        while (!progress?.done) {
          setStatus(`Importing file ${index + 1} of ${importable.length} · ${file.file} · ${progress?.processed ?? 0} of ${file.ready} records`);
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

  const readyFiles = jobs.filter(job => job.id).length;
  const completedFiles = jobs.filter(job => job.progress?.done).length;
  const hasPendingImport = readyFiles > completedFiles;
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">Import Virtual Yard CSV</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-600">Upload up to {MAX_FILES} Leads or Test Drives CSVs for BYD South Morang, up to {MAX_FILE_MB} MB and 10,000 rows per file. Import starts automatically after checking the files.</p>
        <label className="block text-xs font-semibold">
          Virtual Yard CSV files
          <input type="file" accept=".csv,text/csv" multiple disabled={busy} className="mt-1 block max-w-full"
            onChange={event => {
              const selected = Array.from(event.target.files ?? []).sort((a, b) => a.name.localeCompare(b.name));
              setJobs([]);
              setRejectedFiles([]);
              if (selected.length > MAX_FILES || selected.some(file => !/\.csv$/i.test(file.name) || file.size > MAX_FILE_MB * 1024 * 1024)) {
                setFiles([]);
                setError(`Select up to ${MAX_FILES} CSV files of ${MAX_FILE_MB} MB each.`);
              } else {
                setFiles(selected);
                setError('');
              }
            }} />
        </label>
        <button type="button" className={button} disabled={busy || !files.length || hasPendingImport} onClick={() => void runImport()}>Check and import files</button>
        {status && <p role="status" className="text-xs text-slate-600">{status}</p>}
        {files.length > 0 && (
          <dl aria-label="CSV file totals" aria-live="polite" className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-3">
            <div><dt className="text-slate-600">Files checked successfully</dt><dd className="font-bold">{jobs.length} of {files.length}</dd></div>
            <div><dt className="text-slate-600">Files imported</dt><dd className="font-bold">{completedFiles} of {readyFiles} ready</dd></div>
            <div><dt className="text-slate-600">Files that failed checks</dt><dd className="font-bold">{rejectedFiles.length}</dd></div>
          </dl>
        )}
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
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="font-semibold">{job.progress.done ? 'Import complete' : `${job.progress.processed} of ${job.progress.total} processed`}</p>
                <dl aria-label="Record totals for this file" className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <div><dt className="inline text-slate-600">Inserted </dt><dd className="inline font-bold">{job.progress.result.inserted.toLocaleString()}</dd></div>
                  <div><dt className="inline text-slate-600">Updated </dt><dd className="inline font-bold">{job.progress.result.updated.toLocaleString()}</dd></div>
                  <div><dt className="inline text-slate-600">Unchanged </dt><dd className="inline font-bold">{job.progress.result.unchanged.toLocaleString()}</dd></div>
                  <div><dt className="inline text-slate-600">Skipped </dt><dd className="inline font-bold">{job.progress.result.skipped.toLocaleString()}</dd></div>
                </dl>
              </div>
            )}
          </div>
        ))}
        {!busy && hasPendingImport && (
          <button type="button" className={`${button} bg-slate-900 text-white`} onClick={() => void runImport(true)}>
            Resume import
          </button>
        )}
      </div>
    </details>
  );
}
