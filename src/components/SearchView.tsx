import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tv, 
  Film, 
  Music, 
  Plus, 
  Check, 
  Loader2,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import type { SearchResultItem, ServiceId } from '../types.js';
import { AddContentModal } from './AddContentModal.js';

interface SearchViewProps {
  onAddedItem: () => void;
  onViewLibraryItem?: (id: string | number) => void;
  initialQuery?: string;
  initialService?: 'all' | ServiceId;
}

export const SearchView: React.FC<SearchViewProps> = ({ 
  onAddedItem, 
  onViewLibraryItem,
  initialQuery = '',
  initialService = 'all'
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [targetService, setTargetService] = useState<'all' | ServiceId>(initialService);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState<SearchResultItem | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
    if (initialService) {
      setTargetService(initialService);
    }
  }, [initialQuery, initialService]);

  const executeSearch = async (searchTerm: string, service: 'all' | ServiceId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('arr_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (service !== 'all') params.append('service', service);

      const res = await fetch(`/api/arr/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
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

  const quickPicks = [
    { label: 'Severance (TV)', q: 'Severance', svc: 'sonarr' as ServiceId },
    { label: 'Fallout (TV)', q: 'Fallout', svc: 'sonarr' as ServiceId },
    { label: 'Gladiator II (Movie)', q: 'Gladiator', svc: 'radarr' as ServiceId },
    { label: 'Interstellar (Movie)', q: 'Interstellar', svc: 'radarr' as ServiceId },
    { label: 'Radiohead (Music)', q: 'Radiohead', svc: 'lidarr' as ServiceId }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search Header - Pixel Search Widget & Sonos Precision Hardware */}
      <div className="sonos-card p-6 sm:p-8 relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
            Search Media & Indexers
          </h2>
          <p className="text-xs sm:text-sm text-[#9aa0a6] mt-1.5 mb-6">
            Search Sonarr, Radarr, and Lidarr indexers with automated grab dispatch.
          </p>

          {/* Pixel Search Capsule Bar */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-[#9aa0a6] absolute left-5 pointer-events-none" />
            <input
              id="universal-search-input"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by series title, movie, or musical artist..."
              className="w-full pl-13 pr-12 py-3.5 bg-[#1a1e28] border border-white/[0.09] rounded-full text-sm text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 shadow-lg font-medium transition-all"
            />
            {loading && (
              <Loader2 className="w-5 h-5 text-white animate-spin absolute right-5" />
            )}
          </div>

          {/* Quick Pick Chips - Pixel Style */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-4 text-xs">
            <span className="text-[#9aa0a6] text-xs font-semibold mr-1">Trending:</span>
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                onClick={() => {
                  setQuery(pick.q);
                  setTargetService(pick.svc);
                }}
                className="px-3 py-1.5 rounded-full bg-[#1a1e28] hover:bg-[#222734] text-[#e3e6ed] text-[11px] font-medium border border-white/[0.07] transition-colors cursor-pointer pixel-pill"
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Service Filter Tabs - Pixel Segmented Capsule */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex p-1 rounded-full bg-[#14171f] border border-white/[0.08] gap-1">
          <button
            onClick={() => setTargetService('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer pixel-pill ${
              targetService === 'all'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Services</span>
          </button>

          <button
            onClick={() => setTargetService('sonarr')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer pixel-pill ${
              targetService === 'sonarr'
                ? 'bg-[#a8c7fa] text-[#041e49] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Shows</span>
          </button>

          <button
            onClick={() => setTargetService('radarr')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer pixel-pill ${
              targetService === 'radarr'
                ? 'bg-[#e0d0b8] text-[#3e2723] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies</span>
          </button>

          <button
            onClick={() => setTargetService('lidarr')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer pixel-pill ${
              targetService === 'lidarr'
                ? 'bg-[#b4e3be] text-[#072711] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music</span>
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {results.length === 0 && !loading ? (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
          <Search className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#9aa0a6]">No results found.</p>
          <p className="text-xs text-[#5f6368] mt-1">Try searching for popular titles or adjust service filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result) => {
            const serviceBadgeClass = 
              result.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
              result.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
              result.service === 'lidarr' ? 'bg-[#b4e3be] text-[#072711]' :
              'bg-white/10 text-white';

            const isTvShow = result.service === 'sonarr' || result.mediaType === 'tv';

            return (
              <div
                key={`${result.service}-${result.foreignId}`}
                id={`search-card-${result.foreignId}`}
                onClick={() => {
                  if (!result.alreadyInLibrary) {
                    setSelectedItemForAdd(result);
                  } else if (result.existingId && onViewLibraryItem) {
                    onViewLibraryItem(result.existingId);
                  }
                }}
                className={`sonos-card p-4 flex gap-4 hover:bg-[#181c25] transition-all group ${
                  !result.alreadyInLibrary ? 'cursor-pointer hover:border-white/20' : ''
                }`}
              >
                {/* Poster Thumbnail */}
                <div className="w-24 h-36 rounded-2xl bg-[#0c0e12] overflow-hidden shrink-0 border border-white/[0.08] relative shadow-sm">
                  {result.posterUrl ? (
                    <img
                      src={result.posterUrl}
                      alt={result.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5f6368] text-xs">
                      No Poster
                    </div>
                  )}
                  {isTvShow && !result.alreadyInLibrary && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-xs py-1 px-1.5 text-[9px] font-bold text-center text-[#a8c7fa] border-t border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
                      Select Episodes
                    </div>
                  )}
                </div>

                {/* Details & Add Button */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${serviceBadgeClass}`}>
                        {result.service}
                      </span>
                      {result.year && (
                        <span className="text-xs text-[#9aa0a6] font-mono">{result.year}</span>
                      )}
                      {isTvShow && (
                        <span className="text-[10px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full border border-[#a8c7fa]/20 font-medium">
                          Whole show, seasons, or individual episodes
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-white line-clamp-1 tracking-tight group-hover:text-white transition-colors">
                      {result.title}
                    </h4>

                    {result.authorOrArtist && (
                      <p className="text-xs text-[#9aa0a6] line-clamp-1 mt-0.5 font-medium">
                        {result.authorOrArtist}
                      </p>
                    )}

                    <p className="text-xs text-[#9aa0a6] line-clamp-2 mt-1.5 leading-relaxed">
                      {result.overview || 'No synopsis provided.'}
                    </p>

                    {result.genres && result.genres.length > 0 && (
                      <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                        {result.genres.slice(0, 2).map((g) => (
                          <span key={g} className="text-[10px] text-[#9aa0a6] bg-white/[0.05] px-2 py-0.5 rounded-full">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="text-[11px] text-[#9aa0a6] hidden sm:block">
                      {isTvShow && !result.alreadyInLibrary ? (
                        <span className="text-[#a8c7fa] hover:underline">
                          Click card to choose episodes
                        </span>
                      ) : null}
                    </div>

                    {result.alreadyInLibrary ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#b4e3be]/15 text-[#b4e3be] text-xs font-bold border border-[#b4e3be]/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>In Library</span>
                      </div>
                    ) : (
                      <button
                        id={`btn-add-${result.foreignId}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemForAdd(result);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill ${
                          isTvShow
                            ? 'bg-[#a8c7fa] text-[#041e49] hover:bg-[#8ab4f8]'
                            : 'bg-white text-black hover:bg-neutral-200'
                        }`}
                      >
                        {isTvShow ? (
                          <>
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Select & Add</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Title</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
