import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Film, 
  Music, 
  Download, 
  Copy, 
  ExternalLink,
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

  // Group filtered events by date for Schedule/Agenda view
  const groupedAgendaEvents = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const sorted = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));
    for (const ev of sorted) {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    }
    return Object.entries(map);
  }, [filteredEvents]);

  const formatScheduleHeader = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const evDate = new Date(y, m - 1, d);
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((evDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      let relative = '';
      if (diffDays === 0) relative = 'Today';
      else if (diffDays === 1) relative = 'Tomorrow';
      else if (diffDays === -1) relative = 'Yesterday';
      else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;

      const formatted = evDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return { formatted, relative };
    } catch {
      return { formatted: dateStr, relative: '' };
    }
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
          bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          dot: 'bg-sky-400',
          badge: 'bg-sky-500 text-white font-bold'
        };
      case 'radarr':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
          badge: 'bg-amber-500 text-white font-bold'
        };
      case 'lidarr':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-500 text-white font-bold'
        };
      default:
        return {
          bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          dot: 'bg-indigo-400',
          badge: 'bg-indigo-500 text-white font-bold'
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Calendar Top Controls */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Subscribe to iCal Feed Button */}
        <button
          id="subscribe-calendar-btn"
          onClick={() => setShowSubscribeModal(true)}
          className="px-4 py-2 rounded-full bg-[#14171f] hover:bg-[#1a1e28] text-white border border-white/[0.08] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer pixel-pill"
        >
          <Download className="w-3.5 h-3.5 text-[#b4e3be]" />
          <span>Sync iCal Feed</span>
        </button>

        {/* View toggle capsule (Desktop option for both Month & Agenda) */}
        <div className="hidden md:flex items-center bg-[#14171f] p-1 rounded-full border border-white/[0.08]">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all pixel-pill ${
              viewMode === 'month' ? 'bg-white text-black font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            Month Grid
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all pixel-pill ${
              viewMode === 'agenda' ? 'bg-white text-black font-bold shadow-sm' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            Schedule / Agenda
          </button>
        </div>

        {/* Mobile indicator (Calendar is agenda/schedule on mobile) */}
        <div className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14171f] border border-white/[0.08] text-[11px] font-medium text-slate-300">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Schedule View</span>
        </div>
      </div>

      {/* Filter and Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171f] border border-white/[0.07] p-3.5 rounded-2xl">
        {/* Month Picker Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1a1e28] border border-white/[0.08] rounded-full p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
              title="Previous Month"
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
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-semibold text-white tracking-tight font-sans">
            {monthNames[month]} {year}
          </h3>
        </div>

        {/* Service Filters - Pixel Capsule Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => toggleService('sonarr')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border pixel-pill cursor-pointer ${
              enabledServices.sonarr 
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold shadow-sm' 
                : 'bg-[#151b29] text-slate-400 border-[#26334a] hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV (Sonarr)</span>
          </button>

          <button
            onClick={() => toggleService('radarr')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border pixel-pill cursor-pointer ${
              enabledServices.radarr 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-sm' 
                : 'bg-[#151b29] text-slate-400 border-[#26334a] hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies (Radarr)</span>
          </button>

          <button
            onClick={() => toggleService('lidarr')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border pixel-pill cursor-pointer ${
              enabledServices.lidarr 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-sm' 
                : 'bg-[#151b29] text-slate-400 border-[#26334a] hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music (Lidarr)</span>
          </button>
        </div>
      </div>

      {/* Agenda/Schedule Content Subcomponent */}
      {(() => {
        const renderAgendaScheduleView = () => (
          <div className="sonos-card p-4 sm:p-6 space-y-6">
            {groupedAgendaEvents.length === 0 ? (
              <div className="py-16 text-center text-[#9aa0a6] text-sm font-medium">
                No scheduled releases match the selected filters.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedAgendaEvents.map(([dateStr, dayEvents]) => {
                  const { formatted, relative } = formatScheduleHeader(dateStr);
                  return (
                    <div key={dateStr} className="space-y-2.5">
                      {/* Day Group Header */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                            {formatted}
                          </span>
                          {relative && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              relative === 'Today' 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                : relative === 'Tomorrow' 
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                                : 'bg-white/10 text-slate-300'
                            }`}>
                              {relative}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {dayEvents.length} {dayEvents.length === 1 ? 'release' : 'releases'}
                        </span>
                      </div>

                      {/* Day Events Cards */}
                      <div className="space-y-2">
                        {dayEvents.map((ev) => {
                          const style = getServiceStyles(ev.service);
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="p-3.5 sm:p-4 rounded-2xl bg-[#1a1e28] hover:bg-[#202634] border border-white/[0.06] hover:border-white/20 flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 shadow-xs ${style.badge}`}>
                                  {ev.service}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-white truncate tracking-tight group-hover:text-indigo-300 transition-colors">
                                    {ev.seriesOrArtistTitle || ev.title}
                                  </h4>
                                  <p className="text-xs text-[#9aa0a6] truncate mt-0.5">
                                    {ev.title}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                  ev.hasFile 
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-[#151a26] text-slate-400 border-white/[0.08]'
                                }`}>
                                  {ev.hasFile ? 'Downloaded' : 'Monitored'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

        const renderMonthGrid = () => (
          <div className="sonos-card overflow-hidden">
            {/* Day Names Header */}
            <div className="grid grid-cols-7 border-b border-white/[0.07] bg-[#0c0e12]/60 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#9aa0a6]">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/[0.05]">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return (
                    <div key={`empty-${idx}`} className="bg-[#0c0e12]/30 min-h-[110px] p-2" />
                  );
                }

                const dayEvents = getDayEvents(day);
                const isToday = 
                  new Date().getFullYear() === year &&
                  new Date().getMonth() === month &&
                  new Date().getDate() === day;

                return (
                  <div
                    key={`day-${day}`}
                    className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors hover:bg-white/[0.02] ${
                      isToday ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span 
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          isToday 
                            ? 'bg-white text-black font-extrabold shadow-sm' 
                            : 'text-[#9aa0a6]'
                        }`}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-white bg-white/[0.08] px-2 py-0.5 rounded-full">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events Stack */}
                    <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none flex-1">
                      {dayEvents.map((ev) => {
                        const style = getServiceStyles(ev.service);
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`w-full text-left p-1 rounded-md text-[10px] font-medium border truncate block transition-all hover:scale-[1.02] cursor-pointer ${style.bg}`}
                            title={`${ev.seriesOrArtistTitle || ev.title} - ${ev.title}`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                              <span className="font-bold truncate">
                                {ev.seriesOrArtistTitle || ev.title}
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
        );

        return (
          <>
            {/* Desktop Calendar View (Month or Agenda based on desktop viewMode toggle) */}
            <div className="hidden md:block">
              {viewMode === 'month' ? renderMonthGrid() : renderAgendaScheduleView()}
            </div>

            {/* Mobile Calendar View (Always Agenda/Schedule View) */}
            <div className="block md:hidden">
              {renderAgendaScheduleView()}
            </div>
          </>
        );
      })()}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14171f] border border-white/[0.09] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${getServiceStyles(selectedEvent.service).badge}`}>
                  {selectedEvent.service}
                </span>
                <h3 className="text-lg font-semibold text-white mt-1.5 tracking-tight font-sans">
                  {selectedEvent.seriesOrArtistTitle || selectedEvent.title}
                </h3>
                <p className="text-xs text-[#9aa0a6]">
                  {selectedEvent.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1e28] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between text-[#9aa0a6]">
                <span>Air Date:</span>
                <strong className="text-white font-mono">{selectedEvent.date}</strong>
              </div>
              <div className="flex justify-between text-[#9aa0a6]">
                <span>Status:</span>
                <strong className="text-white capitalize">{selectedEvent.hasFile ? 'File Present' : 'Monitored (Pending)'}</strong>
              </div>
              {selectedEvent.overview && (
                <p className="text-xs text-[#9aa0a6] pt-2 border-t border-white/[0.06] leading-relaxed">
                  {selectedEvent.overview}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full cursor-pointer pixel-pill"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe iCal Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14171f] border border-white/[0.09] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-white/[0.06] text-white flex items-center justify-center mb-2 border border-white/10">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-white tracking-tight font-sans">
                  Subscribe to Calendar Feed
                </h3>
                <p className="text-xs text-[#9aa0a6] mt-1">
                  Sync your Arr House releases with Apple Calendar, Google Calendar, or Outlook.
                </p>
              </div>
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] block mb-1.5">
                  WebCal Quick Subscribe (Apple / Outlook)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webcalUrl}
                    className="w-full bg-[#1a1e28] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-[#e3e6ed] font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(webcalUrl, 'WebCal')}
                    className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer pixel-pill"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] block mb-1.5">
                  Standard iCal Feed URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="w-full bg-[#1a1e28] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-[#e3e6ed] font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(feedUrl, 'iCal')}
                    className="px-4 py-2.5 bg-[#1a1e28] hover:bg-[#222734] border border-white/10 rounded-full text-xs text-white font-bold shrink-0 transition-colors cursor-pointer pixel-pill"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full cursor-pointer pixel-pill"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
