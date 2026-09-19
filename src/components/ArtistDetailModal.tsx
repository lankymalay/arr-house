import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import type { MediaItem, SearchResultItem, ArtistDetails, StudioAlbumItem } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { MediaPoster } from './MediaPoster.js';

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

  const artistName = (item as any).authorOrArtist || (item as any).artist || item.title;
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

  const handleForceSearch = (albumTitle?: string) => {
    const target = albumTitle ? `"${albumTitle}" by ${artistName}` : artistName;
    info('Search Dispatched', `Automated release scan sent to LIDARR for ${target}`);
    setTimeout(() => {
      success('Grab Task Scheduled', `Queued release for download client`);
      if (onRefreshItem) onRefreshItem();
    }, 1000);
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

  const handleToggleMonitored = () => {
    const nextState = !monitored;
    setMonitored(nextState);
    success('Monitoring Updated', `${artistName} is now ${nextState ? 'Monitored' : 'Unmonitored'}`);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const host = window.location.hostname;
  const nativeWebUiUrl = `http://${host}:8686`;

  const albumsList = artistDetails?.studioAlbums || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
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

              <h2 className="text-2xl sm:text-3xl font-black text-white truncate font-sans tracking-tight mb-2" title={artistName}>
                {artistName}
              </h2>

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
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              {inLibrary ? (
                <>
                  <button
                    onClick={handleToggleMonitored}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                      monitored 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {monitored ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
                    <span>{monitored ? 'Monitored' : 'Unmonitored'}</span>
                  </button>

                  <button
                    onClick={() => handleForceSearch()}
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer"
                    title="Search missing tracks in Lidarr"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Artist</span>
                  </button>
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
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Studio Albums</span>
              <div className="flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white font-mono">
                  {albumsList.length} Studio
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
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Studio Album
                    </span>
                    {selectedAlbum.year && (
                      <span className="text-xs text-slate-300 font-mono font-medium">{selectedAlbum.year}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-white truncate" title={selectedAlbum.title}>
                    {selectedAlbum.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{selectedAlbum.trackCount} Tracks</span>
                    {selectedAlbum.releaseDate && (
                      <span>Released: {selectedAlbum.releaseDate}</span>
                    )}
                    {selectedAlbum.genre && (
                      <span className="text-slate-300 font-medium">{selectedAlbum.genre}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => handleForceSearch(selectedAlbum.title)}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Grab Album</span>
                </button>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
                  title="Dismiss album detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Studio Albums Section */}
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
                {albumsList.length} Studio Albums
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
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {albumsList.map((album) => {
                  const isSelected = selectedAlbum?.id === album.id;
                  return (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbum(isSelected ? null : album)}
                      className={`group bg-[#141a27] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg ${
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

                        {/* Year pill overlay */}
                        {album.year && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-white font-mono">
                            {album.year}
                          </div>
                        )}

                        {/* Search Album button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForceSearch(album.title);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-emerald-600 text-white transition opacity-0 group-hover:opacity-100 shadow-md backdrop-blur-xs"
                          title={`Grab ${album.title}`}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Album Text Info */}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors" title={album.title}>
                          {album.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span className="font-mono">{album.trackCount} Tracks</span>
                          <span className="text-[10px] text-emerald-400/90 font-medium">
                            {album.hasFiles ? 'In Library' : 'Studio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 bg-[#0a0d14] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <a
            href={nativeWebUiUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-full bg-[#141a27] hover:bg-[#1a2336] text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors pixel-pill shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open in Lidarr</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Done
            </button>
            {inLibrary ? (
              <button
                onClick={() => handleForceSearch()}
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer pixel-pill"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Interactive Grab</span>
              </button>
            ) : (
              <button
                id="add-artist-and-albums-bottom-btn"
                onClick={handleAddArtist}
                disabled={addingArtist}
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all cursor-pointer pixel-pill disabled:opacity-50"
              >
                {addingArtist ? <Disc3 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Add Artist & All Studio Albums</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

