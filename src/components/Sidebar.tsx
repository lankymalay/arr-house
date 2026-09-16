import React from 'react';
import { 
  LayoutDashboard, 
  Film, 
  Search, 
  Calendar as CalendarIcon, 
  Sparkles, 
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
    { id: 'external_calendar', label: 'Forthcoming Releases', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none py-3">
      {/* Brand & Collapse Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 mb-2">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0">
                <PirateShipIcon className="w-9 h-9 rounded-2xl shadow-md shadow-black/50 ring-1 ring-[#3b455b]" withBadge />
              </div>
              <div className="truncate min-w-0">
                <span className="font-extrabold text-[15px] text-white tracking-tight block truncate font-sans">
                  {systemName}
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <PirateShipIcon className="w-9 h-9 rounded-2xl ring-1 ring-[#3b455b] shadow-md shadow-black/50" withBadge />
            </div>
          )}

          <button
            id="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-[#cbd5e1] hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors hidden md:flex items-center justify-center cursor-pointer pixel-pill"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Material 3 Pill Navigation List */}
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
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full font-semibold text-sm transition-all duration-200 relative cursor-pointer pixel-pill ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-950/40 border border-indigo-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left tracking-tight">
                    {item.label}
                  </span>
                )}
                {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                    isActive 
                      ? 'bg-white/20 text-white border-white/30' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#10141e]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile capsule card */}
      <div className="px-3 pt-2">
        <div className={`flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#151b29] border border-[#26334a] shadow-sm ${collapsed ? 'flex-col items-center justify-center gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-200 font-bold text-xs uppercase shrink-0 shadow-inner">
              {user?.username?.charAt(0) || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate tracking-tight">{user?.username || 'User'}</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {user?.role || 'Admin'}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="logout-btn"
              onClick={logout}
              title="Sign out"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer pixel-pill"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex h-screen sticky top-0 bg-[#10141e] border-r border-[#26334a] flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
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
          <div className="relative w-64 max-w-[80vw] h-full bg-[#10141e] border-r border-[#26334a] shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
