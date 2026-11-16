'use client';
import { useRef } from 'react';
export type Signature = number[][][];
export function LoanSignature({ value, onChange, disabled }: { value: Signature; onChange: (value: Signature) => void; disabled?: boolean }) {
  const stroke = useRef<number[][] | null>(null);
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))];
  };
  return <div className="space-y-2"><svg role="img" aria-label="Draw loan-car signature" viewBox="0 0 600 180" className="h-44 w-full touch-none rounded-lg border border-slate-400 bg-white"
    onPointerDown={event => { if (disabled || value.length >= 40) return; event.currentTarget.setPointerCapture(event.pointerId); const first = point(event); stroke.current = [first, first]; onChange([...value, stroke.current]); }}
    onPointerMove={event => { if (!stroke.current || disabled || stroke.current.length >= 500) return; stroke.current = [...stroke.current, point(event)]; onChange([...value.slice(0, -1), stroke.current]); }}
    onPointerUp={() => { stroke.current = null; }} onPointerCancel={() => { stroke.current = null; }}>
    {value.map((line, index) => <polyline key={index} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" points={line.map(([x, y]) => `${x * 600},${y * 180}`).join(' ')} />)}
  </svg><button type="button" disabled={disabled} className="text-sm underline" onClick={() => onChange([])}>Clear signature</button></div>;
}
