'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Search,
  Filter,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { inventoryApi } from '@/lib/api';

interface InventoryViewProps {
  initialVehicles?: Vehicle[];
  selectedRooftop: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function InventoryView({
  initialVehicles = [],
  selectedRooftop,
  onSelectVehicle,
}: InventoryViewProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');
  const [rooftopFilter, setRooftopFilter] = useState(
    selectedRooftop !== 'All Locations' ? selectedRooftop : 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUnits, setTotalUnits] = useState(2477);
  const [isLoading, setIsLoading] = useState(false);

  // Sync rooftopFilter if selectedRooftop changes globally
  useEffect(() => {
    if (selectedRooftop && selectedRooftop !== 'All Locations') {
      setRooftopFilter(selectedRooftop);
    } else {
      setRooftopFilter('all');
    }
    setCurrentPage(1);
  }, [selectedRooftop]);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (agingFilter !== 'all') params.agingBucket = agingFilter;
      if (rooftopFilter !== 'all') params.rooftop = rooftopFilter;

      const res = await inventoryApi.getVehicles(params);
      if (res.success && res.data) {
        setVehicles(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalUnits(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, categoryFilter, agingFilter, rooftopFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  const getAgingBadgeColor = (bucket: string) => {
    switch (bucket) {
      case '90+':
        return 'bg-red-100 text-red-800 border-red-300';
      case '61-90':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case '46-60':
      case '31-45':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="view-stack space-y-5">
      {/* Intro Banner */}
      <div className="page-intro flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              booran_inventory_tracker Database
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
              {totalUnits.toLocaleString()} Active Stock Units
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Live Group Inventory & Capital Tracker
          </h2>
          <p className="text-xs text-slate-500">
            Real-time multi-dealership stock, aging telemetry (DIS), daily holding costs, and showroom soft-hold management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
            <p className="text-[10px] text-slate-400 uppercase font-mono">Aging 90+ Traps</p>
            <p className="text-sm font-bold text-red-600">640 units</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              placeholder="Search by Stock#, VIN, Make, Model, Rego..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500 font-sans"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Categories</option>
              <option value="New">New Vehicles</option>
              <option value="Used">Used Cars</option>
              <option value="Demo">Demo</option>
              <option value="Loaner">Loaner</option>
            </select>

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
              onClick={() => fetchVehicles()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 shrink-0"
              title="Refresh Stock"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Aging Buckets Filter (Scrollable on Mobile) */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar pb-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1 shrink-0">
            Aging:
          </span>
          {[
            { id: 'all', label: 'All Days in Stock' },
            { id: '0-30', label: '0-30 Days (Fresh)' },
            { id: '31-45', label: '31-45 Days' },
            { id: '46-60', label: '46-60 Days' },
            { id: '61-90', label: '61-90 Days (Warning)' },
            { id: '90+', label: '90+ Days (Capital Trap)', red: true },
          ].map((bucket) => (
            <button
              key={bucket.id}
              onClick={() => {
                setAgingFilter(bucket.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                agingFilter === bucket.id
                  ? bucket.red
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : bucket.red
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table & Mobile Cards */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile View: High-Density Vehicle Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading && vehicles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-600" />
              <span>Loading vehicles from booran_inventory_tracker...</span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No vehicles found matching your criteria.
            </div>
          ) : (
            vehicles.map((v) => {
              const isHeld = v.status === 'Soft Hold' || v.softHold?.held;
              return (
                <div
                  key={v._id}
                  onClick={() => onSelectVehicle(v)}
                  className="p-3.5 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
                >
                  {/* Top: Year Make Model & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm">
                        {v.year} {v.make} {v.model}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {v.variant || 'Standard'} · {v.category}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        isHeld
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isHeld ? 'SOFT HOLD' : 'IN STOCK'}
                    </span>
                  </div>

                  {/* Identification */}
                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Stock #{v.stockNumber}</span>
                    <span className="truncate max-w-[160px]">VIN: {v.vin}</span>
                  </div>

                  {/* Financial & Aging Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">
                        Price
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ${v.advertisedPrice ? v.advertisedPrice.toLocaleString() : 'POA'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">
                        Aging
                      </span>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${getAgingBadgeColor(
                          v.agingBucket
                        )}`}
                      >
                        {v.daysInStock} DIS
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">
                        Hold Cost
                      </span>
                      <span className="text-xs font-semibold text-amber-700 font-mono">
                        ${v.accumulatedHoldingCost?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Dealership & Action */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-[11px] text-slate-500 truncate">{v.rooftopName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVehicle(v);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors"
                    >
                      Details & Hold
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Vehicle Specs</th>
                <th className="py-3 px-4">Identification</th>
                <th className="py-3 px-4">Pricing & Cost</th>
                <th className="py-3 px-4">Aging (DIS)</th>
                <th className="py-3 px-4">Holding Cost</th>
                <th className="py-3 px-4">Rooftop & Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading && vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-600" />
                    <span>Loading vehicles from booran_inventory_tracker...</span>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const isHeld = v.status === 'Soft Hold' || v.softHold?.held;
                  return (
                    <tr
                      key={v._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => onSelectVehicle(v)}
                    >
                      {/* Vehicle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-slate-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {v.year} {v.make} {v.model}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {v.variant || v.colour || 'Standard'} · {v.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stock / VIN */}
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-800">
                          #{v.stockNumber}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 truncate">
                          {v.vin || '—'}
                        </p>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          ${v.advertisedPrice ? v.advertisedPrice.toLocaleString() : 'POA'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Cost: ${v.vehicleCost ? v.vehicleCost.toLocaleString() : '—'}
                        </p>
                      </td>

                      {/* Aging DIS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{v.daysInStock}d</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getAgingBadgeColor(
                              v.agingBucket
                            )}`}
                          >
                            {v.agingBucket}
                          </span>
                        </div>
                      </td>

                      {/* Holding Cost */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-amber-700">
                          ${v.accumulatedHoldingCost ? v.accumulatedHoldingCost.toLocaleString() : 0}
                        </span>
                      </td>

                      {/* Rooftop & Hold Status */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 truncate">{v.rooftopName}</p>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono mt-0.5 ${
                            isHeld
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isHeld ? 'SOFT HOLD' : 'IN STOCK'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectVehicle(v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Details & Hold
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUnits}
          pageSize={20}
          onPageChange={(page) => setCurrentPage(page)}
          itemName="vehicles"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
