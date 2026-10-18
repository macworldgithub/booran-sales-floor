'use client';

import { BooranLogo } from '@/components/ui/BooranLogo';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Bell,
  Menu,
  Radio,
  Sparkles,
  User,
  ShieldCheck,
  LogOut,
  Search,
  Users,
  Car,
  Calendar,
  X,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { unifiedApi } from '@/lib/api';
import { Lead, Vehicle, ActionItem } from '@/lib/types';

interface HeaderProps {
  selectedRooftop: string;
  role: 'consultant' | 'manager' | 'principal' | 'super_admin';
  onOpenMobileNav: () => void;
  onOpenNotifications: () => void;
  onSelectLead?: (lead: Lead) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectAction?: (action: ActionItem) => void;
  unreadNotifications?: boolean;
  isOnline?: boolean;
  onOpenAddProspect?: () => void;
}

export function Header({
  selectedRooftop,
  role,
  onOpenMobileNav,
  onOpenNotifications,
  onSelectLead,
  onSelectVehicle,
  onSelectAction,
  unreadNotifications = true,
  isOnline = true,
  onOpenAddProspect,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    leads: Lead[];
    vehicles: Vehicle[];
    actionItems: ActionItem[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvedSearch, setResolvedSearch] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  useRefreshOnResume(() => setSearchRevision((value) => value + 1));
  const searchKey = JSON.stringify([selectedRooftop, searchQuery.trim(), searchRevision]);
  const visibleResults = resolvedSearch === searchKey ? searchResults : null;
  const visibleError = resolvedSearch === searchKey ? searchError : null;
  const searchPending = searchQuery.trim().length >= 2 && (isSearching || resolvedSearch !== searchKey);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Requests own their results; closing the menu never lets a late response reopen it.
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null); setSearchError(null); setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearchResults(null); setSearchError(null); setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await unifiedApi.search(searchQuery.trim(), selectedRooftop, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSearchResults(res.data || null); setResolvedSearch(searchKey);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchError(error instanceof Error ? error.message : 'Search could not be completed.');
        setResolvedSearch(searchKey);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchKey]);
  useEffect(() => {
    const refresh = () => setSearchRevision((value) => value + 1);
    window.addEventListener('booran:data-changed', refresh);
    return () => window.removeEventListener('booran:data-changed', refresh);
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsRoleDropdownOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setIsSearchOpen(false); setIsRoleDropdownOpen(false); } };
    document.addEventListener('keydown', escape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between min-h-16 shrink-0 lg:min-h-[72px] px-3 sm:px-6 lg:px-8 bg-white/95 border-b border-slate-200/80 shadow-sm backdrop-blur-md">
      {/* Left: Mobile Nav & Brand Lockup */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 pr-2">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <BooranLogo className="hidden w-28 shrink-0 sm:inline-flex lg:hidden" sizes="112px" />

        {/* Global Omni-Search Bar */}
        <div ref={searchRef} className="relative flex-1 min-w-0 max-w-[200px] xs:max-w-xs sm:max-w-sm lg:w-96">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(e.target.value.trim().length >= 2); }}
              aria-label="Search leads, vehicles and actions"
              onKeyDown={(event) => { if (event.key === 'Escape') setIsSearchOpen(false); }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setIsSearchOpen(true);
              }}
              placeholder="Search leads, VIN, stock..."
              className="w-full pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 rounded-xl border border-transparent focus:border-red-500/30 focus:ring-2 focus:ring-red-500/10 focus:outline-none transition-all placeholder:text-slate-400 font-sans"
            />
            {searchQuery && (
              <button aria-label="Clear search"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && (searchPending || visibleError) && <div role={visibleError ? 'alert' : 'status'} className="absolute left-0 right-0 top-full mt-2 rounded-xl border bg-white p-4 text-xs shadow-xl z-50">{visibleError || 'Searching...'}</div>}
          {isSearchOpen && visibleResults && (
            <div className="fixed top-16 left-3 right-3 sm:absolute sm:top-full sm:left-0 sm:right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 max-h-[420px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
              {visibleResults.leads.length === 0 &&
              visibleResults.vehicles.length === 0 &&
              visibleResults.actionItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">
                  No records matching &ldquo;{searchQuery}&rdquo; across CRM or Inventory.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* CRM Leads */}
                  {visibleResults.leads.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                        <Users className="w-3 h-3 text-red-500" />
                        CRM Leads ({visibleResults.leads.length})
                      </div>
                      <div className="space-y-0.5">
                        {visibleResults.leads.map((lead) => (
                          <button
                            key={lead._id}
                            onClick={() => {
                              onSelectLead?.(lead);
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {lead.name || lead.customer_name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {lead.vehicle || `${lead.make} ${lead.model}`} · {lead.dealership}
                              </p>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {lead.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleResults.actionItems.length > 0 && <div>
                    <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Inventory actions ({visibleResults.actionItems.length})</p>
                    {visibleResults.actionItems.map((item) => <button key={item._id} onClick={() => { onSelectAction?.(item); setIsSearchOpen(false); }} className="w-full rounded-lg p-2 text-left hover:bg-slate-50">
                      <p className="text-xs font-semibold text-slate-900">{item.vehicleTitle || item.stockNumber}</p>
                      <p className="text-[10px] text-slate-500">{item.actionType}: {item.reason}</p>
                    </button>)}
                  </div>}

                  {/* Inventory Vehicles */}
                  {visibleResults.vehicles.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                        <Car className="w-3 h-3 text-cyan-600" />
                        Live Inventory ({visibleResults.vehicles.length})
                      </div>
                      <div className="space-y-0.5">
                        {visibleResults.vehicles.map((v) => (
                          <button
                            key={v._id}
                            onClick={() => {
                              onSelectVehicle?.(v);
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {v.year} {v.make} {v.model} {v.variant}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate font-mono">
                                Stock: {v.stockNumber} · VIN: {v.vin} · {v.daysInStock} DIS
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600">
                              ${v.advertisedPrice?.toLocaleString() || 'POA'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Role, Live Status, Add Lead, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Live Network Telemetry */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200 text-slate-600 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Telemetry</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-[10px] text-slate-500">Sign365 Cluster</span>
        </div>

        {/* Quick Add Lead Button */}
        {onOpenAddProspect && (
          <button
            onClick={onOpenAddProspect}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
            title="Create New Lead"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ New Lead</span>
          </button>
        )}

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        {/* Role & User Profile Switcher */}
        <div ref={profileRef} className="relative">
          <button
            aria-label="Account menu" aria-expanded={isRoleDropdownOpen}
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 sm:pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.avatar || 'U'}
            </div>
            <div className="hidden md:block leading-tight text-left">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.name || 'Account'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">
                {role === 'super_admin' ? 'Super Admin' : role === 'manager' ? 'Site Manager' : 'Consultant'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xs:block" />
          </button>

          {/* Role Dropdown */}
          {isRoleDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>

              <div className="px-3 py-3 text-xs text-slate-600">{user?.role === 'super_admin' ? 'All locations' : user?.site}</div>
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    logout().catch((error) => window.alert(error.message || 'Unable to sign out. Please retry.'));
                    setIsRoleDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
