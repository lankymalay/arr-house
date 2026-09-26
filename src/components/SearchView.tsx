import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tv, 
  Film, 
  Music, 
  Disc3, 
  Plus, 
  Check, 
  Loader2, 
  SlidersHorizontal, 
  X,
  Flame,
  Calendar as CalendarIcon,
  ShieldCheck
} from 'lucide-react';
import type { SearchResultItem, ServiceId, MediaItem } from '../types.js';
import { getContentTypeLabel } from '../types.js';
import { AddContentModal } from './AddContentModal.js';
import { ArtistDetailModal } from './ArtistDetailModal.js';
import { ForthcomingReleasesView } from './ForthcomingReleasesView.js';
import { PopularThisMonth } from './PopularThisMonth.js';
import { MediaPoster } from './MediaPoster.js';
import { RatingBadge } from './RatingBadge.js';
import { ExpandableSynopsis } from './ExpandableSynopsis.js';
import { prefetchImage } from '../utils/prefetch.js';
import { rankSearchResults } from '../utils/searchRelevance.js';
import { useToast } from '../context/ToastContext.js';
import { SkeletonCard } from './SkeletonCard.js';

interface SearchViewProps {
  onAddedItem: () => void;
  onViewLibraryItem?: (id: string | number) => void;
  initialQuery?: string;
  initialService?: ServiceId;
  libraryItems?: MediaItem[];
  onSelectLibraryItem?: (item: MediaItem) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ 
  onAddedItem, 
  onViewLibraryItem,
  initialQuery = '',
  initialService = 'radarr',
  libraryItems,
  onSelectLibraryItem
}) => {
  const { success, error, info } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [targetService, setTargetService] = useState<ServiceId>(initialService);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState<SearchResultItem | null>(null);
  const [selectedArtistForAlbums, setSelectedArtistForAlbums] = useState<SearchResultItem | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string | number>>(new Set());
  const [browseTab, setBrowseTab] = useState<'popular' | 'forthcoming'>('popular');

  const handleAddSearchResult = async (item: SearchResultItem) => {
    const key = item.foreignId || item.title;
    setAddingIds(prev => new Set(prev).add(key));
    try {
      const token = localStorage.getItem('arr_token');

      const res = await fetch('/api/arr/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: item.service,
          title: item.title,
          foreignId: item.foreignId,
          monitored: true,
          searchForMissing: true,
          metadata: {
            year: item.year,
            overview: item.overview,
            posterUrl: item.posterUrl,
            genres: item.genres
          }
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        success('Added to Library', resData.message || `Added "${item.title}" to ${item.service.toUpperCase()}`);
        setResults(prev => prev.map(r => (r.foreignId === item.foreignId ? { ...r, alreadyInLibrary: true } : r)));
        onAddedItem();
      } else {
        error('Could Not Add', resData.message || resData.error || `Failed to add "${item.title}"`);
      }
    } catch (err: any) {
      error('Add Failed', err.message || 'Could not connect to service');
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
    if (initialService) {
      setTargetService(initialService);
    }
  }, [initialQuery, initialService]);

  const executeSearch = async (searchTerm: string, service: ServiceId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('arr_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      params.append('service', service);

      const res = await fetch(`/api/arr/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const rawResults: SearchResultItem[] = data.results || [];
        const ranked = rankSearchResults(rawResults, searchTerm);
        setResults(ranked);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query, targetService);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, targetService]);

  const renderCard = (result: SearchResultItem) => {
    const serviceBadgeClass = 
      result.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
      result.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
      result.service === 'lidarr' ? 'bg-[#b4e3be] text-[#072711]' :
      'bg-white/10 text-white';

    const isTvShow = result.service === 'sonarr' || result.mediaType === 'tv';
    const isMusic = result.service === 'lidarr' || result.mediaType === 'music';

    return (
      <div
        key={`${result.service}-${result.foreignId}`}
        id={`search-card-${result.foreignId}`}
        onClick={() => {
          if (isMusic) {
            setSelectedArtistForAlbums(result);
          } else if (!result.alreadyInLibrary) {
            setSelectedItemForAdd(result);
          } else if (result.existingId && onViewLibraryItem) {
            onViewLibraryItem(result.existingId);
          }
        }}
        className="sonos-card p-4 flex items-start gap-4 hover:bg-[#181c25] transition-all group cursor-pointer hover:border-white/20"
        onMouseEnter={() => {
          if (result.posterUrl) prefetchImage(result.posterUrl);
        }}
      >
        {/* Poster Thumbnail */}
        <div className={`rounded-2xl bg-[#0c0e12] overflow-hidden shrink-0 border border-white/[0.08] relative shadow-sm ${
          isMusic ? 'w-24 h-24 sm:w-28 sm:h-28 aspect-square' : 'w-24 h-36'
        }`}>
          <MediaPoster
            src={result.posterUrl}
            alt={result.title}
            title={result.title}
            artistOrAuthor={result.authorOrArtist}
            year={result.year}
            mediaType={result.mediaType}
            service={result.service}
            aspectRatio={isMusic ? 'square' : 'custom'}
            className="w-full h-full"
          />
          {isTvShow && !result.alreadyInLibrary && (
            <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-xs py-1 px-1.5 text-[9px] font-bold text-center text-[#a8c7fa] border-t border-white/10 opacity-90 group-hover:opacity-100 transition-opacity z-10">
              Select Episodes
            </div>
          )}
          {isMusic && (
            <div className="absolute inset-x-0 bottom-0 bg-black/85 backdrop-blur-xs py-1 px-1.5 text-[9px] font-bold text-center text-[#b4e3be] border-t border-white/10 opacity-90 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center gap-1">
              <Disc3 className="w-2.5 h-2.5" />
              <span>Artist</span>
            </div>
          )}
          {result.rating ? (
            <div className="absolute top-2 left-2 z-10">
              <RatingBadge rating={result.rating} source={result.ratingSource} variant="thumbnail" />
            </div>
          ) : null}
        </div>

        {/* Details & Add Button */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${serviceBadgeClass}`}>
                {getContentTypeLabel(result.service, result.mediaType)}
              </span>
              {result.year && (
                <span className="text-xs text-[#9aa0a6] font-mono">{result.year}</span>
              )}
              {result.imdbId && (
                <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 rounded-full flex items-center gap-1" title="Reputable IMDb ID verified">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>IMDb: {result.imdbId}</span>
                </span>
              )}
              {result.tvdbId && (
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full flex items-center gap-1" title="Reputable TheTVDB ID verified">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>TVDB: {result.tvdbId}</span>
                </span>
              )}
              {isTvShow && (
                <span className="text-[10px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full border border-[#a8c7fa]/20 font-medium">
                  Whole show, seasons, or individual episodes
                </span>
              )}
              {isMusic && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 text-[#b4e3be] bg-[#b4e3be]/10 border-[#b4e3be]/20">
                  <Disc3 className="w-2.5 h-2.5" />
                  <span>Artist</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 justify-between">
              <h4 className="text-sm font-semibold text-white tracking-tight group-hover:text-cyan-300 transition-colors flex-1">
                {result.title}
              </h4>
              {result.rating ? (
                <RatingBadge rating={result.rating} source={result.ratingSource} variant="inline" />
              ) : null}
            </div>

            {result.authorOrArtist && result.authorOrArtist !== 'Artist' && (
              <p className="text-xs text-[#9aa0a6] line-clamp-1 mt-0.5 font-medium">
                {result.authorOrArtist}
              </p>
            )}

            {/* Overview & Synopsis capped at 50 words */}
            <ExpandableSynopsis
              text={result.overview}
              fallbackText={isMusic ? 'Recording artist • Click to view studio albums and EPs' : 'No synopsis provided.'}
              maxWords={50}
              className="text-xs text-slate-300/90 mt-1.5 leading-relaxed"
            />

            {result.genres && result.genres.length > 0 && (
              <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                {result.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-[10px] text-[#9aa0a6] bg-white/[0.05] px-2 py-0.5 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {result.alreadyInLibrary && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#b4e3be]/15 text-[#b4e3be] text-[11px] font-bold border border-[#b4e3be]/25">
                  <Check className="w-3 h-3" />
                  <span>In Library</span>
                </div>
              )}
              {isTvShow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemForAdd(result);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
                  title="Configure specific seasons and episodes"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Seasons</span>
                </button>
              )}
              {isMusic && (
                <button
                  id={`btn-albums-${result.foreignId}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedArtistForAlbums(result);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#b4e3be]/15 hover:bg-[#b4e3be]/25 text-[#b4e3be] text-[11px] font-bold border border-[#b4e3be]/30 transition-colors cursor-pointer"
                  title="Browse studio albums and EPs"
                >
                  <Disc3 className="w-3 h-3" />
                  <span>Albums & EPs</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-1.5 w-full sm:w-auto sm:ml-auto">
              {result.alreadyInLibrary ? (
                <div 
                  className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  title={`Already in ${result.service.toUpperCase()}`}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Added</span>
                </div>
              ) : (
                <button
                  id={`btn-add-${result.foreignId}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemForAdd(result);
                  }}
                  className="flex-1 sm:flex-initial justify-center px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill active:scale-[0.98] whitespace-nowrap"
                  title={`Add to ${result.service.toUpperCase()}`}
                >
                  <Plus className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search & Filters Toolbar in Main Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#14171f] border border-white/[0.08] p-3 sm:p-3.5 rounded-2xl shadow-sm">
        {/* Service Filter Tabs (Default: Movies, switchable to TV or Music) */}
        <div className="flex flex-wrap items-center bg-[#1a1e28] p-1 rounded-2xl sm:rounded-full border border-white/[0.08] gap-1 w-full sm:w-auto">
          <button
            id="search-filter-radarr"
            onClick={() => setTargetService('radarr')}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer pixel-pill ${
              targetService === 'radarr'
                ? 'bg-[#e0d0b8] text-[#3e2723] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies</span>
          </button>

          <button
            id="search-filter-sonarr"
            onClick={() => setTargetService('sonarr')}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer pixel-pill ${
              targetService === 'sonarr'
                ? 'bg-[#a8c7fa] text-[#041e49] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Shows</span>
          </button>

          <button
            id="search-filter-lidarr"
            onClick={() => setTargetService('lidarr')}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer pixel-pill ${
              targetService === 'lidarr'
                ? 'bg-[#b4e3be] text-[#072711] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music</span>
          </button>
        </div>

        {/* Search Input (to the right of the filters) */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-[#9aa0a6] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="universal-search-input"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              targetService === 'radarr'
                ? 'Search movies by title (e.g. Cool Runnings)...'
                : targetService === 'sonarr'
                  ? 'Search TV series by title (e.g. Breaking Bad)...'
                  : 'Search artists or bands (e.g. Radiohead, Daft Punk)...'
            }
            className="w-full pl-11 pr-11 py-2 sm:py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs sm:text-sm text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 font-medium transition-all"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Content Below Main Search Option */}
      {query.trim() ? (
        <div className="space-y-8">
          {/* Active Search Results Display */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} variant="search-result" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30 flex flex-col items-center justify-center space-y-2">
              <Search className="w-12 h-12 text-slate-600 mb-2" />
              <h3 className="text-lg font-semibold text-white">No results found</h3>
              <p className="text-sm text-slate-400">
                Try adjusting your search terms or switching to a different service
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Search Results for "{query}" ({results.length})</span>
                </span>
                <span className="text-xs text-[#9aa0a6]">
                  Click Add to choose download quality profile
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result) => renderCard(result))}
              </div>
            </div>
          )}

          {/* Discovery Section below active search results */}
          <div className="pt-8 border-t border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBrowseTab('popular')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    browseTab === 'popular'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Popular This Month</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBrowseTab('forthcoming')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    browseTab === 'forthcoming'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  <span>Forthcoming Releases</span>
                </button>
              </div>
            </div>

            {browseTab === 'popular' ? (
              <PopularThisMonth
                activeService={targetService}
                onSelectService={(service) => setTargetService(service)}
                onSelectItemForAdd={(item) => setSelectedItemForAdd(item)}
                onSelectArtistForAlbums={(item) => setSelectedArtistForAlbums(item)}
                onQuickAdd={handleAddSearchResult}
                onViewLibraryItem={onViewLibraryItem}
                addingIds={addingIds}
              />
            ) : (
              <ForthcomingReleasesView
                isEmbedded
                libraryItems={libraryItems}
                onSelectLibraryItem={onSelectLibraryItem}
                onAddedItem={onAddedItem}
                activeType={targetService === 'sonarr' ? 'tv' : targetService === 'lidarr' ? 'music' : 'movie'}
                onTypeChange={(type) => {
                  setTargetService(type === 'tv' ? 'sonarr' : type === 'music' ? 'lidarr' : 'radarr');
                }}
                onSearchItem={(searchQuery, mediaType) => {
                  setQuery(searchQuery);
                  if (mediaType) {
                    setTargetService(mediaType === 'tv' ? 'sonarr' : mediaType === 'music' ? 'lidarr' : 'radarr');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </div>
        </div>
      ) : (
        /* Below Main Search: Popular This Month (UK) or Forthcoming Releases displayed when search box is empty */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBrowseTab('popular')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  browseTab === 'popular'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Popular This Month</span>
              </button>

              <button
                type="button"
                onClick={() => setBrowseTab('forthcoming')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  browseTab === 'forthcoming'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                <span>Forthcoming Releases</span>
              </button>
            </div>
          </div>

          {browseTab === 'popular' ? (
            <PopularThisMonth
              activeService={targetService}
              onSelectService={(service) => setTargetService(service)}
              onSelectItemForAdd={(item) => setSelectedItemForAdd(item)}
              onSelectArtistForAlbums={(item) => setSelectedArtistForAlbums(item)}
              onQuickAdd={handleAddSearchResult}
              onViewLibraryItem={onViewLibraryItem}
              addingIds={addingIds}
            />
          ) : (
            <ForthcomingReleasesView
              isEmbedded
              libraryItems={libraryItems}
              onSelectLibraryItem={onSelectLibraryItem}
              onAddedItem={onAddedItem}
              activeType={targetService === 'sonarr' ? 'tv' : targetService === 'lidarr' ? 'music' : 'movie'}
              onTypeChange={(type) => {
                setTargetService(type === 'tv' ? 'sonarr' : type === 'music' ? 'lidarr' : 'radarr');
              }}
              onSearchItem={(searchQuery, mediaType) => {
                setQuery(searchQuery);
                if (mediaType) {
                  setTargetService(mediaType === 'tv' ? 'sonarr' : mediaType === 'music' ? 'lidarr' : 'radarr');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      )}

      {/* Studio Albums Modal when clicking an artist */}
      {selectedArtistForAlbums && (
        <ArtistDetailModal
          item={selectedArtistForAlbums}
          onClose={() => setSelectedArtistForAlbums(null)}
          onRefreshItem={() => {
            onAddedItem();
            executeSearch(query, targetService);
          }}
          onAddArtist={(itemToConfigure) => {
            setSelectedArtistForAlbums(null);
            setSelectedItemForAdd(itemToConfigure);
          }}
        />
      )}

      {/* Add Modal */}
      {selectedItemForAdd && (
        <AddContentModal
          item={selectedItemForAdd}
          onClose={() => setSelectedItemForAdd(null)}
          onAdded={() => {
            onAddedItem();
            executeSearch(query, targetService);
          }}
        />
      )}
    </div>
  );
};
