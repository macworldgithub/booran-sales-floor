import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'red' | 'cyan' | 'green';
}

export function MetricCard({ label, value, change, icon: Icon, tone = 'neutral' }: MetricCardProps) {
  const toneClass = tone === 'red' ? 'metric-red' : tone === 'cyan' ? 'metric-cyan' : tone === 'green' ? 'metric-green' : '';

  return (
    <div className={`metric-card ${toneClass}`}>
      <div className="flex items-start justify-between gap-1.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="metric-label truncate">{label}</p>
          <p className="metric-value truncate">{value}</p>
        </div>
        <div className="metric-icon shrink-0">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      <p className="metric-change line-clamp-1 mt-1 text-[10px] sm:text-[11px] text-slate-500 font-medium">{change}</p>
    </div>
  );
}
