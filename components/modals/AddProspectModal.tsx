'use client';

import { specificDealerships } from '@/lib/locations';
import { RooftopOptions } from '@/components/ui/RooftopOptions';
import { useAuth } from '@/lib/auth';
import { useDialog } from '@/lib/use-dialog';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, Phone, Mail, Car, MapPin, CheckCircle2 } from 'lucide-react';
import { leadApi } from '@/lib/api';
import { Lead } from '@/lib/types';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated?: (newLead: Lead) => void;
  defaultDealership?: string;
}

export function AddProspectModal({
  isOpen,
  onClose,
  onLeadCreated,
  defaultDealership = 'BYD South Morang',
}: AddProspectModalProps) {
  const { locations: directoryLocations, user } = useAuth();
  const locations = specificDealerships(directoryLocations);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleMake, setVehicleMake] = useState('BYD');
  const [vehicleModel, setVehicleModel] = useState('');
  const [dealership, setDealership] = useState(defaultDealership);
  const [owner, setOwner] = useState(user?.name || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (locations.length && !locations.includes(dealership)) setDealership(locations.includes(defaultDealership) ? defaultDealership : locations[0]); }, [directoryLocations, dealership, defaultDealership]);

  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide customer name.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!locations.includes(dealership)) throw new Error('Select an available dealership.');
      const res = await leadApi.createLead({
        customer_name: name.trim(),
        name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        dealership_name: dealership,
        owner_name: owner,
        notes: notes.trim(),
      });

      if (res.success && res.data) {
        onLeadCreated?.(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to create lead');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating lead');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="AddProspect" tabIndex={-1} className="relative w-full max-w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92dvh] sm:max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Walk-in Prospect</h3>
              <p className="text-[10px] text-slate-500">Insert new opportunity into flwup_crm</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jason Miller"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+61 400 000 000"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Make</label>
              <select
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              >
                <option value="BYD">BYD</option>
                <option value="Hyundai">Hyundai</option>
                <option value="Kia">Kia</option>
                <option value="Chery">Chery</option>
                <option value="MG">MG</option>
                <option value="Other">Other Make</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Sealion 7 / Atto 3 / Tucson"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dealership / Rooftop</label>
              <select
                required
                aria-label="Prospect dealership"
                value={dealership}
                onChange={(e) => setDealership(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              >
                <RooftopOptions allowAll={false} />
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Consultant</label>
              <input
                aria-label="Assigned consultant"
                value={owner}
                maxLength={200}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Initial Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trade-in details, finance requirements, preferences..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !locations.includes(dealership)}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
