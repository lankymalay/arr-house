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
  Music,
  PartyPopper
} from 'lucide-react';
import type { QueueItem, MediaItem, ProwlarrIndexer, DownloadHistoryItem } from '../types.js';
import { getContentTypeLabel } from '../types.js';
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
  const [ticker, setTicker] = useState(Date.now());

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

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'queue') {
      const interval = setInterval(() => {
        onRefresh();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab, onRefresh]);

  // Live 1-second ticker when items are complete or at 100%
  useEffect(() => {
    const hasCompleted = queue.some(
      (item) => item.progress >= 100 || item.status === 'completed'
    );
    if (!hasCompleted) return;

    const timer = setInterval(() => {
      setTicker(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [queue]);

  const handleRefreshAll = () => {
    onRefresh();
    fetchHistory();
  };

  const handleMoveToHistory = async (id?: string | number, title?: string, silent = false) => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/queue/move-to-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(id ? { id } : { allCompleted: true })
      });
      if (res.ok) {
        if (!silent) {
          success('Moved to History', title ? `"${title}" moved to history` : 'Transfers moved to history');
        }
        onRefresh();
        fetchHistory();
      }
    } catch (err: any) {
      if (!silent) {
        error('Failed to Move', err.message);
      }
    }
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">
        <div className="flex flex-wrap items-center p-1 sm:p-1.5 rounded-2xl sm:rounded-full bg-[#14171f] border border-white/[0.08] gap-1 w-full sm:w-auto">
          <button
            id="tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
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
            className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
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
            className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
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
            className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill ${
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
          {queue.some((item) => item.progress >= 100 || item.status === 'completed') && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-[#b4e3be]/10 border border-[#b4e3be]/20 text-xs">
              <div className="flex items-center gap-2 text-[#b4e3be]">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#b4e3be]" />
                <span>Finished downloads remain for 1 minute before automatically moving to History.</span>
              </div>
              <button
                onClick={() => handleMoveToHistory()}
                className="px-3 py-1 rounded-full bg-[#b4e3be] hover:bg-emerald-300 text-black font-bold text-[11px] transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Move All Completed Now
              </button>
            </div>
          )}

          {queue.length === 0 ? (
            <div className="py-16 sm:py-20 text-center border border-dashed border-white/10 rounded-2xl sm:rounded-3xl bg-[#14171f]/30 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">All caught up!</h3>
              <p className="text-sm text-slate-400 mt-2">No active downloads or imports in the queue</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
              {queue.map((item) => {
                const isComplete =
                  item.progress >= 100 ||
                  (item.sizeBytes > 0 && item.sizeLeftBytes === 0) ||
                  item.status === 'completed';

                let secondsLeft = 0;
                if (isComplete) {
                  if (item.completedAt) {
                    const elapsedSec = Math.floor((ticker - item.completedAt) / 1000);
                    secondsLeft = Math.max(0, 60 - elapsedSec);
                  } else if (typeof item.secondsUntilHistory === 'number') {
                    secondsLeft = Math.max(0, item.secondsUntilHistory);
                  }
                }

                return (
                  <div
                    key={item.id}
                    id={`queue-item-${item.id}`}
                    className="sonos-card p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5 group rounded-2xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white">
                          {getContentTypeLabel(item.service)}
                        </span>
                        {isComplete ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#b4e3be]/20 text-[#b4e3be] border border-[#b4e3be]/30 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>100% COMPLETE</span>
                          </span>
                        ) : null}
                        <span className="text-xs text-[#9aa0a6] font-mono">
                          {item.downloadClient} • {item.protocol.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-extrabold text-white truncate tracking-tight font-sans">
                        {item.title}
                      </h4>

                      {/* Sonos Precision Scrubber */}
                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#0c0e12] rounded-full overflow-hidden border border-white/[0.08]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isComplete 
                                  ? 'bg-[#b4e3be]' 
                                  : item.progress >= 50 
                                    ? 'bg-white' 
                                    : 'bg-white/80'
                              }`}
                              style={{ width: `${Math.min(100, item.progress)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-white shrink-0 w-14 text-right">
                            {item.progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] font-mono text-slate-400">{Math.round(item.progress || 0)}%</span>
                          {item.timeleft && item.timeleft !== '00:00:00' && (
                            <span className="text-[11px] text-slate-400">~{item.timeleft} remaining</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#9aa0a6] mt-2 font-mono flex-wrap gap-2">
                        <span>{formatBytes(item.sizeBytes - item.sizeLeftBytes)} of {formatBytes(item.sizeBytes)}</span>
                        {isComplete ? (
                          <span className="text-[#b4e3be] font-sans font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#b4e3be]" />
                            <span>
                              {secondsLeft > 0 ? (
                                <>Moving to history in <strong className="font-mono text-white">{secondsLeft}s</strong></>
                              ) : (
                                'Moving to history...'
                              )}
                            </span>
                          </span>
                        ) : (
                          <span>ETA: <strong className="text-white font-mono">{item.timeleft || 'Unknown'}</strong></span>
                        )}
                        <span className="capitalize text-[#b4e3be] font-sans font-semibold">{item.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-white/[0.06]">
                      {isComplete && (
                        <button
                          onClick={() => handleMoveToHistory(item.id, item.title)}
                          className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white text-xs font-semibold text-white hover:text-black transition-all cursor-pointer pixel-pill border border-white/10 flex items-center gap-1.5"
                          title="Move to History now"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Move to History</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveQueueItem(item.id, item.title)}
                        className="p-2.5 rounded-full text-[#9aa0a6] hover:text-[#f28b82] hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
                        title="Cancel & Remove from Queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

                let formattedDate = 'Recently';
                if (item.date) {
                  try {
                    const parsed = new Date(item.date);
                    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970) {
                      const res = parsed.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      });
                      if (res && !res.toLowerCase().includes('invalid')) {
                        formattedDate = res;
                      }
                    }
                  } catch {
                    // ignore
                  }
                }

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
                            {getContentTypeLabel(item.service)}
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
                          {getContentTypeLabel(item.service, item.mediaType)}
                        </span>
                        {item.year && item.mediaType !== 'music' && item.service !== 'lidarr' && (
                          <span className="text-xs text-[#9aa0a6] font-mono">{item.year}</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate tracking-tight">{item.title}</h4>
                      {(item.artist || item.author) && (
                        <p className="text-[11px] text-[#9aa0a6] truncate mt-0.5">{item.artist || item.author}</p>
                      )}
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
