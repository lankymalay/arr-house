import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Film, 
  Music, 
  Download, 
  Check, 
  Copy, 
  ExternalLink,
  ListFilter,
  CheckCircle2,
  X
} from 'lucide-react';
import type { CalendarEvent, ServiceId } from '../types.js';
import { useToast } from '../context/ToastContext.js';

interface CalendarViewProps {
  events: CalendarEvent[];
  calendarToken: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, calendarToken }) => {
  const { success } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [enabledServices, setEnabledServices] = useState<Record<ServiceId, boolean>>({
    sonarr: true,
    radarr: true,
    lidarr: true,
    prowlarr: true
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const toggleService = (svc: ServiceId) => {
    setEnabledServices(prev => ({ ...prev, [svc]: !prev[svc] }));
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => enabledServices[e.service]);
  }, [events, enabledServices]);

  // Calendar month math
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

  const getDayEvents = (dayNumber: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dStr);
  };

  // Build calendar matrix days
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // iCal feed URL
  const feedUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/calendar/feed.ics?token=${calendarToken}`
    : `/api/calendar/feed.ics?token=${calendarToken}`;

  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to Clipboard', `${label} link ready to paste`);
  };

  const getServiceStyles = (svc: ServiceId) => {
    switch (svc) {
      case 'sonarr':
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          dot: 'bg-sky-400',
          badge: 'bg-sky-500/20 text-sky-300'
        };
      case 'radarr':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          badge: 'bg-amber-500/20 text-amber-300'
        };
      case 'lidarr':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300'
        };
      default:
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
          dot: 'bg-slate-400',
          badge: 'bg-slate-500/20 text-slate-300'
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header with month nav & filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={today}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {monthNames[month]} {year}
          </h2>
        </div>

        {/* Media type filter buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toggleService('sonarr')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              enabledServices.sonarr
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>TV Shows</span>
          </button>

          <button
            onClick={() => toggleService('radarr')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              enabledServices.radarr
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Movies</span>
          </button>

          <button
            onClick={() => toggleService('lidarr')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              enabledServices.lidarr
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Music</span>
          </button>

          {/* Subscribe Button */}
          <button
            id="btn-subscribe-calendar"
            onClick={() => setShowSubscribeModal(true)}
            className="ml-auto md:ml-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>iCal / WebCal Feed</span>
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center py-2 text-xs font-semibold uppercase text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-slate-950/30 min-h-[100px] p-2" />;
            }

            const dayEvents = getDayEvents(day);
            const isToday = 
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day;

            return (
              <div
                key={`day-${day}`}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors hover:bg-slate-800/30 ${
                  isToday ? 'bg-cyan-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Day events pills */}
                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-none flex-1">
                  {dayEvents.map((evt) => {
                    const styles = getServiceStyles(evt.service);
                    return (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`w-full text-left p-1 rounded-md text-[10px] font-medium border truncate block transition-all hover:scale-[1.02] cursor-pointer ${styles.bg}`}
                        title={`${evt.service.toUpperCase()}: ${evt.seriesOrArtistTitle || ''} ${evt.title}`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${styles.dot}`} />
                        <span className="font-semibold text-white mr-1">
                          {evt.episodeNumber || evt.service.slice(0, 3).toUpperCase()}
                        </span>
                        <span>{evt.seriesOrArtistTitle || evt.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Inspector Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${getServiceStyles(selectedEvent.service).bg}`}>
                  {selectedEvent.service}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {selectedEvent.seriesOrArtistTitle || selectedEvent.title}
                </h3>
                {selectedEvent.seriesOrArtistTitle && (
                  <p className="text-xs text-slate-300 font-medium">{selectedEvent.title}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Release Date:</span>
                <span className="text-white font-mono font-medium">{selectedEvent.date}</span>
              </div>
              {selectedEvent.episodeNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Episode:</span>
                  <span className="text-cyan-400 font-mono font-medium">{selectedEvent.episodeNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">File Status:</span>
                <span className={selectedEvent.hasFile ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                  {selectedEvent.hasFile ? 'Downloaded & Ready' : 'Awaiting Indexer Air Date'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {selectedEvent.overview || 'Release event synced via *arr calendar endpoint.'}
            </p>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Subscribe iCal / WebCal Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Subscribe to Unified Calendar Feed</h3>
              </div>
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Subscribe on your iPhone, Android, Google Calendar, or Outlook to automatically receive release notifications for all tracked TV episodes, movie release dates, and music albums.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Direct iCal / ICS Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300"
                  />
                  <button
                    onClick={() => copyToClipboard(feedUrl, 'iCal')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  1-Click Apple Calendar / Outlook WebCal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webcalUrl}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300"
                  />
                  <a
                    href={webcalUrl}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in App</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <strong>Google Calendar Setup:</strong> In Google Calendar, click the <em>+</em> next to <em>Other calendars</em>, choose <em>From URL</em>, and paste the direct iCal link above.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
