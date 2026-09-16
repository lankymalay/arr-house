import React from 'react';
import { Menu } from 'lucide-react';
import type { NavTab } from './Sidebar.js';
import { PirateShipIcon } from './PirateShipIcon.js';
import { ThemeToggleSwitch } from './ThemeToggleSwitch.js';

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
    <header className="h-16 border-b border-[#26334a] bg-[#10141e]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none transition-colors">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle navigation"
            className="md:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer pixel-pill"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 min-w-0">
          <PirateShipIcon className="w-8 h-8 rounded-2xl shrink-0 md:hidden shadow-md shadow-indigo-950/40" withBadge />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate font-sans">
              {title}
            </h1>
            <p className="text-xs text-slate-400 truncate hidden md:block">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Sliding Theme Toggle Switch */}
        <ThemeToggleSwitch id="header-theme-toggle" size="md" />

        {/* Service status indicator strip */}
        {safeServicesStatus.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151b29] border border-[#26334a] shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1 hidden sm:inline">
              Stack:
            </span>
            {safeServicesStatus.map((s) => {
              const isConnected = s.status === 'connected';
              return (
                <div 
                  key={s.id}
                  title={`${s.name}: ${s.status} ${s.version ? `(${s.version})` : ''}`}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1c2436] border border-[#2b3952] text-[11px] font-medium"
                >
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected 
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' 
                        : 'bg-rose-500'
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
