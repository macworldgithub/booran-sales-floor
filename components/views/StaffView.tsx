'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Users, Search, RefreshCw, CheckCircle2, TrendingUp, Award, Shield } from 'lucide-react';
import { StaffMember } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { staffApi } from '@/lib/api';

export function StaffView() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [site, setSite] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.getStaff();
      if (res.success && res.data) {
        setStaff(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load staff.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter((s) => {
    if (site !== 'all' && s.site !== site) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.site.toLowerCase().includes(q);
  });

  return (
    <div className="view-stack space-y-5">
      {/* Intro */}
      <div className="page-intro p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Staff & Capacity Intelligence
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Sales Consultants & Lead Allocation
          </h2>
          <p className="text-xs text-slate-500">
            Real-time pipeline load, deals closed, and active opportunity distribution across Booran sales teams.
          </p>
        </div>

        <button
          onClick={fetchStaff}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            aria-label="Search staff"
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search consultants by name or dealership..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 font-sans"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Staff dealership" value={site} onChange={(event) => { setSite(event.target.value); setPage(1); }} className="min-h-11 max-w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
          <option value="all">All dealerships</option>{Array.from(new Set(staff.map((member) => member.site))).sort().map((name) => <option key={name}>{name}</option>)}
        </select>
        <button onClick={() => { setSite('all'); setSearchQuery(''); setPage(1); }} className="text-sm text-red-700">Reset filters</button>
      </div>
      <QueryStatus error={error} isLoading={isLoading} onRetry={fetchStaff} />
      {!isLoading && !error && filteredStaff.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No consultants match these filters.</p>}
      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredStaff.slice((Math.min(page, Math.max(1, Math.ceil(filteredStaff.length / pageSize))) - 1) * pageSize, Math.min(page, Math.max(1, Math.ceil(filteredStaff.length / pageSize))) * pageSize).map((member) => (
          <div
            key={member._id}
            className="surface-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                {member.initials || 'SC'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{member.name}</h4>
                <p className="text-[11px] text-slate-500 truncate">{member.site}</p>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">
                  Total Leads
                </span>
                <span className="text-xs font-bold text-slate-900">{member.totalLeads}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">
                  Following Up
                </span>
                <span className="text-xs font-bold text-amber-600">{member.followingUpCount}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">
                  Deals Sold
                </span>
                <span className="text-xs font-bold text-emerald-600">{member.soldCount}</span>
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Pipeline Load Capacity</span>
                <span className="font-mono font-bold text-slate-700">{member.loadCapacity}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    member.loadCapacity > 80
                      ? 'bg-red-500'
                      : member.loadCapacity > 50
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, member.loadCapacity)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination currentPage={Math.min(page, Math.max(1, Math.ceil(filteredStaff.length / pageSize)))} totalPages={Math.ceil(filteredStaff.length / pageSize)} totalItems={filteredStaff.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemName="consultants" isLoading={isLoading} />
    </div>
  );
}
