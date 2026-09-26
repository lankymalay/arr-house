import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Folder, 
  Bookmark, 
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  Tv,
  Check,
  Zap,
  DownloadCloud,
  Star,
  ShieldCheck
} from 'lucide-react';
import type { MediaItem, TvShowDetails } from '../types.js';
import { getContentTypeLabel } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { getSpecificServiceContentUrl } from '../utils/serviceUrl.js';
import { MediaPoster } from './MediaPoster.js';
import { RatingBadge } from './RatingBadge.js';
import { InteractiveGrabModal, InteractiveGrabTarget } from './InteractiveGrabModal.js';

interface ItemDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onRefreshItem: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onRefreshItem }) => {
  const { success, info, error } = useToast();
  const [monitored, setMonitored] = useState(item?.monitored ?? true);
  const [tvDetails, setTvDetails] = useState<TvShowDetails | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set([1]));
  const [interactiveTarget, setInteractiveTarget] = useState<InteractiveGrabTarget | null>(null);
  const [grabbingFast, setGrabbingFast] = useState(false);

  const isTvShow = item?.service === 'sonarr' || item?.mediaType === 'tv';

  useEffect(() => {
    if (!item || !isTvShow) return;

    const fetchTv = async () => {
      try {
        const token = localStorage.getItem('arr_token');
        const res = await fetch(`/api/arr/series/details?title=${encodeURIComponent(item.title)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setTvDetails(data);
        }
      } catch (e) {
        console.warn('Could not fetch TV details for library item', e);
      }
    };

    fetchTv();
  }, [item, isTvShow]);

  if (!item) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFastGrab = async (targetOverride?: { season?: number; episode?: number; subtitle?: string }) => {
    setGrabbingFast(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/grab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: item.service,
          title: item.title,
          year: item.year,
          mediaType: item.mediaType,
          posterUrl: item.posterUrl,
          mode: 'fast',
          foreignId: item.id,
          imdbId: item.imdbId || tvDetails?.imdbId,
          tvdbId: item.tvdbId || tvDetails?.tvdbId,
          tmdbId: item.tmdbId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Grab Dispatched', data.message || `Grabbed top release based on profile for "${item.title}"`);
        onRefreshItem();
      } else {
        info('Notice', data.message || 'Sent automatic grab search command');
        onRefreshItem();
      }
    } catch (e: any) {
      error('Grab Failed', e.message || 'Could not dispatch automatic grab');
    } finally {
      setGrabbingFast(false);
    }
  };

  const handleToggleMonitored = () => {
    const nextState = !monitored;
    setMonitored(nextState);
    success('Monitoring Updated', `${item.title} is now ${nextState ? 'Monitored' : 'Unmonitored'}`);
  };

  const { services } = useSettings();
  const serviceKey = item.service || (item.mediaType === 'movie' ? 'radarr' : item.mediaType === 'tv' ? 'sonarr' : item.mediaType === 'music' ? 'lidarr' : '');
  const specificContentUrl = getSpecificServiceContentUrl(services[serviceKey], serviceKey, item);

  const serviceBadgeClass = 
    item.service === 'sonarr' ? 'bg-sky-500 text-white font-bold' :
    item.service === 'radarr' ? 'bg-amber-500 text-white font-bold' :
    'bg-emerald-500 text-white font-bold';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#141a29] border border-[#26334a] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Banner / Poster Header */}
        <div className="relative h-48 sm:h-56 bg-[#0a0d14] overflow-hidden shrink-0">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover blur-md opacity-25 scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141a29] via-[#141a29]/60 to-transparent" />

          {/* Close Button */}
          <button
            id="close-item-detail-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-20 cursor-pointer pixel-pill"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Item Meta Over Banner */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 z-10">
            <div className="w-20 h-30 sm:w-24 sm:h-36 rounded-2xl bg-[#0a0d14] overflow-hidden shrink-0 border-2 border-white/20 shadow-2xl">
              <MediaPoster
                src={item.posterUrl}
                alt={item.title}
                title={item.title}
                artistOrAuthor={item.artist || item.author}
                year={item.year}
                mediaType={item.mediaType}
                service={item.service}
                aspectRatio="custom"
                priority={true}
                className="w-full h-full"
              />
            </div>

            <div className="min-w-0 pb-1 flex-1">
              {/* Primary content title and Rating */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate font-sans tracking-tight" title={item.title}>
                  {item.title}
                </h2>
                {item.rating ? (
                  <RatingBadge rating={item.rating} source={item.ratingSource} votes={item.ratingVotes} variant="inline" />
                ) : null}
              </div>
              {(item.artist || item.author) && (
                <p className="text-xs sm:text-sm font-medium text-slate-300 truncate mb-2">{item.artist || item.author}</p>
              )}

              {/* Secondary metadata: Year, Service */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.mediaType !== 'music' && item.service !== 'lidarr' && item.year ? (
                  <>
                    <span className="text-xs text-cyan-300 font-sans font-semibold">{item.year}</span>
                    <span className="text-slate-500">•</span>
                  </>
                ) : null}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${serviceBadgeClass}`}>
                  {getContentTypeLabel(item.service, item.mediaType)}
                </span>
                {(item.imdbId || tvDetails?.imdbId) && (
                  <span
                    className="text-[10px] font-mono font-medium text-amber-300 bg-amber-950/70 border border-amber-700/50 px-2 py-0.5 rounded-full flex items-center gap-1"
                    title="Authoritative IMDb ID"
                  >
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>IMDb: {item.imdbId || tvDetails?.imdbId}</span>
                  </span>
                )}
                {(item.tvdbId || tvDetails?.tvdbId) && (
                  <span
                    className="text-[10px] font-mono font-medium text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-2 py-0.5 rounded-full flex items-center gap-1"
                    title="Authoritative TheTVDB ID"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>TVDB: {item.tvdbId || tvDetails?.tvdbId}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status and Specs row */}
          <div className={`grid gap-3 ${item.rating ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-[#26334a]">
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

            {item.rating ? (
              <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-amber-500/25">
                <span className="text-[10px] uppercase font-bold text-amber-400/90 block mb-1">
                  {item.ratingSource || 'Audience'} Score
                </span>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold font-mono text-white">
                    {Number(item.rating).toFixed(1)} <span className="text-slate-400 font-normal">/ 10</span>
                  </span>
                </div>
              </div>
            ) : null}

            <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-[#26334a]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Storage Size</span>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white font-mono">
                  {item.sizeBytes ? formatBytes(item.sizeBytes) : '0 B (Missing)'}
                </span>
              </div>
            </div>

            <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-[#26334a]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Media Files</span>
              <span className="text-xs font-bold text-white font-mono">
                {item.episodeFileCount !== undefined ? `${item.episodeFileCount} / ${item.episodeCount} Ep` :
                 item.trackCount !== undefined ? `${item.trackCount} Tracks` : 'Single Item'}
              </span>
            </div>

            <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-[#26334a]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Monitoring</span>
              <button
                onClick={handleToggleMonitored}
                className="flex items-center gap-1 text-xs font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors"
              >
                {monitored ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4 text-slate-500" />}
                <span>{monitored ? 'Active' : 'Ignored'}</span>
              </button>
            </div>
          </div>

          {/* Host Path */}
          {item.path && (
            <div className="bg-[#1a2235] p-3.5 rounded-2xl border border-[#26334a] flex items-center gap-2 text-xs">
              <Folder className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Host Path:</span>
              <span className="text-white font-mono truncate">{item.path}</span>
            </div>
          )}

          {/* Overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Synopsis</h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {item.overview || 'No extended summary provided by media indexer.'}
            </p>
          </div>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {item.genres.map((g) => (
                <span key={g} className="text-xs text-slate-200 bg-[#1a2235] px-3 py-1 rounded-full border border-[#26334a] font-medium">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* TV Seasons & Episodes Guide */}
          {isTvShow && tvDetails && (
            <div className="pt-3 border-t border-[#26334a] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-sky-400" />
                  <span>Seasons & Episodes Guide ({tvDetails.totalSeasons} Seasons • {tvDetails.totalEpisodes} Episodes)</span>
                </h4>
              </div>

              <div className="space-y-2">
                {tvDetails.seasons.map((season) => {
                  const isExpanded = expandedSeasons.has(season.seasonNumber);
                  return (
                    <div key={season.seasonNumber} className="bg-[#1a2235] rounded-2xl border border-[#26334a] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(expandedSeasons);
                          if (next.has(season.seasonNumber)) {
                            next.delete(season.seasonNumber);
                          } else {
                            next.add(season.seasonNumber);
                          }
                          setExpandedSeasons(next);
                        }}
                        className="w-full p-3 px-4 flex items-center justify-between text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{season.title}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({season.episodeCount} eps)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="text-[11px]">View Episodes</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#26334a] p-2 space-y-1 bg-[#10141e]/90 max-h-48 overflow-y-auto">
                          {season.episodes.map((ep) => (
                            <div key={ep.id} className="p-2 px-3 rounded-xl flex items-center justify-between gap-3 text-xs hover:bg-white/[0.05]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded shrink-0 border border-sky-500/30">
                                  E{ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                                </span>
                                <span className="truncate text-white font-medium">{ep.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {ep.airDate && (
                                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{ep.airDate}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFastGrab({ season: season.seasonNumber, episode: ep.episodeNumber });
                                  }}
                                  className="px-2 py-1 bg-white/[0.08] hover:bg-white text-white hover:text-black rounded-full text-[10px] font-bold transition-all cursor-pointer pixel-pill flex items-center gap-1"
                                  title="Fast Grab: download top release based on profile"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Grab</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInteractiveTarget({
                                      service: 'sonarr',
                                      title: item.title,
                                      year: item.year,
                                      mediaType: 'tv',
                                      foreignId: item.id,
                                      imdbId: item.imdbId || tvDetails?.imdbId,
                                      tvdbId: item.tvdbId || tvDetails?.tvdbId,
                                      tmdbId: item.tmdbId,
                                      season: season.seasonNumber,
                                      episode: ep.episodeNumber,
                                      contextSubtitle: `S${String(season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')} • ${ep.title}`
                                    });
                                  }}
                                  className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-full text-[10px] font-bold transition-all cursor-pointer pixel-pill flex items-center gap-1"
                                  title="Interactive Grab: pick from all indexed releases"
                                >
                                  <Search className="w-2.5 h-2.5" />
                                  <span>Interactive</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-3.5 sm:p-4 bg-[#0e121a] border-t border-[#26334a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {specificContentUrl ? (
            <a
              id="modal-open-service-btn"
              href={specificContentUrl}
              target="_blank"
              rel="noreferrer"
              title={`Open "${item.title}" in ${item.service.toUpperCase()}`}
              className="self-start sm:self-auto px-4 py-2 rounded-full bg-[#1c2436] hover:bg-[#253046] text-white text-xs font-bold flex items-center gap-1.5 border border-[#2b3952] transition-colors pixel-pill shadow-sm shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">Open in</span> <span>{item.service.toUpperCase()}</span>
            </a>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* Option 1: Fast Grab */}
            <button
              id="detail-fast-grab-btn"
              type="button"
              onClick={() => handleFastGrab()}
              disabled={grabbingFast}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill disabled:opacity-50 active:scale-[0.98]"
              title="Grab first release based on your quality profile"
            >
              <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
              <span>{grabbingFast ? 'Grabbing...' : 'Grab'}</span>
            </button>

            {/* Option 2: Interactive Grab */}
            <button
              id="detail-interactive-grab-btn"
              type="button"
              onClick={() => setInteractiveTarget({
                service: item.service,
                title: item.title,
                year: item.year,
                mediaType: item.mediaType,
                foreignId: item.id,
                posterUrl: item.posterUrl,
                imdbId: item.imdbId || tvDetails?.imdbId,
                tvdbId: item.tvdbId || tvDetails?.tvdbId,
                tmdbId: item.tmdbId
              })}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-950/40 border border-indigo-400/40 transition-all cursor-pointer pixel-pill active:scale-[0.98]"
              title="Load all possible downloads and pick which one to get"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Interactive Grab</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Interactive Grab Release Picker Modal */}
      {interactiveTarget && (
        <InteractiveGrabModal
          target={interactiveTarget}
          onClose={() => setInteractiveTarget(null)}
          onGrabSuccess={(title) => {
            if (onRefreshItem) onRefreshItem();
          }}
        />
      )}
    </motion.div>
  );
};
