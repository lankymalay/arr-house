import React from 'react';
import { 
  Tv, 
  Film, 
  Music, 
  DownloadCloud, 
  Clock, 
  Radio, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto">
      {/* 4-Widget Metric Grid - High Contrast & Harmonious Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Library */}
        <div 
          onClick={() => onNavigate('libraries')}
          className="theme-card p-5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Total Library
            </span>
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight font-sans">
            {overview?.totalMediaItems ?? 14}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium text-[11px]">
              {overview?.seriesCount ?? 4} TV
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium text-[11px]">
              {overview?.moviesCount ?? 3} Movies
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium text-[11px]">
              {overview?.musicCount ?? 3} Music
            </span>
          </div>
        </div>

        {/* Active Queue */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Active Transfers
            </span>
            <div className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight flex items-baseline gap-2 font-sans">
            {safeQueue.length}
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
              active
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-300 flex items-center gap-1.5">
            {safeQueue.length > 0 ? (
              <>
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-sonos-wave-1" />
                  <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-sonos-wave-2" />
                  <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-sonos-wave-3" />
                </div>
                <span className="text-cyan-300 font-medium">Streaming / Downloading</span>
              </>
            ) : (
              <span className="text-slate-400">Queue idle & standby</span>
            )}
          </div>
        </div>

        {/* Monitored Waitlist */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Monitored
            </span>
            <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight font-sans">
            {overview?.waitlistCount ?? 3}
          </div>
          <div className="mt-3 text-xs text-slate-300 truncate">
            Awaiting releases & indexer grabs
          </div>
        </div>

        {/* Indexers / Prowlarr */}
        <div 
          onClick={() => onNavigate('queue')}
          className="theme-card p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
              Indexers
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight flex items-baseline gap-2 font-sans">
            {safeIndexers.filter(i => i.status === 'healthy').length}
            <span className="text-xs font-medium text-slate-300">/ {safeIndexers.length} online</span>
          </div>
          <div className="mt-3 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{overview?.grabs24h ?? 277} grabs in 24h</span>
          </div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-300">
            Connected Stack
          </h3>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-medium text-indigo-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1 hover:bg-indigo-500/10"
          >
            <span>Configure</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'sonarr', name: 'Sonarr', icon: Tv, count: `${overview?.seriesCount ?? 0} Series`, themeColor: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
            { id: 'radarr', name: 'Radarr', icon: Film, count: `${overview?.moviesCount ?? 0} Movies`, themeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
            { id: 'lidarr', name: 'Lidarr', icon: Music, count: `${overview?.musicCount ?? 0} Artists`, themeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
            { id: 'prowlarr', name: 'Prowlarr', icon: Radio, count: `${overview?.totalIndexers ?? safeIndexers.length} Indexers`, themeColor: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
          ].map(({ id, name, icon: Icon, count, themeColor }) => {
            const svcStatus = overview?.servicesStatus?.find((s: any) => s.id === id);
            const isConnected = svcStatus?.status === 'connected';
            const isError = svcStatus?.status === 'error';
            const portLabel = svcStatus?.disablePort 
              ? 'Tunnel' 
              : (svcStatus?.port ? `:${svcStatus.port}` : 'Standard');

            return (
              <div 
                key={id} 
                onClick={() => onNavigate('settings')}
                className="theme-card p-4 hover:border-indigo-400/40 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-sm ${themeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-white tracking-tight">{name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1c2436] border border-[#2b3952] text-slate-300 font-medium">
                    {portLabel}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="font-normal text-slate-200">{count}</span>
                  {isConnected ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {svcStatus?.latencyMs ? `${svcStatus.latencyMs}ms` : 'Active'}
                    </span>
                  ) : isError ? (
                    <span className="text-rose-400 flex items-center gap-1 font-medium text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Offline
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Untested
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Active Downloads & Upcoming Releases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Downloads Strip */}
        <div className="theme-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-sm">
                <DownloadCloud className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Active Queue & Transfers</h3>
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
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No active downloads in queue.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeQueue.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="bg-[#1c2436] border border-[#2b3952] rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white truncate max-w-xs font-sans">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                      {item.progress.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress Bar with Vivid High-Contrast Gradient */}
                  <div className="w-full h-2 bg-[#0e121c] border border-[#26334a] rounded-full overflow-hidden mb-2.5">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-indigo-500 rounded-full transition-all duration-300 shadow-sm shadow-cyan-500/30"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-mono">{item.downloadClient} • {item.protocol}</span>
                    <span className="font-mono text-white font-bold">ETA: {item.timeleft || 'Calculating...'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Releases Strip */}
        <div className="theme-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
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
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No upcoming scheduled releases found.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeCalendar.slice(0, 3).map((event) => {
                const serviceBadge = 
                  event.service === 'sonarr' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
                  event.service === 'radarr' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';

                return (
                  <div
                    key={event.id}
                    className="bg-[#1c2436] border border-[#2b3952] rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${serviceBadge}`}>
                          {event.service}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {event.seriesOrArtistTitle || event.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate pl-0.5">
                        {event.title}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-white block font-mono">{event.date}</span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {event.hasFile ? 'Downloaded' : 'Monitored'}
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
