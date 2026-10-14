'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
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
  const { user } = useAuth();

  // Navigation & Scope
  const [activeTab, setActiveTab] = useState<string>('today');
  const [selectedRooftop, setSelectedRooftop] = useState<string>('All Locations');
  const [role, setRole] = useState<'consultant' | 'manager' | 'principal' | 'super_admin'>('manager');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Data Stores
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unifiedSummary, setUnifiedSummary] = useState<UnifiedSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookDriveLead, setBookDriveLead] = useState<Lead | null>(null);
  const [isBookDriveOpen, setIsBookDriveOpen] = useState<boolean>(false);
  const [isAddProspectOpen, setIsAddProspectOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Fetch initial telemetry
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, vehiclesRes, actionsRes, apptsRes, summaryRes] = await Promise.all([
        leadApi.getLeads({ limit: 30 }).catch(() => ({ success: false, data: [] })),
        inventoryApi.getVehicles({ limit: 30 }).catch(() => ({ success: false, data: [] })),
        inventoryApi.getActionItems({ limit: 30 }).catch(() => ({ success: false, data: [] })),
        appointmentApi.getAppointments().catch(() => ({ success: false, data: [] })),
        unifiedApi.getSummary().catch(() => ({ success: false, data: undefined })),
      ]);

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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle lead update from modal
  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l._id === updatedLead._id ? { ...l, ...updatedLead } : l))
    );
    setSelectedLead(updatedLead);
  };

  // Handle vehicle update from modal
  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v._id === updatedVehicle._id ? { ...v, ...updatedVehicle } : v))
    );
    setSelectedVehicle(updatedVehicle);
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        selectedRooftop={selectedRooftop}
        setSelectedRooftop={setSelectedRooftop}
        leadsCount={unifiedSummary?.crm?.totalLeads || 1727}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles || 2477}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems || 1022}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header
          role={role}
          setRole={setRole}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onSelectLead={(l) => setSelectedLead(l)}
          onSelectVehicle={(v) => setSelectedVehicle(v)}
          onOpenAddProspect={() => setIsAddProspectOpen(true)}
        />

        {/* View Container */}
        <main className="app-main flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
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
              initialVehicles={vehicles}
              selectedRooftop={selectedRooftop}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
            />
          )}

          {activeTab === 'action-items' && (
            <ActionItemsView
              initialItems={actionItems}
              selectedRooftop={selectedRooftop}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              appointments={appointments}
              onOpenBookDrive={() => {
                setBookDriveLead(null);
                setIsBookDriveOpen(true);
              }}
            />
          )}

          {activeTab === 'rooftops' && <RooftopsView />}

          {activeTab === 'staff' && <StaffView />}

          {activeTab === 'feed-logs' && <FeedLogsView />}
        </main>
      </div>

      {/* Global Modals */}
      <Customer360Modal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
        onOpenBookDrive={(l) => {
          setBookDriveLead(l);
          setIsBookDriveOpen(true);
        }}
      />

      <VehicleDetailModal
        vehicle={selectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onVehicleUpdated={handleVehicleUpdated}
      />

      <AddProspectModal
        isOpen={isAddProspectOpen}
        onClose={() => setIsAddProspectOpen(false)}
        onLeadCreated={(newLead) => {
          setLeads((prev) => [newLead, ...prev]);
          setSelectedLead(newLead);
        }}
        defaultDealership={selectedRooftop !== 'All Locations' ? selectedRooftop : 'BYD South Morang'}
      />

      <BookTestDriveModal
        lead={bookDriveLead}
        isOpen={isBookDriveOpen}
        onClose={() => setIsBookDriveOpen(false)}
        onAppointmentCreated={(newAppt) => {
          setAppointments((prev) => [newAppt, ...prev]);
        }}
      />

      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRooftop={selectedRooftop}
        setSelectedRooftop={setSelectedRooftop}
        leadsCount={unifiedSummary?.crm?.totalLeads || 1727}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles || 2477}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems || 1022}
      />
    </div>
  );
}
