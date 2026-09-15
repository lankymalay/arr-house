import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Film, 
  Music, 
  Star, 
  Search, 
  Plus, 
  ExternalLink,
  Calendar as CalendarIcon,
  Sparkles,
  Loader2,
  Filter
} from 'lucide-react';
import type { ExternalReleaseItem } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface ExternalCalendarViewProps {
  onSearchItem?: (query: string, mediaType: 'tv' | 'movie' | 'music') => void;
}

export const ExternalCalendarView: React.FC<ExternalCalendarViewProps> = ({ onSearchItem }) => {
  const { token } = useAuth();
  const { success, error: toastError } = useToast();
  const [releases, setReleases] = useState<ExternalReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie' | 'music'>('all');
  const [minRating, setMinRating] = useState<number>(8.0);
  const [selectedItem, setSelectedItem] = useState<ExternalReleaseItem | null>(null);

  useEffect(() => {
    async function loadExternalCalendar() {
      setLoading(true);
      try {
        const res = await fetch('/api/arr/external-calendar', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.releases)) {
            setReleases(data.releases);
          }
        }
      } catch (err) {
        console.error('Failed to load external calendar releases:', err);
      } finally {
        setLoading(false);
      }
    }

    loadExternalCalendar();
  }, [token]);

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Filter items by type and rating
  const filteredReleases = useMemo(() => {
    return releases.filter((item) => {
      if (activeType !== 'all' && item.mediaType !== activeType) return false;
      if (item.rating < minRating) return false;
      return true;
    });
  }, [releases, activeType, minRating]);

  const getDayReleases = (dayNumber: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return filteredReleases.filter((r) => r.date === dStr);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getTypeBadge = (mediaType: 'tv' | 'movie' | 'music') => {
    switch (mediaType) {
      case 'tv':
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          dot: 'bg-sky-400',
          label: 'TV Series'
        };
      case 'movie':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          label: 'Movie'
        };
      case 'music':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Music Album'
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Globe className="w-3.5 h-3.5" />
            Global Forthcoming Releases
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            External Release Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Forthcoming highly rated TV shows, anticipated cinematic movies, and acclaimed music drops. Spot future releases and add them to your *arr monitoring queue with one click.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveType('tv')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                activeType === 'tv' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3" /> TV
            </button>
            <button
              onClick={() => setActiveType('movie')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                activeType === 'movie' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" /> Movies
            </button>
            <button
              onClick={() => setActiveType('music')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                activeType === 'music' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3 h-3" /> Music
            </button>
          </div>

          {/* Rating filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-medium text-slate-400">Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value={7.5} className="bg-slate-900 text-white">★ 7.5+</option>
              <option value={8.0} className="bg-slate-900 text-white">★ 8.0+ (Highly Rated)</option>
              <option value={8.5} className="bg-slate-900 text-white">★ 8.5+ (Critically Acclaimed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Bar & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={today}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            TV Shows
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Movies
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Music
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-slate-400 text-xs font-semibold">Loading forthcoming releases...</p>
        </div>
      ) : (
        /* Calendar Grid */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center py-2 text-xs font-semibold uppercase text-slate-400">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`ext-empty-${idx}`} className="bg-slate-950/30 min-h-[110px] p-2" />;
              }

              const dayReleases = getDayReleases(day);
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === day;

              return (
                <div
                  key={`ext-day-${day}`}
                  className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors hover:bg-slate-800/30 ${
                    isToday ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? 'bg-indigo-500 text-white font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {day}
                    </span>
                    {dayReleases.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
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
                          title={`${item.seriesOrArtistTitle || ''} ${item.title} (★ ${item.rating})`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                            <span className="font-semibold truncate">
                              {item.seriesOrArtistTitle ? `${item.seriesOrArtistTitle}: ` : ''}{item.title}
                            </span>
                            <span className="ml-auto text-[9px] text-amber-300 font-bold shrink-0">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="relative h-44 bg-slate-950 overflow-hidden">
              <img
                src={selectedItem.posterUrl}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mb-1 ${getTypeBadge(selectedItem.mediaType).bg}`}>
                    {getTypeBadge(selectedItem.mediaType).label}
                  </span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">
                    {selectedItem.seriesOrArtistTitle || selectedItem.title}
                  </h3>
                  {selectedItem.seriesOrArtistTitle && (
                    <p className="text-xs text-indigo-300 font-medium">{selectedItem.title}</p>
                  )}
                </div>
                <div className="bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-white">{selectedItem.rating}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                <span>Release Date: <strong className="text-white">{selectedItem.date}</strong></span>
                {selectedItem.ratingCount && <span>{selectedItem.ratingCount}</span>}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedItem.genres.map((g) => (
                  <span key={g} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px]">
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedItem.overview}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
                {onSearchItem && (
                  <button
                    onClick={() => {
                      const query = selectedItem.seriesOrArtistTitle || selectedItem.title;
                      onSearchItem(query, selectedItem.mediaType);
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
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
