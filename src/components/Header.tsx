import React from 'react';
import { 
  Search, 
  RotateCw, 
  Menu
} from 'lucide-react';
import type { NavTab } from './Sidebar.js';
import { PirateShipIcon } from './PirateShipIcon.js';

interface HeaderProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  onOpenSearch: () => void;
  onRefresh?: () => void;
  onRefreshData?: () => void;
  refreshing?: boolean;
  servicesStatus?: Array<{ id: string; name: string; status: string; version?: string }>;
  queueCount?: number;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeTab,
  onOpenSearch,
  onRefresh,
  onRefreshData,
  refreshing = false,
  servicesStatus = [],
  onToggleMobileMenu
}) => {
  const tab: NavTab = currentTab || activeTab || 'dashboard';

  const getTabTitle = (t: NavTab) => {
    switch (t) {
      case 'dashboard':
        return { title: 'Stack Dashboard', subtitle: 'Real-time overview of your media ecosystem' };
      case 'libraries':
        return { title: 'Unified Library Browser', subtitle: 'Browse across TV shows, movies, and music' };
      case 'search':
        return { title: 'Universal Search', subtitle: 'Search indexers and lookup metadata across all *arr services' };
      case 'queue':
        return { title: 'Queue & Waitlist', subtitle: 'Active download clients and unreleased/missing media' };
      case 'calendar':
        return { title: 'Library Calendar', subtitle: 'Upcoming episodes, movie releases, and album drops for items in your library' };
      case 'external_calendar':
        return { title: 'External Calendar', subtitle: 'Forthcoming highly rated TV shows, movies, and music across the globe' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Manage *arr connection profiles and user accounts' };
      default:
        return { title: 'Arr House', subtitle: 'Ecosystem overview and control' };
    }
  };

  const { title, subtitle } = getTabTitle(tab);
  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    if (onRefreshData) onRefreshData();
  };

  const safeServicesStatus = Array.isArray(servicesStatus) ? servicesStatus : [];

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle navigation"
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <PirateShipIcon className="w-7 h-7 rounded-lg shrink-0 md:hidden shadow-sm shadow-cyan-950" withBadge />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {title}
            </h1>
            <p className="text-xs text-slate-400 truncate hidden md:block">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Service status indicator strip */}
        {safeServicesStatus.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
              Stack:
            </span>
            {safeServicesStatus.map((s) => {
              const isConnected = s.status === 'connected';
              return (
                <div 
                  key={s.id}
                  title={`${s.name}: ${s.status} ${s.version ? `(${s.version})` : ''}`}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors"
                >
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      isConnected 
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' 
                        : 'bg-slate-600'
                    }`} 
                  />
                  <span className="text-slate-300 text-[10px]">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Search Button */}
        <button
          id="header-search-btn"
          onClick={onOpenSearch}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden md:inline">Universal Search...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
            /
          </kbd>
        </button>

        {/* Refresh */}
        <button
          id="header-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh Stack Data"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
