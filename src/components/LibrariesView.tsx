import React, { useState, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Settings, 
  PlusCircle
} from 'lucide-react';
import type { MediaItem, ServiceId } from '../types.js';
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
      {/* Media Type Tabs - Pixel M3 Segmented Capsule Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex p-1.5 rounded-full bg-[#14171f] border border-white/[0.08] gap-1">
          <button
            id="lib-tab-all"
            onClick={() => setSelectedService('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer pixel-pill ${
              selectedService === 'all'
                ? 'bg-white text-[#0c0e12] shadow-sm font-bold'
                : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>All Media</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedService === 'all' ? 'bg-black/15 text-black' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
              {serviceCounts.all}
            </span>
          </button>

          <button
            id="lib-tab-sonarr"
            onClick={() => setSelectedService('sonarr')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer pixel-pill ${
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

          <button
            id="lib-tab-radarr"
            onClick={() => setSelectedService('radarr')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer pixel-pill ${
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

          <button
            id="lib-tab-lidarr"
            onClick={() => setSelectedService('lidarr')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer pixel-pill ${
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
      </div>

      {/* Filter and Search Bar - Pixel Capsule Style */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14171f] border border-white/[0.07] p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#9aa0a6] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="lib-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, artists, authors, genres..."
            className="w-full pl-11 pr-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector capsule */}
          <div className="flex items-center gap-1 bg-[#1a1e28] p-1 rounded-full border border-white/[0.08]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill ${
                statusFilter === 'all' ? 'bg-white text-black font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('downloaded')}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill ${
                statusFilter === 'downloaded' ? 'bg-[#b4e3be] text-[#072711] font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              Downloaded
            </button>
            <button
              onClick={() => setStatusFilter('missing')}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all pixel-pill ${
                statusFilter === 'missing' ? 'bg-[#f28b82] text-[#49110d] font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
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
            className="bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-[#e3e6ed] px-4 py-2 focus:outline-none focus:border-white/30 cursor-pointer font-medium"
          >
            <option value="title">Sort by Title</option>
            <option value="year">Sort by Release Year</option>
            <option value="size">Sort by File Size</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <div className="py-20 px-4 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/50 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-white/[0.06] text-white flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Library Empty</h3>
          <p className="text-xs text-[#9aa0a6] max-w-md mx-auto leading-relaxed">
            Configure your stack services in Settings to automatically sync and display your media, or search to add your first title.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onNavigate && (
              <button
                id="empty-lib-settings-btn"
                onClick={() => onNavigate('settings')}
                className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full shadow-md hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer pixel-pill"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Services in Settings</span>
              </button>
            )}
            {onNavigate && (
              <button
                id="empty-lib-search-btn"
                onClick={() => onNavigate('search')}
                className="px-5 py-2.5 bg-[#1a1e28] hover:bg-[#222734] text-white text-xs font-bold rounded-full border border-white/10 transition-colors flex items-center gap-2 cursor-pointer pixel-pill"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#b4e3be]" />
                <span>Search & Add Media</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
          <Film className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#9aa0a6]">No media found matching your filter.</p>
          <button
            onClick={() => { setSelectedService('all'); setStatusFilter('all'); setSearchQuery(''); }}
            className="mt-3 text-xs text-[#a8c7fa] hover:underline font-semibold cursor-pointer"
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

            const serviceBadgeClass = 
              item.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
              item.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
              'bg-[#b4e3be] text-[#072711]';

            return (
              <div
                key={`${item.service}-${item.id}`}
                id={`media-card-${item.id}`}
                onClick={() => onSelectItem(item)}
                className="group bg-[#14171f] border border-white/[0.07] hover:border-white/[0.18] rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col"
              >
                {/* Poster / Thumbnail with service pill */}
                <div className="aspect-[2/3] w-full bg-[#0c0e12] relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-[#5f6368]">
                    <Film className="w-8 h-8 mb-1 opacity-30" />
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e12]/95 via-transparent to-black/30 pointer-events-none z-10" />

                  {/* Service Badge Top Left - Pixel Capsule */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow ${serviceBadgeClass}`}>
                      {item.service}
                    </span>
                  </div>

                  {/* Status Badge Top Right */}
                  <div className="absolute top-2.5 right-2.5 z-20">
                    {isDownloaded && (
                      <span className="w-5 h-5 rounded-full bg-[#b4e3be] text-[#072711] flex items-center justify-center shadow" title="Downloaded">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isMissing && (
                      <span className="w-5 h-5 rounded-full bg-[#f28b82] text-[#49110d] flex items-center justify-center shadow" title="Missing File">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isDownloading && (
                      <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow animate-pulse" title="Downloading">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Quality & Year Bottom overlay */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 font-medium z-20 font-mono">
                    <span>{item.year || 'Unknown'}</span>
                    {item.qualityProfile && (
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] text-[#e3e6ed] truncate max-w-[90px]">
                        {item.qualityProfile}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3.5 flex-1 flex flex-col justify-between bg-[#14171f]">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#a8c7fa] transition-colors tracking-tight">
                      {item.title}
                    </h4>
                    {(item.artist || item.author) && (
                      <p className="text-[11px] text-[#9aa0a6] line-clamp-1 mt-0.5">
                        {item.artist || item.author}
                      </p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#9aa0a6] font-mono">
                    <span>
                      {item.episodeFileCount !== undefined ? `${item.episodeFileCount}/${item.episodeCount} Ep` :
                       item.sizeBytes ? formatBytes(item.sizeBytes) : 'Monitored'}
                    </span>
                    <span className="capitalize text-white/70 font-sans font-medium">{item.status}</span>
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
