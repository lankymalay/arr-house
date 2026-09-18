import React from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  DownloadCloud, 
  Clock, 
  Radio, 
  ArrowUpRight, 
  Calendar
} from 'lucide-react';
import type { QueueItem, CalendarEvent, ProwlarrIndexer } from '../types.js';
import type { NavTab } from './Sidebar.js';

interface DashboardViewProps {
  overview: any;
  queue: QueueItem[];
  calendar: CalendarEvent[];
  indexers: ProwlarrIndexer[];
  onNavigate: (tab: NavTab) => void;
  onOpenAddModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  queue = [],
  calendar = [],
  indexers = [],
  onNavigate,
}) => {
  const safeQueue = Array.isArray(queue) ? queue : [];
  const safeCalendar = Array.isArray(calendar) ? calendar : [];
  const safeIndexers = Array.isArray(indexers) ? indexers : [];

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* 4-Widget Metric Grid - High Contrast & Harmonious Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Library */}
        <div 
          onClick={() => onNavigate('libraries')}
          className="theme-card p-3.5 sm:p-5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Total Library
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-4xl font-semibold text-white tracking-tight font-sans">
            {overview?.totalMediaItems ?? 14}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs flex-wrap">
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium text-[10px] sm:text-[11px]">
              {overview?.seriesCount ?? 4} TV
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium text-[10px] sm:text-[11px]">
              {overview?.moviesCount ?? 3} Movies
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium text-[10px] sm:text-[11px]">
              {overview?.musicCount ?? 3} Music
            </span>
          </div>
        </div>

        {/* Active Queue */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-3.5 sm:p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Active Queue
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-4xl font-semibold text-white tracking-tight flex items-baseline gap-1.5 sm:gap-2 font-sans">
            {safeQueue.length}
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
              active
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xs text-slate-300 flex items-center gap-1.5">
            {safeQueue.length > 0 ? (
              <>
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-sonos-wave-1" />
                  <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-sonos-wave-2" />
                  <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-sonos-wave-3" />
                </div>
                <span className="text-cyan-300 font-medium text-[11px] sm:text-xs truncate">Downloading</span>
              </>
            ) : (
              <span className="text-slate-400 text-[11px] sm:text-xs">Queue idle</span>
            )}
          </div>
        </div>

        {/* Monitored Waitlist */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-3.5 sm:p-5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Monitored
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-4xl font-semibold text-white tracking-tight font-sans">
            {overview?.waitlistCount ?? 3}
          </div>
          <div className="mt-2 sm:mt-3 text-xs text-slate-300 truncate text-[11px] sm:text-xs">
            Awaiting releases &amp; grabs
          </div>
        </div>

        {/* Indexers / Prowlarr */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-3.5 sm:p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Indexers
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-4xl font-semibold text-white tracking-tight flex items-baseline gap-1.5 sm:gap-2 font-sans">
            {safeIndexers.filter(i => i.status === 'healthy').length}
            <span className="text-xs font-medium text-slate-300">/ {safeIndexers.length} online</span>
          </div>
          <div className="mt-2 sm:mt-3 text-xs text-emerald-400 font-medium flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="truncate">{overview?.grabs24h ?? 277} grabs in 24h</span>
          </div>
        </div>
      </div>

      {/* Split Section: Active Downloads & Upcoming Releases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Active Downloads Strip */}
        <div className="theme-card p-4 sm:p-6 flex flex-col rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-sm">
                <DownloadCloud className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Active Transfers</h3>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs text-indigo-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1 hover:bg-indigo-500/10"
            >
              <span>Full Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {safeQueue.length === 0 ? (
            <div className="py-8 sm:py-12 text-center text-slate-400 text-xs font-medium">
              No active downloads in queue.
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3 flex-1">
              {safeQueue.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="bg-[#1c2436] border border-[#2b3952] rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white truncate max-w-xs font-sans">
                      {item.title}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                      {item.progress.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress Bar with Vivid High-Contrast Gradient */}
                  <div className="w-full h-2 bg-[#0e121c] border border-[#26334a] rounded-full overflow-hidden mb-2 sm:mb-2.5">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-indigo-500 rounded-full transition-all duration-300 shadow-sm shadow-cyan-500/30"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300">
                    <span className="font-mono truncate mr-2">{item.downloadClient} • {item.protocol}</span>
                    <span className="font-mono text-white font-bold shrink-0">ETA: {item.timeleft || 'Calculating...'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Releases Strip */}
        <div className="theme-card p-4 sm:p-6 flex flex-col rounded-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Upcoming Releases</h3>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs text-indigo-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1 hover:bg-indigo-500/10"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {safeCalendar.length === 0 ? (
            <div className="py-8 sm:py-12 text-center text-slate-400 text-xs font-medium">
              No upcoming scheduled releases found.
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3 flex-1">
              {safeCalendar.slice(0, 3).map((event) => {
                const serviceBadge = 
                  event.service === 'sonarr' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
                  event.service === 'radarr' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';

                // Display main title (Show / Movie / Artist) as primary, with episode / subtitle secondary if distinct
                const mainTitle = event.seriesOrArtistTitle || event.title;
                const subTitle = event.seriesOrArtistTitle && event.seriesOrArtistTitle !== event.title ? event.title : null;

                // Format human-readable date if possible
                const formattedDate = (() => {
                  try {
                    const parsed = new Date(event.date + 'T00:00:00');
                    if (!isNaN(parsed.getTime())) {
                      return parsed.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                    }
                  } catch {
                    // Fallback to raw string
                  }
                  return event.date;
                })();

                return (
                  <div
                    key={event.id}
                    className="bg-[#1c2436] border border-[#2b3952] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-[#3b4b6b] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      {/* 1. Content name as primary */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {mainTitle}
                        </span>
                      </div>

                      {/* Episode / Track title if distinct */}
                      {subTitle && (
                        <p className="text-xs text-slate-300 truncate mt-0.5">
                          {subTitle}
                        </p>
                      )}

                      {/* 2. Date as next important, then 3. Service */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                        <span className="font-semibold text-cyan-300 font-sans">
                          {formattedDate}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${serviceBadge}`}>
                          {event.service}
                        </span>
                        {event.hasFile && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-[10px] font-bold text-emerald-400">
                              Downloaded
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-slate-400 block">
                        {event.hasFile ? 'On Disk' : 'Monitored'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
