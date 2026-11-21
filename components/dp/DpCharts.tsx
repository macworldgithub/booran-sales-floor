'use client';
import { useState } from 'react';
import { dpNumber } from '@/lib/dp-dashboard';

export function DpLineChart({ title, points, suffix = '' }: { title: string; points: { label: string; value: number | null; target?: number | null }[]; suffix?: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const values = points.flatMap(point => [point.value, point.target].filter((value): value is number => value != null));
  const max = Math.max(1, ...values), min = Math.min(0, ...values), y = (value: number) => 165 - (value - min) / (max - min) * 140;
  const x = (index: number) => 40 + index / Math.max(1, points.length - 1) * 530;
  const path = (field: 'value' | 'target') => { let connected = false; return points.map((point, index) => {
    const value = point[field]; if (value == null) { connected = false; return ''; } const command = connected ? 'L' : 'M'; connected = true; return `${command}${x(index)},${y(value)}`;
  }).join(' '); };
  const current = selected === null ? null : points[selected];
  return <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"><figcaption className="font-bold text-slate-900">{title}</figcaption>
    {!values.length ? <p className="flex min-h-48 items-center justify-center text-sm text-slate-500">No measurements in this period.</p> : <>
      <div className="mt-2 flex min-h-6 flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Blue: actual · dashed: target</span><span role="status">{current ? `${current.label}: ${dpNumber(current.value,suffix)}${current.target==null?'':` · target ${dpNumber(current.target,suffix)}`}` : 'Select a point to inspect'}</span></div>
      <svg viewBox="0 0 600 205" className="mt-1 w-full" role="img" aria-label={title}>
        {[0,0.5,1].map(part => <g key={part}><line x1="40" x2="570" y1={25+part*140} y2={25+part*140} stroke="#e2e8f0"/><text x="34" y={29+part*140} textAnchor="end" fill="#64748b" fontSize="10">{dpNumber(max-(max-min)*part)}</text></g>)}
        <path d={path('target')} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5"/>
        <path d={path('value')} fill="none" stroke="#2563eb" strokeWidth="3"/>
        {points.map((point,index) => point.value == null ? null : <circle key={point.label} cx={x(index)} cy={y(point.value)} r={selected===index?5:3} fill="#2563eb" tabIndex={0} role="button" aria-label={`${point.label}: ${dpNumber(point.value,suffix)}`} onMouseEnter={()=>setSelected(index)} onFocus={()=>setSelected(index)} onClick={()=>setSelected(index)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')setSelected(index);}}><title>{point.label}: {dpNumber(point.value,suffix)}</title></circle>)}
        <text x="40" y="195" fontSize="11" fill="#64748b">{points[0]?.label}</text><text x="570" y="195" textAnchor="end" fontSize="11" fill="#64748b">{points.at(-1)?.label}</text>
      </svg>
      <details className="text-xs text-slate-600"><summary className="min-h-8 cursor-pointer">View chart data</summary><div className="max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th>Date</th><th>Actual</th><th>Target</th></tr></thead><tbody>{points.map(point=><tr key={point.label}><td>{point.label}</td><td>{dpNumber(point.value,suffix)}</td><td>{dpNumber(point.target,suffix)}</td></tr>)}</tbody></table></div></details>
    </>}
  </figure>;
}
export function DpBars({ title, rows, onSelect }: { title: string; rows: { label: string; value: number | null; display: string }[]; onSelect?: (label: string) => void }) {
  const max = Math.max(1,...rows.map(row=>Math.abs(row.value||0)));
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-bold">{title}</h3><div className="mt-4 space-y-4">{rows.map(row=><button key={row.label} type="button" disabled={!onSelect} onClick={()=>onSelect?.(row.label)} className="block min-h-11 w-full text-left disabled:cursor-default"><span className="flex flex-wrap justify-between gap-2 text-xs"><span>{row.label}</span><strong>{row.display}</strong></span><span className="mt-2 block h-2 rounded-full bg-slate-100"><span className={`block h-full rounded-full ${row.value!==null&&row.value<0?'bg-red-400':'bg-blue-500'}`} style={{width:row.value==null?'0%':Math.abs(row.value)/max*100+'%'}}/></span></button>)}{!rows.length&&<p className="text-sm text-slate-500">No sites or measurements available.</p>}</div></section>;
}
