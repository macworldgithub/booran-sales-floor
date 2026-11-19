'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Car,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Wrench,
  Mail,
  ExternalLink,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileText,
  UserCheck,
  Building,
  Calendar,
  X,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type GetReadyVehicle = {
  make: string;
  model: string;
  variant?: string;
  colour?: string;
  rego?: string;
  vin?: string;
};

export type SubletJob = {
  id: string;
  item: string;
  vendor_name: string;
  sublet_number: string;
  booking_method: string;
  status: string;
  notes?: string;
  booked_at?: string;
  completed_at?: string;
};

export type AuditEvent = {
  action: string;
  by: string;
  at: string;
  details: string;
};

export type GetReadyRecord = {
  _id: string;
  deal_id?: string;
  deal_number: string;
  stock_number: string;
  customer_name: string;
  vehicle: GetReadyVehicle;
  delivery_date: string;
  delivery_time: string;
  delivery_day: string;
  salesman: string;
  finance_approval: string;
  vehicle_locate: string;
  plastics_stripped: boolean;
  mechanical_pd: boolean;
  detail_vehicle: boolean;
  rwc_required: boolean;
  diesel_required: boolean;
  floor_mats: string;
  is_fleet: boolean;
  fleet_company?: string;
  requested_items: string[];
  notes?: string;
  status: 'submitted' | 'validated' | 'mismatch_blocked' | 'ro_raised' | 'ready' | 'completed';
  ro_number?: string;
  ro_items?: string[];
  sublets?: SubletJob[];
  completed_by?: {
    name: string;
    date: string;
    signed_at?: string;
  };
  parts_dispatched_at?: string;
  parts_dispatched_by?: string;
  validation?: {
    isValid: boolean;
    checkedAt: string;
    checkedBy: string;
    contractReference?: string;
    matchedItems: string[];
    rejectedItems: string[];
    eligibleRoItems: string[];
    reason?: string;
  };
  audit_trail?: AuditEvent[];
  dealership: string;
  createdAt: string;
  updatedAt: string;
  deal?: {
    _id: string;
    status: string;
    contract?: {
      reference: string;
      signed_at: string;
      items?: string[];
      filename?: string;
      media_id?: string;
    };
    contract_items?: string[];
  };
};

export type SubletVendor = {
  _id: string;
  name: string;
  category: string;
  contact_method: string;
  email?: string;
  phone?: string;
  portal_url?: string;
  instructions?: string;
  supported_brands?: string[];
  notes?: string;
  is_default?: boolean;
};

export type SalesLogRow = {
  _id: string;
  deal_number: string;
  stock_number: string;
  customer_name: string;
  vehicle: GetReadyVehicle;
  vehicle_location: string;
  delivery_date: string;
  delivery_time: string;
  delivery_day: string;
  ro_number: string;
  jobs: string[];
  rwc: string;
  diesel: string;
  chemical: string;
  tint: string;
  floor_mats: string;
  mechanical_pd: string;
  plastics_stripped: string;
  detail_vehicle: string;
  is_fleet: boolean;
  fleet_company?: string;
  dealership: string;
  updated_at: string;
  updated_by: string;
};

export type EligibleDeal = {
  _id: string;
  dealNumber: string;
  stockNumber: string;
  lead_id: string;
  dealership: string;
  make: string;
  model: string;
  rego: string;
  vin: string;
  status: string;
  customerName: string;
  contractItems: string[];
  contract?: {
    reference: string;
    items?: string[];
  };
};

