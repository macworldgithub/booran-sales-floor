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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
        </div>
        <div className="metric-icon">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="metric-change">{change}</p>
    </div>
  );
}
