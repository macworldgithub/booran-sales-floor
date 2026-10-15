'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  RefreshCw,
  TrendingDown,
  Layers,
  MapPin,
  Tag,
  Clock,
} from 'lucide-react';
import { ActionItem } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { inventoryApi } from '@/lib/api';

interface ActionItemsViewProps {
  initialItems?: ActionItem[];
  selectedRooftop: string;
}

export function ActionItemsView({
  initialItems = [],
  selectedRooftop,
}: ActionItemsViewProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [rooftopFilter, setRooftopFilter] = useState(
    selectedRooftop !== 'All Locations' ? selectedRooftop : 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(1022);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedToast, setResolvedToast] = useState<string | null>(null);

  // Sync rooftopFilter if selectedRooftop changes globally
  useEffect(() => {
    if (selectedRooftop && selectedRooftop !== 'All Locations') {
      setRooftopFilter(selectedRooftop);
    } else {
      setRooftopFilter('all');
    }
    setCurrentPage(1);
  }, [selectedRooftop]);

  const fetchActionItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (actionTypeFilter !== 'all') params.actionType = actionTypeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (rooftopFilter !== 'all') params.rooftop = rooftopFilter;

      const res = await inventoryApi.getActionItems(params);
      if (res.success && res.data) {
        setActionItems(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch action items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, actionTypeFilter, statusFilter, rooftopFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActionItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchActionItems]);

  const handleResolveAction = async (item: ActionItem) => {
    try {
      const res = await inventoryApi.updateActionItem(item._id, {
        status: 'resolved',
        resolvedNotes: 'Action approved by Group Sales Manager',
      });
      if (res.success) {
        setResolvedToast(`Action resolved for ${item.vehicleTitle}`);
        fetchActionItems();
        setTimeout(() => setResolvedToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to resolve action item:', err);
    }
  };

  return (
    <div className="view-stack space-y-5">
      {/* Intro Banner */}
      <div className="page-intro flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              booran_inventory_tracker · Capital Optimization
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {totalCount.toLocaleString()} Action Alerts
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Capital Trap Radar & Inventory Actions
          </h2>
          <p className="text-xs text-slate-500">
            Automated intelligence identifying units exceeding wholesale thresholds or experiencing margin compression.
          </p>
        </div>
      </div>

      {/* Toast Feedback */}
      {resolvedToast && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resolvedToast}</span>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
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
              placeholder="Search by Vehicle, Stock#, VIN, Reason..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Rooftop Filter */}
            <select
              value={rooftopFilter}
              onChange={(e) => {
                setRooftopFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Dealerships</option>
              <option value="Booran Cheltenham">Booran Cheltenham</option>
              <option value="Cranbourne Hyundai">Cranbourne Hyundai</option>
              <option value="South Morang Hyundai">South Morang Hyundai</option>
              <option value="Berwick MG">Berwick MG Hyundai</option>
            </select>

            <button
              onClick={() => fetchActionItems()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 shrink-0"
              title="Refresh Actions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Type & Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Action Types' },
              { id: 'WHOLESALE', label: 'Wholesale Exit' },
              { id: 'PRICE', label: 'Price Reviews' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActionTypeFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  actionTypeFilter === tab.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'open', label: 'Open' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'all', label: 'All' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  statusFilter === st.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items Content: Mobile Cards + Desktop Table */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile View: High-Priority Action Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading && actionItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
              <span>Loading action items from booran_inventory_tracker...</span>
            </div>
          ) : actionItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No action items found matching your filters.
            </div>
          ) : (
            actionItems.map((item) => (
              <div key={item._id} className="p-3.5 space-y-2.5 active:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      item.actionType === 'WHOLESALE'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {item.actionType}
                  </span>
                  <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {item.impactMetric}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-slate-900 text-sm">{item.vehicleTitle}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    Stock: {item.stockNumber} · VIN: {item.vin}
                  </p>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {item.reason}
                </p>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[11px] text-slate-500 truncate">{item.rooftopName}</span>
                  {item.status === 'open' ? (
                    <button
                      onClick={() => handleResolveAction(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
                    >
                      Approve Action
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Vehicle</th>
                <th className="py-3 px-4">Deterministic Reason</th>
                <th className="py-3 px-4">Financial Impact</th>
                <th className="py-3 px-4">Rooftop</th>
                <th className="py-3 px-4 text-right">Execute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading && actionItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    <span>Loading action items from booran_inventory_tracker...</span>
                  </td>
                </tr>
              ) : actionItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No action items found matching your filters.
                  </td>
                </tr>
              ) : (
                actionItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          item.actionType === 'WHOLESALE'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.actionType}
                      </span>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.vehicleTitle}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        Stock: {item.stockNumber} · VIN: {item.vin}
                      </p>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-700 leading-snug">{item.reason}</p>
                    </td>

                    {/* Impact Metric */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.impactMetric}
                      </span>
                    </td>

                    {/* Rooftop */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{item.rooftopName}</span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right">
                      {item.status === 'open' ? (
                        <button
                          onClick={() => handleResolveAction(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
                        >
                          Approve Action
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={20}
          onPageChange={(page) => setCurrentPage(page)}
          itemName="action alerts"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
