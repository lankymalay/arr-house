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
      {/* 4-Widget Metric Grid - Material 3 High Contrast */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Library */}
        <div 
          onClick={() => onNavigate('libraries')}
          className="sonos-card p-5 hover:bg-[#242c3d] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1]">
              Total Library
            </span>
            <div className="w-9 h-9 rounded-full bg-[#183868] text-[#8ab4f8] border border-[#2a5594] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
            {overview?.totalMediaItems ?? 14}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#112d52] text-[#a8c7fa] border border-[#2b5fa3] font-bold text-[11px]">
              {overview?.seriesCount ?? 4} TV
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#422502] text-[#ffb873] border border-[#a15c0a] font-bold text-[11px]">
              {overview?.moviesCount ?? 3} Movies
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0a351f] text-[#69f0ae] border border-[#1b874c] font-bold text-[11px]">
              {overview?.musicCount ?? 3} Music
            </span>
          </div>
        </div>

        {/* Active Queue */}
        <div 
          onClick={() => onNavigate('queue')}
          className="sonos-card p-5 hover:bg-[#242c3d] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1]">
              Active Transfers
            </span>
            <div className="w-9 h-9 rounded-full bg-[#0c3d23] text-[#69f0ae] border border-[#16663c] flex items-center justify-center group-hover:scale-105 transition-transform">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-2 font-sans">
            {safeQueue.length}
            <span className="text-xs font-bold text-[#69f0ae] uppercase tracking-wider">
              active
            </span>
          </div>
          <div className="mt-3 text-xs text-[#cbd5e1] flex items-center gap-1.5">
            {safeQueue.length > 0 ? (
              <>
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-[#69f0ae] rounded-full animate-sonos-wave-1" />
                  <span className="w-0.5 h-3 bg-[#69f0ae] rounded-full animate-sonos-wave-2" />
                  <span className="w-0.5 h-1.5 bg-[#69f0ae] rounded-full animate-sonos-wave-3" />
                </div>
                <span className="text-white font-semibold">Streaming / Downloading</span>
              </>
            ) : (
              <span>Queue idle & standby</span>
            )}
          </div>
        </div>

        {/* Monitored Waitlist */}
        <div 
          onClick={() => onNavigate('queue')}
          className="sonos-card p-5 hover:bg-[#242c3d] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1]">
              Monitored
            </span>
            <div className="w-9 h-9 rounded-full bg-[#472602] text-[#ffb873] border border-[#854706] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
            {overview?.waitlistCount ?? 3}
          </div>
          <div className="mt-3 text-xs text-[#cbd5e1] truncate">
            Awaiting drops & indexer grabs
          </div>
        </div>

        {/* Indexers / Prowlarr */}
        <div 
          onClick={() => onNavigate('queue')}
          className="sonos-card p-5 hover:bg-[#242c3d] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1]">
              Indexers
            </span>
            <div className="w-9 h-9 rounded-full bg-[#0c3d23] text-[#69f0ae] border border-[#16663c] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-2 font-sans">
            {safeIndexers.filter(i => i.status === 'healthy').length}
            <span className="text-xs font-bold text-[#cbd5e1]">/ {safeIndexers.length} online</span>
          </div>
          <div className="mt-3 text-xs text-[#69f0ae] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#69f0ae]" />
            <span>{overview?.grabs24h ?? 277} grabs in 24h</span>
          </div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
            Connected Stack
          </h3>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-bold text-[#8ab4f8] hover:text-white flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1"
          >
            <span>Configure</span>
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
                className="bg-[#1d2331] border border-[#364056] rounded-2xl p-4 hover:border-[#556485] hover:bg-[#222939] transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#283854] text-[#8ab4f8] border border-[#48638f] flex items-center justify-center group-hover:bg-[#34486d] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-sm text-white tracking-tight">{name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#252c3e] border border-[#3b455b] text-[#cbd5e1] font-bold">
                    {portLabel}
                  </span>
                </div>
                <div className="text-xs text-[#cbd5e1] flex items-center justify-between">
                  <span className="font-medium text-white">{count}</span>
                  {isConnected ? (
                    <span className="text-[#69f0ae] flex items-center gap-1 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {svcStatus?.latencyMs ? `${svcStatus.latencyMs}ms` : 'Active'}
                    </span>
                  ) : isError ? (
                    <span className="text-[#ff8a80] flex items-center gap-1 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Offline
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] flex items-center gap-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
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
        <div className="sonos-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0c3d23] text-[#69f0ae] border border-[#16663c] flex items-center justify-center">
                <DownloadCloud className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">Active Queue & Transfers</h3>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs text-[#8ab4f8] hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1"
            >
              <span>Full Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {safeQueue.length === 0 ? (
            <div className="py-12 text-center text-[#cbd5e1] text-xs font-medium">
              No active downloads in queue.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeQueue.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  className="bg-[#252c3e] border border-[#3b455b] rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white truncate max-w-xs font-sans">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-bold text-[#69f0ae] px-2.5 py-0.5 rounded-full bg-[#0a351f] border border-[#1b874c] shrink-0">
                      {item.progress.toFixed(0)}%
                    </span>
                  </div>

                  {/* Material Design Progress Bar */}
                  <div className="w-full h-2 bg-[#141822] border border-[#364056] rounded-full overflow-hidden mb-2.5">
                    <div 
                      className="h-full bg-[#8ab4f8] rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#cbd5e1]">
                    <span className="font-mono">{item.downloadClient} • {item.protocol}</span>
                    <span className="font-mono text-white font-bold">ETA: {item.timeleft || 'Calculating...'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Releases Strip */}
        <div className="sonos-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#183868] text-[#8ab4f8] border border-[#2a5594] flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">Upcoming Releases</h3>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs text-[#8ab4f8] hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors pixel-pill px-2.5 py-1"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {safeCalendar.length === 0 ? (
            <div className="py-12 text-center text-[#cbd5e1] text-xs font-medium">
              No upcoming scheduled releases found.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {safeCalendar.slice(0, 3).map((event) => {
                const serviceBadge = 
                  event.service === 'sonarr' ? 'bg-[#112d52] text-[#a8c7fa] border border-[#2b5fa3]' :
                  event.service === 'radarr' ? 'bg-[#422502] text-[#ffb873] border border-[#a15c0a]' :
                  'bg-[#0a351f] text-[#69f0ae] border border-[#1b874c]';

                return (
                  <div
                    key={event.id}
                    className="bg-[#252c3e] border border-[#3b455b] rounded-2xl p-3.5 flex items-center justify-between gap-3"
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
                      <p className="text-[11px] text-[#cbd5e1] truncate pl-0.5">
                        {event.title}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-white block font-mono">{event.date}</span>
                      <span className="text-[10px] text-[#cbd5e1] font-bold">
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