export function DeliveryCentreView({ rooftop }: { rooftop: string }) {
  const { user } = useAuth();
  const isManager = ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'].includes(user?.role || '');

  // Tab: 'cards' | 'sales_log'
  const [activeTab, setActiveTab] = useState<'cards' | 'sales_log'>('cards');
  const [rows, setRows] = useState<GetReadyRecord[]>([]);
  const [salesLogRows, setSalesLogRows] = useState<SalesLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [fleetFilter, setFleetFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [selectedRecordForRo, setSelectedRecordForRo] = useState<GetReadyRecord | null>(null);
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<GetReadyRecord | null>(null);
  const [selectedRecordForSublet, setSelectedRecordForSublet] = useState<GetReadyRecord | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<GetReadyRecord | null>(null);
  const [selectedRecordForAudit, setSelectedRecordForAudit] = useState<GetReadyRecord | null>(null);
  const [autoYouDraft, setAutoYouDraft] = useState<{ to: string; subject: string; body: string } | null>(null);

  // Load Get Ready Records
  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (rooftop && rooftop !== 'All Locations') params.set('rooftop', rooftop);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (fleetFilter !== 'all') params.set('fleet', fleetFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '50');

      const res = await fetchApi<GetReadyRecord[]>(`/deliveries/get-ready?${params.toString()}`);
      setRows(res.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rooftop, statusFilter, fleetFilter, searchQuery]);

  // Load Sales Log Records
  const loadSalesLog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (rooftop && rooftop !== 'All Locations') params.set('rooftop', rooftop);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '50');

      const res = await fetchApi<SalesLogRow[]>(`/deliveries/sales-log?${params.toString()}`);
      setSalesLogRows(res.data || []);
    } catch {
      // Safe fallback
    }
  }, [rooftop, searchQuery]);

  useEffect(() => {
    loadRecords();
    if (activeTab === 'sales_log') {
      loadSalesLog();
    }
  }, [loadRecords, loadSalesLog, activeTab, revision]);

  // Quick stats calculations
  const totalCount = rows.length;
  const pendingValidationCount = rows.filter(r => r.status === 'submitted').length;
  const mismatchBlockedCount = rows.filter(r => r.status === 'mismatch_blocked').length;
  const roRaisedCount = rows.filter(r => r.status === 'ro_raised').length;
  const readyCount = rows.filter(r => r.status === 'ready').length;
  const fleetCount = rows.filter(r => r.is_fleet).length;

  // Validate Contract Handler
  const handleValidate = async (record: GetReadyRecord) => {
    setError('');
    setNotice('');
    try {
      const res = await fetchApi<{ status: string; validation: GetReadyRecord['validation'] }>(
        `/deliveries/get-ready/${record._id}/validate`,
        { method: 'POST' }
      );
      if (res.data?.validation?.isValid) {
        setNotice(`Contract validated successfully for ${record.customer_name}. Ready to raise RO.`);
      } else {
        setError(`Contract mismatch: ${res.data?.validation?.rejectedItems?.join(', ') || 'Contract missing'} - items blocked from RO.`);
      }
      setRevision(v => v + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
                South Morang Delivery Centre
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Hyundai · Kia · Chery · BYD
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              Get Ready & Repair Order Process
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Contract is the sole authority for RO generation. Enforces contract validation, pre-populates eligible line items, manages sublets, and synchronizes the Sales Log.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVendorsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Wrench className="h-4 w-4 text-slate-500" />
              Sublet Vendors
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab(activeTab === 'cards' ? 'sales_log' : 'cards');
                if (activeTab === 'cards') loadSalesLog();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              {activeTab === 'cards' ? 'View Sales Log (BOOKED)' : 'View Delivery Cards'}
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Submit Get Ready Form
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Total Bookings</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-xs font-medium text-amber-700">Awaiting Validation</p>
            <p className="mt-1 text-xl font-bold text-amber-800">{pendingValidationCount}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
            <p className="text-xs font-medium text-red-700">Mismatch / Blocked</p>
            <p className="mt-1 text-xl font-bold text-red-800">{mismatchBlockedCount}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs font-medium text-blue-700">RO Raised (In Prep)</p>
            <p className="mt-1 text-xl font-bold text-blue-800">{roRaisedCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-medium text-emerald-700">Ready for Pick Up</p>
            <p className="mt-1 text-xl font-bold text-emerald-800">{readyCount}</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
            <p className="text-xs font-medium text-purple-700">Fleet Deals</p>
            <p className="mt-1 text-xl font-bold text-purple-800">{fleetCount}</p>
          </div>
        </div>

        {/* Global Notifications / Alerts */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 p-3.5 text-sm text-red-800 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {notice && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted (Pending Validation)</option>
              <option value="mismatch_blocked">Contract Mismatch (Blocked)</option>
              <option value="validated">Contract Validated</option>
              <option value="ro_raised">RO Raised</option>
              <option value="ready">Ready for Handover</option>
            </select>

            <select
              value={fleetFilter}
              onChange={e => setFleetFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Deal Types</option>
              <option value="fleet_only">Fleet Deals Only</option>
              <option value="retail_only">Retail Deals Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock #, deal #, customer, rego..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setRevision(v => v + 1)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100"
              title="Refresh records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'sales_log' ? (
        <SalesLogTable rows={salesLogRows} onRefresh={loadSalesLog} />
      ) : (
        <div className="space-y-4">
          {loading && !rows.length && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading Delivery Centre bookings...
            </div>
          )}

          {!loading && !rows.length && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Car className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No Get Ready records found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Submit a new Get Ready form to initiate contract validation and RO generation.
              </p>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Submit First Get Ready Form
              </button>
            </div>
          )}

          {rows.map(record => (
            <GetReadyCard
              key={record._id}
              record={record}
              onValidate={() => handleValidate(record)}
              onRaiseRo={() => setSelectedRecordForRo(record)}
              onPrintRo={() => setSelectedRecordForPrint(record)}
              onAddSublet={() => setSelectedRecordForSublet(record)}
              onDetailComplete={() => setSelectedRecordForDetail(record)}
              onViewAudit={() => setSelectedRecordForAudit(record)}
              onViewAutoYouDraft={(draft) => setAutoYouDraft(draft)}
              onReload={() => setRevision(v => v + 1)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showSubmitModal && (
        <SubmitGetReadyModal
          rooftop={rooftop}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={() => {
            setShowSubmitModal(false);
            setRevision(v => v + 1);
            setNotice('Get Ready form submitted successfully. Please validate against signed contract.');
          }}
        />
      )}

      {showVendorsModal && (
        <SubletVendorsModal
          rooftop={rooftop}
          onClose={() => setShowVendorsModal(false)}
        />
      )}

      {selectedRecordForRo && (
        <RaiseRoModal
          record={selectedRecordForRo}
          onClose={() => setSelectedRecordForRo(null)}
          onSuccess={() => {
            setSelectedRecordForRo(null);
            setRevision(v => v + 1);
            setNotice(`RO successfully raised. Vehicle location set to BOOKED and Sales Log updated.`);
          }}
        />
      )}

      {selectedRecordForPrint && (
        <PrintRoModal
          record={selectedRecordForPrint}
          onClose={() => setSelectedRecordForPrint(null)}
          onDispatched={() => {
            setRevision(v => v + 1);
            setNotice('RO and Parts Sheet marked as dispatched to Parts Department.');
          }}
        />
      )}

      {selectedRecordForSublet && (
        <AddSubletModal
          record={selectedRecordForSublet}
          onClose={() => setSelectedRecordForSublet(null)}
          onSuccess={() => {
            setSelectedRecordForSublet(null);
            setRevision(v => v + 1);
            setNotice('Sublet job assigned successfully.');
          }}
        />
      )}

      {selectedRecordForDetail && (
        <DetailCompleteModal
          record={selectedRecordForDetail}
          onClose={() => setSelectedRecordForDetail(null)}
          onSuccess={() => {
            setSelectedRecordForDetail(null);
            setRevision(v => v + 1);
            setNotice('Vehicle detailing sign-off completed. Status updated to Ready for Delivery.');
          }}
        />
      )}

      {selectedRecordForAudit && (
        <AuditTrailModal
          record={selectedRecordForAudit}
          onClose={() => setSelectedRecordForAudit(null)}
        />
      )}

      {autoYouDraft && (
        <AutoYouDraftModal
          draft={autoYouDraft}
          onClose={() => setAutoYouDraft(null)}
        />
      )}
    </div>
  );
}

// ─── GET READY CARD COMPONENT ────────────────────────────────────────────────
function GetReadyCard({
  record,
  onValidate,
  onRaiseRo,
  onPrintRo,
  onAddSublet,
  onDetailComplete,
  onViewAudit,
  onViewAutoYouDraft,
  onReload,
}: {
  record: GetReadyRecord;
  onValidate: () => void;
  onRaiseRo: () => void;
  onPrintRo: () => void;
  onAddSublet: () => void;
  onDetailComplete: () => void;
  onViewAudit: () => void;
  onViewAutoYouDraft: (draft: { to: string; subject: string; body: string }) => void;
  onReload: () => void;
}) {
  const [busySubletId, setBusySubletId] = useState('');

  const statusBadge = () => {
    switch (record.status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <Clock className="h-3 w-3" />
            Pending Validation
          </span>
        );
      case 'mismatch_blocked':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
            <AlertTriangle className="h-3 w-3" />
            Mismatch Blocked
          </span>
        );
      case 'validated':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
            <CheckCircle className="h-3 w-3" />
            Contract Validated
          </span>
        );
      case 'ro_raised':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
            <Wrench className="h-3 w-3" />
            RO: {record.ro_number}
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <CheckCircle className="h-3 w-3" />
            Ready for Delivery
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
            Handover Complete
          </span>
        );
      default:
        return null;
    }
  };

  const handleFetchAutoYouDraft = async (subletId: string) => {
    try {
      const res = await fetchApi<{ to: string; subject: string; body: string }>(
        `/deliveries/get-ready/${record._id}/sublets/${subletId}/email-draft`
      );
      if (res.data) {
        onViewAutoYouDraft(res.data);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCompleteSublet = async (subletId: string) => {
    setBusySubletId(subletId);
    try {
      await fetchApi(`/deliveries/get-ready/${record._id}/sublets/${subletId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      onReload();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusySubletId('');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {record.customer_name}
            </h2>
            {record.is_fleet && (
              <span className="rounded bg-purple-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Fleet Deal {record.fleet_company ? `· ${record.fleet_company}` : ''}
              </span>
            )}
            {statusBadge()}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              {record.vehicle?.make} {record.vehicle?.model} {record.vehicle?.variant || ''}
            </span>
            <span>·</span>
            <span>Colour: {record.vehicle?.colour || 'TBA'}</span>
            <span>·</span>
            <span>Stock: <strong className="font-mono text-slate-900">{record.stock_number}</strong></span>
            <span>·</span>
            <span>Deal: <strong className="font-mono text-slate-900">{record.deal_number}</strong></span>
            <span>·</span>
            <span>Rego: <strong className="font-mono text-slate-900">{record.vehicle?.rego || 'UNREG'}</strong></span>
            <span>·</span>
            <span>VIN: <strong className="font-mono text-slate-700">{record.vehicle?.vin || 'N/A'}</strong></span>
          </div>
        </div>

        {/* Delivery Timing & Location Box */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2 text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Delivery Scheduled</p>
          <p className="text-sm font-extrabold text-blue-950">
            {record.delivery_day} · {record.delivery_date}
          </p>
          <p className="text-xs font-medium text-blue-800">
            {record.delivery_time} · Locate: <span className="font-bold">{record.vehicle_locate}</span>
          </p>
        </div>
      </div>

      {/* Preparation Checkboxes & Statuses */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">RWC</span>
          <span className={`font-semibold ${record.rwc_required ? 'text-amber-700' : 'text-slate-700'}`}>
            {record.rwc_required ? 'Required' : 'N/A'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Diesel</span>
          <span className={`font-semibold ${record.diesel_required ? 'text-blue-700' : 'text-slate-700'}`}>
            {record.diesel_required ? 'Required' : 'N/A'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Plastics</span>
          <span className={`font-semibold ${record.plastics_stripped ? 'text-emerald-700' : 'text-slate-400'}`}>
            {record.plastics_stripped ? 'Stripped' : 'Pending'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Mechanical PD</span>
          <span className={`font-semibold ${record.mechanical_pd ? 'text-emerald-700' : 'text-slate-400'}`}>
            {record.mechanical_pd ? 'Booked' : 'Pending'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Floor Mats</span>
          <span className="font-semibold text-slate-800">
            {record.floor_mats || 'Carpet'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Detailing</span>
          <span className={`font-semibold ${record.detail_vehicle ? 'text-emerald-700' : 'text-slate-400'}`}>
            {record.detail_vehicle ? 'Booked' : 'Pending'}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Detailer Sign-Off</span>
          <span className={`font-semibold truncate block ${record.completed_by ? 'text-emerald-700' : 'text-slate-400'}`}>
            {record.completed_by ? `${record.completed_by.name} (${record.completed_by.date})` : 'Awaiting'}
          </span>
        </div>
      </div>

      {/* Contract Validation & Requested Accessories */}
      <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Requested Preparation & Accessories:
            </span>
            {record.validation?.contractReference && (
              <span className="text-xs text-slate-500">
                (Validated vs Contract {record.validation.contractReference})
              </span>
            )}
          </div>
          {record.deal?.contract && (
            <span className="text-[11px] font-semibold text-emerald-700">
              ✓ Signed Contract on File
            </span>
          )}
        </div>

        {/* Validation Line Items Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {record.requested_items && record.requested_items.length > 0 ? (
            record.requested_items.map((item, idx) => {
              const isMatched = record.validation?.matchedItems?.includes(item);
              const isRejected = record.validation?.rejectedItems?.includes(item);

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium shadow-xs ${
                    isMatched
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : isRejected
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {isMatched && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                  {isRejected && <AlertTriangle className="h-3 w-3 text-red-600" />}
                  {item}
                  {isRejected && (
                    <span className="ml-1 text-[10px] font-bold text-red-600 uppercase">
                      (Blocked from RO)
                    </span>
                  )}
                </span>
              );
            })
          ) : (
            <span className="text-xs italic text-slate-400">Standard delivery preparation only (no additional accessories requested).</span>
          )}
        </div>

        {/* Validation Warning Alert if Mismatch */}
        {record.status === 'mismatch_blocked' && (
          <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            <strong>Contract Authority Rule Enforced:</strong>{' '}
            {record.validation?.reason ||
              `The following items are NOT on the signed contract: ${record.validation?.rejectedItems?.join(', ')}. They cannot be raised on an RO.`}
          </div>
        )}
      </div>

      {/* Sublets Section */}
      {record.sublets && record.sublets.length > 0 && (
        <div className="mt-3.5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sublet Jobs & Vendors:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {record.sublets.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span>{s.item}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-700">{s.vendor_name}</span>
                  </div>
                  <p className="mt-0.5 text-slate-500 font-mono">
                    Sublet #{s.sublet_number} · Status: <span className="font-semibold text-slate-800">{s.status}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {s.vendor_name.toLowerCase().includes('auto you') && (
                    <button
                      type="button"
                      onClick={() => handleFetchAutoYouDraft(s.id)}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      title="View Auto You booking email draft"
                    >
                      <Mail className="h-3 w-3" />
                      Email Draft
                    </button>
                  )}

                  {s.status !== 'completed' && (
                    <button
                      type="button"
                      disabled={busySubletId === s.id}
                      onClick={() => handleCompleteSublet(s.id)}
                      className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onValidate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <FileCheck className="h-3.5 w-3.5 text-blue-600" />
            Validate vs Contract
          </button>

          <button
            type="button"
            onClick={onRaiseRo}
            disabled={record.status === 'mismatch_blocked' && (!record.validation?.eligibleRoItems || !record.validation.eligibleRoItems.length)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40"
          >
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
            {record.ro_number ? `Update RO (${record.ro_number})` : 'Raise Repair Order (RO)'}
          </button>

          <button
            type="button"
            onClick={onAddSublet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            Book Sublet
          </button>

          <button
            type="button"
            onClick={onDetailComplete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            Detailer Sign-Off
          </button>

          <button
            type="button"
            onClick={onPrintRo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Parts Dispatch Sheet
          </button>
        </div>

        <button
          type="button"
          onClick={onViewAudit}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <Clock className="h-3.5 w-3.5" />
          Audit Trail
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── SUBMIT GET READY MODAL ──────────────────────────────────────────────────
function SubmitGetReadyModal({
  rooftop,
  onClose,
  onSuccess,
}: {
  rooftop: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [eligibleDeals, setEligibleDeals] = useState<EligibleDeal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [dealNumber, setDealNumber] = useState('');
  const [stockNumber, setStockNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [make, setMake] = useState('Hyundai');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [colour, setColour] = useState('');
  const [rego, setRego] = useState('');
  const [vin, setVin] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('10:00 AM');
  const [deliveryDay, setDeliveryDay] = useState('Wednesday');
  const [salesman, setSalesman] = useState('');
  const [financeApproval, setFinanceApproval] = useState<'Yes' | 'No'>('Yes');
  const [vehicleLocate, setVehicleLocate] = useState('HOLDING YARD');
  const [rwcRequired, setRwcRequired] = useState(false);
  const [dieselRequired, setDieselRequired] = useState(false);
  const [plasticsStripped, setPlasticsStripped] = useState(true);
  const [mechanicalPd, setMechanicalPd] = useState(true);
  const [detailVehicle, setDetailVehicle] = useState(true);
  const [floorMats, setFloorMats] = useState('Carpet');
  const [isFleet, setIsFleet] = useState(false);
  const [fleetCompany, setFleetCompany] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch eligible deals
  useEffect(() => {
    fetchApi<EligibleDeal[]>(`/deliveries/deals-for-ready?rooftop=${encodeURIComponent(rooftop)}`)
      .then(res => setEligibleDeals(res.data || []))
      .catch(() => {});
  }, [rooftop]);

  // When a deal is chosen from dropdown, pre-populate form
  const handleSelectDeal = (id: string) => {
    setSelectedDealId(id);
    const d = eligibleDeals.find(deal => deal._id === id);
    if (!d) return;

    setDealNumber(d.dealNumber || '');
    setStockNumber(d.stockNumber || '');
    setCustomerName(d.customerName || '');
    setMake(d.make || 'Hyundai');
    setModel(d.model || '');
    setRego(d.rego || '');
    setVin(d.vin || '');
    if (d.contractItems?.length) {
      setItemsText(d.contractItems.join(', '));
    }
  };

  const calculateDayOfWeek = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setDeliveryDay(days[d.getUTCDay()]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealNumber.trim() || !stockNumber.trim() || !customerName.trim() || !deliveryDate || !salesman.trim()) {
      setError('Please fill in all mandatory fields: Deal #, Stock #, Customer, Delivery Date, and Salesman.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const requestedItems = itemsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);

      await fetchApi('/deliveries/get-ready', {
        method: 'POST',
        body: JSON.stringify({
          deal_id: selectedDealId || undefined,
          deal_number: dealNumber.trim(),
          stock_number: stockNumber.trim(),
          customer_name: customerName.trim(),
          vehicle: { make, model, variant, colour, rego, vin },
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          delivery_day: deliveryDay,
          salesman: salesman.trim(),
          finance_approval: financeApproval,
          vehicle_locate: vehicleLocate,
          rwc_required: rwcRequired,
          diesel_required: dieselRequired,
          plastics_stripped: plasticsStripped,
          mechanical_pd: mechanicalPd,
          detail_vehicle: detailVehicle,
          floor_mats: floorMats,
          is_fleet: isFleet,
          fleet_company: isFleet ? fleetCompany.trim() : undefined,
          requested_items: requestedItems,
          notes: notes.trim(),
          dealership: rooftop && rooftop !== 'All Locations' ? rooftop : undefined,
        }),
      });

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Submit Get Ready Form</h3>
            <p className="text-xs text-slate-500">Capture vehicle handover prep requirements and link to signed contract.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Quick Deal Select */}
          {eligibleDeals.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <label className="block font-bold text-blue-900">
                Pre-populate from active CRM deal:
              </label>
              <select
                value={selectedDealId}
                onChange={e => handleSelectDeal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-medium text-slate-800"
              >
                <option value="">-- Choose deal to auto-fill --</option>
                {eligibleDeals.map(d => (
                  <option key={d._id} value={d._id}>
                    Deal {d.dealNumber} · Stock {d.stockNumber} · {d.customerName} ({d.make} {d.model})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Deal & Customer Info */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-slate-700">Deal Number *</label>
              <input
                type="text"
                required
                value={dealNumber}
                onChange={e => setDealNumber(e.target.value)}
                placeholder="e.g. SM29161"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Stock Number *</label>
              <input
                type="text"
                required
                value={stockNumber}
                onChange={e => setStockNumber(e.target.value)}
                placeholder="e.g. 320476904"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Customer / Company *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer or Company name"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          {/* Vehicle Sold Details */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-slate-700">Make</label>
              <select
                value={make}
                onChange={e => setMake(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="Hyundai">Hyundai</option>
                <option value="Kia">Kia</option>
                <option value="Chery">Chery</option>
                <option value="BYD">BYD</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700">Model</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. Tucson HEV / Sportage / Shark"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Variant / Trim</label>
              <input
                type="text"
                value={variant}
                onChange={e => setVariant(e.target.value)}
                placeholder="e.g. Highlander / GT-Line"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-slate-700">Colour</label>
              <input
                type="text"
                value={colour}
                onChange={e => setColour(e.target.value)}
                placeholder="e.g. Amazon Grey"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Registration No</label>
              <input
                type="text"
                value={rego}
                onChange={e => setRego(e.target.value)}
                placeholder="e.g. 1XY2AB"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">VIN</label>
              <input
                type="text"
                value={vin}
                onChange={e => setVin(e.target.value)}
                placeholder="17-character VIN"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 uppercase"
              />
            </div>
          </div>

          {/* Delivery Schedule & Salesman */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="block font-bold text-slate-700">Delivery Date *</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={e => {
                  setDeliveryDate(e.target.value);
                  calculateDayOfWeek(e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Delivery Day</label>
              <select
                value={deliveryDay}
                onChange={e => setDeliveryDay(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-semibold"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700">Delivery Time *</label>
              <input
                type="text"
                required
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Salesman *</label>
              <input
                type="text"
                required
                value={salesman}
                onChange={e => setSalesman(e.target.value)}
                placeholder="Consultant name"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          {/* Locate & Finance */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-slate-700">Vehicle Locate</label>
              <select
                value={vehicleLocate}
                onChange={e => setVehicleLocate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-800"
              >
                <option value="HYUNDAI">HYUNDAI</option>
                <option value="KIA">KIA</option>
                <option value="HOLDING YARD">HOLDING YARD</option>
                <option value="CHERY">CHERY</option>
                <option value="BYD">BYD</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700">Finance Approval</label>
              <select
                value={financeApproval}
                onChange={e => setFinanceApproval(e.target.value as 'Yes' | 'No')}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700">Tailored Floor Mats</label>
              <input
                type="text"
                value={floorMats}
                onChange={e => setFloorMats(e.target.value)}
                placeholder="e.g. Carpet / Rubber"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          {/* Checkboxes Group */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
              Vehicle Preparation Checkboxes
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plasticsStripped}
                  onChange={e => setPlasticsStripped(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Plastics Stripped & De Stickered</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mechanicalPd}
                  onChange={e => setMechanicalPd(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Mechanical PD (Pre-Delivery)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={detailVehicle}
                  onChange={e => setDetailVehicle(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Detail Vehicle for Pick Up</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rwcRequired}
                  onChange={e => setRwcRequired(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>RWC (if required)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dieselRequired}
                  onChange={e => setDieselRequired(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>DIESEL (if required)</span>
              </label>
            </div>
          </div>

          {/* Fleet Deal Section */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
              <input
                type="checkbox"
                checked={isFleet}
                onChange={e => setIsFleet(e.target.checked)}
                className="rounded text-purple-600"
              />
              <span>Is this a Fleet Deal?</span>
            </label>
            {isFleet && (
              <div className="mt-2">
                <label className="block text-[11px] font-semibold text-purple-800">Fleet Company Name</label>
                <input
                  type="text"
                  value={fleetCompany}
                  onChange={e => setFleetCompany(e.target.value)}
                  placeholder="e.g. SG Fleet / Custom Fleet / LeasePlan"
                  className="mt-1 w-full rounded-lg border border-purple-300 bg-white p-2 text-xs"
                />
              </div>
            )}
          </div>

          {/* Requested Items & Accessories */}
          <div>
            <label className="block font-bold text-slate-700">
              Requested Accessories & Preparation Items (Comma-separated)
            </label>
            <p className="text-[11px] text-slate-500">
              Contract is the source of truth. Any item entered here will be validated against the signed contract before an RO can be raised.
            </p>
            <textarea
              rows={2}
              value={itemsText}
              onChange={e => setItemsText(e.target.value)}
              placeholder="e.g. Front & Rear Dash Cam, Darkest Legal Tint, Carpet Floor Mats, Towbar, Ceramic Paint Protection"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-sans"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block font-bold text-slate-700">Additional Instructions / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any specific delivery instructions, handover requests, etc."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit Get Ready Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── RAISE REPAIR ORDER (RO) MODAL ───────────────────────────────────────────
function RaiseRoModal({
  record,
  onClose,
  onSuccess,
}: {
  record: GetReadyRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [roNumber, setRoNumber] = useState(record.ro_number || `RO-${Math.floor(10000 + Math.random() * 90000)}`);
  const [deliveryDate, setDeliveryDate] = useState(record.delivery_date);
  const [deliveryTime, setDeliveryTime] = useState(record.delivery_time);
  const [deliveryDay, setDeliveryDay] = useState(record.delivery_day);
  const [selectedItems, setSelectedItems] = useState<string[]>(
    record.validation?.eligibleRoItems || record.requested_items || []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const eligibleItems = record.validation?.eligibleRoItems || [];
  const rejectedItems = record.validation?.rejectedItems || [];

  const handleToggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleRaise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roNumber.trim()) {
      setError('Please provide an RO number.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/deliveries/get-ready/${record._id}/raise-ro`, {
        method: 'POST',
        body: JSON.stringify({
          ro_number: roNumber.trim(),
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          delivery_day: deliveryDay,
          items: selectedItems,
        }),
      });

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Raise Repair Order (RO)</h3>
            <p className="text-xs text-slate-500">
              Deal {record.deal_number} · Stock {record.stock_number} · {record.customer_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRaise} className="mt-4 space-y-4 text-xs">
          {/* RO Details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700">RO Number *</label>
              <input
                type="text"
                required
                value={roNumber}
                onChange={e => setRoNumber(e.target.value)}
                placeholder="e.g. RO-84920"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-900 uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Delivery Day</label>
              <select
                value={deliveryDay}
                onChange={e => setDeliveryDay(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-semibold"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700">Delivery Date</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Delivery Time</label>
              <input
                type="text"
                required
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          {/* Validated Contract Items Selection */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Select Validated Line Items for RO (Contract Authority)
            </span>

            {eligibleItems.length > 0 ? (
              <div className="space-y-1.5">
                {eligibleItems.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item)}
                      onChange={() => handleToggleItem(item)}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">{item}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No accessories on contract. Standard preparation will be raised.</p>
            )}

            {rejectedItems.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
                <span className="font-bold block">Blocked from RO (Not on Signed Contract):</span>
                <ul className="list-disc list-inside mt-1">
                  {rejectedItems.map(i => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-900">
            <p className="font-bold">Sales Log Update Trigger:</p>
            <p className="mt-0.5 text-[11px] text-blue-800">
              Raising this RO will automatically update the vehicle location in the Sales Log and Live Inventory to <strong className="font-black">BOOKED</strong>.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Raising RO...' : 'Confirm & Raise RO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PRINTABLE RO & PARTS DISPATCH MODAL ─────────────────────────────────────
function PrintRoModal({
  record,
  onClose,
  onDispatched,
}: {
  record: GetReadyRecord;
  onClose: () => void;
  onDispatched: () => void;
}) {
  const [sheetData, setSheetData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchApi(`/deliveries/get-ready/${record._id}/ro-sheet`)
      .then(res => setSheetData(res.data))
      .catch(() => {});
  }, [record._id]);

  const handleMarkDispatched = async () => {
    setBusy(true);
    try {
      await fetchApi(`/deliveries/get-ready/${record._id}/parts-dispatch`, { method: 'POST' });
      onDispatched();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-black text-slate-900">Parts & Repair Order Dispatch Sheet</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleMarkDispatched}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Mark Dispatched to Parts
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="mt-4 rounded-xl border border-slate-300 p-8 font-sans text-slate-900 print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                {record.dealership} · DELIVERY CENTRE
              </p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                PARTS & REPAIR ORDER DISPATCH
              </h1>
              <p className="text-xs text-slate-600">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-slate-500">RO Number</p>
              <p className="text-3xl font-black text-blue-900 font-mono">
                {record.ro_number || 'PENDING RO'}
              </p>
              {record.is_fleet && (
                <span className="inline-block rounded bg-purple-700 px-2 py-0.5 text-[10px] font-black uppercase text-white mt-1">
                  Fleet Deal: {record.fleet_company || 'Fleet'}
                </span>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-bold uppercase text-slate-500 mb-1">Deal & Customer</p>
              <p><strong>Customer:</strong> {record.customer_name}</p>
              <p><strong>Deal Number:</strong> {record.deal_number}</p>
              <p><strong>Stock Number:</strong> {record.stock_number}</p>
              <p><strong>Salesman:</strong> {record.salesman}</p>
              <p><strong>Finance Approval:</strong> {record.finance_approval}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-bold uppercase text-slate-500 mb-1">Vehicle Specification</p>
              <p><strong>Vehicle:</strong> {record.vehicle?.make} {record.vehicle?.model} {record.vehicle?.variant || ''}</p>
              <p><strong>Colour:</strong> {record.vehicle?.colour}</p>
              <p><strong>Rego:</strong> {record.vehicle?.rego || 'UNREGISTERED'}</p>
              <p><strong>VIN:</strong> {record.vehicle?.vin || 'N/A'}</p>
              <p><strong>Vehicle Locate:</strong> <span className="font-bold text-blue-900">{record.vehicle_locate}</span></p>
            </div>
          </div>

          {/* Delivery Booking Highlight */}
          <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs flex justify-between items-center font-semibold">
            <span>DELIVERY BOOKING: {record.delivery_day.toUpperCase()}, {record.delivery_date} AT {record.delivery_time}</span>
            <span>LOCATION: {record.vehicle_locate}</span>
          </div>

          {/* Preparation Checkpoints */}
          <div className="mt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 border-b pb-1">
              Workshop & Detailing Checkpoints
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ {record.mechanical_pd ? '✓' : ' '} ]</span>
                <span>Mechanical PD (Pre-Delivery)</span>
              </div>
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ {record.plastics_stripped ? '✓' : ' '} ]</span>
                <span>Plastics Stripped & De Stickered</span>
              </div>
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ {record.detail_vehicle ? '✓' : ' '} ]</span>
                <span>Detail Vehicle for Pick Up</span>
              </div>
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ {record.rwc_required ? '✓' : ' '} ]</span>
                <span>RWC Certificate</span>
              </div>
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ {record.diesel_required ? '✓' : ' '} ]</span>
                <span>Full Tank Diesel</span>
              </div>
              <div className="flex items-center gap-2 border p-2 rounded">
                <span className="font-bold">[ ✓ ]</span>
                <span>Floor Mats ({record.floor_mats || 'Carpet'})</span>
              </div>
            </div>
          </div>

          {/* Validated Line Items (Parts & Accessories) */}
          <div className="mt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 border-b pb-1">
              Validated Contract Parts & Accessories
            </h4>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 border-b">Item Description</th>
                  <th className="p-2 border-b">Category / Sublet</th>
                  <th className="p-2 border-b text-center">Parts Pulled</th>
                  <th className="p-2 border-b text-center">Fitted</th>
                </tr>
              </thead>
              <tbody>
                {(record.ro_items || record.validation?.matchedItems || record.requested_items || []).map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-semibold">{item}</td>
                    <td className="p-2 text-slate-600">Contract Accessory</td>
                    <td className="p-2 text-center font-mono">[ ]</td>
                    <td className="p-2 text-center font-mono">[ ]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sublet Vendors Table if any */}
          {record.sublets && record.sublets.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 border-b pb-1">
                Sublet Vendor Allocations
              </h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2 border-b">Sublet #</th>
                    <th className="p-2 border-b">Vendor</th>
                    <th className="p-2 border-b">Item</th>
                    <th className="p-2 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {record.sublets.map((s, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-mono font-bold">{s.sublet_number}</td>
                      <td className="p-2">{s.vendor_name}</td>
                      <td className="p-2">{s.item}</td>
                      <td className="p-2 font-semibold">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures Block */}
          <div className="mt-10 grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 text-xs">
            <div>
              <p className="font-bold uppercase text-slate-600">Parts Department</p>
              <div className="mt-6 border-b border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-500">Sign & Date</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-600">Workshop / Contractor</p>
              <div className="mt-6 border-b border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-500">Sign & Date</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-600">Detailer Sign-Off</p>
              <div className="mt-6 border-b border-slate-400">
                {record.completed_by && (
                  <span className="font-bold text-slate-900">{record.completed_by.name} · {record.completed_by.date}</span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Sign & Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADD SUBLET JOB MODAL ────────────────────────────────────────────────────
function AddSubletModal({
  record,
  onClose,
  onSuccess,
}: {
  record: GetReadyRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [vendors, setVendors] = useState<SubletVendor[]>([]);
  const [vendorName, setVendorName] = useState('Auto You');
  const [item, setItem] = useState('Front & Rear Dash Cam');
  const [subletNumber, setSubletNumber] = useState(`SUB-${Math.floor(10000 + Math.random() * 90000)}`);
  const [bookingMethod, setBookingMethod] = useState<'email' | 'portal' | 'phone'>('email');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<SubletVendor[]>(`/deliveries/sublets/vendors?rooftop=${encodeURIComponent(record.dealership)}`)
      .then(res => {
        if (res.data?.length) {
          setVendors(res.data);
          setVendorName(res.data[0].name);
          setBookingMethod((res.data[0].contact_method as any) || 'email');
        }
      })
      .catch(() => {});
  }, [record.dealership]);

  const handleVendorChange = (name: string) => {
    setVendorName(name);
    const v = vendors.find(vendor => vendor.name === name);
    if (v) {
      setBookingMethod((v.contact_method as any) || 'email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !vendorName.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/deliveries/get-ready/${record._id}/sublets`, {
        method: 'POST',
        body: JSON.stringify({
          item: item.trim(),
          vendor_name: vendorName.trim(),
          sublet_number: subletNumber.trim(),
          booking_method: bookingMethod,
          notes: notes.trim(),
        }),
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Book Sublet Work</h3>
            <p className="text-slate-500">Assign external work to specialized vendor.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block font-bold text-slate-700">Vendor</label>
            <select
              value={vendorName}
              onChange={e => handleVendorChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-semibold"
            >
              {vendors.map(v => (
                <option key={v._id} value={v.name}>
                  {v.name} ({v.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700">Item / Work Required *</label>
            <input
              type="text"
              required
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="e.g. Front & Rear Dash Cam / Suspension Upgrade"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700">Sublet Number</label>
              <input
                type="text"
                value={subletNumber}
                onChange={e => setSubletNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Booking Method</label>
              <select
                value={bookingMethod}
                onChange={e => setBookingMethod(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="email">Email</option>
                <option value="portal">Booking Portal</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700">Notes / Vehicle Details</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Customer requested hardwire parking mode enabled"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Assign Sublet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUBLET VENDORS MASTER MODAL ─────────────────────────────────────────────
function SubletVendorsModal({
  rooftop,
  onClose,
}: {
  rooftop: string;
  onClose: () => void;
}) {
  const [vendors, setVendors] = useState<SubletVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'portal' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadVendors = useCallback(() => {
    setLoading(true);
    fetchApi<SubletVendor[]>(`/deliveries/sublets/vendors?rooftop=${encodeURIComponent(rooftop)}`)
      .then(res => setVendors(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rooftop]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi('/deliveries/sublets/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          contact_method: contactMethod,
          email: email.trim(),
          phone: phone.trim(),
          instructions: instructions.trim(),
          dealership: rooftop && rooftop !== 'All Locations' ? rooftop : undefined,
        }),
      });
      setName('');
      setCategory('');
      setEmail('');
      setPhone('');
      setInstructions('');
      loadVendors();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Sublet Vendors Master</h3>
            <p className="text-slate-500">Configure default and custom external vendors (e.g. for BYD Shark accessories, suspension, towbars).</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Vendors List */}
        <div className="mt-4 space-y-2">
          <p className="font-bold uppercase tracking-wider text-slate-600">Configured Vendors for this Dealership:</p>
          {loading && <p className="text-slate-400">Loading vendors...</p>}
          <div className="divide-y rounded-xl border border-slate-200 bg-slate-50">
            {vendors.map(v => (
              <div key={v._id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                      {v.category}
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px] capitalize">
                    via {v.contact_method}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{v.instructions}</p>
                <div className="mt-1 flex gap-3 text-slate-500 text-[11px]">
                  {v.email && <span>Email: {v.email}</span>}
                  {v.phone && <span>Phone: {v.phone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Vendor Form */}
        <form onSubmit={handleAddVendor} className="mt-6 rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
          <h4 className="font-bold text-slate-800 text-sm">Add New Sublet Vendor</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Vendor Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Opposite Lock / ARB"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Category *</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Suspension & Towbars"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Contact Method</label>
              <select
                value={contactMethod}
                onChange={e => setContactMethod(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="email">Email</option>
                <option value="portal">Portal</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="03 9000 0000"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700">Booking Instructions</label>
            <input
              type="text"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Email bookings with date, time, sublet number and vehicle details"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 py-2 font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Adding...' : 'Save Sublet Vendor'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── DETAILER COMPLETION SIGN-OFF MODAL ──────────────────────────────────────
function DetailCompleteModal({
  record,
  onClose,
  onSuccess,
}: {
  record: GetReadyRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [detailerName, setDetailerName] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailerName.trim()) return;

    setBusy(true);
    setError('');
    try {
      await fetchApi(`/deliveries/get-ready/${record._id}/detail-complete`, {
        method: 'POST',
        body: JSON.stringify({
          detailer_name: detailerName.trim(),
          completion_date: completionDate,
        }),
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Detailer Sign-Off</h3>
            <p className="text-slate-500">Record detailer completion to mark vehicle ready for delivery.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block font-bold text-slate-700">Detailer Full Name *</label>
            <input
              type="text"
              required
              value={detailerName}
              onChange={e => setDetailerName(e.target.value)}
              placeholder="e.g. Dave Miller"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700">Completion Date *</label>
            <input
              type="date"
              required
              value={completionDate}
              onChange={e => setCompletionDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Signing off...' : 'Sign Off & Mark Ready'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AUTO YOU EMAIL DRAFT MODAL ──────────────────────────────────────────────
function AutoYouDraftModal({
  draft,
  onClose,
}: {
  draft: { to: string; subject: string; body: string };
  onClose: () => void;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-black text-slate-900">Auto You Booking Email Draft</h3>
              <p className="text-slate-500">Auto-formatted with sublet number, vehicle details, date and time.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 font-mono">
          <div className="rounded-lg border bg-slate-50 p-2.5">
            <span className="font-bold text-slate-600 font-sans block text-[11px] mb-1">To:</span>
            <span className="text-slate-900 select-all">{draft.to}</span>
          </div>

          <div className="rounded-lg border bg-slate-50 p-2.5">
            <span className="font-bold text-slate-600 font-sans block text-[11px] mb-1">Subject:</span>
            <span className="text-slate-900 select-all font-semibold">{draft.subject}</span>
          </div>

          <div className="rounded-lg border bg-slate-50 p-3">
            <span className="font-bold text-slate-600 font-sans block text-[11px] mb-1">Message Body:</span>
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-800 select-all font-mono">
              {draft.body}
            </pre>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <a
            href={`mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Email App
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied to Clipboard!' : 'Copy Email Text'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT TRAIL MODAL ───────────────────────────────────────────────────────
function AuditTrailModal({
  record,
  onClose,
}: {
  record: GetReadyRecord;
  onClose: () => void;
}) {
  const events = record.audit_trail || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Audit Trail History</h3>
            <p className="text-slate-500">
              Deal {record.deal_number} · Stock {record.stock_number} · {record.customer_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {events.length > 0 ? (
            events.map((evt, idx) => (
              <div key={idx} className="relative pl-6 pb-3 border-l-2 border-blue-200 last:border-none">
                <span className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-blue-600" />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-bold text-slate-800 capitalize">{evt.action.replace(/_/g, ' ')}</span>
                  <span>{new Date(evt.at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-slate-700 font-medium">{evt.details}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">By: {evt.by}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 italic">No audit events recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SALES LOG TABLE VIEW ───────────────────────────────────────────────────
function SalesLogTable({
  rows,
  onRefresh,
}: {
  rows: SalesLogRow[];
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Sales Log – Delivery Center Status</h2>
          <p className="text-xs text-slate-500">
            Synchronized live when ROs are raised. Confirms vehicle location set to <strong className="text-blue-900">BOOKED</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Deal #</th>
              <th className="p-3">Stock #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3 text-center">Vehicle Location</th>
              <th className="p-3">Delivery Date & Time</th>
              <th className="p-3">RO #</th>
              <th className="p-3 text-center">RWC</th>
              <th className="p-3 text-center">Chemical</th>
              <th className="p-3 text-center">Tint</th>
              <th className="p-3">Mats</th>
              <th className="p-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map(r => (
                <tr key={r._id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono font-bold text-slate-900">{r.deal_number}</td>
                  <td className="p-3 font-mono font-bold text-slate-700">{r.stock_number}</td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900 block">{r.customer_name}</span>
                    {r.is_fleet && (
                      <span className="text-[10px] font-bold text-purple-700 uppercase">
                        Fleet ({r.fleet_company || 'Fleet'})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span>{r.vehicle?.make} {r.vehicle?.model}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{r.vehicle?.rego || 'UNREG'}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-900">
                      {r.vehicle_location}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-slate-800">{r.delivery_day} {r.delivery_date}</span>
                    <span className="block text-[10px] text-slate-500">{r.delivery_time}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-blue-800">{r.ro_number}</td>
                  <td className="p-3 text-center font-medium">{r.rwc}</td>
                  <td className="p-3 text-center font-medium">{r.chemical}</td>
                  <td className="p-3 text-center font-medium">{r.tint}</td>
                  <td className="p-3 font-medium">{r.floor_mats}</td>
                  <td className="p-3 text-right text-slate-400 text-[10px]">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                  No Sales Log records recorded yet. Raise an RO to synchronize the Sales Log.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
