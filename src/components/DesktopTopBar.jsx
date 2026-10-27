import React from 'react';
import {
  Search,
  X,
  RefreshCw,
  Sun,
  Moon,
  Plus,
  FileEdit,
  Users,
  Home,
  Briefcase,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export default function DesktopTopBar({
  mainSection,
  searchQuery,
  setSearchQuery,
  onOpenAdd,
  isSyncing,
  onSync,
  isDark,
  toggleTheme,
  totalCount = 0
}) {
  const getSectionMeta = () => {
    switch (mainSection) {
      case 'roommates':
        return {
          title: 'Flatzymates Roommate Sharing',
          subtitle: 'Moderate, verify and manage flatmate seeker profiles',
          icon: Users,
          iconColor: 'text-[#7C3AED]',
          iconBg: 'bg-purple-500/10',
          badgeText: `${totalCount} Profiles`,
          badgeColor: 'bg-purple-500/15 text-[#7C3AED] border-purple-500/30',
          addLabel: '+ Add Flatmate',
          addButtonColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20',
          placeholder: 'Search flatmate name, WhatsApp, college, locality...'
        };
      case 'properties':
        return {
          title: 'Flats & Properties Inventory',
          subtitle: 'Manage live rental & sale inventory across Kolkata',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-500/10',
          badgeText: `${totalCount} Properties`,
          badgeColor: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
          addLabel: '+ Post Flat',
          addButtonColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20',
          placeholder: 'Search flat headline, BHK, locality, landmark...'
        };
      case 'brokers':
        return {
          title: 'Kolkata Partner Brokers',
          subtitle: 'Verified local real estate agent network & assigned inventory',
          icon: Briefcase,
          iconColor: 'text-purple-400',
          iconBg: 'bg-purple-500/10',
          badgeText: `${totalCount} Brokers`,
          badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          addLabel: '+ Add Broker',
          addButtonColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20',
          placeholder: 'Search broker name, agency, phone number...'
        };
      case 'inquiries':
      default:
        return {
          title: 'Inquiries & Tenant Leads',
          subtitle: 'Customer calls, WhatsApp leads and booking management',
          icon: FileEdit,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-400/10',
          badgeText: `${totalCount} Leads`,
          badgeColor: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
          addLabel: '+ Add Inquiry',
          addButtonColor: 'bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] text-[#0B132B] shadow-amber-400/25',
          placeholder: 'Search tenant name, phone, BHK, locality...'
        };
    }
  };

  const meta = getSectionMeta();
  const Icon = meta.icon;

  return (
    <header className={`hidden lg:flex items-center justify-between px-8 py-4 border-b shrink-0 sticky top-0 z-20 backdrop-blur-md transition-colors ${
      isDark
        ? 'bg-[#080E21]/90 border-slate-800 text-white'
        : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* 1. Left: Section Title & Breadcrumb */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
          <Icon className={`w-5 h-5 ${meta.iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-black tracking-tight truncate">
              {meta.title}
            </h1>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
              {meta.badgeText}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* 2. Center: Global Desktop Search Bar (for active section) */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={meta.placeholder}
            className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs outline-none border transition-all font-medium ${
              isDark
                ? 'bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Right: Quick Actions */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          title="Sync with Supabase"
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenAdd}
          className={`px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${meta.addButtonColor}`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{meta.addLabel}</span>
        </button>
      </div>
    </header>
  );
}
