'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  Menu,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMore: () => void;
  leadsCount?: number;
  inventoryCount?: number;
  actionItemsCount?: number;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenMore,
  leadsCount = 1727,
  inventoryCount = 2477,
  actionItemsCount = 1022,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'today',
      label: 'Today',
      icon: LayoutDashboard,
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: Users,
      badge: leadsCount > 999 ? `${(leadsCount / 1000).toFixed(1)}k` : leadsCount,
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Car,
      badge: inventoryCount > 999 ? `${(inventoryCount / 1000).toFixed(1)}k` : inventoryCount,
    },
    {
      id: 'calendar',
      label: 'Showroom',
      icon: Calendar,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#171b22]/95 backdrop-blur-md border-t border-white/10 px-2 py-1.5 safe-area-bottom shadow-2xl"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-red-600 shadow-sm shadow-red-500/50" />
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-500 scale-110' : ''} transition-transform`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[9px] font-extrabold px-1 rounded-full text-white ${
                      'bg-red-600'
                    } leading-tight font-mono ring-1 ring-[#171b22]`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-semibold tracking-tight ${isActive ? 'font-bold text-white' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenMore}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
