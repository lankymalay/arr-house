import React from 'react';
import { Menu } from 'lucide-react';
import type { NavTab } from './Sidebar.js';
import { PirateShipIcon } from './PirateShipIcon.js';

interface HeaderProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  onOpenSearch?: () => void;
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
        return { title: 'Forthcoming Releases', subtitle: 'Top TV shows, movies, and music arriving in the next three months' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Manage connection profiles and accounts' };
      default:
        return { title: 'Arr House', subtitle: 'Ecosystem overview and control' };
    }
  };

  const { title, subtitle } = getTabTitle(tab);
  const safeServicesStatus = Array.isArray(servicesStatus) ? servicesStatus : [];

  return (
    <header className="h-16 border-b border-[#2d3548] bg-[#131722]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle navigation"
            className="md:hidden p-2 rounded-full text-[#cbd5e1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer pixel-pill"
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
            <p className="text-xs text-[#cbd5e1] truncate hidden md:block">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Service status indicator strip - Material capsule style */}
        {safeServicesStatus.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1d2331] border border-[#364056]">
            <span className="text-[10px] uppercase font-bold text-[#cbd5e1] tracking-wider mr-1">
              Stack:
            </span>
            {safeServicesStatus.map((s) => {
              const isConnected = s.status === 'connected';
              return (
                <div 
                  key={s.id}
                  title={`${s.name}: ${s.status} ${s.version ? `(${s.version})` : ''}`}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#252c3e] border border-[#3b455b] text-[11px] font-medium"
                >
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected 
                        ? 'bg-[#69f0ae] shadow-[0_0_8px_rgba(105,240,174,0.6)]' 
                        : 'bg-[#ff8a80]'
                    }`} 
                  />
                  <span className="text-white text-[10px] font-bold">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
