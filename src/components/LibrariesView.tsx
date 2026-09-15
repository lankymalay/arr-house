import React, { useState, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  ArrowUpDown,
  SlidersHorizontal,
  Bookmark,
  Settings,
  PlusCircle
} from 'lucide-react';
import type { MediaItem, ServiceId, MediaType } from '../types.js';
import type { NavTab } from './Sidebar.js';

interface LibrariesViewProps {
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  onNavigate?: (tab: NavTab) => void;
}

export const LibrariesView: React.FC<LibrariesViewProps> = ({ items, onSelectItem, onNavigate }) => {
  const [selectedService, setSelectedService] = useState<'all' | ServiceId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'downloaded' | 'missing' | 'unreleased'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'size'>('title');

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedService !== 'all' && item.service !== selectedService) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
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
      all: items.length,
      sonarr: items.filter(i => i.service === 'sonarr').length,
      radarr: items.filter(i => i.service === 'radarr').length,
      lidarr: items.filter(i => i.service === 'lidarr').length,
    };
  }, [items]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Media Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          id="lib-tab-all"
          onClick={() => setSelectedService('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            selectedService === 'all'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>All Media</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {serviceCounts.all}
          </span>
        </button>

        <button
          id="lib-tab-sonarr"
          onClick={() => setSelectedService('sonarr')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            selectedService === 'sonarr'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-sky-400" />
          <span>TV Shows (Sonarr)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {serviceCounts.sonarr}
          </span>
        </button>

        <button
          id="lib-tab-radarr"
          onClick={() => setSelectedService('radarr')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            selectedService === 'radarr'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span>Movies (Radarr)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {serviceCounts.radarr}
          </span>
        </button>

        <button
          id="lib-tab-lidarr"
          onClick={() => setSelectedService('lidarr')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            selectedService === 'lidarr'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Music className="w-3.5 h-3.5 text-emerald-400" />
          <span>Music (Lidarr)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {serviceCounts.lidarr}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="lib-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, artists, authors, genres..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('downloaded')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === 'downloaded' ? 'bg-emerald-900/40 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Downloaded
            </button>
            <button
              onClick={() => setStatusFilter('missing')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === 'missing' ? 'bg-amber-900/40 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Missing
            </button>
          </div>

          {/* Sort selector */}
          <select
            id="lib-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="title">Sort by Title</option>
            <option value="year">Sort by Release Year</option>
            <option value="size">Sort by File Size</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <div className="py-20 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">No Content Found in Library</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Your media library is currently empty. Configure your stack services in Settings to automatically sync and display your media, or search to add your first title.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onNavigate && (
              <button
                id="empty-lib-settings-btn"
                onClick={() => onNavigate('settings')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Services in Settings</span>
              </button>
            )}
            {onNavigate && (
              <button
                id="empty-lib-search-btn"
                onClick={() => onNavigate('search')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Search & Add Media</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No media found matching your filter.</p>
          <button
            onClick={() => { setSelectedService('all'); setStatusFilter('all'); setSearchQuery(''); }}
            className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => {
            const isDownloaded = item.status === 'downloaded';
            const isMissing = item.status === 'missing';
            const isDownloading = item.status === 'downloading';

            return (
              <div
                key={`${item.service}-${item.id}`}
                id={`media-card-${item.id}`}
                onClick={() => onSelectItem(item)}
                className="group bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/20 cursor-pointer flex flex-col"
              >
                {/* Poster / Thumbnail with service pill */}
                <div className="aspect-[2/3] w-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-slate-600">
                    <Film className="w-8 h-8 mb-1 opacity-40" />
                    <span className="text-[10px] line-clamp-2">{item.title}</span>
                  </div>
                  {item.posterUrl && (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none z-10" />

                  {/* Service Badge Top Left */}
                  <div className="absolute top-2 left-2 z-20">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-cyan-300 shadow">
                      {item.service}
                    </span>
                  </div>

                  {/* Status Badge Top Right */}
                  <div className="absolute top-2 right-2 z-20">
                    {isDownloaded && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow" title="Downloaded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isMissing && (
                      <span className="w-5 h-5 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow" title="Missing File">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isDownloading && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow animate-pulse" title="Downloading">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Quality & Year Bottom overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-slate-300 font-medium z-20">
                    <span>{item.year || 'Unknown'}</span>
                    {item.qualityProfile && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-cyan-300 truncate max-w-[100px]">
                        {item.qualityProfile}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h4>
                    {(item.artist || item.author) && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.artist || item.author}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {item.episodeFileCount !== undefined ? `${item.episodeFileCount}/${item.episodeCount} Ep` :
                       item.sizeBytes ? formatBytes(item.sizeBytes) : 'Monitored'}
                    </span>
                    <span className="capitalize">{item.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
