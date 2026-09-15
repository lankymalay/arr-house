import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { FirstRunWizard } from './components/FirstRunWizard.js';
import { LoginView } from './components/LoginView.js';
import { DashboardView } from './components/DashboardView.js';
import { LibrariesView } from './components/LibrariesView.js';
import { QueueWaitlistView } from './components/QueueWaitlistView.js';
import { SearchView } from './components/SearchView.js';
import { CalendarView } from './components/CalendarView.js';
import { ExternalCalendarView } from './components/ExternalCalendarView.js';
import { SettingsView } from './components/SettingsView.js';
import { ItemDetailModal } from './components/ItemDetailModal.js';
import { AddContentModal } from './components/AddContentModal.js';
import { PirateShipIcon } from './components/PirateShipIcon.js';
import type { MediaItem, QueueItem, CalendarEvent, ProwlarrIndexer, SearchResultItem, ServiceId } from './types.js';

const VALID_TABS: NavTab[] = [
  'dashboard',
  'libraries',
  'search',
  'queue',
  'calendar',
  'external_calendar',
  'settings'
];

function getTabFromUrl(): NavTab {
  if (typeof window === 'undefined') return 'dashboard';
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  if (VALID_TABS.includes(raw as NavTab)) {
    return raw as NavTab;
  }
  return 'dashboard';
}

function getQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return null;
  const params = new URLSearchParams(hash.substring(qIdx + 1));
  return params.get(key);
}

