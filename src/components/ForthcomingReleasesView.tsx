import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  Search, 
  Star, 
  Loader2,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  Flame,
  Plus,
  RefreshCw,
  X,
  Radio,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import type { ExternalReleaseItem } from '../types.js';

interface ForthcomingReleasesPayload {
  generatedAt: string;
  timeframe: {
    startDate: string;
    endDate: string;
    months: { key: string; label: string; year: number; month: number }[];
  };
  counts: {
    total: number;
    tv: number;
    movie: number;
    music: number;
  };
  spotlight: ExternalReleaseItem[];
  topTv: ExternalReleaseItem[];
  topMovies: ExternalReleaseItem[];
  topMusic: ExternalReleaseItem[];
  all: ExternalReleaseItem[];
}

interface ForthcomingReleasesViewProps {
  onSearchItem?: (query: string, mediaType?: 'tv' | 'movie' | 'music') => void;
}

export const ForthcomingReleasesView: React.FC<ForthcomingReleasesViewProps> = ({ onSearchItem }) => {
  const [data, setData] = useState<ForthcomingReleasesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie' | 'music'>('all');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'anticipated' | 'soonest' | 'latest'>('anticipated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ExternalReleaseItem | null>(null);

  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const fetchForthcoming = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const storedToken = localStorage.getItem('arr_token');
      const url = force ? '/api/arr/forthcoming?refresh=true' : '/api/arr/forthcoming';
      const res = await fetch(url, {
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching forthcoming releases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForthcoming();
  }, []);

  // Compute countdown from today
  const getDaysUntil = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return { label: 'Releasing today', isSoon: true, isToday: true, days: 0 };
        if (diffDays === 1) return { label: 'Tomorrow', isSoon: true, isToday: false, days: 1 };
        if (diffDays <= 7) return { label: `In ${diffDays} days`, isSoon: true, isToday: false, days: diffDays };
        if (diffDays <= 14) return { label: 'In ~2 weeks', isSoon: true, isToday: false, days: diffDays };
        if (diffDays <= 30) return { label: `In ${Math.round(diffDays / 7)} weeks`, isSoon: false, isToday: false, days: diffDays };
        return { label: `In ${Math.round(diffDays / 30)} mos`, isSoon: false, isToday: false, days: diffDays };
      }
    } catch {
      // ignore
    }
    return { label: dateStr, isSoon: false, isToday: false, days: 99 };
  };

  const formatReleaseDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Group TV shows so each TV show is shown only once and not loads of episodes
  const processedAllItems = useMemo(() => {
    if (!data?.all) return [];

    const tvShowsGrouped = new Map<string, ExternalReleaseItem>();
    const nonTvItems: ExternalReleaseItem[] = [];

    for (const item of data.all) {
      if (item.mediaType === 'tv') {
        // Strip out trailing episode codes like "S01E02" so title is just the clean TV show name
        const cleanShowTitle = (item.seriesOrArtistTitle || item.title.replace(/\s+S\d+E\d+.*$/i, '')).trim();
        const showKey = cleanShowTitle.toLowerCase();
        const existing = tvShowsGrouped.get(showKey);

        if (!existing) {
          tvShowsGrouped.set(showKey, {
            ...item,
            title: cleanShowTitle,
            seriesOrArtistTitle: cleanShowTitle
          });
        } else {
          // Keep earliest upcoming release airdate
          if (item.date < existing.date) {
            existing.date = item.date;
            if (item.status === 'premiering') existing.status = 'premiering';
            if (item.ratingCount) existing.ratingCount = item.ratingCount;
            if (item.posterUrl && !existing.posterUrl) existing.posterUrl = item.posterUrl;
          }
        }
      } else {
        nonTvItems.push(item);
      }
    }

    return [...nonTvItems, ...Array.from(tvShowsGrouped.values())];
  }, [data]);

  // Derived category counts reflecting unique items
  const categoryCounts = useMemo(() => {
    if (!processedAllItems.length) {
      return {
        total: data?.counts.total || 0,
        tv: data?.counts.tv || 0,
        movie: data?.counts.movie || 0,
        music: data?.counts.music || 0
      };
    }
    const tv = processedAllItems.filter(i => i.mediaType === 'tv').length;
    const movie = processedAllItems.filter(i => i.mediaType === 'movie').length;
    const music = processedAllItems.filter(i => i.mediaType === 'music').length;
    return {
      total: processedAllItems.length,
      tv,
      movie,
      music
    };
  }, [processedAllItems, data]);

  // Reset pagination whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeType, selectedMonthKey, sortBy, searchQuery]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!processedAllItems.length) return [];

    let pool = processedAllItems;

    // Filter by type
    if (activeType !== 'all') {
      pool = pool.filter(item => item.mediaType === activeType);
    }

    // Filter by month
    if (selectedMonthKey !== 'all') {
      pool = pool.filter(item => item.date.startsWith(selectedMonthKey));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      pool = pool.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(q);
        const seriesMatch = item.seriesOrArtistTitle?.toLowerCase().includes(q);
        const overviewMatch = item.overview.toLowerCase().includes(q);
        const genresMatch = item.genres.some(g => g.toLowerCase().includes(q));
        const ratingCountMatch = item.ratingCount?.toLowerCase().includes(q);
        return titleMatch || seriesMatch || overviewMatch || genresMatch || ratingCountMatch;
      });
    }

    // Sort
    return [...pool].sort((a, b) => {
      if (sortBy === 'anticipated') {
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return a.date.localeCompare(b.date);
      } else if (sortBy === 'soonest') {
        return a.date.localeCompare(b.date);
      } else {
        return b.date.localeCompare(a.date);
      }
    });
  }, [processedAllItems, activeType, selectedMonthKey, searchQuery, sortBy]);

  // Cap visible items to 24 at a time with "Load more"
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const handleSearchAction = (item: ExternalReleaseItem) => {
    if (!onSearchItem) return;
    const query = item.seriesOrArtistTitle || item.title;
    onSearchItem(query, item.mediaType);
  };

  const getTargetServiceLabel = (type: 'tv' | 'movie' | 'music') => {
    switch (type) {
      case 'tv': return 'Sonarr';
      case 'movie': return 'Radarr';
      case 'music': return 'Lidarr';
    }
  };

  const getMediaFallbackImage = (type: 'tv' | 'movie' | 'music') => {
    switch (type) {
      case 'tv':
        return 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80';
      case 'music':
        return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
      case 'movie':
      default:
        return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Forthcoming Releases
            </h1>
          </div>
        </div>

        {/* Action Controls & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="refresh-forthcoming-btn"
            onClick={() => fetchForthcoming(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-white/[0.08] hover:border-cyan-500/30 text-slate-300 hover:text-white transition shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Forthcoming Releases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards / Quick Category Counters */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => { setActiveType('all'); setSelectedMonthKey('all'); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeType === 'all'
                ? 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                : 'bg-[#0f1218]/80 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium">All Forthcoming</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{categoryCounts.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Arriving next 90 days</div>
          </button>

          <button
            onClick={() => { setActiveType('movie'); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeType === 'movie'
                ? 'bg-purple-950/30 border-purple-500/40 shadow-lg shadow-purple-950/30'
                : 'bg-[#0f1218]/80 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium">Movies</span>
              <Film className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{categoryCounts.movie}</div>
            <div className="text-[11px] text-purple-400/80 mt-0.5">Theatrical & streaming</div>
          </button>

          <button
            onClick={() => { setActiveType('tv'); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeType === 'tv'
                ? 'bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-950/30'
                : 'bg-[#0f1218]/80 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium">TV Shows</span>
              <Tv className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{categoryCounts.tv}</div>
            <div className="text-[11px] text-blue-400/80 mt-0.5">Returning & premieres</div>
          </button>

          <button
            onClick={() => { setActiveType('music'); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeType === 'music'
                ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                : 'bg-[#0f1218]/80 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-medium">Music Albums</span>
              <Music className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{categoryCounts.music}</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">Studio records</div>
          </button>
        </div>
      )}

      {/* Featured Marquee Shelf: Most Anticipated Spotlight */}
      {data && data.spotlight && data.spotlight.length > 0 && activeType === 'all' && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Most Anticipated Spotlight
              </h2>
            </div>
            <span className="text-xs text-slate-400">Hand-picked blockbusters & major premieres</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.spotlight.slice(0, 4).map((item) => {
              const countdown = getDaysUntil(item.date);
              return (
                <div
                  key={`spotlight-${item.id}`}
                  onClick={() => setSelectedItem(item)}
                  className="group relative bg-[#0d1016] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer flex flex-col"
                >
                  {/* Media Poster & Badge */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <img
                      src={item.posterUrl || getMediaFallbackImage(item.mediaType)}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getMediaFallbackImage(item.mediaType);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1016] via-[#0d1016]/40 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border backdrop-blur-md ${
                        item.mediaType === 'movie' 
                          ? 'bg-purple-500/30 text-purple-200 border-purple-400/40' 
                          : item.mediaType === 'tv'
                            ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40'
                            : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                      }`}>
                        {item.mediaType}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {item.rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Countdown Pill */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md ${
                        countdown.isSoon 
                          ? 'bg-rose-500/80 text-white font-bold animate-pulse'
                          : 'bg-slate-900/80 text-slate-300 border border-white/[0.1]'
                      }`}>
                        {countdown.label}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-slate-400 truncate mb-0.5">
                        {formatReleaseDate(item.date)}
                        {item.ratingCount ? ` • ${item.ratingCount}` : ''}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      {item.seriesOrArtistTitle && item.seriesOrArtistTitle !== item.title && (
                        <p className="text-xs text-slate-400 line-clamp-1 mb-1">
                          {item.seriesOrArtistTitle}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.overview}
                      </p>
                    </div>

                    {/* Quick Search in Arr Button */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex gap-1 overflow-hidden">
                        {item.genres.slice(0, 2).map((g) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-slate-400">
                            {g}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearchAction(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition active:scale-95"
                        title={`Search in ${getTargetServiceLabel(item.mediaType)}`}
                      >
                        <Search className="w-3 h-3" />
                        <span>{getTargetServiceLabel(item.mediaType)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#0c0f15] border border-white/[0.08] rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="forthcoming-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forthcoming releases by title, artist, network, genre..."
              className="w-full bg-[#141822] border border-white/[0.08] focus:border-cyan-500/50 rounded-xl pl-10 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center bg-[#141822] p-1 rounded-xl border border-white/[0.08] overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveType('all')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setActiveType('movie')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeType === 'movie'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setActiveType('tv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeType === 'tv'
                  ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Shows</span>
            </button>
            <button
              onClick={() => setActiveType('music')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeType === 'music'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Music</span>
            </button>
          </div>
        </div>

        {/* Secondary Bar: Month selector pills & Sort options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05] text-xs">
          {/* Month Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Timeline:</span>
            </span>
            <button
              onClick={() => setSelectedMonthKey('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedMonthKey === 'all'
                  ? 'bg-slate-200 text-slate-900 font-semibold'
                  : 'bg-[#141822] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              All 3 Months
            </button>
            {data?.timeframe?.months.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMonthKey(m.key)}
                className={`px-2.5 py-1 rounded-lg transition font-medium whitespace-nowrap ${
                  selectedMonthKey === m.key
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-[#141822] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#141822] border border-white/[0.08] text-slate-300 rounded-lg px-2.5 py-1 outline-none text-xs focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="anticipated">Most Anticipated (Rating & Score)</option>
              <option value="soonest">Release Date (Soonest First)</option>
              <option value="latest">Release Date (Furthest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm font-medium">Gathering top TV, movies, and music for the next three months...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#0d1016] border border-white/[0.08] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">No forthcoming releases found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing your month filter, or switching media category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveType('all');
              setSelectedMonthKey('all');
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5 flex-wrap">
              Showing <strong className="text-white font-bold">{visibleItems.length}</strong> of{' '}
              <strong className="text-white font-bold">{filteredItems.length}</strong> forthcoming releases
              {visibleCount < filteredItems.length && (
                <span className="text-cyan-400/90 font-medium">
                  • Capped at {PAGE_SIZE} per page
                </span>
              )}
            </span>
            {selectedMonthKey !== 'all' && (
              <span className="text-cyan-400 font-medium">
                Filtered to {data?.timeframe?.months.find(m => m.key === selectedMonthKey)?.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map((item) => {
              const countdown = getDaysUntil(item.date);
              const targetService = getTargetServiceLabel(item.mediaType);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group bg-[#0d1017] border border-white/[0.07] hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-950/30 flex flex-col cursor-pointer"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                    <img
                      src={item.posterUrl || getMediaFallbackImage(item.mediaType)}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getMediaFallbackImage(item.mediaType);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-[#0d1017]/30 to-transparent" />

                    {/* Media Type Tag */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border backdrop-blur-md ${
                        item.mediaType === 'movie' 
                          ? 'bg-purple-500/30 text-purple-200 border-purple-400/40' 
                          : item.mediaType === 'tv'
                            ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40'
                            : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                      }`}>
                        {item.mediaType}
                      </span>
                      {item.status === 'premiering' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/30 text-rose-200 border border-rose-400/40 backdrop-blur-md">
                          Premiere
                        </span>
                      )}
                    </div>

                    {/* Countdown Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md ${
                        countdown.isSoon
                          ? 'bg-rose-500/85 text-white font-bold'
                          : 'bg-slate-900/80 text-slate-300 border border-white/[0.1]'
                      }`}>
                        {countdown.label}
                      </span>
                    </div>

                    {/* Rating & Date strip at bottom of poster */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-slate-200 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/[0.08] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {item.rating.toFixed(1)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/[0.08]">
                        {formatReleaseDate(item.date)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {item.ratingCount && (
                        <div className="text-[11px] font-medium text-cyan-400/80 truncate mb-0.5">
                          {item.ratingCount}
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      {item.seriesOrArtistTitle && item.seriesOrArtistTitle !== item.title && (
                        <p className="text-xs text-slate-400 truncate">
                          {item.seriesOrArtistTitle}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {item.overview}
                      </p>
                    </div>

                    {/* Genres & Search in Arr Button */}
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex gap-1 overflow-hidden">
                        {item.genres.slice(0, 2).map((g) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04] text-slate-400 truncate">
                            {g}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearchAction(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
                        title={`Search & Monitor in ${targetService}`}
                      >
                        <Search className="w-3 h-3" />
                        <span>Search in {targetService}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {visibleCount < filteredItems.length && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 pb-2">
              <button
                id="load-more-releases-btn"
                onClick={() => setVisibleCount(prev => Math.min(filteredItems.length, prev + PAGE_SIZE))}
                className="px-6 py-3 rounded-full text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 text-cyan-400" />
                <span>Load More Releases</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/30 text-white font-semibold">
                  +{Math.min(PAGE_SIZE, filteredItems.length - visibleCount)} more
                </span>
              </button>
              <button
                id="show-all-releases-btn"
                onClick={() => setVisibleCount(filteredItems.length)}
                className="px-4 py-3 rounded-full text-xs font-semibold bg-[#14171f] hover:bg-[#1e2330] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
              >
                Show All ({filteredItems.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Release Detail Inspector Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-[#0f121a] border border-white/[0.1] rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-slate-300 hover:text-white flex items-center justify-center border border-white/[0.1] transition backdrop-blur-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Poster Header */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">
              <img
                src={selectedItem.posterUrl || getMediaFallbackImage(selectedItem.mediaType)}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getMediaFallbackImage(selectedItem.mediaType);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f121a] via-[#0f121a]/50 to-transparent" />

              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedItem.mediaType === 'movie' 
                      ? 'bg-purple-500 text-white' 
                      : selectedItem.mediaType === 'tv'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                  }`}>
                    {selectedItem.mediaType}
                  </span>
                  <span className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {selectedItem.rating.toFixed(1)} / 10
                  </span>
                  {selectedItem.status === 'premiering' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                      Season Premiere
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedItem.title}
                </h2>
                {selectedItem.seriesOrArtistTitle && selectedItem.seriesOrArtistTitle !== selectedItem.title && (
                  <p className="text-sm text-cyan-400 font-medium">
                    {selectedItem.seriesOrArtistTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Release Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 text-cyan-400" />
                    <span>Release Date</span>
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {formatReleaseDate(selectedItem.date)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Countdown</span>
                  </div>
                  <div className="text-xs font-semibold text-amber-300">
                    {getDaysUntil(selectedItem.date).label}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span>Arr Target</span>
                  </div>
                  <div className="text-xs font-semibold text-purple-300">
                    {getTargetServiceLabel(selectedItem.mediaType)}
                  </div>
                </div>
              </div>

              {/* Overview */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Overview & Synopsis
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedItem.overview || 'No extended overview provided for this release.'}
                </p>
              </div>

              {/* Genre Pills */}
              {selectedItem.genres && selectedItem.genres.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Genres & Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.genres.map((genre) => (
                      <span 
                        key={genre}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.05] text-slate-300 border border-white/[0.08]"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSearchAction(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search in {getTargetServiceLabel(selectedItem.mediaType)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as ExternalCalendarView for backwards compatibility
export { ForthcomingReleasesView as ExternalCalendarView };
