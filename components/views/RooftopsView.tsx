'use client';

import React from 'react';
import { MapPin, Building, ShieldCheck, User, DollarSign, Layers, CheckCircle2 } from 'lucide-react';
import { Rooftop } from '@/lib/types';

interface RooftopsViewProps {
  onSelectRooftopFilter?: (rooftop: string) => void;
}

export function RooftopsView({ onSelectRooftopFilter }: RooftopsViewProps) {
  const rooftopCards = [
    {
      id: 'boorancheltenham',
      name: 'Booran Cheltenham',
      location: 'Cheltenham, VIC',
      franchise: 'Multi-Franchise Dealership Cluster',
      gm: 'Brett Harrison',
      dp: 'Paul Booran',
      rate: '0.030% daily holding cost',
      branchCodes: ['01', 'CHELT', 'CHELTI', 'CHELTH', 'SOCH'],
      leadVolume: 'High',
      stockUnits: 840,
    },
    {
      id: 'bydsouthmorang',
      name: 'BYD South Morang',
      location: 'South Morang, VIC',
      franchise: 'BYD Electric Vehicle Centre',
      gm: 'Nathan Cole',
      dp: 'Paul Booran',
      rate: '0.030% daily holding cost',
      branchCodes: ['SM-BYD', 'BYD01'],
      leadVolume: '1,120+ Inquiries',
      stockUnits: 460,
    },
    {
      id: 'cranbournehyundai',
      name: 'Cranbourne Hyundai',
      location: 'Cranbourne, VIC',
      franchise: 'Hyundai Volume Dealership',
      gm: 'Sarah Jenkins',
      dp: 'Paul Booran',
      rate: '0.030% daily holding cost',
      branchCodes: ['CRAN', 'CRHYU'],
      leadVolume: 'Medium',
      stockUnits: 620,
    },
    {
      id: 'berwickmg',
      name: 'Berwick MG Hyundai',
      location: 'Berwick, VIC',
      franchise: 'Dual Franchise Retail Centre',
      gm: "Liam O'Connor",
      dp: 'Paul Booran',
      rate: '0.030% daily holding cost',
      branchCodes: ['BERW', 'BMG'],
      leadVolume: 'Medium',
      stockUnits: 557,
    },
  ];

  return (
    <div className="view-stack space-y-5">
      {/* Intro */}
      <div className="page-intro p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
          Booran Motors VIC Dealer Network
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
          Rooftops & Multi-Dealership Facilities
        </h2>
        <p className="text-xs text-slate-500">
          Executive oversight of all dealer points, DMS feed branches, holding cost rates, and facility management.
        </p>
      </div>

      {/* Rooftops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {rooftopCards.map((r) => (
          <div
            key={r.id}
            className="surface-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-3.5 sm:space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                  <Building className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{r.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{r.location}</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                Active Tier Pro
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  General Manager
                </span>
                <span className="font-semibold text-slate-800">{r.gm}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Dealer Principal
                </span>
                <span className="font-semibold text-slate-800">{r.dp}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Holding Cost Rate
                </span>
                <span className="font-semibold text-slate-800">{r.rate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Stock On Ground
                </span>
                <span className="font-semibold text-slate-800">{r.stockUnits} units</span>
              </div>
            </div>

            {/* DMS Branch Codes */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1.5">
                Pentana DMS Branch Codes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {r.branchCodes.map((code) => (
                  <span
                    key={code}
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
