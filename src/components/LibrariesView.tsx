import React, { useState, useMemo, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Settings, 
  PlusCircle,
  Calendar as CalendarIcon,
  Download,
  Copy,
  ExternalLink,
  X,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  Disc3
} from 'lucide-react';
import type { MediaItem, ServiceId } from '../types.js';
import { getContentTypeLabel } from '../types.js';
import type { NavTab } from './Sidebar.js';
import { MediaPoster } from './MediaPoster.js';
import { RatingBadge } from './RatingBadge.js';
import { prefetchImage } from '../utils/prefetch.js';
import { useToast } from '../context/ToastContext.js';
import { SkeletonCard } from './SkeletonCard.js';

interface LibrariesViewProps {
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  onNavigate?: (tab: NavTab) => void;
  calendarToken?: string;
  onOpenCalendarView?: (mode: 'month' | 'agenda') => void;
}

export const LibrariesView: React.FC<LibrariesViewProps> = ({ 
  items, 
  onSelectItem, 
  onNavigate,
  calendarToken = '',
  onOpenCalendarView
}) => {
  const { success } = useToast();
  const [selectedService, setSelectedService] = useState<ServiceId>('radarr');
  const [statusFilter, setStatusFilter] = useState<'all' | 'downloaded' | 'missing' | 'monitored' | 'unmonitored'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'size'>('title');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Pagination: Cap library items at 30, with "Load More" for subsequent 30 items
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset page window to first 30 items whenever search query, filters, or sorting changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedService, statusFilter, searchQuery, sortBy]);

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const effectiveToken = calendarToken || 'arr_house_token';
  const feedUrl = `${protocol}//${host}/api/calendar/ical?token=${effectiveToken}`;
  const webcalUrl = `webcal://${host}/api/calendar/ical?token=${effectiveToken}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success('Copied URL', `${label} link copied to clipboard`);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const isMatch = item.service === selectedService || 
        (selectedService === 'radarr' && item.mediaType === 'movie') ||
        (selectedService === 'sonarr' && item.mediaType === 'tv') ||
        (selectedService === 'lidarr' && item.mediaType === 'music');
      if (!isMatch) return false;
      if (statusFilter === 'downloaded' && item.status !== 'downloaded') return false;
      if (statusFilter === 'missing' && item.status !== 'missing') return false;
      if (statusFilter === 'monitored' && !item.monitored) return false;
      if (statusFilter === 'unmonitored' && item.monitored) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchArtist = item.artist?.toLowerCase().includes(q);
        const matchAuthor = item.author?.toLowerCase().includes(q);
        const matchOverview = item.overview?.toLowerCase().includes(q);
        const matchGenre = item.genres?.some(g => g.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchAuthor && !matchOverview && !matchGenre) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'year') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      return a.title.localeCompare(b.title);
    });
  }, [items, selectedService, statusFilter, searchQuery, sortBy]);

  const serviceCounts = useMemo(() => {
    return {
      radarr: items.filter(i => i.service === 'radarr' || i.mediaType === 'movie').length,
      sonarr: items.filter(i => i.service === 'sonarr' || i.mediaType === 'tv').length,
      lidarr: items.filter(i => i.service === 'lidarr' || i.mediaType === 'music').length,
    };
  }, [items]);

  const statusCounts = useMemo(() => {
    const scope = items.filter(i => i.service === selectedService || 
      (selectedService === 'radarr' && i.mediaType === 'movie') ||
      (selectedService === 'sonarr' && i.mediaType === 'tv') ||
      (selectedService === 'lidarr' && i.mediaType === 'music')
    );
    return {
      all: scope.length,
      downloaded: scope.filter(i => i.status === 'downloaded').length,
      missing: scope.filter(i => i.status === 'missing').length,
      monitored: scope.filter(i => !!i.monitored).length,
      unmonitored: scope.filter(i => !i.monitored).length,
    };
  }, [items, selectedService]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const hasMore = visibleCount < filteredItems.length;
  const remainingCount = Math.max(0, filteredItems.length - visibleCount);
  const nextBatchSize = Math.min(PAGE_SIZE, remainingCount);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Main Content Control Bar: Media Types, Calendar View Actions, Search & Filters */}
      <div className="bg-[#14171f] border border-white/[0.08] p-3 sm:p-4 rounded-2xl space-y-3.5 shadow-sm">
        {/* Top Control Tier: Media Categories + Calendar Tools (Sync iCal Feed, Month Grid, Schedule) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Media Type Tabs: Movies, TV Shows, Music (in that order) */}
          <div className="flex flex-wrap items-center bg-[#1a1e28] p-1 rounded-2xl sm:rounded-full border border-white/[0.08] gap-1 w-full sm:w-auto">
            {/* 1. Movies */}
            <button
              id="lib-tab-radarr"
              onClick={() => setSelectedService('radarr')}
              className={`flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
                selectedService === 'radarr'
                  ? 'bg-[#e0d0b8] text-[#3e2723] shadow-sm font-bold'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedService === 'radarr' ? 'bg-[#3e2723]/20 text-[#3e2723]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                {serviceCounts.radarr}
              </span>
            </button>

            {/* 2. TV Shows */}
            <button
              id="lib-tab-sonarr"
              onClick={() => setSelectedService('sonarr')}
              className={`flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
                selectedService === 'sonarr'
                  ? 'bg-[#a8c7fa] text-[#041e49] shadow-sm font-bold'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Shows</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedService === 'sonarr' ? 'bg-[#041e49]/20 text-[#041e49]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                {serviceCounts.sonarr}
              </span>
            </button>

            {/* 3. Music */}
            <button
              id="lib-tab-lidarr"
              onClick={() => setSelectedService('lidarr')}
              className={`flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
                selectedService === 'lidarr'
                  ? 'bg-[#b4e3be] text-[#072711] shadow-sm font-bold'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Music</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedService === 'lidarr' ? 'bg-[#072711]/20 text-[#072711]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                {serviceCounts.lidarr}
              </span>
            </button>
          </div>

          {/* Quick Calendar Tools: Month Grid, Schedule & Sync iCal Feed */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher capsule: Month Grid & Schedule */}
            <div className="flex items-center bg-[#1a1e28] p-1 rounded-full border border-white/[0.08]">
              <button
                id="lib-view-month-grid"
                onClick={() => {
                  if (onOpenCalendarView) onOpenCalendarView('month');
                  else if (onNavigate) onNavigate('calendar');
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-all pixel-pill flex items-center gap-1.5 cursor-pointer"
                title="View in Library Calendar Month Grid"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Month Grid</span>
              </button>
              <button
                id="lib-view-schedule"
                onClick={() => {
                  if (onOpenCalendarView) onOpenCalendarView('agenda');
                  else if (onNavigate) onNavigate('calendar');
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-all pixel-pill flex items-center gap-1.5 cursor-pointer"
                title="View in Library Calendar Schedule / Agenda"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Schedule</span>
              </button>
            </div>

            {/* Sync iCal Feed Button */}
            <button
              id="lib-sync-ical-btn"
              onClick={() => setShowSubscribeModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#1a1e28] hover:bg-[#222734] text-white border border-white/[0.08] hover:border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer pixel-pill shrink-0"
              title="Subscribe to Library iCal Calendar Feed"
            >
              <Download className="w-3.5 h-3.5 text-[#b4e3be]" />
              <span>Sync iCal Feed</span>
            </button>
          </div>
        </div>

        {/* Bottom Tier: Search Bar, Status Filter Capsule & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-white/[0.06]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#9aa0a6] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="lib-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, artists, authors, genres..."
              className="w-full pl-11 pr-4 py-2 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status selector capsule */}
            <div className="flex flex-wrap items-center gap-1 bg-[#1a1e28] p-1 rounded-2xl sm:rounded-full border border-white/[0.08] w-full sm:w-auto">
              <button
                id="lib-status-all"
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill flex items-center justify-center gap-1.5 ${
                  statusFilter === 'all' ? 'bg-white text-black font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <span>All Status</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-black/15 text-black' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                  {statusCounts.all}
                </span>
              </button>
              <button
                id="lib-status-downloaded"
                onClick={() => setStatusFilter('downloaded')}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill flex items-center justify-center gap-1.5 ${
                  statusFilter === 'downloaded' ? 'bg-[#b4e3be] text-[#072711] font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <span>Downloaded</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'downloaded' ? 'bg-black/15 text-[#072711]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                  {statusCounts.downloaded}
                </span>
              </button>
              <button
                id="lib-status-missing"
                onClick={() => setStatusFilter('missing')}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill flex items-center justify-center gap-1.5 ${
                  statusFilter === 'missing' ? 'bg-[#f28b82] text-[#49110d] font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <span>Missing</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'missing' ? 'bg-black/15 text-[#49110d]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                  {statusCounts.missing}
                </span>
              </button>
              <button
                id="lib-status-monitored"
                onClick={() => setStatusFilter('monitored')}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill flex items-center justify-center gap-1.5 ${
                  statusFilter === 'monitored' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                <span>Monitored</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'monitored' ? 'bg-emerald-950 text-emerald-300' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                  {statusCounts.monitored}
                </span>
              </button>
              <button
                id="lib-status-unmonitored"
                onClick={() => setStatusFilter('unmonitored')}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill flex items-center justify-center gap-1.5 ${
                  statusFilter === 'unmonitored' ? 'bg-white/15 text-white border border-white/20 font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <Bookmark className="w-3 h-3 text-slate-400" />
                <span>Unmonitored</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'unmonitored' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
                  {statusCounts.unmonitored}
                </span>
              </button>
            </div>

            {/* Sort selector */}
            <select
              id="lib-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-[#e3e6ed] px-3.5 py-2 focus:outline-none focus:border-white/30 cursor-pointer font-medium"
            >
              <option value="title">Sort by Title</option>
              <option value="year">Sort by Release Year</option>
              <option value="size">Sort by File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <div className="py-20 px-4 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/50 max-w-2xl mx-auto">
          <Film className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Your library is empty</h3>
          <p className="text-sm text-[#9aa0a6] max-w-md mx-auto leading-relaxed">
            Start by searching for content or configuring your services
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onNavigate && (
              <button
                id="empty-lib-search-btn"
                onClick={() => onNavigate('search')}
                className="px-5 py-2.5 bg-[#1a1e28] hover:bg-[#222734] text-white text-xs font-bold rounded-full border border-white/10 transition-colors flex items-center gap-2 cursor-pointer pixel-pill"
              >
                <Search className="w-4 h-4 text-white" />
                <span>Search for Content</span>
              </button>
            )}
            {onNavigate && (
              <button
                id="empty-lib-settings-btn"
                onClick={() => onNavigate('settings')}
                className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full shadow-md hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer pixel-pill"
              >
                <Settings className="w-4 h-4 text-black" />
                <span>Configure Services</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
          <Film className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#9aa0a6]">No media found matching your filter.</p>
          <button
            onClick={() => { setSelectedService('radarr'); setStatusFilter('all'); setSearchQuery(''); }}
            className="mt-3 text-xs text-[#a8c7fa] hover:underline font-semibold cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          {/* Library count & page indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span>
                Showing <span className="font-mono font-bold text-white">{visibleItems.length}</span> of <span className="font-mono font-bold text-white">{filteredItems.length}</span> titles
                {` in ${selectedService === 'radarr' ? 'Movies' : selectedService === 'sonarr' ? 'TV Shows' : 'Music'}`}
              </span>
            </div>
            {hasMore ? (
              <span className="text-[11px] text-slate-500 font-mono">
                {remainingCount} more in library
              </span>
            ) : filteredItems.length > PAGE_SIZE ? (
              <span className="text-[11px] text-emerald-400 font-mono">
                All titles loaded
              </span>
            ) : null}
          </div>

          {/* Skeleton loading state */}
          {items.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 mb-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Media Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
            {visibleItems.map((item, index) => {
              const isDownloaded = item.status === 'downloaded';
              const isMissing = item.status === 'missing';
              const isDownloading = item.status === 'downloading';

              const serviceBadgeClass = 
                item.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
                item.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
                'bg-[#b4e3be] text-[#072711]';

              return (
                <div
                  key={`${item.service}-${item.id}`}
                  id={`media-card-${item.id}`}
                  onClick={() => onSelectItem(item)}
                  onMouseEnter={() => {
                    if (item.posterUrl) prefetchImage(item.posterUrl);
                  }}
                  className="group relative bg-[#14171f] border border-white/[0.07] hover:border-white/[0.18] rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col"
                >
                  {/* Poster / Thumbnail with service pill */}
                  <div className="aspect-[2/3] w-full bg-[#0c0e12] relative overflow-hidden flex items-center justify-center">
                    <MediaPoster
                      src={item.posterUrl}
                      alt={item.title}
                      title={item.title}
                      artistOrAuthor={item.artist || item.author}
                      year={item.year}
                      mediaType={item.mediaType}
                      service={item.service}
                      aspectRatio="poster"
                      priority={index < 12}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e12]/95 via-transparent to-black/30 pointer-events-none z-10" />

                    {/* Content Badge Top Left - Subtle Minimalist Capsule */}
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md ${serviceBadgeClass}`}>
                        {getContentTypeLabel(item.service, item.mediaType)}
                      </span>
                    </div>

                    {/* Status Badge Top Right */}
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                      {/* Monitored status capsule */}
                      {item.monitored ? (
                        <span 
                          className="px-1.5 py-0.5 rounded-full bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold flex items-center gap-1 shadow backdrop-blur-xs" 
                          title="Monitored in library"
                        >
                          <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                          <span className="hidden sm:inline">Monitored</span>
                        </span>
                      ) : (
                        <span 
                          className="px-1.5 py-0.5 rounded-full bg-black/75 border border-white/20 text-slate-400 text-[9px] font-medium flex items-center gap-1 shadow backdrop-blur-xs" 
                          title="Unmonitored"
                        >
                          <Bookmark className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">Unmonitored</span>
                        </span>
                      )}

                      {/* Downloaded / Incomplete / Missing status badge */}
                      {isDownloaded && (
                        <span className="w-5 h-5 rounded-full bg-[#b4e3be] text-[#072711] flex items-center justify-center shadow" title="Downloaded (Complete)">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      )}
                      {isDownloading && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shadow" title="Downloading / Incomplete">
                          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      )}
                      {isMissing && (
                        <span className="w-5 h-5 rounded-full bg-[#f28b82] text-[#49110d] flex items-center justify-center shadow" title="Missing Files">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      )}
                    </div>

                    {/* Bottom overlay: Year & Rating Badge */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 z-20">
                      {item.mediaType !== 'music' && item.service !== 'lidarr' && item.year ? (
                        <span className="text-[11px] text-white font-semibold z-20 font-mono drop-shadow-md bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {item.year}
                        </span>
                      ) : <span />}
                      {item.rating ? (
                        <RatingBadge rating={item.rating} source={item.ratingSource} variant="thumbnail" />
                      ) : null}
                    </div>
                  </div>

                  {/* Details Footer */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-[#14171f]">
                    <div>
                      <div className="flex items-center gap-1.5 justify-between">
                        <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors tracking-tight leading-snug flex-1" title={item.title}>
                          {item.title}
                        </h4>
                        {item.rating ? (
                          <RatingBadge rating={item.rating} source={item.ratingSource} variant="inline" />
                        ) : null}
                      </div>
                      {(item.artist || item.author) && (
                        <p className="text-xs font-medium text-[#9aa0a6] line-clamp-1 mt-0.5">
                          {item.artist || item.author}
                        </p>
                      )}
                    </div>

                    {item.mediaType === 'music' || item.service === 'lidarr' ? (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-300 flex items-center gap-1">
                            <Disc3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              {item.trackFileCount !== undefined ? `${item.trackFileCount}/${item.trackCount || 0} Trk` : 
                               item.albumCount !== undefined ? `${item.albumCount} Alb` : 
                               item.sizeBytes ? formatBytes(item.sizeBytes) : 'Music'}
                            </span>
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'downloaded' ? 'text-emerald-400' :
                            item.status === 'downloading' ? 'text-amber-400' :
                            !item.monitored ? 'text-slate-400' : 'text-rose-400'
                          }`}>
                            {item.status === 'downloaded' ? 'Downloaded' :
                             item.status === 'downloading' ? 'Incomplete' :
                             !item.monitored ? 'Unmonitored' : 'Missing'}
                          </span>
                        </div>

                        {/* Track download progress bar if trackCount is known */}
                        {item.trackCount && item.trackCount > 0 ? (
                          <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden" title={`${item.trackFileCount || 0}/${item.trackCount} Tracks downloaded`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                item.status === 'downloaded' ? 'bg-emerald-400' :
                                (item.trackFileCount || 0) > 0 ? 'bg-amber-400' : 'bg-rose-500/40'
                              }`}
                              style={{ width: `${Math.min(100, Math.round(((item.trackFileCount || 0) / item.trackCount) * 100))}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9aa0a6] font-mono">
                        <span className="text-slate-300">
                          {item.episodeFileCount !== undefined ? `${item.episodeFileCount}/${item.episodeCount} Ep` :
                           item.sizeBytes ? formatBytes(item.sizeBytes) : (item.monitored ? 'Monitored' : 'Unmonitored')}
                        </span>
                        <span className="capitalize text-slate-400 font-sans text-[10px] font-medium">{item.status}</span>
                      </div>
                    )}
                  </div>
                  {/* Hover overlay with title */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 pointer-events-none rounded-2xl">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
                    {item.year && <p className="text-[10px] text-slate-300 mt-0.5">{item.year}</p>}
                    <p className="text-[10px] text-indigo-300 mt-1 font-medium">View Details →</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination Controls */}
          {hasMore ? (
            <div className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="lib-load-more-btn"
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-full shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer pixel-pill active:scale-[0.98]"
              >
                <ChevronDown className="w-4 h-4" />
                <span>Load Next {nextBatchSize} Titles ({remainingCount} Remaining)</span>
              </button>
              <button
                id="lib-load-all-btn"
                type="button"
                onClick={() => setVisibleCount(filteredItems.length)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#1a1e28] hover:bg-[#222734] text-slate-300 hover:text-white font-semibold text-xs rounded-full border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer pixel-pill"
              >
                Load All ({filteredItems.length})
              </button>
            </div>
          ) : filteredItems.length > PAGE_SIZE ? (
            <div className="pt-2 pb-6 text-center text-xs text-slate-500 font-medium font-mono">
              All {filteredItems.length} library titles loaded
            </div>
          ) : null}
        </>
      )}

      {/* Subscribe to iCal Feed Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#14171f] border border-white/[0.08] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowSubscribeModal(false)}
              className="absolute top-5 right-5 text-[#9aa0a6] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Download className="w-5 h-5 text-[#b4e3be]" />
                Subscribe to Library Calendar
              </h3>
              <p className="text-xs text-[#9aa0a6] mt-1">
                Sync live episode air dates, movie premieres, and album drops to your phone, Google Calendar, or desktop client.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] block mb-1.5">
                  WebCal Quick Subscribe (Apple / Outlook)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webcalUrl}
                    className="w-full bg-[#1a1e28] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-[#e3e6ed] font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(webcalUrl, 'WebCal')}
                    className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer pixel-pill"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] block mb-1.5">
                  Standard iCal Feed URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="w-full bg-[#1a1e28] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-[#e3e6ed] font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(feedUrl, 'iCal')}
                    className="px-4 py-2.5 bg-[#1a1e28] hover:bg-[#222734] border border-white/10 rounded-full text-xs text-white font-bold shrink-0 transition-colors cursor-pointer pixel-pill"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full cursor-pointer pixel-pill"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
