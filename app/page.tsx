'use client';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { localDate, localDayRange } from '@/lib/dates';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { TodayView } from '@/components/views/TodayView';
import { LeadsView } from '@/components/views/LeadsView';
import { InventoryView } from '@/components/views/InventoryView';
import { ActionItemsView } from '@/components/views/ActionItemsView';
import { CalendarView } from '@/components/views/CalendarView';
import { RooftopsView } from '@/components/views/RooftopsView';
import { StaffView } from '@/components/views/StaffView';
import { FeedLogsView } from '@/components/views/FeedLogsView';

import { Customer360Modal } from '@/components/modals/Customer360Modal';
import { VehicleDetailModal } from '@/components/modals/VehicleDetailModal';
import { AddProspectModal } from '@/components/modals/AddProspectModal';
import { BookTestDriveModal } from '@/components/modals/BookTestDriveModal';
import { NotificationCenterModal } from '@/components/modals/NotificationCenterModal';

import { useAuth } from '@/lib/auth';
import {
  leadApi,
  inventoryApi,
  appointmentApi,
  unifiedApi,
} from '@/lib/api';
import { Lead, Vehicle, ActionItem, Appointment, UnifiedSummary } from '@/lib/types';

export default function BooranSalesFloorApp() {
  const { user, locationsError, reloadLocations } = useAuth();

  // Navigation & Scope
  const [activeTab, updateActiveTab] = useState<string>('today');
  const setActiveTab = (tab: string) => {
    updateActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const sync = () => {
      const tab = new URL(window.location.href).searchParams.get('tab') || 'today';
      updateActiveTab(tab === 'feed-logs' && user?.role !== 'super_admin' ? 'today' : ['today', 'leads', 'inventory', 'action-items', 'calendar', 'rooftops', 'staff', 'feed-logs'].includes(tab) ? tab : 'today');
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [user?.role]);
  const [selectedRooftop, updateSelectedRooftop] = useState<string>('All Locations');
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const sync = () => setToday(localDate());
    const timer = window.setInterval(sync, 60000);
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const role = user?.role || 'manager';
  const [actionTarget, setActionTarget] = useState({ search: '', status: 'open', version: 0 });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Data Stores
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unifiedSummary, setUnifiedSummary] = useState<UnifiedSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);

  // Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookDriveLead, setBookDriveLead] = useState<Lead | null>(null);
  const [isBookDriveOpen, setIsBookDriveOpen] = useState<boolean>(false);
  const [isAddProspectOpen, setIsAddProspectOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  const loadVersion = useRef(0);
  const setSelectedRooftop = (rooftop: string) => {
    if (rooftop === selectedRooftop) return;
    ++loadVersion.current;
    setLeads([]); setVehicles([]); setActionItems([]); setAppointments([]); setUnifiedSummary(null);
    setLoadError(false); setIsLoading(true);
    updateSelectedRooftop(rooftop);
  };

  // Fetch initial telemetry
  const loadInitialData = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError(false);
    setLeads([]); setVehicles([]); setActionItems([]); setAppointments([]); setUnifiedSummary(null);
    try {
      const [leadsRes, vehiclesRes, actionsRes, apptsRes, summaryRes] = await Promise.all([
        leadApi.getLeads({ limit: 30, dealership: selectedRooftop, attention: 'true' }).catch(() => ({ success: false, data: [] })),
        inventoryApi.getVehicles({ limit: 30, rooftop: selectedRooftop }).catch(() => ({ success: false, data: [] })),
        inventoryApi.getActionItems({ limit: 30, rooftop: selectedRooftop }).catch(() => ({ success: false, data: [] })),
        appointmentApi.getAppointments({ rooftop: selectedRooftop, limit: 30, ...localDayRange(today) }).catch(() => ({ success: false, data: [] })),
        unifiedApi.getSummary(selectedRooftop).catch(() => ({ success: false, data: undefined })),
      ]);

      if (version !== loadVersion.current) return;
      setLoadError(!leadsRes.success || !vehiclesRes.success || !actionsRes.success || !apptsRes.success || !summaryRes.success);
      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data);
      }
      if (vehiclesRes.success && vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
      }
      if (actionsRes.success && actionsRes.data) {
        setActionItems(actionsRes.data);
      }
      if (apptsRes.success && apptsRes.data) {
        setAppointments(apptsRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setUnifiedSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [selectedRooftop, today]);

  useRefreshOnResume(loadInitialData);

  useEffect(() => {
    loadInitialData();
    window.addEventListener('booran:data-changed', loadInitialData);
    return () => { loadVersion.current += 1; window.removeEventListener('booran:data-changed', loadInitialData); };
  }, [loadInitialData]);

  // Handle lead update from modal
  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l._id === updatedLead._id ? { ...l, ...updatedLead } : l))
    );
    setSelectedLead((current) => current?._id === updatedLead._id ? updatedLead : current);
  };

  // Handle vehicle update from modal
  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v._id === updatedVehicle._id ? { ...v, ...updatedVehicle } : v))
    );
    setSelectedVehicle((current) => current?._id === updatedVehicle._id ? updatedVehicle : current);
  };

  return (
    <div className="app-shell flex w-full bg-[#f4f5f7] text-slate-900 overflow-hidden font-sans">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        selectedRooftop={selectedRooftop}
        setSelectedRooftop={setSelectedRooftop}
        leadsCount={unifiedSummary?.crm?.totalLeads ?? 0}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles ?? 0}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems ?? 0}
      />

      {/* Main Content Area */}
      <div className="app-content flex-1 flex flex-col overflow-hidden min-w-0">
        <Header selectedRooftop={selectedRooftop}
          unreadNotifications={Boolean(unifiedSummary?.crm.newLeads || unifiedSummary?.inventory.openActionItems)}
          role={role}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onSelectLead={(l) => setSelectedLead(l)}
          onSelectVehicle={(v) => setSelectedVehicle(v)}
          onSelectAction={(item) => { setActionTarget((previous) => ({ search: item.stockNumber || item.vehicleTitle || '', status: item.status, version: previous.version + 1 })); setActiveTab('action-items'); }}
          onOpenAddProspect={() => setIsAddProspectOpen(true)}
        />

        {/* View Container */}
        <main id="main-content" tabIndex={-1} className="app-main flex-1 overflow-x-hidden">
          {locationsError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">{locationsError}<button onClick={reloadLocations} className="font-bold underline">Retry dealerships</button></div>}
          {isLoading && <p role="status" className="mx-auto mb-4 max-w-screen-xl text-sm text-slate-500">Loading showroom data...</p>}
          {loadError && <div role="alert" className="mx-auto mb-4 flex max-w-screen-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Some showroom data could not be loaded.<button onClick={loadInitialData} className="font-bold underline">Retry</button></div>}
          {activeTab === 'today' && (
            <TodayView
              leads={leads}
              vehicles={vehicles}
              actionItems={actionItems}
              appointments={appointments}
              selectedRooftop={selectedRooftop}
              onSelectLead={(l) => setSelectedLead(l)}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
              onOpenBookDrive={(l) => {
                setBookDriveLead(l || null);
                setIsBookDriveOpen(true);
              }}
              onOpenAddProspect={() => setIsAddProspectOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              stats={unifiedSummary}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsView
              onRooftopChange={setSelectedRooftop}
              initialLeads={leads}
              selectedRooftop={selectedRooftop}
              onSelectLead={(l) => setSelectedLead(l)}
              onOpenBookDrive={(l) => {
                setBookDriveLead(l || null);
                setIsBookDriveOpen(true);
              }}
              onOpenAddProspect={() => setIsAddProspectOpen(true)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              onRooftopChange={setSelectedRooftop}
              initialVehicles={vehicles}
              selectedRooftop={selectedRooftop}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
            />
          )}

          {activeTab === 'action-items' && (
            <ActionItemsView key={actionTarget.version}
              initialSearch={actionTarget.search}
              initialStatus={actionTarget.status}
              onRooftopChange={setSelectedRooftop}
              initialItems={actionItems}
              selectedRooftop={selectedRooftop}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView selectedRooftop={selectedRooftop}
              appointments={appointments}
              onOpenBookDrive={() => {
                setBookDriveLead(null);
                setIsBookDriveOpen(true);
              }}
            />
          )}

          {activeTab === 'rooftops' && <RooftopsView selectedRooftop={selectedRooftop} onSelectRooftopFilter={(rooftop) => { setSelectedRooftop(rooftop); setActiveTab('inventory'); }} />}

          {activeTab === 'staff' && <StaffView selectedRooftop={selectedRooftop} onRooftopChange={setSelectedRooftop} />}

          {activeTab === 'feed-logs' && user?.role === 'super_admin' && <FeedLogsView />}
        </main>
      </div>

      {/* Global Modals */}
      <Customer360Modal key={selectedLead?._id || 'closed'}
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
        onOpenBookDrive={(l) => {
          setBookDriveLead(l);
          setIsBookDriveOpen(true);
        }}
      />

      <VehicleDetailModal key={selectedVehicle?._id || 'closed'}
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onVehicleUpdated={handleVehicleUpdated}
      />

      <AddProspectModal key={`${isAddProspectOpen}-${selectedRooftop}`}
        isOpen={isAddProspectOpen}
        onClose={() => setIsAddProspectOpen(false)}
        onLeadCreated={(newLead) => {
          setLeads((prev) => [newLead, ...prev]);
          setSelectedLead(newLead);
        }}
        defaultDealership={selectedRooftop !== 'All Locations' ? selectedRooftop : 'BYD South Morang'}
      />

      <BookTestDriveModal key={`${bookDriveLead?._id || 'new'}-${isBookDriveOpen}-${selectedRooftop}`}
        defaultDealership={selectedRooftop}
        lead={bookDriveLead}
        isOpen={isBookDriveOpen}
        onClose={() => setIsBookDriveOpen(false)}
      />

      <NotificationCenterModal
        summary={unifiedSummary}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMore={() => setIsMobileNavOpen(true)}
        leadsCount={unifiedSummary?.crm?.totalLeads ?? 0}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles ?? 0}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems ?? 0}
      />

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRooftop={selectedRooftop}
        setSelectedRooftop={setSelectedRooftop}
        leadsCount={unifiedSummary?.crm?.totalLeads ?? 0}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles ?? 0}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems ?? 0}
      />
    </div>
  );
}
