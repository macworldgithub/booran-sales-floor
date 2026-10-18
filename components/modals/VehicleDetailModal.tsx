'use client';

import { useAuth } from '@/lib/auth';
import { useDialog } from '@/lib/use-dialog';

import React, { useState } from 'react';
import {
  X,
  Car,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  MapPin,
  Tag,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { inventoryApi } from '@/lib/api';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated?: (updatedVehicle: Vehicle) => void;
}

export function VehicleDetailModal({
  vehicle,
  isOpen,
  onClose,
  onVehicleUpdated,
}: VehicleDetailModalProps) {
  const [prospectName, setProspectName] = useState('');
  const [holdNotes, setHoldNotes] = useState('');
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user } = useAuth();
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen || !vehicle) return null;

  const isHeld = vehicle.status === 'Soft Hold' || vehicle.softHold?.held;

  const handleToggleHold = async () => {
    setIsSubmittingHold(true);
    try {
      if (isHeld) {
        const res = await inventoryApi.releaseHold(vehicle._id);
        if (res.success && res.data) {
          onVehicleUpdated?.(res.data);
          setToastMessage('Soft-hold released. Unit returned to open stock.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      } else {
        const res = await inventoryApi.softHold(vehicle._id, {
          prospectName: prospectName.trim() || 'Floor Customer',
          notes: holdNotes.trim() || '48-hour customer showroom hold',
          consultant: user?.name,
        });
        if (res.success && res.data) {
          onVehicleUpdated?.(res.data);
          setToastMessage('Soft-hold successfully applied for 48 hours!');
          setProspectName('');
          setHoldNotes('');
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    } catch (err: any) {
      console.error('Failed to update hold:', err);
    } finally {
      setIsSubmittingHold(false);
    }
  };

  const getAgingBadgeColor = (bucket: string) => {
    switch (bucket) {
      case '90+':
        return 'bg-red-500/15 text-red-700 border-red-500/30';
      case '61-90':
        return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
      case '46-60':
      case '31-45':
        return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="VehicleDetail" tabIndex={-1} className="relative w-full max-w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92dvh] sm:max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">
                  #{vehicle.stockNumber}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                {vehicle.variant || ''} · {vehicle.rooftopName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Advertised Price</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                ${vehicle.advertisedPrice ? vehicle.advertisedPrice.toLocaleString() : 'POA'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Days In Stock (DIS)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-base font-bold text-slate-900">{vehicle.daysInStock}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getAgingBadgeColor(vehicle.agingBucket)}`}>
                  {vehicle.agingBucket}d
                </span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Vehicle Cost</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                ${vehicle.vehicleCost ? vehicle.vehicleCost.toLocaleString() : '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Holding Cost Eaten</p>
              <p className="text-base font-bold text-amber-600 mt-0.5">
                ${vehicle.accumulatedHoldingCost ? vehicle.accumulatedHoldingCost.toLocaleString() : '0'}
              </p>
            </div>
          </div>

          {/* Vehicle Specifications */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Vehicle Master Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400">VIN:</span>{' '}
                <span className="font-mono font-medium text-slate-800">{vehicle.vin || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">Category:</span>{' '}
                <span className="font-semibold text-slate-800">{vehicle.category}</span>
              </div>
              <div>
                <span className="text-slate-400">Colour:</span>{' '}
                <span className="font-medium text-slate-800">{vehicle.colour || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">Transmission:</span>{' '}
                <span className="font-medium text-slate-800">{vehicle.transmission || 'Automatic'}</span>
              </div>
              <div>
                <span className="text-slate-400">Fuel:</span>{' '}
                <span className="font-medium text-slate-800">{vehicle.fuel || 'Petrol'}</span>
              </div>
              <div>
                <span className="text-slate-400">Rego / Plate:</span>{' '}
                <span className="font-mono font-medium text-slate-800">{vehicle.rego || 'Unregistered'}</span>
              </div>
            </div>
          </div>

          {/* Action Recommendation (If Aging or Price Compression) */}
          {vehicle.actionReason && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs">
              <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Inventory Action Advisory</span>
              </div>
              <p className="text-red-700 leading-relaxed">{vehicle.actionReason}</p>
              {vehicle.recommendedAction && (
                <p className="text-red-900 font-semibold mt-1">
                  Recommendation: {vehicle.recommendedAction}
                </p>
              )}
            </div>
          )}

          {/* Soft-Hold Workflow */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Showroom Soft-Hold Status</h4>
                <p className="text-[11px] text-slate-500">
                  {isHeld
                    ? `Held for ${vehicle.softHold?.prospectName || 'Customer'} (Expires in 48h)`
                    : 'Place a 48-hour hold to protect this unit while customer finalises finance.'}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isHeld ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isHeld ? 'SOFT HOLD' : 'AVAILABLE'}
              </span>
            </div>

            {isHeld ? (
              <button
                onClick={handleToggleHold}
                disabled={isSubmittingHold}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Release Soft-Hold</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Prospect full name..."
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={holdNotes}
                    onChange={(e) => setHoldNotes(e.target.value)}
                    placeholder="Hold reason / deal notes..."
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleToggleHold}
                  disabled={isSubmittingHold}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Place 48-Hour Soft-Hold</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
