'use client';

import React from 'react';
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
  leadsCount = 1727,
  inventoryCount = 2477,
  actionItemsCount = 1022,
  selectedRooftop,
  setSelectedRooftop,
}: SidebarProps) {
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
    <aside className="hidden lg:flex flex-col w-64 bg-[#171b22] text-slate-200 h-screen sticky top-0 shrink-0 border-r border-white/10 z-40">
      {/* Brand Header */}
      <div className="p-4 pb-3 border-b border-white/10 bg-[#12161c]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40 text-white font-extrabold text-lg tracking-wider font-heading">
            BM
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-wide truncate font-heading uppercase">
              Booran Motors
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              Sales Floor OS · VIC Group
            </p>
          </div>
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
            <option value="All Locations">All Dealerships (Group View)</option>
            <option value="BYD South Morang">BYD South Morang</option>
            <option value="Booran Cheltenham">Booran Cheltenham</option>
            <option value="Chery South Morang">Chery South Morang</option>
            <option value="South Morang Hyundai">South Morang Hyundai</option>
            <option value="South Morang Kia">South Morang Kia</option>
            <option value="Cranbourne Hyundai">Cranbourne Hyundai</option>
            <option value="Berwick MG">Berwick MG Hyundai</option>
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
            {managementNavItems.map((item) => {
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
                  1,727
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="truncate">booran_inventory</span>
                <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  2,477
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
              {selectedRooftop === 'All Locations' ? 'Booran Group HQ' : selectedRooftop}
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
