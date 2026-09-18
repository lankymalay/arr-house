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

  return (
    <header className="h-14 sm:h-16 border-b border-[#2d3c54] bg-[#121824]/95 backdrop-blur-xl px-3.5 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 select-none transition-colors">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle navigation"
            aria-label="Open navigation menu"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-[#2d3c54]/60 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl shrink-0 md:hidden flex items-center justify-center bg-gradient-to-br from-[#242e42] to-[#161c28] p-0.5 shadow-md shadow-black/40 ring-1 ring-white/20">
            <PirateShipIcon className="w-full h-full" withBadge />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate font-sans header-title">
              {title}
            </h1>
            <p className="text-xs text-slate-400 truncate hidden md:block header-subtitle">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
