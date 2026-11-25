'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Car,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  Building2,
  Send,
} from 'lucide-react';
import { leadApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { CustomerHistoryData, Lead } from '@/lib/types';
import { WorkflowHistory } from './WorkflowHistory';
import { CustomerActivityFeed } from './CustomerActivityFeed';

function formatAud(cents: number | null | undefined) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateAu(iso?: string | null) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (!Number.isFinite(+parsed)) return '—';
  return parsed.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'Delivered':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Completed':
    case 'Sold':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Registered':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function CustomerHistoryTab({
  lead,
  onLeadUpdated,
}: {
  lead: Lead;
  onLeadUpdated?: (updatedLead: Lead) => void;
}) {
  const { user } = useAuth();
  const [includeBusiness, setIncludeBusiness] = useState(true);
  const [data, setData] = useState<CustomerHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    leadApi
      .getHistory(lead._id, includeBusiness, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted && res.data) setData(res.data);
      })
      .catch((err: any) => {
        if (!controller.signal.aborted) setError(err?.message || 'Unable to load customer history.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lead._id, lead.status, lead.sold_at, lead.business_id, includeBusiness]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim() || savingNote) return;
    setSavingNote(true);
    try {
      const res = await leadApi.addNote(lead._id, quickNote.trim(), user?.name);
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        setQuickNote('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse" aria-label="Loading customer history">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-slate-100 border border-slate-200" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
        {error}
      </div>
    );
  }

  const summary = data?.summary;
  const items = data?.items || [];

  return (
    <div className="space-y-5" aria-label="Customer purchase history">
      {/* Scope toggle when business linked */}
      {data?.hasLinkedBusiness && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Linked to{' '}
              <strong className="text-slate-900">
                {data.linkedBusinesses.map((b) => b.name).join(', ')}
              </strong>
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setIncludeBusiness(true)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                includeBusiness ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Person + Business
            </button>
            <button
              type="button"
              onClick={() => setIncludeBusiness(false)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                !includeBusiness ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This person only
            </button>
          </div>
        </div>
      )}

      {/* Lifetime Value Summary */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Lifetime value summary</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <Car className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Total vehicles purchased</p>
            <p className="text-2xl font-extrabold text-slate-950 mt-0.5">
              {summary?.totalVehiclesPurchased ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {data?.hasLinkedBusiness && includeBusiness && (summary?.businessPurchasesCount ?? 0) > 0
                ? `${summary?.customerPurchasesCount || 0} personal · ${summary?.businessPurchasesCount || 0} business`
                : 'Across all deals'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Lifetime spend</p>
            <p className="text-2xl font-extrabold text-slate-950 mt-0.5">
              {summary?.totalVehiclesPurchased === 0
                ? '$0'
                : summary?.lifetimeSpendCents != null
                  ? formatAud(summary.lifetimeSpendCents)
                  : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalVehiclesPurchased === 0
                ? 'No completed purchases yet'
                : summary?.pricedPurchasesCount
                  ? `Total across ${summary.pricedPurchasesCount} priced ${summary.pricedPurchasesCount === 1 ? 'deal' : 'deals'}`
                  : 'Sale price not recorded'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">Last purchase</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-950 mt-0.5">
              {summary?.lastPurchaseDate ? formatDateAu(summary.lastPurchaseDate) : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.lastPurchaseDate ? 'Most recent purchase date' : 'No completed sales yet'}
            </p>
          </div>
        </div>
      </section>

      {/* Purchase & Vehicle History Timeline */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Purchase &amp; vehicle history</span>
        </h4>

        {!items.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
            No vehicle deals or past purchases recorded yet for this{' '}
            {data?.hasLinkedBusiness && includeBusiness ? 'customer or linked business.' : 'customer.'}
          </div>
        ) : (
          <div className="relative pl-5 space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {items.map((item) => (
              <article
                key={item.id}
                className="relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-5 top-4 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                </span>

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-slate-900">{item.vehicle}</h5>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {[
                        item.vin ? `VIN: ${item.vin}` : null,
                        item.stockNumber ? `Stock: ${item.stockNumber}` : null,
                        item.dealNumber ? `Deal #${item.dealNumber}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'CRM deal record'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {item.scope === 'business' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        <Building2 className="w-3 h-3" />
                        {item.buyerName}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(
                        item.status,
                      )}`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Purchase date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDateAu(item.purchaseDate)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Sale price
                    </span>
                    <span className="font-bold text-slate-900">
                      {item.salePriceCents != null ? formatAud(item.salePriceCents) : 'Not recorded'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Salesperson
                    </span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {item.salesperson}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Expandable Inspection & Service History */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          aria-expanded={inspectionOpen}
          onClick={() => setInspectionOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Inspection &amp; service history
                {((data?.serviceBookings?.length || 0) + (data?.appraisalsCount || 0) + (data?.deliveriesCount || 0)) > 0 && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {(data?.serviceBookings?.length || 0) + (data?.appraisalsCount || 0) + (data?.deliveriesCount || 0)}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                View all inspections, service visits and work performed
              </p>
            </div>
          </div>
          {inspectionOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {inspectionOpen && (
          <div className="border-t border-slate-200 p-3.5 space-y-3 bg-slate-50/50">
            {!!data?.serviceBookings?.length && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Service visits &amp; bookings ({data.serviceBookings.length})
                </p>
                {data.serviceBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{booking.vehicle}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateAu(booking.startsAt)}
                        {booking.reference ? ` · Ref: ${booking.reference}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <WorkflowHistory leadId={lead._id} />
          </div>
        )}
      </section>

      {/* Expandable Notes */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          aria-expanded={notesOpen}
          onClick={() => setNotesOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Notes
                {(lead.diary_entries?.length ?? data?.notesCount ?? 0) > 0 && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {lead.diary_entries?.length ?? data?.notesCount ?? 0}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">View and add notes about this client</p>
            </div>
          </div>
          {notesOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {notesOpen && (
          <div className="border-t border-slate-200 p-3.5 space-y-3 bg-slate-50/50">
            <CustomerActivityFeed lead={lead} onUpdated={onLeadUpdated} />
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Add a note about this client..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingNote || !quickNote.trim()}
                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Add note</span>
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
