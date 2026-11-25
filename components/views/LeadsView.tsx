'use client';
import { leadSources } from '@/lib/lead-sources';
import { EngagementIndicator } from '@/components/customer/EngagementIndicator';
import { RooftopOptions } from '@/components/ui/RooftopOptions';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Car,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { Pagination } from '@/components/ui/Pagination';
import { leadApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LeadAssignment } from '@/components/customer/LeadAssignment';
import {BulkLeadAssignment} from '@/components/customer/BulkLeadAssignment';
import { useDialog } from '@/lib/use-dialog';

export function getLeadAssignmentHighlight(lead: Lead) {
  const isUnassigned = !lead.owner_name || lead.owner_name === 'Unassigned' || !lead.owner_id || lead.owner_name === 'Floor';
  const isNew = lead.status === 'new_lead';
  const isConnex = lead.source === 'Connex' || Boolean(lead.deal_id?.startsWith('CONNEX')) || lead.external?.source === 'connex';
  const isMark = Boolean(lead.owner_name && /^Mark(?:\s|$)/i.test(lead.owner_name));
  const isClosed = lead.status === 'sold' || lead.status === 'lost';

  if (isClosed) return null;

  if (isUnassigned && isNew) {
    return {
      type: 'unassigned_new' as const,
      label: 'New · Needs Assignment',
      shortLabel: 'Needs Assignment',
      rowClass: 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500',
      mobileClass: 'border-l-4 border-l-amber-500 bg-amber-50/50',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    };
  }

  if (isUnassigned) {
    return {
      type: 'unassigned' as const,
      label: 'Awaiting Assignment',
      shortLabel: 'Unassigned',
      rowClass: 'bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-400',
      mobileClass: 'border-l-4 border-l-amber-400 bg-amber-50/30',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }

  if (isConnex && isMark) {
    return {
      type: 'connex_mark' as const,
      label: 'Connex · System Assisted to Mark',
      shortLabel: 'Assisted to Mark',
      rowClass: 'bg-purple-50/60 hover:bg-purple-100/60 border-l-4 border-l-purple-500',
      mobileClass: 'border-l-4 border-l-purple-500 bg-purple-50/40',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    };
  }

  return null;
}

interface LeadsViewProps {
  assignedStaff?: { id: string; name: string } | null;
  onClearStaff?: () => void;
  initialLeads?: Lead[];
  selectedRooftop: string;
  onRooftopChange: (rooftop: string) => void;
  onSelectLead: (lead: Lead) => void;
  onOpenBookDrive: (lead?: Lead) => void;
  onOpenAddProspect: () => void;
}

export function LeadsView({
  assignedStaff,
  onClearStaff,
  initialLeads = [],
  selectedRooftop,
  onRooftopChange,
  onSelectLead,
  onOpenBookDrive,
  onOpenAddProspect,
}: LeadsViewProps) {
  const { user } = useAuth();
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const closeAssignment = useCallback(() => setAssigningLead(null), []);
  const assignmentDialog = useDialog(Boolean(assigningLead), closeAssignment);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [source, setSource] = useState('all');
  const [assignment, setAssignment] = useState('all');
  const [missingContact, setMissingContact] = useState(false);
  const [ownerFilter,setOwnerFilter]=useState('');
  const rooftopFilter = selectedRooftop === 'All Locations' ? 'all' : selectedRooftop;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [selectedRooftop]);

  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('created_at:desc');
  const { data: leads, pagination, isLoading, isRefreshing, error, refresh: fetchLeads } = usePaginatedQuery(
    leadApi.getLeads,
    { page: currentPage, limit: pageSize, search: searchQuery.trim(), status: statusFilter,
    dealership: rooftopFilter, source, assignment, ...(missingContact ? { missingContact: 'true' } : {}), owner:ownerFilter.trim(), ...(assignedStaff && { ownerId: assignedStaff.id }), sortBy: sort.split(':')[0], sortOrder: sort.split(':')[1] },
    setCurrentPage,
  );
  useEffect(() => {
    if (currentPage !== 1 || isLoading || isRefreshing) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchLeads();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [currentPage, fetchLeads, isLoading, isRefreshing]);
  const totalPages = pagination.totalPages;
  const totalLeads = pagination.total;
  const resetFilters = () => {
    onClearStaff?.();
    setSearchQuery('');
    setStatusFilter('all');
    setSource('all');
    setAssignment('all');
    setMissingContact(false);
    onRooftopChange('All Locations');
    setSort('created_at:desc');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new_lead':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'following_up':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'sold':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'lost':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="view-stack space-y-5">
      {/* Page Intro Banner */}
      <div className="page-intro flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              Customer 360
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {totalLeads.toLocaleString()} Total Records
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Customer 360
          </h2>
          <p className="text-xs text-slate-500">
            Real prospects, contact intervals, vehicle inquiries and diary entries across Booran Group rooftops.
          </p>
        </div>

        <button
          onClick={onOpenAddProspect}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Walk-In Prospect</span>
        </button>
      </div>

      {/* Filters and Controls */}
      {/* Filters and Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        {/* Search Bar & Dealership Select */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              aria-label="Search results"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by customer, phone, email, vehicle..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 font-sans"
            />
          </div>

          {/* Dealership Filter & Refresh */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Dealership"
              value={rooftopFilter}
              onChange={(e) => {
                onRooftopChange(e.target.value === 'all' ? 'All Locations' : e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-red-500"
            >
              <RooftopOptions />
            </select>

            <button
              onClick={fetchLeads}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 shrink-0"
              title="Refresh Leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {assignedStaff && <button type="button" onClick={() => { onClearStaff?.(); setCurrentPage(1); }} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {assignedStaff.name} · Clear salesperson filter
          </button>}
          <select aria-label="Lead source" value={source} onChange={event => { setSource(event.target.value); setCurrentPage(1); }} className="rounded-lg border px-3 py-2 text-xs">
            <option value="all">All sources</option>
            {leadSources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {user?.canAllocate && <select aria-label="Lead assignment" value={assignment} onChange={event => { setAssignment(event.target.value); setCurrentPage(1); }} className="rounded-lg border px-3 py-2 text-xs">
            <option value="all">Any assignment</option>
            <option value="needs_allocation">Needs Assignment (Unassigned & Mark Connex)</option>
            <option value="unassigned">Unassigned</option>
            <option value="connex_mark">Connex (System Assisted to Mark)</option>
            <option value="assigned">Assigned</option>
          </select>}
          <label className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs text-slate-700">
            <input type="checkbox" checked={missingContact} onChange={e => { setMissingContact(e.target.checked); setCurrentPage(1); }} />
            No phone &amp; email
          </label>
        </div>
        {/* Status Pills (Scrollable on Mobile) */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pt-1 pb-0.5">
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'new_lead', label: 'New Leads' },
            { id: 'following_up', label: 'Following Up' },
            { id: 'sold', label: 'Sold Deals' },
            { id: 'lost', label: 'Lost' },
            { id: 'returned', label: 'Returned' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Content: Mobile Cards + Desktop Table */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600" role="status">{isLoading ? 'Updating results…' : `${totalLeads.toLocaleString()} matching results`}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">Sort by
            <select value={sort} onChange={(event) => { setSort(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="customer_name:asc">Customer A-Z</option>
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Reset filters</button>
        </div>
      </div>
      <QueryStatus error={error} isLoading={isLoading} onRetry={fetchLeads} />

      <div className="surface-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile View: High-Performance Touch Cards (< sm) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {isLoading && leads.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
              <span>Loading leads from flwup_crm...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No leads found matching your criteria.
            </div>
          ) : (
            leads.map((lead) => {
              const highlight = getLeadAssignmentHighlight(lead);
              return (
              <div
                key={lead._id}
                onClick={() => onSelectLead(lead)}
                className={`p-3.5 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer ${
                  highlight ? highlight.mobileClass : ''
                }`}
              >
                {/* Top: Customer & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {lead.initials || 'PR'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {lead.name || lead.customer_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {lead.deal_id || 'CRM-LEAD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${getStatusBadge(
                        lead.status
                      )}`}
                    >
                      {lead.status.replace('_', ' ')}
                    </span>
                    {highlight && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-tight ${highlight.badgeClass}`}>
                        {highlight.shortLabel}
                      </span>
                    )}
                  </div>
                </div>

                <EngagementIndicator engagement={lead.engagement} active={['new_lead', 'following_up', 'returned'].includes(lead.status)} />
                {/* Vehicle & Dealership */}
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">
                    {lead.vehicle || `${lead.make} ${lead.model}`}
                  </span>
                  <span className="text-slate-400"> · </span>
                  <span className="text-slate-500">{lead.dealership}</span>
                </div>

                {/* Contact & Consultant Info */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    {lead.phone && (
                      <span className="font-medium text-slate-700">{lead.phone}</span>
                    )}
                    {lead.email && (
                      <span className="text-slate-400 truncate max-w-[130px]">{lead.email}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Host: {lead.owner_name || 'Floor'}
                  </span>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {user?.canAllocate && <button type="button" onClick={() => setAssigningLead(lead)} className="rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700">Assign</button>}
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition-colors"
                  >
                    Customer 360
                  </button>
                  <button
                    onClick={() => onOpenBookDrive(lead)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 text-center transition-colors"
                  >
                    Book Drive
                  </button>
                </div>
              </div>
            );})
          )}
        </div>

        {user?.canAllocate&&<label className="my-3 block text-sm font-semibold">Filter by current consultant name<input aria-label="Current consultant name" value={ownerFilter} onChange={event=>{setOwnerFilter(event.target.value);setCurrentPage(1);}} placeholder="Exact name, including former staff such as George Jacobs" className="mt-1 min-h-11 w-full rounded-lg border p-2 font-normal"/></label>}
        <BulkLeadAssignment leads={leads} onCompleted={fetchLeads}/>
        {/* Desktop View: Full Data Table (sm+) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm border-collapse [&_td_p]:whitespace-normal [&_td_p]:break-words [&_td_p]:overflow-visible [&_th]:px-2 [&_td]:px-2">
            <colgroup>{[18,18,17,11,14,12,10].map((width,index)=><col key={index} style={{width:`${width}%`}}/>)}</colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Prospect</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Vehicle Interested</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dealership / Rooftop</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading && leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    <span>Loading leads from flwup_crm...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const highlight = getLeadAssignmentHighlight(lead);
                  return (
                  <tr
                    key={lead._id}
                    className={`${highlight ? highlight.rowClass : 'hover:bg-slate-50/80'} transition-colors cursor-pointer group`}
                    onClick={() => onSelectLead(lead)}
                  >
                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-50 text-slate-800 group-hover:text-red-700 font-bold text-xs flex items-center justify-center shrink-0 transition-colors">
                          {lead.initials || 'PR'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {lead.name || lead.customer_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {lead.deal_id || 'CRM-LEAD'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 truncate">
                        {lead.phone || lead.customer_phone || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {lead.email || lead.customer_email || '—'}
                      </p>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 truncate">
                        {lead.vehicle || `${lead.make} ${lead.model}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {[lead.source || 'Manual', lead.source_channel].filter(Boolean).join(' · ')}
                      </p>
                      <EngagementIndicator engagement={lead.engagement} active={['new_lead', 'following_up', 'returned'].includes(lead.status)} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${getStatusBadge(
                          lead.status
                        )}`}
                      >
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Dealership */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{lead.dealership}</span>
                    </td>

                    {/* Consultant */}
                    <td className="py-3 px-4" onClick={event => event.stopPropagation()}>
                      <div className="flex flex-col items-start gap-1">
                        <span className={`font-semibold ${highlight?.type === 'unassigned' || highlight?.type === 'unassigned_new' ? 'text-amber-800 font-bold' : 'text-slate-800'}`}>
                          {lead.owner_name || 'Unassigned'}
                        </span>
                        {highlight && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-tight border ${highlight.badgeClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {highlight.label}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {user?.canAllocate && <button type="button" onClick={() => setAssigningLead(lead)} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Assign</button>}
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Customer 360
                        </button>
                        <button
                          onClick={() => onOpenBookDrive(lead)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                        >
                          Book Drive
                        </button>
                      </div>
                    </td>
                  </tr>
                );})
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalLeads}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          onPageChange={(page) => setCurrentPage(page)}
          itemName="leads"
          isLoading={isLoading}
        />
      </div>
      {assigningLead && user?.canAllocate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
        <section ref={assignmentDialog} data-app-dialog role="dialog" aria-modal="true" aria-labelledby="assign-lead-title" tabIndex={-1} className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <h2 id="assign-lead-title" className="min-w-0 break-words text-base font-bold">Assign {assigningLead.name || assigningLead.customer_name}</h2>
            <button type="button" onClick={closeAssignment} className="text-sm font-semibold text-slate-600">Close</button>
          </div>
          <p className="text-sm text-slate-600">{assigningLead.dealership} · Current owner: {assigningLead.owner_name || 'Unassigned'}</p>
          <LeadAssignment key={assigningLead._id} lead={assigningLead} onUpdated={setAssigningLead} onSaved={closeAssignment} />
        </section>
      </div>}
    </div>
  );
}
