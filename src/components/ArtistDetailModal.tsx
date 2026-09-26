import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  ExternalLink, 
  Disc3, 
  Music, 
  Calendar, 
  HardDrive, 
  CheckCircle2, 
  CircleDot, 
  Bookmark, 
  BookmarkCheck,
  Folder,
  Layers,
  Sparkles,
  ArrowUpRight,
  Radio,
  Plus,
  SlidersHorizontal,
  Check,
  Zap,
  DownloadCloud,
  AlertCircle,
  Clock,
  Star
} from 'lucide-react';
import type { MediaItem, SearchResultItem, ArtistDetails, StudioAlbumItem } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { getSpecificServiceContentUrl } from '../utils/serviceUrl.js';
import { MediaPoster } from './MediaPoster.js';
import { RatingBadge } from './RatingBadge.js';
import { InteractiveGrabModal, InteractiveGrabTarget } from './InteractiveGrabModal.js';

interface ArtistDetailModalProps {
  item: MediaItem | SearchResultItem;
  onClose: () => void;
  onRefreshItem?: () => void;
  onAddArtist?: (item: SearchResultItem) => void;
}

export const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({ 
  item, 
  onClose, 
  onRefreshItem,
  onAddArtist
}) => {
  const { success, info } = useToast();
  const isSearchResult = 'foreignId' in item;
  const initialInLibrary = 'alreadyInLibrary' in item ? !!item.alreadyInLibrary : true;
  
  const [inLibrary, setInLibrary] = useState(initialInLibrary);
  const [monitored, setMonitored] = useState((item as any).monitored ?? true);
  const [artistDetails, setArtistDetails] = useState<ArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingArtist, setAddingArtist] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<StudioAlbumItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'albums' | 'eps'>('all');
  const [albumStatusFilter, setAlbumStatusFilter] = useState<'all' | 'downloaded' | 'missing' | 'monitored' | 'unmonitored'>('all');

  const artistName = (item as any).artistName || 
    ((item as any).artist && (item as any).artist !== 'Artist' ? (item as any).artist : '') || 
    ((item as any).authorOrArtist && (item as any).authorOrArtist !== 'Artist' && (item as any).authorOrArtist !== 'Music' ? (item as any).authorOrArtist : '') || 
    item.title;
  const artistId = (item as any).id || (item as any).foreignId || '';

  useEffect(() => {
    let isMounted = true;
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('arr_token');
        const res = await fetch(
          `/api/arr/artist/details?artist=${encodeURIComponent(artistName)}&id=${encodeURIComponent(String(artistId))}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );
        if (res.ok) {
          const data: ArtistDetails = await res.json();
          if (isMounted) {
            setArtistDetails(data);
          }
        }
      } catch (err) {
        console.warn('Error loading artist studio albums:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArtistData();

    return () => {
      isMounted = false;
    };
  }, [artistName, artistId]);

  const [interactiveTarget, setInteractiveTarget] = useState<InteractiveGrabTarget | null>(null);
  const [grabbingFast, setGrabbingFast] = useState(false);

  const handleFastGrab = async (albumTitle?: string, albumYear?: number, albumId?: string | number, coverUrl?: string, albumType?: string) => {
    setGrabbingFast(true);
    try {
      const token = localStorage.getItem('arr_token');
      const targetTitle = albumTitle ? `${artistName} - ${albumTitle}` : artistName;
      const res = await fetch('/api/arr/grab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: 'lidarr',
          title: targetTitle,
          albumTitle: albumTitle,
          artistName: artistName,
          albumId: albumId,
          year: albumYear || (item as any).year,
          mediaType: 'music',
          posterUrl: coverUrl || item.posterUrl,
          mode: 'fast',
          foreignId: albumId || artistId,
          musicBrainzId: (item as any).foreignArtistId || item.musicBrainzId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Fast Grab Dispatched', data.message || `Grabbed top release for ${albumTitle ? `"${albumTitle}"` : artistName}`);
        if (onRefreshItem) onRefreshItem();
      } else {
        info('Notice', data.message || `Grab command sent to Lidarr`);
      }
    } catch (e: any) {
      info('Notice', e.message || 'Grab request dispatched');
    } finally {
      setGrabbingFast(false);
    }
  };

  const handleForceSearch = (albumTitle?: string) => {
    handleFastGrab(albumTitle);
  };

  const handleAddArtist = async () => {
    setAddingArtist(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: 'lidarr',
          title: artistName,
          qualityProfileId: 1,
          rootFolderPath: '/data/media/music',
          monitored: true,
          searchForMissing: true,
          foreignId: artistId,
          metadata: {
            posterUrl: item.posterUrl,
            genres: artistDetails?.genres || item.genres,
            overview: artistDetails?.overview || item.overview
          }
        })
      });
      if (res.ok) {
        setInLibrary(true);
        success('Artist Added', `"${artistName}" was successfully added to your Lidarr music collection!`);
        if (onRefreshItem) onRefreshItem();
      } else {
        const data = await res.json();
        info('Notice', data.error || 'Artist could not be added');
      }
    } catch (err: any) {
      info('Notice', err.message || 'Failed to add artist');
    } finally {
      setAddingArtist(false);
    }
  };

  const handleToggleMonitored = async () => {
    const nextState = !monitored;
    setMonitored(nextState);
    try {
      const token = localStorage.getItem('arr_token');
      await fetch('/api/arr/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: 'lidarr',
          id: artistId,
          monitored: nextState
        })
      });
      success('Monitoring Updated', `${artistName} is now ${nextState ? 'Monitored' : 'Unmonitored'}`);
      if (onRefreshItem) onRefreshItem();
    } catch {
      success('Monitoring Updated', `${artistName} is now ${nextState ? 'Monitored' : 'Unmonitored'}`);
    }
  };

  const handleToggleAlbumMonitored = async (album: StudioAlbumItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMonitored = !album.monitored;
    setArtistDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        studioAlbums: prev.studioAlbums.map(a => a.id === album.id ? { ...a, monitored: nextMonitored } : a),
        eps: prev.eps.map(a => a.id === album.id ? { ...a, monitored: nextMonitored } : a),
      };
    });
    if (selectedAlbum && selectedAlbum.id === album.id) {
      setSelectedAlbum(prev => prev ? { ...prev, monitored: nextMonitored } : null);
    }
    try {
      const token = localStorage.getItem('arr_token');
      await fetch('/api/arr/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: 'lidarr',
          albumId: album.id,
          monitored: nextMonitored
        })
      });
      success('Album Monitoring Updated', `"${album.title}" is now ${nextMonitored ? 'Monitored' : 'Unmonitored'}`);
      if (onRefreshItem) onRefreshItem();
    } catch {
      info('Monitoring Updated', `"${album.title}" is now ${nextMonitored ? 'Monitored' : 'Unmonitored'}`);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const { services } = useSettings();
  const resolvedForeignArtistId = 
    (item as any).foreignArtistId ||
    artistDetails?.foreignArtistId ||
    (typeof (item as any).foreignId === 'string' && /^[0-9a-f-]{36}$/i.test((item as any).foreignId) ? (item as any).foreignId : null) ||
    (typeof (item as any).id === 'string' && /^[0-9a-f-]{36}$/i.test((item as any).id) ? (item as any).id : null);

  const specificContentUrl = resolvedForeignArtistId 
    ? getSpecificServiceContentUrl(services['lidarr'], 'lidarr', { 
        foreignArtistId: resolvedForeignArtistId, 
        mediaType: 'music' 
      }) 
    : null;

  const albumsList = artistDetails?.studioAlbums || [];
  const epsList = artistDetails?.eps || [];

  const filterAlbumItem = (album: StudioAlbumItem) => {
    const isDownloaded = album.hasFiles && (album.percentDownloaded === 100 || (album.trackFileCount !== undefined && album.trackFileCount >= album.trackCount));
    const isMissing = !album.hasFiles || (album.trackFileCount !== undefined && album.trackFileCount < album.trackCount);
    if (albumStatusFilter === 'downloaded') return isDownloaded;
    if (albumStatusFilter === 'missing') return isMissing;
    if (albumStatusFilter === 'monitored') return !!album.monitored;
    if (albumStatusFilter === 'unmonitored') return !album.monitored;
    return true;
  };

  const albumCounts = React.useMemo(() => {
    const allReleases = [...albumsList, ...epsList];
    return {
      all: allReleases.length,
      downloaded: allReleases.filter(a => a.hasFiles && (a.percentDownloaded === 100 || (a.trackFileCount !== undefined && a.trackFileCount >= a.trackCount))).length,
      missing: allReleases.filter(a => !a.hasFiles || (a.trackFileCount !== undefined && a.trackFileCount < a.trackCount)).length,
      monitored: allReleases.filter(a => !!a.monitored).length,
      unmonitored: allReleases.filter(a => !a.monitored).length,
    };
  }, [albumsList, epsList]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <motion.div 
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#0f131c] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Hero Banner */}
        <div className="relative bg-gradient-to-br from-emerald-950/70 via-[#131926] to-[#0c0f17] border-b border-white/10 p-6 sm:p-8 shrink-0 overflow-hidden">
          {/* Subtle Ambient Background Disc Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            id="close-artist-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/50 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10 backdrop-blur-md"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Artist Thumbnail / Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0a0d14] overflow-hidden shrink-0 border-2 border-emerald-500/30 shadow-2xl relative group flex items-center justify-center">
              <MediaPoster
                src={item.posterUrl}
                alt={artistName}
                title={artistName}
                mediaType="music"
                service="lidarr"
                aspectRatio="square"
                priority={true}
                className="w-full h-full"
              />
              <div className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/70 backdrop-blur-xs text-emerald-400 z-10">
                <Music className="w-3.5 h-3.5" />
              </div>
              {(artistDetails?.rating || item.rating) && (
                <div className="absolute top-2 left-2 z-10">
                  <RatingBadge 
                    rating={artistDetails?.rating || item.rating} 
                    source={artistDetails?.ratingSource || item.ratingSource} 
                    variant="thumbnail" 
                  />
                </div>
              )}
            </div>

            {/* Artist Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {inLibrary ? 'Artist • Lidarr' : 'Discovered Artist • Lidarr'}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {albumsList.length > 0 ? `${albumsList.length} Studio Albums` : 'Discography'}
                </span>
                {inLibrary && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>In Library</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white truncate font-sans tracking-tight" title={artistName}>
                  {artistName}
                </h2>
                {(artistDetails?.rating || item.rating) && (
                  <RatingBadge 
                    rating={artistDetails?.rating || item.rating} 
                    source={artistDetails?.ratingSource || item.ratingSource} 
                    votes={artistDetails?.ratingVotes || item.ratingVotes} 
                    variant="inline" 
                  />
                )}
              </div>

              {/* Genre Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(artistDetails?.genres || item.genres || ['Music']).map((genre) => (
                  <span key={genre} className="text-[11px] font-medium text-slate-300 bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/10">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {inLibrary ? (
                <>
                  <button
                    onClick={handleToggleMonitored}
                    className={`justify-center px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                      monitored 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {monitored ? <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : <Bookmark className="w-4 h-4 shrink-0" />}
                    <span>{monitored ? 'Monitored' : 'Unmonitored'}</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        if (selectedAlbum) {
                          handleFastGrab(selectedAlbum.title, selectedAlbum.year, selectedAlbum.id, selectedAlbum.coverUrl, selectedAlbum.albumType);
                        } else {
                          handleFastGrab();
                        }
                      }}
                      disabled={grabbingFast}
                      className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill active:scale-[0.98] disabled:opacity-50"
                      title={selectedAlbum ? `Fast Grab top release for ${selectedAlbum.title}` : "Grab first release based on profile"}
                    >
                      <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
                      <span>{grabbingFast ? 'Grabbing...' : selectedAlbum ? `Grab Selected ${selectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}` : 'Grab'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (selectedAlbum) {
                          setInteractiveTarget({
                            service: 'lidarr',
                            title: `${artistName} - ${selectedAlbum.title}`,
                            albumTitle: selectedAlbum.title,
                            artistName: artistName,
                            year: selectedAlbum.year,
                            mediaType: 'music',
                            foreignId: selectedAlbum.id,
                            posterUrl: selectedAlbum.coverUrl || item.posterUrl,
                            contextSubtitle: selectedAlbum.albumType === 'EP' ? `EP (${selectedAlbum.year || 'N/A'})` : `Studio Album (${selectedAlbum.year || 'N/A'})`
                          });
                        } else {
                          setInteractiveTarget({
                            service: 'lidarr',
                            title: artistName,
                            year: (item as any).year,
                            mediaType: 'music',
                            foreignId: artistId,
                            artistName: artistName,
                            posterUrl: item.posterUrl,
                            contextSubtitle: 'Artist Discography'
                          });
                        }
                      }}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer pixel-pill"
                      title={selectedAlbum ? `Interactive Grab: pick release for ${selectedAlbum.title}` : "Interactive release search and picker"}
                    >
                      <Search className="w-3.5 h-3.5 shrink-0" />
                      <span>Interactive Grab</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {onAddArtist && isSearchResult && (
                    <button
                      onClick={() => onAddArtist(item as SearchResultItem)}
                      className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Configure monitoring scope & quality profile"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Configure & Add</span>
                    </button>
                  )}
                  <button
                    id="add-artist-to-library-top-btn"
                    onClick={handleAddArtist}
                    disabled={addingArtist}
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer disabled:opacity-50 pixel-pill"
                    title="Add this artist and monitor their studio albums in Lidarr"
                  >
                    {addingArtist ? <Disc3 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{addingArtist ? 'Adding...' : 'Add to Lidarr'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Status & Storage Mini Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#141a27] p-3.5 rounded-2xl border border-white/[0.08]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Library Status</span>
              <div className="flex items-center gap-1.5">
                {inLibrary ? (
                  (item as any).status === 'downloaded' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Complete</span>
                    </>
                  ) : (item as any).status === 'downloading' ? (
                    <>
                      <CircleDot className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-amber-400">Downloading</span>
                    </>
                  ) : (
                    <>
                      <CircleDot className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-300">Monitored</span>
                    </>
                  )
                ) : (
                  <>
                    <CircleDot className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">Ready to Add</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#141a27] p-3.5 rounded-2xl border border-white/[0.08]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Disk Storage</span>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white font-mono">
                  {(item as any).sizeBytes ? formatBytes((item as any).sizeBytes) : (inLibrary ? '0 B (Missing)' : 'Not Downloaded')}
                </span>
              </div>
            </div>

            <div className="bg-[#141a27] p-3.5 rounded-2xl border border-white/[0.08]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Discography</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300 font-mono">
                  {albumsList.length} Studio
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs font-bold text-[#a8c7fa] font-mono">
                  {epsList.length} EPs
                </span>
              </div>
            </div>

            <div className="bg-[#141a27] p-3.5 rounded-2xl border border-white/[0.08]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Service</span>
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase">Lidarr Audio</span>
              </div>
            </div>
          </div>

          {/* Host Path (if available) */}
          {(item as any).path && (
            <div className="bg-[#141a27] p-3.5 rounded-2xl border border-white/[0.08] flex items-center gap-2 text-xs">
              <Folder className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Library Path:</span>
              <span className="text-white font-mono truncate">{(item as any).path}</span>
            </div>
          )}

          {/* Overview / Bio (if available) */}
          {(artistDetails?.overview || item.overview) && (
            <div className="bg-[#141a27] p-4 rounded-2xl border border-white/[0.08]">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Artist Bio & Discography Summary</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {artistDetails?.overview || item.overview}
              </p>
            </div>
          )}

          {/* Selected Album Details Callout Banner */}
          {selectedAlbum && (
            <div className="bg-gradient-to-r from-[#162720] via-[#141e2b] to-[#10141f] p-4 rounded-2xl border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-black overflow-hidden shrink-0 border border-white/20 shadow-md">
                  <MediaPoster
                    src={selectedAlbum.coverUrl}
                    alt={selectedAlbum.title}
                    title={selectedAlbum.title}
                    artistOrAuthor={artistName}
                    mediaType="music"
                    service="lidarr"
                    aspectRatio="square"
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {selectedAlbum.albumType === 'EP' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/30">
                        EP / Mini-Album
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Studio Album
                      </span>
                    )}
                    {selectedAlbum.year && (
                      <span className="text-xs text-slate-300 font-mono font-medium">{selectedAlbum.year}</span>
                    )}
                    {/* Status Pill for Selected Album */}
                    {selectedAlbum.hasFiles && (selectedAlbum.percentDownloaded === 100 || (selectedAlbum.trackFileCount !== undefined && selectedAlbum.trackFileCount >= selectedAlbum.trackCount)) ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#b4e3be] text-[#072711] flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Downloaded</span>
                      </span>
                    ) : selectedAlbum.hasFiles && (selectedAlbum.trackFileCount || 0) > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-black flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{selectedAlbum.trackFileCount}/{selectedAlbum.trackCount} Tracks</span>
                      </span>
                    ) : selectedAlbum.monitored ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f28b82] text-[#49110d] flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Missing Audio Files</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-400 flex items-center gap-1">
                        <Bookmark className="w-2.5 h-2.5" />
                        <span>Unmonitored</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white truncate" title={selectedAlbum.title}>
                      {selectedAlbum.title}
                    </h4>
                    {selectedAlbum.rating ? (
                      <RatingBadge rating={selectedAlbum.rating} source={selectedAlbum.ratingSource} variant="inline" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono">
                      {selectedAlbum.trackFileCount !== undefined ? `${selectedAlbum.trackFileCount}/${selectedAlbum.trackCount} Tracks Downloaded` : `${selectedAlbum.trackCount} Tracks`}
                    </span>
                    {selectedAlbum.releaseDate && (
                      <span>Released: {selectedAlbum.releaseDate}</span>
                    )}
                    {selectedAlbum.genre && (
                      <span className="text-slate-300 font-medium">{selectedAlbum.genre}</span>
                    )}
                  </div>
                  {/* Selected Album Download Progress */}
                  {selectedAlbum.trackCount > 0 && (
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2 max-w-xs">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          selectedAlbum.percentDownloaded === 100 || (selectedAlbum.trackFileCount !== undefined && selectedAlbum.trackFileCount >= selectedAlbum.trackCount)
                            ? 'bg-emerald-400'
                            : (selectedAlbum.trackFileCount || 0) > 0
                            ? 'bg-amber-400'
                            : 'bg-rose-500/40'
                        }`}
                        style={{ 
                          width: `${Math.min(100, selectedAlbum.percentDownloaded !== undefined ? selectedAlbum.percentDownloaded : Math.round(((selectedAlbum.trackFileCount || 0) / selectedAlbum.trackCount) * 100))}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                <div className="flex items-center gap-2 flex-1 sm:flex-initial flex-wrap sm:flex-nowrap">
                  {/* Album Monitoring Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleAlbumMonitored(selectedAlbum)}
                    className={`justify-center px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                      selectedAlbum.monitored
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                    title={selectedAlbum.monitored ? 'Monitored in Lidarr (click to unmonitor)' : 'Unmonitored in Lidarr (click to monitor)'}
                  >
                    {selectedAlbum.monitored ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Bookmark className="w-3.5 h-3.5 shrink-0" />}
                    <span>{selectedAlbum.monitored ? 'Monitored' : 'Unmonitored'}</span>
                  </button>

                  {/* Fast Grab */}
                  <button
                    id="banner-fast-grab-btn"
                    type="button"
                    onClick={() => handleFastGrab(selectedAlbum.title, selectedAlbum.year, selectedAlbum.id, selectedAlbum.coverUrl, selectedAlbum.albumType)}
                    disabled={grabbingFast}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill active:scale-[0.98] disabled:opacity-50"
                    title={`Fast Grab ${selectedAlbum.title} matching profile`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
                    <span>Grab Selected {selectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}</span>
                  </button>

                  {/* Interactive Grab */}
                  <button
                    id="banner-interactive-grab-btn"
                    type="button"
                    onClick={() => setInteractiveTarget({
                      service: 'lidarr',
                      title: `${artistName} - ${selectedAlbum.title}`,
                      albumTitle: selectedAlbum.title,
                      artistName: artistName,
                      year: selectedAlbum.year,
                      mediaType: 'music',
                      foreignId: selectedAlbum.id,
                      posterUrl: selectedAlbum.coverUrl || item.posterUrl,
                      contextSubtitle: selectedAlbum.albumType === 'EP' ? `EP (${selectedAlbum.year || 'N/A'})` : `Studio Album (${selectedAlbum.year || 'N/A'})`
                    })}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 border border-indigo-400/30 transition-all cursor-pointer pixel-pill active:scale-[0.98]"
                    title={`Interactive Grab: choose release for ${selectedAlbum.title}`}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span>Interactive Grab</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                  title="Dismiss album detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Section & Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-white/[0.08] pb-3 pt-1">
            {/* Release Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'all'
                    ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                    : 'bg-[#141a27] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                <span>All Releases</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 font-mono">
                  {albumsList.length + epsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('albums')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'albums'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-[#141a27] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                <Disc3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Studio Albums</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                  {albumsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('eps')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'eps'
                    ? 'bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/40 shadow-sm'
                    : 'bg-[#141a27] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-[#a8c7fa]" />
                <span>EPs & Mini-Albums</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#a8c7fa]/20 text-[#a8c7fa] font-mono">
                  {epsList.length}
                </span>
              </button>
            </div>

            {/* Discography Download / Monitoring Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAlbumStatusFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  albumStatusFilter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                All ({albumCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setAlbumStatusFilter('downloaded')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  albumStatusFilter === 'downloaded'
                    ? 'bg-[#b4e3be] text-[#072711]'
                    : 'text-[#b4e3be] hover:bg-[#b4e3be]/10 bg-white/[0.04]'
                }`}
                title="Only show completed/downloaded releases"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Downloaded ({albumCounts.downloaded})</span>
              </button>

              <button
                type="button"
                onClick={() => setAlbumStatusFilter('missing')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  albumStatusFilter === 'missing'
                    ? 'bg-[#f28b82] text-[#49110d]'
                    : 'text-[#f28b82] hover:bg-[#f28b82]/10 bg-white/[0.04]'
                }`}
                title="Only show releases with missing tracks"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Missing ({albumCounts.missing})</span>
              </button>

              <button
                type="button"
                onClick={() => setAlbumStatusFilter('monitored')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  albumStatusFilter === 'monitored'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-emerald-400 hover:bg-emerald-500/10 bg-white/[0.04]'
                }`}
                title="Only show monitored releases"
              >
                <BookmarkCheck className="w-3 h-3" />
                <span>Monitored ({albumCounts.monitored})</span>
              </button>

              <button
                type="button"
                onClick={() => setAlbumStatusFilter('unmonitored')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  albumStatusFilter === 'unmonitored'
                    ? 'bg-white/25 text-white'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
                title="Only show unmonitored releases"
              >
                <Bookmark className="w-3 h-3" />
                <span>Unmonitored ({albumCounts.unmonitored})</span>
              </button>
            </div>
          </div>

          {/* Main Studio Albums Section */}
          {(activeTab === 'all' || activeTab === 'albums') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Studio Albums
                    </h3>
                    <p className="text-xs text-slate-400">
                      Core studio discography and featured LP releases for {artistName}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                  {albumsList.filter(filterAlbumItem).length} / {albumsList.length} Studio Albums
                </span>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Disc3 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span className="text-xs font-medium">Cataloging studio albums for {artistName}...</span>
                </div>
              ) : albumsList.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl bg-[#141a27]/40 p-6">
                  <Disc3 className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-300">No studio albums cataloged yet</p>
                  <p className="text-xs text-slate-500 mt-1">Lidarr will catalog full studio albums once added to library.</p>
                </div>
              ) : albumsList.filter(filterAlbumItem).length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#141a27]/40 p-5">
                  <p className="text-xs font-medium text-slate-400">No studio albums match "{albumStatusFilter}" filter</p>
                  <button
                    type="button"
                    onClick={() => setAlbumStatusFilter('all')}
                    className="mt-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {albumsList.filter(filterAlbumItem).map((album) => {
                    const isSelected = selectedAlbum?.id === album.id;
                    const isDownloaded = album.hasFiles && (album.percentDownloaded === 100 || (album.trackFileCount !== undefined && album.trackFileCount >= album.trackCount));
                    const isPartial = album.hasFiles && (album.trackFileCount || 0) > 0 && !isDownloaded;
                    const progressPercent = Math.min(100, album.percentDownloaded !== undefined ? album.percentDownloaded : album.trackCount > 0 ? Math.round(((album.trackFileCount || 0) / album.trackCount) * 100) : 0);

                    return (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbum(isSelected ? null : album)}
                        className={`group bg-[#141a27] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${
                          isSelected 
                            ? 'border-emerald-500 ring-1 ring-emerald-500/40 bg-[#192233]' 
                            : 'border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        {/* Album Cover */}
                        <div className="aspect-square w-full rounded-xl bg-[#0c0f17] overflow-hidden relative mb-2.5 shadow-md flex items-center justify-center">
                          <MediaPoster
                            src={album.coverUrl}
                            alt={album.title}
                            title={album.title}
                            artistOrAuthor={artistName}
                            mediaType="music"
                            service="lidarr"
                            aspectRatio="square"
                            className="w-full h-full"
                          />

                          {/* Selected Check Badge or Download Status Badge */}
                          {isSelected ? (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-400 text-black text-[10px] font-bold flex items-center gap-1 shadow-md z-10 animate-fadeIn">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Selected</span>
                            </div>
                          ) : (
                            <div className="absolute top-2 left-2 z-10">
                              {isDownloaded ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#b4e3be] text-[#072711] text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title="Downloaded (Complete)">
                                  <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Downloaded</span>
                                </span>
                              ) : isPartial ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title={`Incomplete: ${album.trackFileCount}/${album.trackCount} tracks downloaded`}>
                                  <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>{album.trackFileCount}/{album.trackCount}</span>
                                </span>
                              ) : album.monitored ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#f28b82] text-[#49110d] text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title="Monitored in Lidarr (Missing audio files)">
                                  <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Missing</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-black/75 text-slate-400 text-[10px] font-medium flex items-center gap-1 shadow-md backdrop-blur-xs" title="Unmonitored release">
                                  <Bookmark className="w-2.5 h-2.5" />
                                  <span>Unmonitored</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Year & Rating pill overlay */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                            {album.year ? (
                              <div className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-bold text-white font-mono">
                                {album.year}
                              </div>
                            ) : <div />}
                            {album.rating ? (
                              <RatingBadge rating={album.rating} source={album.ratingSource} variant="thumbnail" />
                            ) : null}
                          </div>

                          {/* Controls on Cover (Top Right) */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                            {/* Fast Grab and Interactive Grab buttons on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFastGrab(album.title, album.year, album.id, album.coverUrl, 'Studio Album');
                                }}
                                className="p-1.5 rounded-full bg-black/80 hover:bg-white text-white hover:text-black transition shadow-md backdrop-blur-xs cursor-pointer"
                                title={`Fast Grab ${album.title} based on profile`}
                              >
                                <Zap className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInteractiveTarget({
                                    service: 'lidarr',
                                    title: `${artistName} - ${album.title}`,
                                    albumTitle: album.title,
                                    artistName,
                                    year: album.year,
                                    mediaType: 'music',
                                    foreignId: album.id,
                                    posterUrl: album.coverUrl,
                                    contextSubtitle: `Studio Album (${album.year || 'N/A'})`
                                  });
                                }}
                                className="p-1.5 rounded-full bg-black/80 hover:bg-emerald-500 text-white transition shadow-md backdrop-blur-xs cursor-pointer"
                                title={`Interactive Grab ${album.title}: choose release`}
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Album Monitoring Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleAlbumMonitored(album, e)}
                              className={`p-1.5 rounded-full transition shadow-md backdrop-blur-xs cursor-pointer ${
                                album.monitored 
                                  ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900' 
                                  : 'bg-black/75 text-slate-400 border border-white/10 hover:text-white hover:bg-black/90'
                              }`}
                              title={album.monitored ? "Monitored in Lidarr (click to unmonitor)" : "Unmonitored in Lidarr (click to monitor)"}
                            >
                              {album.monitored ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Album Text Info */}
                        <div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors flex-1" title={album.title}>
                              {album.title}
                            </h4>
                            {album.rating ? (
                              <RatingBadge rating={album.rating} source={album.ratingSource} variant="inline" />
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span className="font-mono">
                              {album.trackFileCount !== undefined ? `${album.trackFileCount}/${album.trackCount} Tracks` : `${album.trackCount} Tracks`}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isDownloaded 
                                ? 'text-emerald-400' 
                                : isPartial 
                                ? 'text-amber-400' 
                                : album.monitored 
                                ? 'text-rose-400' 
                                : 'text-slate-500'
                            }`}>
                              {isDownloaded ? 'Downloaded' : isPartial ? 'Incomplete' : album.monitored ? 'Missing' : 'Unmonitored'}
                            </span>
                          </div>

                          {/* Track download progress bar */}
                          {album.trackCount > 0 && (
                            <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mt-2" title={`${album.trackFileCount || 0}/${album.trackCount} tracks downloaded (${progressPercent}%)`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDownloaded
                                    ? 'bg-emerald-400'
                                    : isPartial
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500/40'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EPs & Extended Plays Section */}
          {(activeTab === 'all' || activeTab === 'eps') && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#a8c7fa]/15 border border-[#a8c7fa]/30 flex items-center justify-center text-[#a8c7fa]">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      EPs & Mini-Albums
                    </h3>
                    <p className="text-xs text-slate-400">
                      Extended plays, mini-albums, and short-form releases for {artistName}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/20">
                  {epsList.filter(filterAlbumItem).length} / {epsList.length} EPs
                </span>
              </div>

              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Disc3 className="w-6 h-6 animate-spin text-[#a8c7fa]" />
                  <span className="text-xs">Checking EPs for {artistName}...</span>
                </div>
              ) : epsList.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#141a27]/30 p-5">
                  <Music className="w-6 h-6 text-slate-500 mx-auto mb-1.5 opacity-40" />
                  <p className="text-xs font-medium text-slate-400">No EPs cataloged for this artist</p>
                </div>
              ) : epsList.filter(filterAlbumItem).length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#141a27]/30 p-5">
                  <p className="text-xs font-medium text-slate-400">No EPs match "{albumStatusFilter}" filter</p>
                  <button
                    type="button"
                    onClick={() => setAlbumStatusFilter('all')}
                    className="mt-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {epsList.filter(filterAlbumItem).map((ep) => {
                    const isSelected = selectedAlbum?.id === ep.id;
                    const isDownloaded = ep.hasFiles && (ep.percentDownloaded === 100 || (ep.trackFileCount !== undefined && ep.trackFileCount >= ep.trackCount));
                    const isPartial = ep.hasFiles && (ep.trackFileCount || 0) > 0 && !isDownloaded;
                    const progressPercent = Math.min(100, ep.percentDownloaded !== undefined ? ep.percentDownloaded : ep.trackCount > 0 ? Math.round(((ep.trackFileCount || 0) / ep.trackCount) * 100) : 0);

                    return (
                      <div
                        key={ep.id}
                        onClick={() => setSelectedAlbum(isSelected ? null : ep)}
                        className={`group bg-[#141a27] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${
                          isSelected 
                            ? 'border-[#a8c7fa] ring-1 ring-[#a8c7fa]/40 bg-[#162033]' 
                            : 'border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        {/* EP Cover */}
                        <div className="aspect-square w-full rounded-xl bg-[#0c0f17] overflow-hidden relative mb-2.5 shadow-md flex items-center justify-center">
                          <MediaPoster
                            src={ep.coverUrl}
                            alt={ep.title}
                            title={ep.title}
                            artistOrAuthor={artistName}
                            mediaType="music"
                            service="lidarr"
                            aspectRatio="square"
                            className="w-full h-full"
                          />

                          {/* Selected Check Badge or Download Status Badge */}
                          {isSelected ? (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#a8c7fa] text-[#041e49] text-[10px] font-bold flex items-center gap-1 shadow-md z-10 animate-fadeIn">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Selected EP</span>
                            </div>
                          ) : (
                            <div className="absolute top-2 left-2 z-10">
                              {isDownloaded ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#b4e3be] text-[#072711] text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title="Downloaded (Complete)">
                                  <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Downloaded</span>
                                </span>
                              ) : isPartial ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title={`Incomplete: ${ep.trackFileCount}/${ep.trackCount} tracks downloaded`}>
                                  <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>{ep.trackFileCount}/{ep.trackCount}</span>
                                </span>
                              ) : ep.monitored ? (
                                <span className="px-2 py-0.5 rounded-md bg-[#f28b82] text-[#49110d] text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs" title="Monitored in Lidarr (Missing audio files)">
                                  <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Missing</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-black/75 text-slate-400 text-[10px] font-medium flex items-center gap-1 shadow-md backdrop-blur-xs" title="Unmonitored release">
                                  <Bookmark className="w-2.5 h-2.5" />
                                  <span>Unmonitored</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Year & Rating pill overlay */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                            {ep.year ? (
                              <div className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-bold text-white font-mono">
                                {ep.year}
                              </div>
                            ) : <div />}
                            {ep.rating ? (
                              <RatingBadge rating={ep.rating} source={ep.ratingSource} variant="thumbnail" />
                            ) : null}
                          </div>

                          {/* Controls on Cover (Top Right) */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                            {/* Fast Grab and Interactive Grab buttons on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFastGrab(ep.title, ep.year, ep.id, ep.coverUrl, 'EP');
                                }}
                                className="p-1.5 rounded-full bg-black/80 hover:bg-white text-white hover:text-black transition shadow-md backdrop-blur-xs cursor-pointer"
                                title={`Fast Grab ${ep.title} based on profile`}
                              >
                                <Zap className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInteractiveTarget({
                                    service: 'lidarr',
                                    title: `${artistName} - ${ep.title}`,
                                    albumTitle: ep.title,
                                    artistName,
                                    year: ep.year,
                                    mediaType: 'music',
                                    foreignId: ep.id,
                                    posterUrl: ep.coverUrl,
                                    contextSubtitle: `EP (${ep.year || 'N/A'})`
                                  });
                                }}
                                className="p-1.5 rounded-full bg-black/80 hover:bg-[#a8c7fa] hover:text-[#041e49] text-white transition shadow-md backdrop-blur-xs cursor-pointer"
                                title={`Interactive Grab ${ep.title}: choose release`}
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Album Monitoring Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleAlbumMonitored(ep, e)}
                              className={`p-1.5 rounded-full transition shadow-md backdrop-blur-xs cursor-pointer ${
                                ep.monitored 
                                  ? 'bg-[#0e213b] text-[#a8c7fa] border border-[#a8c7fa]/40 hover:bg-[#152e50]' 
                                  : 'bg-black/75 text-slate-400 border border-white/10 hover:text-white hover:bg-black/90'
                              }`}
                              title={ep.monitored ? "Monitored in Lidarr (click to unmonitor)" : "Unmonitored in Lidarr (click to monitor)"}
                            >
                              {ep.monitored ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* EP Text Info */}
                        <div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-[#a8c7fa] transition-colors flex-1" title={ep.title}>
                              {ep.title}
                            </h4>
                            {ep.rating ? (
                              <RatingBadge rating={ep.rating} source={ep.ratingSource} variant="inline" />
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span className="font-mono">
                              {ep.trackFileCount !== undefined ? `${ep.trackFileCount}/${ep.trackCount} Tracks` : `${ep.trackCount} Tracks`}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isDownloaded 
                                ? 'text-emerald-400' 
                                : isPartial 
                                ? 'text-amber-400' 
                                : ep.monitored 
                                ? 'text-rose-400' 
                                : 'text-slate-500'
                            }`}>
                              {isDownloaded ? 'Downloaded' : isPartial ? 'Incomplete' : ep.monitored ? 'Missing' : 'Unmonitored'}
                            </span>
                          </div>

                          {/* Track download progress bar */}
                          {ep.trackCount > 0 && (
                            <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mt-2" title={`${ep.trackFileCount || 0}/${ep.trackCount} tracks downloaded (${progressPercent}%)`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDownloaded
                                    ? 'bg-emerald-400'
                                    : isPartial
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500/40'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-3.5 sm:p-4 bg-[#0a0d14] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {specificContentUrl && (
              <a
                id="modal-open-lidarr-btn"
                href={specificContentUrl}
                target="_blank"
                rel="noreferrer"
                title={`Open "${artistName}" in Lidarr`}
                className="px-3.5 sm:px-4 py-2 rounded-full bg-[#141a27] hover:bg-[#1a2336] text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors pixel-pill shadow-sm shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Open in Lidarr</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Done
            </button>
          </div>

          {inLibrary ? (
            <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <button
                id="artist-footer-fast-grab-btn"
                type="button"
                onClick={() => {
                  if (selectedAlbum) {
                    handleFastGrab(selectedAlbum.title, selectedAlbum.year, selectedAlbum.id, selectedAlbum.coverUrl, selectedAlbum.albumType);
                  } else {
                    handleFastGrab();
                  }
                }}
                disabled={grabbingFast}
                className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer pixel-pill active:scale-[0.98] disabled:opacity-50"
                title={selectedAlbum ? `Fast Grab top release for ${selectedAlbum.title}` : "Grab first release based on profile"}
              >
                <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
                <span>{grabbingFast ? 'Grabbing...' : selectedAlbum ? `Grab Selected ${selectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}` : 'Grab Discography'}</span>
              </button>
              <button
                id="artist-footer-interactive-grab-btn"
                type="button"
                onClick={() => {
                  if (selectedAlbum) {
                    setInteractiveTarget({
                      service: 'lidarr',
                      title: `${artistName} - ${selectedAlbum.title}`,
                      albumTitle: selectedAlbum.title,
                      artistName: artistName,
                      year: selectedAlbum.year,
                      mediaType: 'music',
                      foreignId: selectedAlbum.id,
                      posterUrl: selectedAlbum.coverUrl || item.posterUrl,
                      contextSubtitle: selectedAlbum.albumType === 'EP' ? `EP (${selectedAlbum.year || 'N/A'})` : `Studio Album (${selectedAlbum.year || 'N/A'})`
                    });
                  } else {
                    setInteractiveTarget({
                      service: 'lidarr',
                      title: artistName,
                      year: (item as any).year,
                      mediaType: 'music',
                      foreignId: artistId,
                      artistName: artistName,
                      posterUrl: item.posterUrl,
                      contextSubtitle: 'Artist Discography'
                    });
                  }
                }}
                className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer pixel-pill"
                title={selectedAlbum ? `Interactive Grab: pick release for ${selectedAlbum.title}` : "Interactive release search and picker"}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>{selectedAlbum ? `Interactive Grab Selected ${selectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}` : 'Interactive Grab'}</span>
              </button>
            </div>
          ) : (
            <button
              id="add-artist-and-albums-bottom-btn"
              onClick={handleAddArtist}
              disabled={addingArtist}
              className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer pixel-pill disabled:opacity-50"
            >
              {addingArtist ? <Disc3 className="w-4 h-4 animate-spin shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
              <span>Add Artist & All Studio Albums</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Interactive Grab Modal */}
      {interactiveTarget && (
        <InteractiveGrabModal
          target={interactiveTarget}
          onClose={() => setInteractiveTarget(null)}
          onGrabSuccess={() => {
            if (onRefreshItem) onRefreshItem();
          }}
        />
      )}
    </motion.div>
  );
};

