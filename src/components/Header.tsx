import React from 'react';
import { Menu, Search } from 'lucide-react';
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
  onOpenSearch,
  onToggleMobileMenu
}) => {
  const tab: NavTab = currentTab || activeTab || 'libraries';

  const getTabTitle = (t: NavTab) => {
    switch (t) {
      case 'libraries':
        return { title: 'Libraries', subtitle: 'Browse TV shows, movies, and music' };
      case 'search':
        return { title: 'Search', subtitle: 'Universal search across indexers and services' };
      case 'queue':
        return { title: 'Queue & Activity', subtitle: 'Active downloads and pending media' };
      case 'calendar':
        return { title: 'Library Calendar', subtitle: 'Upcoming releases for tracked media' };
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
          <div className="shrink-0 md:hidden">
            <PirateShipIcon className="w-9 h-9 rounded-2xl shadow-md shadow-black/50 ring-1 ring-[#2d3c54]" withBadge />
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

      {/* Right side: Search shortcut & status indicators */}
      <div className="hidden md:flex items-center gap-3">
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer"
            title="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-medium">Search</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-slate-400">⌘K</kbd>
          </button>
        )}
      </div>
    </header>
  );
};
