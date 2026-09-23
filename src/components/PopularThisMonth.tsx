import React, { useEffect, useState } from 'react';
import { 
  Flame, 
  Plus, 
  Check, 
  Loader2
} from 'lucide-react';
import type { ServiceId, SearchResultItem, PopularUkPayload, PopularUkItem } from '../types.js';
import { MediaPoster } from './MediaPoster.js';
import { ExpandableSynopsis } from './ExpandableSynopsis.js';
import { RatingBadge } from './RatingBadge.js';

interface PopularThisMonthProps {
  activeService: ServiceId;
  onSelectService: (service: ServiceId) => void;
  onSelectItemForAdd: (item: SearchResultItem) => void;
  onSelectArtistForAlbums?: (item: SearchResultItem) => void;
  onQuickAdd: (item: SearchResultItem) => void;
  onViewLibraryItem?: (id: string | number) => void;
  addingIds: Set<string | number>;
}

export const PopularThisMonth: React.FC<PopularThisMonthProps> = ({
  activeService,
  onSelectService,
  onSelectItemForAdd,
  onSelectArtistForAlbums,
  onQuickAdd,
  onViewLibraryItem,
  addingIds
}) => {
  const [data, setData] = useState<PopularUkPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPopular = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('arr_token');
        const res = await fetch('/api/arr/popular-uk', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          throw new Error(`Failed to load popular titles (${res.status})`);
        }
        const json: PopularUkPayload = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Could not load UK popularity data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPopular();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine active category items & source
  let items: PopularUkItem[] = [];
  let sourceLabel = '';
  let categoryName = 'Movies';

  if (data) {
    if (activeService === 'sonarr') {
      items = data.tv || [];
      sourceLabel = data.sourceAttribution.tv;
      categoryName = 'TV Shows';
    } else if (activeService === 'lidarr') {
      items = data.music || [];
      sourceLabel = data.sourceAttribution.music;
      categoryName = 'Music Albums';
    } else {
      items = data.movies || [];
      sourceLabel = data.sourceAttribution.movies;
      categoryName = 'Movies';
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-400/20">
          <Flame className="w-3 h-3 text-amber-400" />
          #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-300/20 text-slate-200 border border-slate-300/30">
          #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/30 text-amber-200 border border-amber-600/30">
          #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center bg-[#14171f] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">
            Loading popular {categoryName.toLowerCase()}...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Grid of 8 Popular Titles */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isMusic = item.service === 'lidarr';
            const isAdding = addingIds.has(item.foreignId || item.title);

            return (
              <div
                key={item.foreignId || `${item.service}-${item.rank}`}
                onClick={() => {
                  if (isMusic && onSelectArtistForAlbums) {
                    onSelectArtistForAlbums(item);
                  } else if (!item.alreadyInLibrary) {
                    onSelectItemForAdd(item);
                  } else if (item.existingId && onViewLibraryItem) {
                    onViewLibraryItem(item.existingId);
                  }
                }}
                className="group relative bg-[#14171f] border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer"
              >
                <div>
                  {/* Card Header: Poster & Rank Header */}
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1a1e28] border border-white/[0.06] mb-3">
                    <MediaPoster
                      src={item.posterUrl}
                      alt={item.title}
                      title={item.title}
                      mediaType={item.mediaType}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Gradient shadow overlay for legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                    {/* Rank Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {getRankBadge(item.rank)}
                    </div>

                    {/* Rating or Service Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {item.rating ? (
                        <RatingBadge rating={item.rating} source={item.ratingSource} variant="thumbnail" />
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-black/60 backdrop-blur-md text-white border border-white/10">
                          {item.service.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Bottom overlay: Year & UK Metric */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-amber-300 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-amber-400/30 truncate self-start shadow-sm">
                        {item.ukRankMetric}
                      </span>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 flex-1">
                        {item.title}
                      </h4>
                      {item.year && (
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          {item.year}
                        </span>
                      )}
                    </div>

                    {item.authorOrArtist && item.authorOrArtist !== 'Artist' && (
                      <p className="text-xs text-[#9aa0a6] truncate font-medium">
                        {item.authorOrArtist}
                      </p>
                    )}

                    {/* Overview & Synopsis capped at 50 words with expand toggle */}
                    <ExpandableSynopsis
                      text={item.overview}
                      fallbackText={isMusic ? 'Recording artist • Click to browse studio albums and EPs.' : 'No synopsis provided.'}
                      maxWords={50}
                      className="text-xs text-slate-300/90 mt-1.5 leading-relaxed"
                    />

                    {/* Genres */}
                    {item.genres && item.genres.length > 0 && (
                      <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                        {item.genres.slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] text-[#9aa0a6] bg-white/[0.05] px-2 py-0.5 rounded-full"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {item.mediaType === 'movie' ? 'Movie' : item.mediaType === 'tv' ? 'TV Show' : 'Album'}
                  </span>

                  {item.alreadyInLibrary ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#b4e3be]/15 text-[#b4e3be] text-[11px] font-bold border border-[#b4e3be]/25 shrink-0">
                      <Check className="w-3 h-3" />
                      <span>In Library</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMusic && onSelectArtistForAlbums) {
                          onSelectArtistForAlbums(item);
                        } else {
                          onQuickAdd(item);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>{isMusic ? 'View & Add' : 'Add'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PopularThisMonth;
