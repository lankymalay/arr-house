import React from 'react';
import { 
  LayoutDashboard, 
  Film, 
  Search, 
  Calendar as CalendarIcon, 
  Globe,
  DownloadCloud, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { PirateShipIcon } from './PirateShipIcon';

export type NavTab = 'dashboard' | 'libraries' | 'search' | 'queue' | 'calendar' | 'external_calendar' | 'settings';

interface SidebarProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onTabChange?: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  queueCount?: number;
  waitlistCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  queueCount = 0,
  waitlistCount = 0,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { user, logout, systemName } = useAuth();
  const selectedTab: NavTab = currentTab || activeTab || 'dashboard';

  const handleSelectTab = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onTabChange) onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'libraries', label: 'Libraries', icon: Film },
    { id: 'search', label: 'Universal Search', icon: Search },
    { id: 'queue', label: 'Queue & Waitlist', icon: DownloadCloud, badge: queueCount },
    { id: 'calendar', label: 'Library Calendar', icon: CalendarIcon },
    { id: 'external_calendar', label: 'External Calendar', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none">
      {/* Brand & Collapse Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <PirateShipIcon className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-900/30 shrink-0" withBadge />
              <div className="truncate">
                <span className="font-bold text-sm text-white tracking-tight block truncate">
                  {systemName}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          ) : (
            <PirateShipIcon className="w-8 h-8 mx-auto rounded-lg shadow-lg shadow-cyan-900/30" withBadge />
          )}

          <button
            id="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors hidden md:block cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-sm border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
                {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-800/80">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
            {user?.username?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.username || 'User'}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                {user?.role || 'Admin'}
              </div>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign out"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex h-screen sticky top-0 bg-[#090d16] border-r border-slate-800/80 flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile} 
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-[#090d16] border-r border-slate-800 shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
