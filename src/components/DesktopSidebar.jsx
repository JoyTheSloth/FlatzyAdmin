import React from 'react';
import {
  FileEdit,
  Users,
  Home,
  Briefcase,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  HelpCircle,
  ShieldCheck,
  Flame,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function DesktopSidebar({
  mainSection,
  setMainSection,
  counts = {},
  hotLeadsCount = 0,
  onOpenAdd,
  isSyncing,
  onSync,
  isDark,
  toggleTheme,
  onOpenHelp,
  currentUser = {}
}) {
  const navItems = [
    {
      id: 'inquiries',
      label: 'Inquiries & Leads',
      sublabel: 'Tenant calls & inquiries',
      icon: FileEdit,
      count: counts.leads || 0,
      activeColor: 'bg-[#FFC800] text-[#0B132B] shadow-md shadow-amber-400/20 font-black',
      inactiveHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300',
      badgeActive: 'bg-[#0B132B] text-[#FFC800]',
      badgeInactive: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      accentDot: 'bg-[#FFC800]'
    },
    {
      id: 'roommates',
      label: 'Flatzymates',
      sublabel: 'Roommate sharing profiles',
      icon: Users,
      count: counts.roommates || 0,
      activeColor: 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/20 font-black',
      inactiveHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      accentDot: 'bg-[#7C3AED]'
    },
    {
      id: 'properties',
      label: 'Flats & Properties',
      sublabel: 'Rent & Sale catalog',
      icon: Home,
      count: counts.properties || 0,
      activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black',
      inactiveHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      accentDot: 'bg-blue-500'
    },
    {
      id: 'brokers',
      label: 'Partner Brokers',
      sublabel: 'Verified Kolkata brokers',
      icon: Briefcase,
      count: counts.brokers || 0,
      activeColor: 'bg-purple-600 text-white shadow-md shadow-purple-500/20 font-black',
      inactiveHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      accentDot: 'bg-purple-500'
    }
  ];

  return (
    <aside className={`hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r h-screen sticky top-0 z-30 select-none transition-colors duration-200 ${
      isDark
        ? 'bg-[#080E21] border-slate-800/80 text-slate-200'
        : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
    }`}>
      {/* 1. TOP BRAND HEADER */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center space-x-3">
          {/* Logo with yellow glow ring */}
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#FFC800] p-[2px] shadow-[0_2px_14px_rgba(255,200,0,0.35)] shrink-0">
            <img 
              src="/flatzy-logo.jpg" 
              alt="Flatzy" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-xl tracking-tight leading-none">
                Flatzy
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-[#FFC800] border border-[#FFC800]/40">
                ADMIN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              Kolkata Real Estate Portal
            </p>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
        <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Management Portals
        </div>

        {navItems.map((item) => {
          const isActive = mainSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setMainSection(item.id)}
              className={`w-full p-3 rounded-2xl transition-all duration-150 flex items-center justify-between text-left group cursor-pointer ${
                isActive ? item.activeColor : item.inactiveHover
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'bg-black/10 text-current' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold truncate tracking-tight">{item.label}</span>
                    {item.id === 'inquiries' && hotLeadsCount > 0 && (
                      <span className="flex items-center text-[9px] font-extrabold text-rose-500 bg-rose-500/10 px-1 rounded" title={`${hotLeadsCount} urgent hot inquiries`}>
                        <Flame className="w-2.5 h-2.5 fill-rose-500 mr-0.5" />
                        {hotLeadsCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] truncate ${
                    isActive ? 'opacity-80' : 'text-slate-400'
                  }`}>
                    {item.sublabel}
                  </p>
                </div>
              </div>

              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-all ${
                isActive ? item.badgeActive : item.badgeInactive
              }`}>
                {item.count}
              </span>
            </button>
          );
        })}

        {/* Quick Add CTA Button inside sidebar */}
        <div className="pt-4 px-1">
          <button
            onClick={onOpenAdd}
            className={`w-full py-3 px-3.5 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
              mainSection === 'properties'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                : mainSection === 'roommates'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-purple-500/20'
                  : 'bg-gradient-to-r from-[#FFC800] via-[#FFD21A] to-[#FFAE00] hover:brightness-105 text-[#0B132B] shadow-amber-400/25'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>
              {mainSection === 'properties'
                ? '+ Post Flat'
                : mainSection === 'roommates'
                  ? '+ Add Flatmate'
                  : mainSection === 'brokers'
                    ? '+ Add Broker'
                    : '+ Add Inquiry'}
            </span>
          </button>
        </div>

        {/* Live Supabase Sync Status Card */}
        <div className={`mt-5 p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cloud Sync
              </span>
            </div>
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Sync with Supabase cloud"
              className={`p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer ${
                isSyncing ? 'animate-spin opacity-60' : ''
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Supabase Live Realtime
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isSyncing ? 'Syncing data now...' : 'All changes auto-saved'}
          </p>
        </div>
      </div>

      {/* 3. SIDEBAR FOOTER (User Profile + Settings) */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 shrink-0 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          {/* User info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-[#0B132B] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              AD
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate leading-tight">
                Super Admin
              </span>
              <span className="text-[10px] text-emerald-500 font-bold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active</span>
              </span>
            </div>
          </div>

          {/* Theme & Help icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>
            <button
              onClick={onOpenHelp}
              title="Help Guide"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
