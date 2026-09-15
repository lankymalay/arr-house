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
    { id: 'search', label: 'Search', icon: Search },
    { id: 'queue', label: 'Queue & Activity', icon: DownloadCloud, badge: queueCount },
    { id: 'calendar', label: 'Library Calendar', icon: CalendarIcon },
    { id: 'external_calendar', label: 'External Releases', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none py-3">
      {/* Brand & Collapse Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 mb-2">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative shrink-0">
                <PirateShipIcon className="w-9 h-9 rounded-2xl shadow-md shadow-black/40 ring-1 ring-white/10" withBadge />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#b4e3be] ring-2 ring-[#0c0e12]" />
              </div>
              <div className="truncate min-w-0">
                <span className="font-extrabold text-[15px] text-white tracking-tight block truncate font-sans">
                  {systemName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-2.5 bg-[#b4e3be] rounded-full animate-sonos-wave-1" />
                    <span className="w-0.5 h-3 bg-[#b4e3be] rounded-full animate-sonos-wave-2" />
                    <span className="w-0.5 h-2 bg-[#b4e3be] rounded-full animate-sonos-wave-3" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9aa0a6]">
                    Online
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto">
              <PirateShipIcon className="w-9 h-9 rounded-2xl ring-1 ring-white/10 shadow-md shadow-black/40" withBadge />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#b4e3be] ring-2 ring-[#0c0e12]" />
            </div>
          )}

          <button
            id="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-[#9aa0a6] hover:text-white p-2 rounded-full hover:bg-white/[0.06] transition-colors hidden md:flex items-center justify-center cursor-pointer pixel-pill"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Pixel Material 3 Pill Navigation List */}
        <nav className="px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full font-medium text-sm transition-all duration-200 relative cursor-pointer pixel-pill ${
                  isActive
                    ? 'bg-[#222734] text-white font-semibold shadow-sm border border-white/[0.12]'
                    : 'text-[#9aa0a6] hover:text-[#e3e6ed] hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#b4e3be]' : 'text-[#9aa0a6]'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left tracking-tight">
                    {item.label}
                  </span>
                )}
                {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#b4e3be]/15 text-[#b4e3be] border border-[#b4e3be]/30">
                    {item.badge}
                  </span>
                )}
                {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#b4e3be] ring-2 ring-[#0c0e12]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile capsule card */}
      <div className="px-3 pt-2">
        <div className={`flex items-center gap-3 p-2.5 rounded-2xl bg-[#14171f] border border-white/[0.07] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#222734] border border-white/10 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
            {user?.username?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate tracking-tight">{user?.username || 'User'}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#9aa0a6]">
                {user?.role || 'Admin'}
              </div>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign out"
            className="text-[#9aa0a6] hover:text-[#f28b82] p-1.5 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
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
        className={`hidden md:flex h-screen sticky top-0 bg-[#0c0e12] border-r border-white/[0.07] flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={onCloseMobile} 
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-[#0c0e12] border-r border-white/[0.08] shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
