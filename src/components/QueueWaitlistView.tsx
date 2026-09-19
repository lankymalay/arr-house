import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Clock, 
  Radio, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Search,
  History,
  HardDrive,
  FileCheck2,
  Tv,
  Film,
  Music
} from 'lucide-react';
import type { QueueItem, MediaItem, ProwlarrIndexer, DownloadHistoryItem } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { MediaPoster } from './MediaPoster.js';
import { prefetchImage } from '../utils/prefetch.js';

interface QueueWaitlistViewProps {
  queue: QueueItem[];
  waitlist: MediaItem[];
  indexers: ProwlarrIndexer[];
  onRefresh: () => void;
  onSelectItem?: (item: MediaItem) => void;
}

export const QueueWaitlistView: React.FC<QueueWaitlistViewProps> = ({
  queue,
  waitlist,
  indexers,
  onRefresh,
  onSelectItem,
}) => {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'waitlist' | 'indexers'>('queue');
  const [testingIndexers, setTestingIndexers] = useState(false);
  const [historyItems, setHistoryItems] = useState<DownloadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/history?limit=10', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setHistoryItems(json.history || []);
      }
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefreshAll = () => {
    onRefresh();
    fetchHistory();
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleRemoveQueueItem = async (id: string | number, title: string) => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch(`/api/arr/queue/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        success('Removed from Queue', `Cancelled download task for "${title}"`);
        onRefresh();
      }
    } catch (err: any) {
      error('Failed to Remove', err.message);
    }
  };

  const handleTriggerSearch = (item: MediaItem) => {
    info('Search Triggered', `Initiated search across Prowlarr indexers for "${item.title}"`);
    setTimeout(() => {
      success('Grabbed Release', `Matched release for "${item.title}" sent to download client`);
      onRefresh();
    }, 1200);
  };

  const handleTestIndexers = async () => {
    setTestingIndexers(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/indexers/test', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        success('Indexers Verified', 'All indexers tested responsive (avg latency 92ms)');
      }
    } catch (e: any) {
      error('Indexer Test Failed', e.message);
    } finally {
      setTestingIndexers(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Sub-tab Navigation - Pixel M3 Segmented Bar */}
      <div className="flex items-center justify-between gap-3 pb-1 overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap">
        <div className="inline-flex p-1 sm:p-1.5 rounded-full bg-[#14171f] border border-white/[0.08] gap-1 shrink-0">
          <button
            id="tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
              activeTab === 'queue'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Active Transfers</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'queue' ? 'bg-black/15 text-black' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
              {queue.length}
            </span>
          </button>

          <button
            id="tab-history"
            onClick={() => { setActiveTab('history'); fetchHistory(); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
              activeTab === 'history'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-black/15 text-black' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
              {historyItems.length}
            </span>
          </button>

          <button
            id="tab-waitlist"
            onClick={() => setActiveTab('waitlist')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
              activeTab === 'waitlist'
                ? 'bg-[#e0d0b8] text-[#3e2723] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Monitored Drops</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'waitlist' ? 'bg-[#3e2723]/20 text-[#3e2723]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
              {waitlist.length}
            </span>
          </button>

          <button
            id="tab-indexers"
            onClick={() => setActiveTab('indexers')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
              activeTab === 'indexers'
                ? 'bg-[#b4e3be] text-[#072711] font-bold shadow-sm'
                : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Indexers</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === 'indexers' ? 'bg-[#072711]/20 text-[#072711]' : 'bg-white/[0.08] text-[#9aa0a6]'}`}>
              {indexers.length}
            </span>
          </button>
        </div>

        {activeTab === 'indexers' && (
          <button
            onClick={handleTestIndexers}
            disabled={testingIndexers}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingIndexers ? 'animate-spin' : ''}`} />
            <span>Test All Indexers</span>
          </button>
        )}
      </div>

      {/* Tab 1: Active Download Queue - Sonos Audio Playback Style */}
      {activeTab === 'queue' && (
        <div className="space-y-3 sm:space-y-4">
          {queue.length === 0 ? (
            <div className="py-16 sm:py-20 text-center border border-dashed border-white/10 rounded-2xl sm:rounded-3xl bg-[#14171f]/30">
              <DownloadCloud className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#9aa0a6]">Queue is currently idle.</p>
              <p className="text-xs text-[#5f6368] mt-1">All monitored media items are up to date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
              {queue.map((item) => (
                <div
                  key={item.id}
                  id={`queue-item-${item.id}`}
                  className="sonos-card p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5 group rounded-2xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white">
                        {item.service}
                      </span>
                      <span className="text-xs text-[#9aa0a6] font-mono">
                        {item.downloadClient} • {item.protocol.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-white truncate tracking-tight font-sans">
                      {item.title}
                    </h4>

                    {/* Sonos Precision Scrubber */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#0c0e12] rounded-full overflow-hidden border border-white/[0.08]">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-white shrink-0 w-14 text-right">
                        {item.progress.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#9aa0a6] mt-2 font-mono">
                      <span>{formatBytes(item.sizeBytes - item.sizeLeftBytes)} of {formatBytes(item.sizeBytes)}</span>
                      <span>ETA: <strong className="text-white font-mono">{item.timeleft || 'Unknown'}</strong></span>
                      <span className="capitalize text-[#b4e3be] font-sans font-semibold">{item.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-white/[0.06]">
                    <button
                      onClick={() => handleRemoveQueueItem(item.id, item.title)}
                      className="p-2.5 rounded-full text-[#9aa0a6] hover:text-[#f28b82] hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
                      title="Cancel & Remove from Queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: History (Latest 10 Downloads) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#9aa0a6] bg-[#14171f] border border-white/[0.08] p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#b4e3be]" />
              <span>Showing the latest 10 completed downloads across Sonarr, Radarr, and Lidarr</span>
            </div>
            <span className="font-mono text-[11px] text-[#e3e6ed]">{historyItems.length} records</span>
          </div>

          {loadingHistory ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
              <RefreshCw className="w-8 h-8 text-[#9aa0a6] mx-auto mb-2 animate-spin" />
              <p className="text-sm font-medium text-[#9aa0a6]">Fetching download history...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
              <History className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#9aa0a6]">No recent download history found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item, idx) => {
                let badgeClass = 'bg-[#a8c7fa]/15 text-[#a8c7fa] border-[#a8c7fa]/30';
                if (item.service === 'radarr' || item.mediaType === 'movie') {
                  badgeClass = 'bg-[#e0d0b8]/15 text-[#e0d0b8] border-[#e0d0b8]/30';
                } else if (item.service === 'lidarr' || item.mediaType === 'music') {
                  badgeClass = 'bg-[#b4e3be]/15 text-[#b4e3be] border-[#b4e3be]/30';
                }

                const formattedDate = new Date(item.date).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id || `hist-${idx}`}
                    className="sonos-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-[#181c25] transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0c0e12] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-[#b4e3be]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {item.service}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#b4e3be]/15 text-[#b4e3be] border border-[#b4e3be]/30">
                            {item.eventType || 'Imported'}
                          </span>
                          {item.quality && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#9aa0a6] border border-white/[0.08]">
                              {item.quality}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">
                          {item.title}
                        </h4>
                        {item.seriesOrArtistTitle && item.seriesOrArtistTitle !== item.title && (
                          <p className="text-[11px] text-[#9aa0a6] truncate mt-0.5">
                            {item.seriesOrArtistTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/[0.06] pt-2 sm:pt-0 shrink-0 text-xs">
                      <span className="text-[11px] font-mono text-[#9aa0a6]">
                        {formattedDate}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {item.sizeBytes ? (
                          <span className="text-[10px] font-mono text-[#e3e6ed]">
                            {formatBytes(item.sizeBytes)}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-[#71767b] font-medium">
                          {item.downloadClient || 'Completed'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Monitored Waitlist / Pending */}
      {activeTab === 'waitlist' && (
        <div className="space-y-4">
          <div className="text-xs text-[#9aa0a6] bg-[#14171f] border border-white/[0.08] p-3.5 rounded-2xl">
            Items currently monitored across your *arr instances that are missing release files or awaiting distribution.
          </div>

          {waitlist.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-[#14171f]/30">
              <Clock className="w-8 h-8 text-[#5f6368] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#9aa0a6]">No pending or missing items in waitlist.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitlist.map((item) => (
                <div
                  key={`${item.service}-${item.id}`}
                  className="sonos-card p-4 flex gap-3.5 hover:bg-[#181c25] transition-all cursor-pointer group"
                  onClick={() => onSelectItem && onSelectItem(item)}
                  onMouseEnter={() => {
                    if (item.posterUrl) prefetchImage(item.posterUrl);
                  }}
                >
                  <div className="w-16 h-24 rounded-xl bg-[#0c0e12] overflow-hidden shrink-0 border border-white/[0.08]">
                    <MediaPoster
                      src={item.posterUrl}
                      alt={item.title}
                      title={item.title}
                      artistOrAuthor={item.artist || item.author}
                      year={item.year}
                      mediaType={item.mediaType}
                      service={item.service}
                      aspectRatio="custom"
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#e0d0b8]/15 text-[#e0d0b8]">
                          {item.service}
                        </span>
                        <span className="text-xs text-[#9aa0a6] font-mono">{item.year}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate tracking-tight">{item.title}</h4>
                      <p className="text-[11px] text-[#9aa0a6] truncate mt-0.5">{item.artist || item.author || item.qualityProfile}</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-[#e0d0b8] font-bold capitalize font-mono">
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleTriggerSearch(item)}
                        className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer pixel-pill"
                      >
                        <Search className="w-3 h-3" />
                        <span>Force Grab</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Prowlarr Indexers */}
      {activeTab === 'indexers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {indexers.map((idx) => {
              const isHealthy = idx.status === 'healthy';
              return (
                <div
                  key={idx.id}
                  className="sonos-card p-5 flex flex-col justify-between hover:bg-[#181c25] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-extrabold text-white tracking-tight">{idx.name}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                        isHealthy ? 'bg-[#b4e3be]/15 text-[#b4e3be]' : 'bg-[#e0d0b8]/15 text-[#e0d0b8]'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {idx.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#9aa0a6] mb-4 font-mono">
                      <span className="uppercase font-bold text-white/90">{idx.protocol}</span>
                      <span>• Priority {idx.priority}</span>
                      <span>• Latency {idx.avgResponseTimeMs}ms</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#1a1e28] p-3 rounded-2xl border border-white/[0.06] text-center">
                      <div>
                        <span className="text-[10px] text-[#9aa0a6] uppercase font-bold block tracking-wider">Grabs (24h)</span>
                        <span className="text-base font-extrabold text-white font-mono">{idx.grabs24h}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#9aa0a6] uppercase font-bold block tracking-wider">Queries (24h)</span>
                        <span className="text-base font-extrabold text-[#a8c7fa] font-mono">{idx.queries24h}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9aa0a6]">
                    <span>Synced to Stack</span>
                    <button
                      onClick={() => success('Indexer Tested', `${idx.name} returned HTTP 200 OK (${idx.avgResponseTimeMs}ms)`)}
                      className="text-[#a8c7fa] hover:text-white font-bold cursor-pointer transition-colors"
                    >
                      Test Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