const MainLayout: React.FC = () => {
  const { user, needsSetup, initialized, loading: authLoading } = useAuth();
  const { info, error } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>(() => getTabFromUrl());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchPreset, setSearchPreset] = useState<{ query?: string; service?: 'all' | ServiceId } | null>(null);

  // App Stack Data
  const [overview, setOverview] = useState<any>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [indexers, setIndexers] = useState<ProwlarrIndexer[]>([]);
  const [calendarToken, setCalendarToken] = useState<string>('arr-hub-master-cal-token');
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);
  const [addItemData, setAddItemData] = useState<SearchResultItem | null>(null);

  // Unified tab navigation with browser history (PushState & PopState)
  const navigateToTab = useCallback((tab: NavTab, options?: { replace?: boolean; query?: string; service?: 'all' | ServiceId }) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);

    if (options?.query) {
      setSearchPreset({ query: options.query, service: options.service });
    }

    const searchPart = options?.query ? `?q=${encodeURIComponent(options.query)}` : '';
    const targetHash = `#/${tab}${searchPart}`;

    if (window.location.hash !== targetHash) {
      if (options?.replace) {
        window.history.replaceState({ tab }, '', targetHash);
      } else {
        window.history.pushState({ tab }, '', targetHash);
      }
    }
  }, []);

  // Handle Browser Back and Forward buttons seamlessly
  useEffect(() => {
    // Initial hash setup if missing
    if (!window.location.hash) {
      const initialTab = getTabFromUrl();
      window.history.replaceState({ tab: initialTab }, '', `#/${initialTab}`);
    }

    const handlePopState = (event: PopStateEvent) => {
      // If a modal was open when user hit Back, gracefully dismiss the modal
      if (selectedMediaItem) {
        setSelectedMediaItem(null);
        return;
      }
      if (addItemData) {
        setAddItemData(null);
        return;
      }

      // Read target tab from browser history state or URL hash
      const stateTab = event.state?.tab;
      const urlTab = getTabFromUrl();
      const targetTab = (stateTab && VALID_TABS.includes(stateTab)) ? stateTab : urlTab;

      setActiveTab(targetTab);
      setMobileMenuOpen(false);

      const q = getQueryParam('q');
      if (q && targetTab === 'search') {
        setSearchPreset({ query: q });
      }
    };

    const handleHashChange = () => {
      const urlTab = getTabFromUrl();
      setActiveTab(urlTab);
      const q = getQueryParam('q');
      if (q && urlTab === 'search') {
        setSearchPreset({ query: q });
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [selectedMediaItem, addItemData]);

  // Modal open helpers with history push
  const openMediaItemModal = useCallback((item: MediaItem) => {
    setSelectedMediaItem(item);
    window.history.pushState({ tab: activeTab, modal: 'item_detail', id: item.id }, '', window.location.hash);
  }, [activeTab]);

  const openAddModal = useCallback((item: SearchResultItem) => {
    setAddItemData(item);
    window.history.pushState({ tab: activeTab, modal: 'add_item', title: item.title }, '', window.location.hash);
  }, [activeTab]);

  // Safe JSON response parser
  const parseJsonSafe = async (res: Response) => {
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // Data fetching
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const token = localStorage.getItem('arr_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [ovRes, medRes, qRes, calRes, idxRes] = await Promise.all([
        fetch('/api/arr/overview', { headers }),
        fetch('/api/arr/library', { headers }),
        fetch('/api/arr/queue', { headers }),
        fetch('/api/arr/calendar', { headers }),
        fetch('/api/arr/indexers', { headers })
      ]);

      const [ovData, medData, qData, calData, idxData] = await Promise.all([
        parseJsonSafe(ovRes),
        parseJsonSafe(medRes),
        parseJsonSafe(qRes),
        parseJsonSafe(calRes),
        parseJsonSafe(idxRes)
      ]);

      if (ovData) setOverview(ovData);
      if (medData && Array.isArray(medData.items)) {
        setMediaItems(medData.items);
      }
      if (qData && Array.isArray(qData.queue)) {
        setQueue(qData.queue);
      }
      if (calData) {
        if (Array.isArray(calData.events)) setCalendarEvents(calData.events);
        if (calData.calendarToken) setCalendarToken(calData.calendarToken);
      }
      if (idxData && Array.isArray(idxData.indexers)) {
        setIndexers(idxData.indexers);
      }
    } catch (err: any) {
      console.error('Error fetching arr data', err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 45000);
      return () => clearInterval(interval);
    }
  }, [user, fetchAllData]);

  // Keyboard shortcut Ctrl+K or Cmd+K to jump to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigateToTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070a10] flex flex-col items-center justify-center p-4">
        <PirateShipIcon className="w-14 h-14 rounded-2xl shadow-2xl shadow-cyan-950/80 mb-4 animate-pulse" withBadge />
        <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Loading Arr House...</p>
      </div>
    );
  }

  // First Run Wizard
  if (needsSetup || initialized === false) {
    return <FirstRunWizard onCompleted={() => window.location.reload()} />;
  }

  // Not Logged In
  if (!user) {
    return <LoginView />;
  }

  // Filter waitlist items (monitored & missing or unreleased)
  const waitlistItems = mediaItems.filter(
    (item) => item.monitored && (item.status === 'missing' || item.status === 'unreleased')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        currentTab={activeTab}
        onTabChange={(tab) => navigateToTab(tab)}
        onSelectTab={(tab) => navigateToTab(tab)}
        queueCount={queue.length}
        waitlistCount={waitlistItems.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header Bar */}
        <Header
          activeTab={activeTab}
          currentTab={activeTab}
          queueCount={queue.length}
          onOpenSearch={() => navigateToTab('search')}
          onRefresh={fetchAllData}
          onRefreshData={fetchAllData}
          refreshing={refreshing}
          servicesStatus={overview?.servicesStatus || []}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Dynamic Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              overview={overview}
              queue={queue}
              calendar={calendarEvents}
              indexers={indexers}
              onNavigate={(tab) => navigateToTab(tab)}
              onOpenAddModal={() => navigateToTab('search')}
            />
          )}

          {activeTab === 'libraries' && (
            <LibrariesView
              items={mediaItems}
              onSelectItem={(item) => openMediaItemModal(item)}
              onNavigate={(tab) => navigateToTab(tab)}
            />
          )}

          {activeTab === 'queue' && (
            <QueueWaitlistView
              queue={queue}
              waitlist={waitlistItems}
              indexers={indexers}
              onRefresh={fetchAllData}
              onSelectItem={(item) => openMediaItemModal(item)}
            />
          )}

          {activeTab === 'search' && (
            <SearchView
              onAddedItem={() => fetchAllData()}
              onViewLibraryItem={(id) => {
                const found = mediaItems.find((m) => m.id === id);
                if (found) openMediaItemModal(found);
              }}
              initialQuery={searchPreset?.query || ''}
              initialService={searchPreset?.service || 'all'}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              events={calendarEvents}
              calendarToken={calendarToken}
            />
          )}

          {activeTab === 'external_calendar' && (
            <ExternalCalendarView
              onSearchItem={(query, mediaType) => {
                const service: 'all' | ServiceId = mediaType === 'tv' 
                  ? 'sonarr' 
                  : mediaType === 'movie' 
                    ? 'radarr' 
                    : mediaType === 'music' 
                      ? 'lidarr' 
                      : 'all';
                navigateToTab('search', { query, service });
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onRefreshStack={fetchAllData}
            />
          )}
        </main>
      </div>

      {/* Item Detail Inspector Modal */}
      {selectedMediaItem && (
        <ItemDetailModal
          item={selectedMediaItem}
          onClose={() => setSelectedMediaItem(null)}
          onRefreshItem={fetchAllData}
        />
      )}

      {/* Quick Add Modal */}
      {addItemData && (
        <AddContentModal
          item={addItemData}
          onClose={() => setAddItemData(null)}
          onAdded={() => fetchAllData()}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
