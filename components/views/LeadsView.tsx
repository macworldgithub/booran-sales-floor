'use client';

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
import { Pagination } from '@/components/ui/Pagination';
import { leadApi } from '@/lib/api';

interface LeadsViewProps {
  initialLeads?: Lead[];
  selectedRooftop: string;
  onSelectLead: (lead: Lead) => void;
  onOpenBookDrive: (lead?: Lead) => void;
  onOpenAddProspect: () => void;
}

export function LeadsView({
  initialLeads = [],
  selectedRooftop,
  onSelectLead,
  onOpenBookDrive,
  onOpenAddProspect,
}: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rooftopFilter, setRooftopFilter] = useState(selectedRooftop !== 'All Locations' ? selectedRooftop : 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(1727);
  const [isLoading, setIsLoading] = useState(false);

  // Sync rooftopFilter if selectedRooftop changes from Header/Sidebar
  useEffect(() => {
    if (selectedRooftop && selectedRooftop !== 'All Locations') {
      setRooftopFilter(selectedRooftop);
    } else {
      setRooftopFilter('all');
    }
    setCurrentPage(1);
  }, [selectedRooftop]);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (rooftopFilter !== 'all') params.dealership = rooftopFilter;

      const res = await leadApi.getLeads(params);
      if (res.success && res.data) {
        setLeads(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalLeads(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, rooftopFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

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
              flwup_crm Database
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {totalLeads.toLocaleString()} Total Records
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Leads & Pipeline Management
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
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by customer, phone, email, VIN..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 font-sans"
            />
          </div>

          {/* Dealership Filter & Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={rooftopFilter}
              onChange={(e) => {
                setRooftopFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Dealerships</option>
              <option value="BYD South Morang">BYD South Morang</option>
              <option value="Chery South Morang">Chery South Morang</option>
              <option value="South Morang Hyundai">South Morang Hyundai</option>
              <option value="South Morang Kia">South Morang Kia</option>
            </select>

            <button
              onClick={() => fetchLeads()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 shrink-0"
              title="Refresh Leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
      <div className="surface-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile View: High-Performance Touch Cards (< sm) */}
        <div className="sm:hidden divide-y divide-slate-100">
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
            leads.map((lead) => (
              <div
                key={lead._id}
                onClick={() => onSelectLead(lead)}
                className="p-3.5 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
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
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${getStatusBadge(
                      lead.status
                    )}`}
                  >
                    {lead.status.replace('_', ' ')}
                  </span>
                </div>

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
            ))
          )}
        </div>

        {/* Desktop View: Full Data Table (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
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
                leads.map((lead) => (
                  <tr
                    key={lead._id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
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
                        Source: {lead.source || 'Manual'}
                      </p>
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
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {lead.owner_name || 'Unassigned'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalLeads}
          pageSize={20}
          onPageChange={(page) => setCurrentPage(page)}
          itemName="leads"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
