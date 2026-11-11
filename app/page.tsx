'use client';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { localDate, localDayRange } from '@/lib/dates';
import { canOpenTab } from '@/lib/navigation';
import { DailyOversight } from '@/components/views/DailyOversight';
import { MySalesDay, TeamActivity } from '@/components/views/SalesWorkspace';

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
  const role = user?.role || 'sales_consultant';
  const salesOnly = role === 'sales_consultant';

  // Navigation & Scope
  const [requestedTab, updateActiveTab] = useState<string>('today');
  const activeTab = canOpenTab(requestedTab, role) ? requestedTab : 'today';
  const [teamMember, setTeamMember] = useState<{ id: string; name: string } | null>(null);
  const setActiveTab = (tab: string, member?: { id: string; name: string }) => {
    const next = canOpenTab(tab, role) ? tab : 'today';
    updateActiveTab(next);
    setTeamMember(member ?? null);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.pushState({}, '', url);
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const sync = () => {
      const tab = new URL(window.location.href).searchParams.get('tab') || 'today';
      updateActiveTab(canOpenTab(tab, role) ? tab : 'today');
      setTeamMember(null);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [role]);
  const [selectedRooftop, updateSelectedRooftop] = useState<string>('All Locations');
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const sync = () => setToday(localDate());
    const timer = window.setInterval(sync, 60000);
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const [actionTarget, setActionTarget] = useState({ search: '', status: 'open', version: 0 });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Data Stores
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unifiedSummary, setUnifiedSummary] = useState<UnifiedSummary | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
    setLoadError(false); setIsInitialLoading(true);
    updateSelectedRooftop(rooftop);
  };

  // Fetch initial telemetry
  const loadInitialData = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const [leadsRes, vehiclesRes, actionsRes, apptsRes, summaryRes] = await Promise.all([
        leadApi.getLeads({ limit: 30, dealership: selectedRooftop, attention: 'true' }).catch(() => ({ success: false, data: [] })),
        salesOnly ? { success: true, data: [] } : inventoryApi.getVehicles({ limit: 30, rooftop: selectedRooftop }).catch(() => ({ success: false, data: [] })),
        salesOnly ? { success: true, data: [] } : inventoryApi.getActionItems({ limit: 30, rooftop: selectedRooftop }).catch(() => ({ success: false, data: [] })),
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
      if (version === loadVersion.current) setLoadError(true);
    } finally {
      if (version === loadVersion.current) setIsInitialLoading(false);
    }
  }, [salesOnly, selectedRooftop, today]);

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
          onOpenNotifications={salesOnly ? undefined : () => setIsNotificationsOpen(true)}
          onSelectLead={(l) => setSelectedLead(l)}
          onSelectVehicle={(v) => setSelectedVehicle(v)}
          onSelectAction={(item) => { setActionTarget((previous) => ({ search: item.stockNumber || item.vehicleTitle || '', status: item.status, version: previous.version + 1 })); setActiveTab('action-items'); }}
          onOpenAddProspect={() => setIsAddProspectOpen(true)}
        />

        {/* View Container */}
        <main id="main-content" tabIndex={-1} className="app-main flex-1 overflow-x-hidden">
          {locationsError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">{locationsError}<button onClick={reloadLocations} className="font-bold underline">Retry dealerships</button></div>}
          {isInitialLoading && <p role="status" className="mx-auto mb-4 max-w-screen-xl text-sm text-slate-500">Loading showroom data...</p>}
          {loadError && <div role="alert" className="mx-auto mb-4 flex max-w-screen-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Some showroom data could not be loaded.<button onClick={loadInitialData} className="font-bold underline">Retry</button></div>}
          {activeTab === 'today' && salesOnly && <MySalesDay rooftop={selectedRooftop} leads={leads} appointments={appointments}
            onOpenLead={setSelectedLead} onNavigate={setActiveTab} />}
          {activeTab === 'today' && !salesOnly && (
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
              afterBanner={user?.canAllocate && <>
                <DailyOversight key={selectedRooftop} rooftop={selectedRooftop} onOpenLead={setSelectedLead} />
                <TeamActivity rooftop={selectedRooftop} onOpenLeads={member => setActiveTab('leads', member)}
                  onOpenCalendar={member => setActiveTab('calendar', member)} />
              </>}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsView
              onRooftopChange={setSelectedRooftop}
              initialLeads={leads}
              selectedRooftop={selectedRooftop}
              assignedStaff={user?.canAllocate ? teamMember : null}
              onClearStaff={() => setTeamMember(null)}
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
              assignedStaff={user?.canAllocate ? teamMember : null}
              onClearStaff={() => setTeamMember(null)}
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
        onLeadMerged={primary => setSelectedLead(primary)}
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
        onOpenExisting={existing => { setIsAddProspectOpen(false); setSelectedLead(existing); }}
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
        isOpen={!salesOnly && isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        role={role}
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
