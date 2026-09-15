import React, { useState } from 'react';
import { 
  X, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Folder, 
  Bookmark, 
  BookmarkCheck
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
      success('Grab Task Scheduled', 'Download client received matched release');
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

  const serviceBadgeClass = 
    item.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
    item.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
    'bg-[#b4e3be] text-[#072711]';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#14171f] border border-white/[0.09] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Banner / Poster Header */}
        <div className="relative h-48 sm:h-56 bg-[#0c0e12] overflow-hidden shrink-0">
          <img
            src={item.posterUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-md opacity-25 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14171f] via-[#14171f]/60 to-transparent" />

          {/* Close Button */}
          <button
            id="close-item-detail-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-[#9aa0a6] hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-20 cursor-pointer pixel-pill"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Item Meta Over Banner */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 z-10">
            <div className="w-20 h-30 sm:w-24 sm:h-36 rounded-2xl bg-[#0c0e12] overflow-hidden shrink-0 border-2 border-white/10 shadow-2xl">
              <img
                src={item.posterUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 pb-1 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-sm ${serviceBadgeClass}`}>
                  {item.service}
                </span>
                <span className="text-xs text-[#9aa0a6] font-mono font-bold">{item.year}</span>
                {item.qualityProfile && (
                  <span className="text-[10px] text-[#e3e6ed] bg-white/[0.08] px-2.5 py-0.5 rounded-full">
                    {item.qualityProfile}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate font-sans tracking-tight">
                {item.title}
              </h2>
              {(item.artist || item.author) && (
                <p className="text-xs text-[#9aa0a6] truncate mt-0.5">{item.artist || item.author}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status and Specs row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1a1e28] p-3.5 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-[#9aa0a6] block mb-1">Status</span>
              <div className="flex items-center gap-1.5">
                {item.status === 'downloaded' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#b4e3be]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#e0d0b8]" />
                )}
                <span className="text-xs font-bold text-white capitalize">{item.status}</span>
              </div>
            </div>

            <div className="bg-[#1a1e28] p-3.5 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-[#9aa0a6] block mb-1">Storage Size</span>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#a8c7fa]" />
                <span className="text-xs font-bold text-white font-mono">
                  {item.sizeBytes ? formatBytes(item.sizeBytes) : '0 B (Missing)'}
                </span>
              </div>
            </div>

            <div className="bg-[#1a1e28] p-3.5 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-[#9aa0a6] block mb-1">Media Files</span>
              <span className="text-xs font-bold text-white font-mono">
                {item.episodeFileCount !== undefined ? `${item.episodeFileCount} / ${item.episodeCount} Ep` :
                 item.trackCount !== undefined ? `${item.trackCount} Tracks` : 'Single Item'}
              </span>
            </div>

            <div className="bg-[#1a1e28] p-3.5 rounded-2xl border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-[#9aa0a6] block mb-1">Monitoring</span>
              <button
                onClick={handleToggleMonitored}
                className="flex items-center gap-1 text-xs font-bold text-white hover:text-[#b4e3be] cursor-pointer transition-colors"
              >
                {monitored ? <BookmarkCheck className="w-4 h-4 text-[#b4e3be]" /> : <Bookmark className="w-4 h-4 text-[#5f6368]" />}
                <span>{monitored ? 'Active' : 'Ignored'}</span>
              </button>
            </div>
          </div>

          {/* Host Path */}
          {item.path && (
            <div className="bg-[#1a1e28] p-3.5 rounded-2xl border border-white/[0.06] flex items-center gap-2 text-xs">
              <Folder className="w-4 h-4 text-[#9aa0a6] shrink-0" />
              <span className="text-[#9aa0a6]">Host Path:</span>
              <span className="text-white font-mono truncate">{item.path}</span>
            </div>
          )}

          {/* Overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] mb-2">Synopsis</h4>
            <p className="text-xs sm:text-sm text-[#e3e6ed] leading-relaxed">
              {item.overview || 'No extended summary provided by media indexer.'}
            </p>
          </div>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {item.genres.map((g) => (
                <span key={g} className="text-xs text-[#9aa0a6] bg-[#1a1e28] px-3 py-1 rounded-full border border-white/[0.06] font-medium">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 bg-[#0c0e12]/80 border-t border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
          <a
            href={nativeWebUiUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-full bg-[#1a1e28] hover:bg-[#222734] text-white text-xs font-bold flex items-center gap-1.5 border border-white/[0.08] transition-colors pixel-pill"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in {item.service.toUpperCase()}</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSearch}
              className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer pixel-pill"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Interactive Grab</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
