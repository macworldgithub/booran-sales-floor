'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Car,
  Users,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  PhoneCall,
  DollarSign,
  TrendingDown,
  Layers,
  ShieldCheck,
  Send,
  Lock,
} from 'lucide-react';
import { Lead, Vehicle, ActionItem, Appointment } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { MetricCard } from '@/components/ui/MetricCard';

interface TodayViewProps {
  leads: Lead[];
  vehicles: Vehicle[];
  actionItems: ActionItem[];
  appointments: Appointment[];
  selectedRooftop: string;
  onSelectLead: (lead: Lead) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenBookDrive: (lead?: Lead) => void;
  onOpenAddProspect: () => void;
  onNavigateTab: (tab: string) => void;
  stats?: any;
}

export function TodayView({
  leads,
  vehicles,
  actionItems,
  appointments,
  selectedRooftop,
  onSelectLead,
  onSelectVehicle,
  onOpenBookDrive,
  onOpenAddProspect,
  onNavigateTab,
  stats,
}: TodayViewProps) {
  const { user, locations } = useAuth();
  const visibleLocations = selectedRooftop === 'All Locations' ? locations : locations.filter((name) => name === selectedRooftop);
  const scopeLabel = selectedRooftop === 'All Locations' ? (user?.role === 'super_admin' ? 'Booran Group Network (Victoria)' : `${user?.site} dealerships`) : selectedRooftop;

  // Urgent leads needing attention (new_lead or priority)
  const urgentLeads = leads
    .filter((l) => l.status === 'new_lead' || l.status === 'following_up')
    .slice(0, 5);

  // Critical aging vehicles (>90 days in stock)
  const agingVehicles = vehicles
    .filter((v) => v.agingBucket === '90+' || v.daysInStock >= 90)
    .slice(0, 4);

  // High priority open action items
  const urgentActionItems = actionItems
    .filter((a) => a.status === 'open')
    .slice(0, 3);

  const totalLeadsCount = stats?.crm?.totalLeads ?? 0;
  const followUpCount = stats?.crm?.followingUp ?? 0;
  const stockCount = stats?.inventory?.totalVehicles ?? 0;
  const agingCount = stats?.inventory?.agingOver90Days ?? 0;
  const actionItemsCount = stats?.inventory?.openActionItems ?? 0;

  return (
    <div className="view-stack space-y-4 sm:space-y-6">
      {/* Hero Executive Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171b22] via-[#1f2530] to-[#12161c] text-white p-4 sm:p-6 md:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-600 text-white font-mono">
                Live Sales Floor OS
              </span>
              <span className="text-xs text-slate-400">
                {scopeLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading uppercase leading-tight">
              Sales Floor Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time synchronization across <strong>flwup_crm</strong> ({totalLeadsCount.toLocaleString()} leads) and <strong>booran_inventory_tracker</strong> ({stockCount.toLocaleString()} units).
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={onOpenAddProspect}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Add Prospect</span>
            </button>
            <button
              onClick={() => onOpenBookDrive()}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
            >
              <Calendar className="w-4 h-4 text-red-400" />
              <span>Book Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip - Responsive 2 col on mobile, 3 col on sm, 5 col on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <MetricCard
          label="Active Leads"
          value={totalLeadsCount.toLocaleString()}
          change="flwup_crm active pipeline"
          icon={Users}
          tone="red"
        />
        <MetricCard
          label="Follow-Ups Due"
          value={followUpCount.toLocaleString()}
          change="Urgent callbacks required"
          icon={Clock}
          tone="cyan"
        />
        <MetricCard
          label="Stock in Selected Locations"
          value={stockCount.toLocaleString()}
          change={scopeLabel}
          icon={Car}
          tone="green"
        />
        <MetricCard
          label="Aging 90+ Days"
          value={agingCount.toLocaleString()}
          change="Capital traps consuming holding"
          icon={TrendingDown}
          tone="red"
        />
        <div className="col-span-2 sm:col-span-1">
          <MetricCard
            label="Open Action Items"
            value={actionItemsCount.toLocaleString()}
            change="Wholesale & price reviews"
            icon={AlertTriangle}
            tone="cyan"
          />
        </div>
      </div>

      {/* Urgent Action Alert Bar */}
      {urgentActionItems.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-900 truncate">
                {urgentActionItems[0].actionType}: {urgentActionItems[0].vehicleTitle}
              </p>
              <p className="text-[11px] text-amber-800 truncate">
                {urgentActionItems[0].reason} · <strong>{urgentActionItems[0].impactMetric}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('action-items')}
            className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm"
          >
            <span>Review Radar ({actionItemsCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two Column Command Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Urgent Leads & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority CRM Leads Queue */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase font-heading tracking-wide">
                  Priority Leads Requiring Action
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real prospects from flwup_crm with recent inquiries or overdue first touch
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('leads')}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <span>View All ({totalLeadsCount})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {urgentLeads.map((lead) => (
                <div
                  key={lead._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {lead.initials || 'PR'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {lead.name || lead.customer_name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 uppercase font-mono">
                          {lead.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {lead.vehicle || `${lead.make} ${lead.model}`} · {lead.dealership}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onSelectLead(lead)}
                      className="px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Customer 360
                    </button>
                    <button
                      onClick={() => onOpenBookDrive(lead)}
                      className="px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                    >
                      Book Drive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Showroom Test Drive Schedule */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase font-heading tracking-wide">
                  Today&apos;s Showroom Floor Schedule
                </h3>
                <p className="text-[11px] text-slate-500">
                  Confirmed test drives & handover appointments
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <span>Full Calendar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {appointments.slice(0, 3).map((appt) => (
                <div
                  key={appt._id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {appt.prospectName} · {appt.vehicle}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          {appt.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {appt.notes} · Host: {appt.consultantName}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-700 shrink-0">
                    {appt.when ? new Date(appt.when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:00 AM'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Aging Capital Traps & Stock Health */}
        <div className="space-y-6">
          {/* Critical Aging Vehicles Radar */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase font-heading tracking-wide">
                  Aging Capital Traps (90+ DIS)
                </h3>
                <p className="text-[11px] text-slate-500">
                  High holding cost units from booran_inventory
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                Stock ({stockCount})
              </button>
            </div>

            <div className="space-y-3">
              {agingVehicles.map((v) => (
                <div
                  key={v._id}
                  onClick={() => onSelectVehicle(v)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {v.year} {v.make} {v.model}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                      {v.daysInStock} DIS
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Stock #{v.stockNumber}</span>
                    <span className="font-bold text-slate-800">
                      ${v.advertisedPrice ? v.advertisedPrice.toLocaleString() : 'POA'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{v.rooftopName}</span>
                    <span className="text-amber-600 font-semibold">
                      Hold Cost: ${v.accumulatedHoldingCost?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('action-items')}
              className="mt-4 w-full py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Launch Capital Optimization Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dealership Network Snapshot */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-heading tracking-wide">
              Dealerships in Current View
            </h3>
            <div className="space-y-2 text-xs">
              {visibleLocations.map((name) => (
                <div key={name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
                  <span className="font-semibold text-slate-800">{name}</span>
                  <span className="font-mono text-slate-500">Authorised dealership</span>
                </div>
              ))}
              {!visibleLocations.length && <p className="text-slate-500">No dealerships to show in this view.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
