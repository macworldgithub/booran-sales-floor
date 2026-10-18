'use client';
import { BooranLogo } from '@/components/ui/BooranLogo';
import { RooftopOptions } from '@/components/ui/RooftopOptions';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { useDialog } from '@/lib/use-dialog';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Car,
  AlertTriangle,
  MapPin,
  UserCheck,
  RefreshCw,
  X,
  Database,
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedRooftop: string;
  setSelectedRooftop: (rooftop: string) => void;
  leadsCount?: number;
  inventoryCount?: number;
  actionItemsCount?: number;
}

export function MobileNav({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  selectedRooftop,
  setSelectedRooftop,
  leadsCount = 0,
  inventoryCount = 0,
  actionItemsCount = 0,
}: MobileNavProps) {
  const { user } = useAuth();
  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  const navItems = [
    { id: 'today', label: 'Today Command Center', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads Centre (CRM)', icon: Users, badge: leadsCount },
    { id: 'inventory', label: 'Live Inventory', icon: Car, badge: inventoryCount },
    { id: 'action-items', label: 'Capital Radar', icon: AlertTriangle, badge: actionItemsCount, badgeColor: 'bg-amber-600' },
    { id: 'calendar', label: 'Showroom Floor', icon: Calendar },
    { id: 'rooftops', label: 'Locations & Rooftops', icon: MapPin },
    { id: 'staff', label: 'Staff & Allocation', icon: UserCheck },
    { id: 'feed-logs', label: 'DMS & Feed Sync', icon: RefreshCw },
  ];

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="Navigation menu" tabIndex={-1} className="relative flex flex-col w-4/5 max-w-xs sm:max-w-sm bg-[#171b22] text-slate-200 p-4 shadow-2xl h-full">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="min-w-0 space-y-2">
            <BooranLogo className="w-44" sizes="176px" />
            <p className="text-[10px] font-medium text-slate-400">Sales Floor OS</p>
          </div>
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rooftop Selector */}
        <div className="py-3">
          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 font-mono">
            Active Dealership
          </label>
          <select
            value={selectedRooftop}
            onChange={(e) => {
              setSelectedRooftop(e.target.value);
              onClose();
            }}
            className="w-full bg-[#1c222b] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none"
          >
            <RooftopOptions allValue="All Locations" />
          </select>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto space-y-1 py-2">
          {navItems.filter((item) => item.id !== 'feed-logs' || user?.role === 'super_admin').map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`${
                      item.badgeColor || 'bg-white/20'
                    } text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full`}
                  >
                    {item.badge.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>flwup_crm + booran_inventory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
