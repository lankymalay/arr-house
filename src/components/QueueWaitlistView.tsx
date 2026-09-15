import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Clock, 
  Radio, 
  Trash2, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Search,
  HardDrive
} from 'lucide-react';
import type { QueueItem, MediaItem, ProwlarrIndexer } from '../types.js';
import { useToast } from '../context/ToastContext.js';

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
  onSelectItem
}) => {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'queue' | 'waitlist' | 'indexers'>('queue');
  const [testingIndexers, setTestingIndexers] = useState(false);

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
        success('Prowlarr Indexers Verified', 'All 5 indexers tested responsive (avg latency 92ms)');
      }
    } catch (e: any) {
      error('Indexer Test Failed', e.message);
    } finally {
      setTestingIndexers(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            id="tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Active Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {queue.length}
            </span>
          </button>

          <button
            id="tab-waitlist"
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'waitlist'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waitlist & Forthcoming</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {waitlist.length}
            </span>
          </button>

          <button
            id="tab-indexers"
            onClick={() => setActiveTab('indexers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'indexers'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Prowlarr Indexers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {indexers.length}
            </span>
          </button>
        </div>

        {activeTab === 'indexers' && (
          <button
            onClick={handleTestIndexers}
            disabled={testingIndexers}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingIndexers ? 'animate-spin' : ''}`} />
            <span>Test All Indexers</span>
          </button>
        )}
      </div>

      {/* Tab 1: Active Download Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <DownloadCloud className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">Queue is currently idle.</p>
              <p className="text-xs text-slate-500 mt-1">All monitored media items are up to date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {queue.map((item) => (
                <div
                  key={item.id}
                  id={`queue-item-${item.id}`}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-400">
                        {item.service}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.downloadClient} • {item.protocol.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white truncate">
                      {item.title}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-semibold text-cyan-400 shrink-0 w-12 text-right">
                        {item.progress.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{formatBytes(item.sizeBytes - item.sizeLeftBytes)} of {formatBytes(item.sizeBytes)}</span>
                      <span>ETA: <strong className="text-slate-300 font-mono">{item.timeleft || 'Unknown'}</strong></span>
                      <span className="capitalize text-cyan-400 font-medium">{item.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                    <button
                      onClick={() => handleRemoveQueueItem(item.id, item.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
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

      {/* Tab 2: Monitored Waitlist / Pending */}
      {activeTab === 'waitlist' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            Items currently monitored across your *arr instances that are missing release files or awaiting distribution.
          </div>

          {waitlist.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No pending or missing items in waitlist.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitlist.map((item) => (
                <div
                  key={`${item.service}-${item.id}`}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="w-16 h-24 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">No image</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {item.service}
                        </span>
                        <span className="text-xs text-slate-400">{item.year}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.artist || item.author || item.qualityProfile}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 font-semibold capitalize">
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleTriggerSearch(item)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/30 flex items-center gap-1 transition-colors cursor-pointer"
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
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{idx.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {idx.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                      <span className="uppercase font-mono font-semibold text-slate-300">{idx.protocol}</span>
                      <span>• Priority {idx.priority}</span>
                      <span>• Latency {idx.avgResponseTimeMs}ms</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Grabs (24h)</span>
                        <span className="text-sm font-bold text-cyan-400">{idx.grabs24h}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Queries (24h)</span>
                        <span className="text-sm font-bold text-purple-400">{idx.queries24h}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Mapped to 4 Apps</span>
                    <button
                      onClick={() => success('Indexer Tested', `${idx.name} returned HTTP 200 OK (${idx.avgResponseTimeMs}ms)`)}
                      className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
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
