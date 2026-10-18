'use client';
import { BooranLogo } from '@/components/ui/BooranLogo';
import { RooftopOptions } from '@/components/ui/RooftopOptions';

import React from 'react';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Car,
  AlertTriangle,
  GitBranch,
  BarChart3,
  MapPin,
  Sparkles,
  Zap,
  FileText,
  UserCheck,
  ShieldCheck,
  Database,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'consultant' | 'manager' | 'principal' | 'super_admin';
  leadsCount?: number;
  inventoryCount?: number;
  actionItemsCount?: number;
  selectedRooftop: string;
  setSelectedRooftop: (rooftop: string) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  role,
  leadsCount = 0,
  inventoryCount = 0,
  actionItemsCount = 0,
  selectedRooftop,
  setSelectedRooftop,
}: SidebarProps) {
  const { user } = useAuth();
  const mainNavItems = [
    { id: 'today', label: 'Today', icon: LayoutDashboard },
    {
      id: 'leads',
      label: 'Leads Centre (CRM)',
      icon: Users,
      badge: leadsCount > 0 ? leadsCount.toLocaleString() : undefined,
      source: 'flwup_crm',
    },
    {
      id: 'inventory',
      label: 'Live Inventory',
      icon: Car,
      badge: inventoryCount > 0 ? inventoryCount.toLocaleString() : undefined,
      source: 'booran_inventory',
    },
    {
      id: 'action-items',
      label: 'Capital Radar',
      icon: AlertTriangle,
      badge: actionItemsCount > 0 ? actionItemsCount.toLocaleString() : undefined,
      badgeColor: 'bg-amber-600',
      source: 'booran_inventory',
    },
    { id: 'calendar', label: 'Showroom Floor', icon: Calendar },
  ];

  const managementNavItems = [
    { id: 'rooftops', label: 'Locations & Rooftops', icon: MapPin },
    { id: 'staff', label: 'Staff & Allocation', icon: UserCheck },
    { id: 'feed-logs', label: 'DMS & Feed Sync', icon: RefreshCw },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#171b22] text-slate-200 h-dvh sticky top-0 shrink-0 border-r border-white/10 z-40">
      {/* Brand Header */}
      <div className="p-4 pb-3 border-b border-white/10 bg-[#12161c]">
        <div className="space-y-2">
          <BooranLogo className="w-full" sizes="224px" />
          <p className="text-[10px] font-medium tracking-wide text-slate-400">Sales Floor OS - VIC Group</p>
        </div>

        {/* Global Rooftop Switcher */}
        <div className="mt-3">
          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 font-mono">
            Active Rooftop
          </label>
          <select
            value={selectedRooftop}
            onChange={(e) => setSelectedRooftop(e.target.value)}
            className="w-full bg-[#1c222b] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-red-500 font-sans cursor-pointer transition-colors"
          >
            <RooftopOptions allValue="All Locations" />
          </select>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Workspace Menu */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              Floor Operations
            </p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 font-mono">
              Dual DB
            </span>
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  data-active={isActive}
                  className={`sidebar-link w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-red-600/90 text-white shadow-md shadow-red-900/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`${
                        item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-red-600/80 text-white')
                      } text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-5 text-center`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Management & Analytics */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              Group Management
            </p>
            <span className="text-[9px] font-bold text-red-400 bg-red-950/60 border border-red-900/60 px-1.5 py-0.2 rounded uppercase">
              Executive
            </span>
          </div>
          <nav className="space-y-1">
            {managementNavItems.filter((item) => item.id !== 'feed-logs' || role === 'super_admin').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  data-active={isActive}
                  className={`sidebar-link w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-red-600/90 text-white shadow-md shadow-red-900/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Connected Databases Telemetry Info */}
        <div className="px-3 pt-2">
          <div className="p-2.5 rounded-lg bg-[#14181f] border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Database Nodes</span>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="truncate">flwup_crm</span>
                <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {leadsCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="truncate">booran_inventory</span>
                <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {inventoryCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showroom Location Footer */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#12161c]">
        <div className="site-card flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
          <div className="site-mark w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-slate-300">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-xs font-semibold text-white truncate">
              {selectedRooftop === 'All Locations' ? (role === 'super_admin' ? 'Booran Group HQ' : user?.site) : selectedRooftop}
            </strong>
            <span className="block text-[10px] text-slate-400 truncate">
              Victoria, Australia
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>
        <p className="demo-caption text-[9px] text-slate-400 text-center">
          Booran Motors Enterprise Platform · Sign365
        </p>
      </div>
    </aside>
  );
}
