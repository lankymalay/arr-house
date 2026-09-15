import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Film, 
  Music, 
  Search, 
  Star, 
  Loader2,
  Calendar as CalendarIcon,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import type { ExternalReleaseItem } from '../types.js';

interface ExternalCalendarViewProps {
  onSearchItem?: (query: string, mediaType?: 'tv' | 'movie' | 'music') => void;
}

export const ExternalCalendarView: React.FC<ExternalCalendarViewProps> = ({ onSearchItem }) => {
  const [releases, setReleases] = useState<ExternalReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default to actual current system date (e.g. September 2026)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie' | 'music'>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ExternalReleaseItem | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function loadExternalCalendar() {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem('arr_token');
        const res = await fetch(`/api/arr/external-calendar?year=${year}&month=${month + 1}`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.releases)) {
            setReleases(data.releases);
          }
        }
      } catch (err) {
        console.error('Error fetching external calendar releases', err);
      } finally {
        setLoading(false);
      }
    }

    loadExternalCalendar();
  }, [year, month]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const setMonthYear = (newYear: number, newMonth: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
  };
  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  // Dynamic presets based on current real-world time
  const currentSysDate = new Date();
  const currentSysYear = currentSysDate.getFullYear();
  const currentSysMonth = currentSysDate.getMonth();

  const presets = [
    { offset: 0, label: 'This Month' },
    { offset: 1, label: '+1 Mo' },
    { offset: 2, label: '+2 Mo' },
    { offset: 3, label: '+3 Mo' },
  ].map(p => {
    const d = new Date(currentSysYear, currentSysMonth + p.offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const shortName = monthNames[m].substring(0, 3);
    const yrShort = String(y).slice(-2);
    return {
      year: y,
      month: m,
      label: p.offset === 0 ? 'This Month' : `${shortName} '${yrShort}`
    };
  });

  // Filter releases by media type, rating, and search query
  const filteredReleases = useMemo(() => {
    return releases.filter((item) => {
      if (activeType !== 'all' && item.mediaType !== activeType) return false;
      if (minRating > 0 && item.rating < minRating) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(q);
        const seriesMatch = item.seriesOrArtistTitle?.toLowerCase().includes(q);
        const genreMatch = item.genres.some(g => g.toLowerCase().includes(q));
        const overviewMatch = item.overview.toLowerCase().includes(q);
        if (!titleMatch && !seriesMatch && !genreMatch && !overviewMatch) return false;
      }
      return true;
    });
  }, [releases, activeType, minRating, searchQuery]);

  // Calendar math for grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const getDayReleases = (dayNumber: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return filteredReleases.filter((item) => item.date === dStr);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'tv':
        return { 
          bg: 'bg-[#a8c7fa]/15 text-[#a8c7fa] border-[#a8c7fa]/30', 
          dot: 'bg-[#a8c7fa]', 
          label: 'TV' 
        };
      case 'movie':
        return { 
          bg: 'bg-[#e0d0b8]/15 text-[#e0d0b8] border-[#e0d0b8]/30', 
          dot: 'bg-[#e0d0b8]', 
          label: 'Movie' 
        };
      case 'music':
        return { 
          bg: 'bg-[#b4e3be]/15 text-[#b4e3be] border-[#b4e3be]/30', 
          dot: 'bg-[#b4e3be]', 
          label: 'Album' 
        };
      default:
        return { 
          bg: 'bg-white/10 text-white border-white/[0.08]', 
          dot: 'bg-white', 
          label: type 
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-[#e3e6ed]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
              External Releases Calendar
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              <Sparkles className="w-3 h-3" />
              Verified Real Dates
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#9aa0a6] mt-1 max-w-2xl">
            Official premiere air dates, anticipated theatrical films, and studio album drops.
          </p>
        </div>

        {/* Search Bar - Sonos x Pixel Capsule */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#9aa0a6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shows, movies, artists..."
            className="w-full pl-10 pr-9 py-2 rounded-full bg-[#14171f] border border-white/[0.08] text-white text-xs placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171f] border border-white/[0.07] p-3 rounded-2xl">
        {/* Media Type Capsule */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-full bg-[#1a1e28] border border-white/[0.08] text-xs gap-1">
            <button
              onClick={() => setActiveType('all')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer pixel-pill ${
                activeType === 'all' ? 'bg-white text-black shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveType('tv')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 pixel-pill ${
                activeType === 'tv' ? 'bg-[#a8c7fa] text-[#041e49] shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3" /> TV
            </button>
            <button
              onClick={() => setActiveType('movie')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 pixel-pill ${
                activeType === 'movie' ? 'bg-[#e0d0b8] text-[#3e2723] shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" /> Movies
            </button>
            <button
              onClick={() => setActiveType('music')}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 pixel-pill ${
                activeType === 'music' ? 'bg-[#b4e3be] text-[#072711] shadow-sm' : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Music className="w-3 h-3" /> Music
            </button>
          </div>

          {/* Rating filter */}
          <div className="flex items-center gap-1.5 bg-[#1a1e28] border border-white/[0.08] px-3.5 py-1.5 rounded-full text-xs text-[#e3e6ed]">
            <Star className="w-3.5 h-3.5 text-[#e0d0b8] fill-[#e0d0b8]" />
            <span className="text-[11px] font-medium text-[#9aa0a6]">Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value={0} className="bg-[#14171f] text-white">All Ratings</option>
              <option value={7.0} className="bg-[#14171f] text-white">★ 7.0+</option>
              <option value={7.5} className="bg-[#14171f] text-white">★ 7.5+</option>
              <option value={8.0} className="bg-[#14171f] text-white">★ 8.0+</option>
              <option value={8.5} className="bg-[#14171f] text-white">★ 8.5+</option>
            </select>
          </div>
        </div>

        {/* Date Month Selector & Quick Jump */}
        <div className="flex items-center gap-2">
          {/* Quick Year/Month jump presets */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {presets.map((p) => {
              const isActive = year === p.year && month === p.month;
              return (
                <button
                  key={`${p.year}-${p.month}`}
                  onClick={() => setMonthYear(p.year, p.month)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isActive ? 'bg-[#a8c7fa] text-[#041e49]' : 'text-[#9aa0a6] hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={resetToToday}
              title="Reset to current month"
              className="px-2 py-1 rounded-full text-[10px] font-semibold text-[#8e918f] hover:text-white transition-colors cursor-pointer ml-0.5"
            >
              Reset
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 bg-[#1a1e28] border border-white/[0.08] rounded-full p-1">
            <button
              onClick={prevMonth}
              title="Previous Month"
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-white min-w-[120px] text-center font-sans">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              title="Next Month"
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* If Search is active, show search summary header */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between bg-[#14171f] border border-white/[0.08] px-4 py-2.5 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#a8c7fa]" />
            <span>Search results for: <strong className="text-white">"{searchQuery}"</strong></span>
            <span className="text-[#9aa0a6]">({filteredReleases.length} release{filteredReleases.length !== 1 ? 's' : ''} found)</span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-[#9aa0a6] hover:text-white underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      {loading ? (
        <div className="sonos-card p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
          <p className="text-[#9aa0a6] text-xs font-semibold">Loading verified media releases...</p>
        </div>
      ) : (
        <div className="sonos-card overflow-hidden shadow-2xl">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.07] bg-[#0c0e12]/60 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#9aa0a6]">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/[0.05]">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`ext-empty-${idx}`} className="bg-[#0c0e12]/30 min-h-[120px] p-2" />;
              }

              const dayReleases = getDayReleases(day);
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === day;

              return (
                <div
                  key={`ext-day-${day}`}
                  className={`min-h-[125px] p-2 flex flex-col justify-between transition-colors hover:bg-white/[0.02] ${
                    isToday ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? 'bg-white text-black font-extrabold shadow-sm' : 'text-[#9aa0a6]'
                      }`}
                    >
                      {day}
                    </span>
                    {dayReleases.length > 0 && (
                      <span className="text-[10px] font-bold text-white bg-white/[0.08] px-2 py-0.5 rounded-full">
                        {dayReleases.length}
                      </span>
                    )}
                  </div>

                  {/* Releases for this day */}
                  <div className="space-y-1 overflow-y-auto max-h-[90px] scrollbar-none flex-1">
                    {dayReleases.map((item) => {
                      const badge = getTypeBadge(item.mediaType);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`w-full text-left p-1 rounded-md text-[10px] font-medium border truncate block transition-all hover:scale-[1.02] cursor-pointer ${badge.bg}`}
                          title={`${item.title} (${item.date}) - ★ ${item.rating}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                            <span className="font-bold truncate">
                              {item.title}
                            </span>
                            <span className="ml-auto text-[9px] text-[#e0d0b8] font-bold shrink-0 font-mono">
                              ★{item.rating}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14171f] border border-white/[0.09] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="relative h-48 bg-[#0c0e12] overflow-hidden">
              <img
                src={selectedItem.posterUrl}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14171f] via-[#14171f]/50 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                <div>
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 border ${getTypeBadge(selectedItem.mediaType).bg}`}>
                    {getTypeBadge(selectedItem.mediaType).label}
                  </span>
                  <h3 className="text-xl font-extrabold text-white leading-tight font-sans">
                    {selectedItem.title}
                  </h3>
                </div>
                <div className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#e0d0b8] fill-[#e0d0b8]" />
                  <span className="text-sm font-bold text-white font-mono">{selectedItem.rating}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#9aa0a6] border-b border-white/[0.06] pb-3 font-mono">
                <span>Release Date: <strong className="text-emerald-400 font-bold">{selectedItem.date}</strong></span>
                {selectedItem.ratingCount && <span>{selectedItem.ratingCount}</span>}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedItem.genres.map((g) => (
                  <span key={g} className="px-2.5 py-0.5 bg-[#1a1e28] text-[#e3e6ed] rounded-full text-[10px] font-medium border border-white/[0.06]">
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                {selectedItem.overview}
              </p>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-[#1a1e28] hover:bg-[#222734] text-[#e3e6ed] text-xs font-bold rounded-full cursor-pointer pixel-pill"
                >
                  Close
                </button>
                {onSearchItem && (
                  <button
                    onClick={() => {
                      const query = selectedItem.seriesOrArtistTitle || selectedItem.title.replace(/\s+S\d+E\d+$/i, '');
                      onSearchItem(query, selectedItem.mediaType);
                      setSelectedItem(null);
                    }}
                    className="px-5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search in Arr</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
