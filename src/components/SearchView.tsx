import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tv, 
  Film, 
  Music, 
  Plus, 
  Check, 
  Sparkles, 
  Loader2,
  ExternalLink,
  Layers
} from 'lucide-react';
import type { SearchResultItem, ServiceId } from '../types.js';
import { AddContentModal } from './AddContentModal.js';

interface SearchViewProps {
  onAddedItem: () => void;
  onViewLibraryItem?: (id: string | number) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onAddedItem, onViewLibraryItem }) => {
  const [query, setQuery] = useState('');
  const [targetService, setTargetService] = useState<'all' | ServiceId>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState<SearchResultItem | null>(null);

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
    // Initial catalog fetch or debounced search
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
      {/* Search Header Hero */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Universal *arr Metadata & Indexer Lookup
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Search & Add to Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-5">
            Query Sonarr, Radarr, and Lidarr indexers simultaneously with instant automated grab dispatch.
          </p>

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              id="universal-search-input"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by series title, movie, or musical artist..."
              className="w-full pl-12 pr-10 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xl"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-4" />
            )}
          </div>

          {/* Quick Picks */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3 text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Popular:</span>
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                onClick={() => {
                  setQuery(pick.q);
                  setTargetService(pick.svc);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700/50 transition-colors cursor-pointer"
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Service Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTargetService('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            targetService === 'all'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Services</span>
        </button>

        <button
          onClick={() => setTargetService('sonarr')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            targetService === 'sonarr'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-sky-400" />
          <span>TV Shows (Sonarr)</span>
        </button>

        <button
          onClick={() => setTargetService('radarr')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            targetService === 'radarr'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span>Movies (Radarr)</span>
        </button>

        <button
          onClick={() => setTargetService('lidarr')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            targetService === 'lidarr'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Music className="w-3.5 h-3.5 text-emerald-400" />
          <span>Music (Lidarr)</span>
        </button>
      </div>

      {/* Results Grid */}
      {results.length === 0 && !loading ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No results found.</p>
          <p className="text-xs text-slate-500 mt-1">Try searching for popular titles or adjust service filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result) => {
            const serviceColors = {
              sonarr: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
              radarr: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
              readarr: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
              lidarr: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
              prowlarr: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
            };

            return (
              <div
                key={`${result.service}-${result.foreignId}`}
                id={`search-card-${result.foreignId}`}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex gap-4 hover:border-slate-700 transition-all"
              >
                {/* Poster Thumbnail */}
                <div className="w-24 h-36 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800/80 relative">
                  {result.posterUrl ? (
                    <img
                      src={result.posterUrl}
                      alt={result.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                      No Poster
                    </div>
                  )}
                </div>

                {/* Details & Add Button */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${serviceColors[result.service]}`}>
                        {result.service}
                      </span>
                      {result.year && (
                        <span className="text-xs text-slate-400">{result.year}</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {result.title}
                    </h4>

                    {result.authorOrArtist && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {result.authorOrArtist}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {result.overview || 'No synopsis provided.'}
                    </p>

                    {result.genres && result.genres.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {result.genres.slice(0, 2).map((g) => (
                          <span key={g} className="text-[10px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-end">
                    {result.alreadyInLibrary ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>In Library</span>
                      </div>
                    ) : (
                      <button
                        id={`btn-add-${result.foreignId}`}
                        onClick={() => setSelectedItemForAdd(result)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to {result.service.toUpperCase()}</span>
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
