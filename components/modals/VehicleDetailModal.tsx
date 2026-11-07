'use client';

import { vehicleStatus } from '@/lib/vehicle-status';
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
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user } = useAuth();
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen || !vehicle) return null;

  const { held: isHeld, label: stockStatus } = vehicleStatus(vehicle);
  const expiresAt = vehicle.softHold?.expiresAt && Number.isFinite(Date.parse(vehicle.softHold.expiresAt)) ? new Date(vehicle.softHold.expiresAt).toLocaleString('en-AU') : 'unknown';

  const handleToggleHold = async () => {
    setHoldError(null);
    setIsSubmittingHold(true);
    try {
      const res = await inventoryApi.releaseHold(vehicle._id, { holdId: vehicle.softHold?.holdId, heldAt: vehicle.softHold?.heldAt });
      if (res.data) {
        onVehicleUpdated?.(res.data);
        setToastMessage('Existing hold released.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: any) {
      setHoldError(err instanceof Error ? err.message : 'Unable to update hold. Please retry.');
      if (err.status === 409) {
        const latest = await inventoryApi.getVehicle(vehicle._id).catch(() => null);
        if (latest?.data) onVehicleUpdated?.(latest.data);
      }
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
        {holdError && <p role="alert" className="bg-red-50 p-4 text-sm text-red-700">{holdError}</p>}
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
{user?.viewCost && <>
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
</>}
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

          {isHeld && <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-900">Existing Soft Hold</h4>
            <p className="text-xs text-slate-600">Expires {expiresAt}</p>
            {user?.canAllocate && <button onClick={handleToggleHold} disabled={isSubmittingHold}
              className="mt-3 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white">
              <Unlock className="mr-2 inline h-4 w-4" />Release hold
            </button>}
          </div>}
        </div>
      </div>
    </div>
  );
}
