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
        return { title: 'Dashboard', subtitle: 'Real-time overview of media ecosystem' };
      case 'libraries':
        return { title: 'Libraries', subtitle: 'Browse TV shows, movies, and music' };
      case 'search':
        return { title: 'Search', subtitle: 'Universal search across indexers and services' };
      case 'queue':
        return { title: 'Queue & Activity', subtitle: 'Active downloads and pending media' };
      case 'calendar':
        return { title: 'Library Calendar', subtitle: 'Upcoming releases for tracked media' };
      case 'external_calendar':
        return { title: 'External Releases', subtitle: 'Global forthcoming TV, movies, and albums' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Manage connection profiles and accounts' };
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
    <header className="h-16 border-b border-white/[0.07] bg-[#0c0e12]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle navigation"
            className="md:hidden p-2 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 min-w-0">
          <PirateShipIcon className="w-7 h-7 rounded-xl shrink-0 md:hidden shadow-sm" withBadge />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate font-sans">
              {title}
            </h1>
            <p className="text-xs text-[#9aa0a6] truncate hidden md:block">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Service status indicator strip - Pixel capsule style */}
        {safeServicesStatus.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14171f] border border-white/[0.08]">
            <span className="text-[10px] uppercase font-bold text-[#9aa0a6] tracking-wider mr-1">
              Stack:
            </span>
            {safeServicesStatus.map((s) => {
              const isConnected = s.status === 'connected';
              return (
                <div 
                  key={s.id}
                  title={`${s.name}: ${s.status} ${s.version ? `(${s.version})` : ''}`}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1a1e28] text-[11px] font-medium"
                >
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected 
                        ? 'bg-[#b4e3be] shadow-[0_0_6px_rgba(180,227,190,0.5)]' 
                        : 'bg-[#5f6368]'
                    }`} 
                  />
                  <span className="text-[#e3e6ed] text-[10px] font-semibold">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pixel Pill Search Button */}
        <button
          id="header-search-btn"
          onClick={onOpenSearch}
          className="p-2 sm:px-4 sm:py-2 rounded-full bg-[#14171f] hover:bg-[#1a1e28] text-[#9aa0a6] hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer pixel-pill"
        >
          <Search className="w-3.5 h-3.5 text-[#9aa0a6]" />
          <span className="hidden md:inline text-xs font-medium">Search media...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-[#9aa0a6] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Refresh button - Sonos hardware style */}
        <button
          id="header-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh Stack Data"
          className="p-2 rounded-full bg-[#14171f] hover:bg-[#1a1e28] text-[#9aa0a6] hover:text-white border border-white/[0.08] transition-colors cursor-pointer pixel-pill"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#b4e3be]' : ''}`} />
        </button>
      </div>
    </header>
  );
};
