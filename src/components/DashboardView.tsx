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
  HardDrive,
  Calendar,
  ExternalLink
} from 'lucide-react';
import type { MediaItem, QueueItem, CalendarEvent, ProwlarrIndexer } from '../types.js';
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
  onOpenAddModal
}) => {
  const safeQueue = Array.isArray(queue) ? queue : [];
  const safeCalendar = Array.isArray(calendar) ? calendar : [];
  const safeIndexers = Array.isArray(indexers) ? indexers : [];

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 4-Card Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div 
          onClick={() => onNavigate('libraries')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Library</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {overview?.totalMediaItems ?? 14}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
            <span className="text-sky-400 font-medium">{overview?.seriesCount ?? 4} TV</span> • 
            <span className="text-amber-400 font-medium">{overview?.moviesCount ?? 3} Movies</span> • 
            <span className="text-emerald-400 font-medium">{overview?.musicCount ?? 3} Music</span>
          </div>
        </div>

        {/* Active Queue */}
        <div 
          onClick={() => onNavigate('queue')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Queue</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
            {safeQueue.length}
            <span className="text-xs font-normal text-cyan-400">tasks active</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {safeQueue.length > 0 
              ? `${safeQueue.length} ${safeQueue.length === 1 ? 'item' : 'items'} in download queue`
              : 'Download queue idle'}
          </div>
        </div>

        {/* Monitored Waitlist */}
        <div 
          onClick={() => onNavigate('queue')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Waitlist</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {overview?.waitlistCount ?? 3}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Unreleased or awaiting indexer grabs
          </div>
        </div>

        {/* Indexers / Prowlarr */}
        <div 
          onClick={() => onNavigate('queue')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Prowlarr Indexers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
            {safeIndexers.filter(i => i.status === 'healthy').length}
            <span className="text-xs font-normal text-slate-400">/ {safeIndexers.length} online</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400">
            {overview?.grabs24h ?? 277} grabs completed in past 24h
          </div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Connected Stack Profiles
          </h3>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Configure Services</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'sonarr', name: 'Sonarr', icon: Tv, count: `${overview?.seriesCount ?? 0} Series` },
            { id: 'radarr', name: 'Radarr', icon: Film, count: `${overview?.moviesCount ?? 0} Movies` },
            { id: 'lidarr', name: 'Lidarr', icon: Music, count: `${overview?.musicCount ?? 0} Artists` },
            { id: 'prowlarr', name: 'Prowlarr', icon: Radio, count: `${overview?.totalIndexers ?? safeIndexers.length} Indexers` },
          ].map(({ id, name, icon: Icon, count }) => {
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
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-sm text-white">{name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {portLabel}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>{count}</span>
                  {isConnected ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {svcStatus?.latencyMs ? `${svcStatus.latencyMs}ms` : 'Connected'}
                    </span>
                  ) : isError ? (
                    <span className="text-rose-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Offline
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Active Queue & Downloads</h3>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {safeQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No active downloads in queue.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeQueue.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-xs">
                      {item.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-cyan-400 shrink-0">
                      {item.status} ({item.progress.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.downloadClient} ({item.protocol})</span>
                    <span>ETA: {item.timeleft || 'Calculating...'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Releases Strip */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Upcoming Releases</h3>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {safeCalendar.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No upcoming scheduled releases found.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeCalendar.slice(0, 3).map((event) => {
                const serviceColor = 
                  event.service === 'sonarr' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' :
                  event.service === 'radarr' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                  'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

                return (
                  <div
                    key={event.id}
                    className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${serviceColor}`}>
                          {event.service}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {event.seriesOrArtistTitle || event.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {event.title}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-300 block">{event.date}</span>
                      <span className="text-[10px] text-slate-500">
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
