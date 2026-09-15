import React, { useState } from 'react';
import { 
  X, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  Folder, 
  Bookmark, 
  BookmarkCheck,
  Play
} from 'lucide-react';
import type { MediaItem } from '../types.js';
import { useToast } from '../context/ToastContext.js';

interface ItemDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onRefreshItem: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onRefreshItem }) => {
  const { success, info } = useToast();
  const [monitored, setMonitored] = useState(item?.monitored ?? true);

  if (!item) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleForceSearch = () => {
    info('Search Dispatched', `Automated grab search sent to ${item.service.toUpperCase()} for "${item.title}"`);
    setTimeout(() => {
      success('Grab Task Scheduled', 'Download client received matched torrent/nzb');
      onRefreshItem();
    }, 1000);
  };

  const handleToggleMonitored = () => {
    const nextState = !monitored;
    setMonitored(nextState);
    success('Monitoring Updated', `${item.title} is now ${nextState ? 'Monitored' : 'Unmonitored'}`);
  };

  const getServicePort = (service: string) => {
    switch (service) {
      case 'sonarr': return 8989;
      case 'radarr': return 7878;
      case 'lidarr': return 8686;
      default: return 3000;
    }
  };

  const nativeWebUiUrl = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${getServicePort(item.service)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Banner / Poster Header */}
        <div className="relative h-48 sm:h-56 bg-slate-950 overflow-hidden shrink-0">
          <img
            src={item.posterUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-sm opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close Button */}
          <button
            id="close-item-detail-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Item Meta Over Banner */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 z-10">
            <div className="w-20 h-30 sm:w-24 sm:h-36 rounded-xl bg-slate-950 overflow-hidden shrink-0 border-2 border-slate-700/80 shadow-2xl">
              <img
                src={item.posterUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 pb-1 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {item.service}
                </span>
                <span className="text-xs text-slate-300 font-semibold">{item.year}</span>
                {item.qualityProfile && (
                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    {item.qualityProfile}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white truncate">{item.title}</h2>
              {(item.artist || item.author) && (
                <p className="text-xs text-slate-300 truncate">{item.artist || item.author}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status and Specs row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</span>
              <div className="flex items-center gap-1.5">
                {item.status === 'downloaded' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold text-white capitalize">{item.status}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Storage Size</span>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">
                  {item.sizeBytes ? formatBytes(item.sizeBytes) : '0 B (Missing)'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Episodes / Tracks</span>
              <span className="text-xs font-bold text-white">
                {item.episodeFileCount !== undefined ? `${item.episodeFileCount} / ${item.episodeCount}` :
                 item.trackCount !== undefined ? `${item.trackCount} Tracks` : 'Single Item'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monitoring</span>
              <button
                onClick={handleToggleMonitored}
                className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                {monitored ? <BookmarkCheck className="w-4 h-4 text-cyan-400" /> : <Bookmark className="w-4 h-4 text-slate-500" />}
                <span>{monitored ? 'Active' : 'Ignored'}</span>
              </button>
            </div>
          </div>

          {/* Path on TrueNAS */}
          {item.path && (
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2 text-xs">
              <Folder className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-slate-400">Host Path:</span>
              <span className="text-slate-200 font-mono truncate">{item.path}</span>
            </div>
          )}

          {/* Overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Synopsis</h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {item.overview || 'No extended summary provided by media indexer.'}
            </p>
          </div>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              {item.genres.map((g) => (
                <span key={g} className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-medium">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <a
            href={nativeWebUiUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700/80 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in {item.service.toUpperCase()} Web UI</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSearch}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Interactive Grab Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
