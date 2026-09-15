import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Film, 
  Music, 
  Search, 
  Star, 
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react';
import type { ExternalReleaseItem } from '../types.js';

interface ExternalCalendarViewProps {
  onSearchItem?: (query: string, mediaType?: 'tv' | 'movie' | 'music') => void;
}

export const ExternalCalendarView: React.FC<ExternalCalendarViewProps> = ({ onSearchItem }) => {
  const [releases, setReleases] = useState<ExternalReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeType, setActiveType] = useState<'all' | 'tv' | 'movie' | 'music'>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<ExternalReleaseItem | null>(null);

  useEffect(() => {
    async function loadExternalCalendar() {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem('arr_token');
        const res = await fetch('/api/arr/external-calendar', {
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
  }, []);

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

  // Filter releases by media type & rating
  const filteredReleases = releases.filter((item) => {
    if (activeType !== 'all' && item.mediaType !== activeType) return false;
    if (minRating > 0 && item.rating < minRating) return false;
    return true;
  });

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
          bg: 'bg-[#a8c7fa]/15 text-[#a8c7fa] border-white/[0.08]', 
          dot: 'bg-[#a8c7fa]', 
          label: 'TV' 
        };
      case 'movie':
        return { 
          bg: 'bg-[#e0d0b8]/15 text-[#e0d0b8] border-white/[0.08]', 
          dot: 'bg-[#e0d0b8]', 
          label: 'Movie' 
        };
      case 'music':
        return { 
          bg: 'bg-[#b4e3be]/15 text-[#b4e3be] border-white/[0.08]', 
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
            External Releases
          </h2>
          <p className="text-xs sm:text-sm text-[#9aa0a6] mt-1 max-w-2xl">
            Forthcoming TV shows, anticipated movies, and acclaimed music drops across popular feeds.
          </p>
        </div>

        {/* Filters - Pixel Capsule Styling */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter capsule */}
          <div className="inline-flex p-1 rounded-full bg-[#14171f] border border-white/[0.08] text-xs gap-1">
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
          <div className="flex items-center gap-1.5 bg-[#14171f] border border-white/[0.08] px-3.5 py-1.5 rounded-full text-xs text-[#e3e6ed]">
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
      </div>

      {/* Calendar Bar & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171f] border border-white/[0.07] p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1a1e28] border border-white/[0.08] rounded-full p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={today}
              className="px-3 py-1 text-xs font-bold text-white hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer pixel-pill"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-extrabold text-white tracking-tight font-sans">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="text-xs text-[#9aa0a6] flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#a8c7fa]" />
            TV Shows
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e0d0b8]" />
            Movies
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#b4e3be]" />
            Music
          </span>
        </div>
      </div>

      {loading ? (
        <div className="sonos-card p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
          <p className="text-[#9aa0a6] text-xs font-semibold">Loading forthcoming releases...</p>
        </div>
      ) : (
        /* Calendar Grid */
        <div className="sonos-card overflow-hidden">
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

          {/* Days */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/[0.05]">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`ext-empty-${idx}`} className="bg-[#0c0e12]/30 min-h-[110px] p-2" />;
              }

              const dayReleases = getDayReleases(day);
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === day;

              return (
                <div
                  key={`ext-day-${day}`}
                  className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors hover:bg-white/[0.02] ${
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
                  <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none flex-1">
                    {dayReleases.map((item) => {
                      const badge = getTypeBadge(item.mediaType);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`w-full text-left p-1 rounded-md text-[10px] font-medium border truncate block transition-all hover:scale-[1.02] cursor-pointer ${badge.bg}`}
                          title={`${item.title} (★ ${item.rating})`}
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
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${getTypeBadge(selectedItem.mediaType).bg}`}>
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
                <span>Release Date: <strong className="text-white">{selectedItem.date}</strong></span>
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
