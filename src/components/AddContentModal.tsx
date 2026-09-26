import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  DownloadCloud, 
  Tv, 
  Film, 
  Music, 
  Disc3,
  ChevronDown, 
  ChevronRight, 
  Check, 
  Layers, 
  CheckSquare, 
  Square, 
  MinusSquare, 
  Calendar,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Info,
  Plus
} from 'lucide-react';
import type { 
  SearchResultItem, 
  QualityProfile, 
  RootFolder, 
  TvShowDetails, 
  TvSeasonItem, 
  TvEpisodeItem,
  ArtistDetails,
  StudioAlbumItem,
  AddContentPayload 
} from '../types.js';
import { getContentTypeLabel } from '../types.js';
import { ExpandableSynopsis } from './ExpandableSynopsis.js';
import { useToast } from '../context/ToastContext.js';
import { MediaPoster } from './MediaPoster.js';

interface AddContentModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
  onAdded: () => void;
}

type TvSelectionMode = 'whole_show' | 'specific_seasons' | 'individual_episodes';

export const AddContentModal: React.FC<AddContentModalProps> = ({ item, onClose, onAdded }) => {
  const { success, error } = useToast();

  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<RootFolder[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [selectedRootPath, setSelectedRootPath] = useState<string>('');
  const [searchForMissing, setSearchForMissing] = useState(true);
  const [monitorAll, setMonitorAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // TV Show Season & Episode state
  const isTvShow = item?.service === 'sonarr' || item?.mediaType === 'tv';
  const [tvDetails, setTvDetails] = useState<TvShowDetails | null>(null);
  const [loadingTvDetails, setLoadingTvDetails] = useState(false);
  const [selectionMode, setSelectionMode] = useState<TvSelectionMode>('whole_show');
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

  // Music Artist Studio Albums state
  const isMusic = item?.service === 'lidarr' || item?.mediaType === 'music';
  const [artistDetails, setArtistDetails] = useState<ArtistDetails | null>(null);
  const [loadingArtistDetails, setLoadingArtistDetails] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string | number>>(new Set());
  const [albumSelectionMode, setAlbumSelectionMode] = useState<'all' | 'latest' | 'custom'>('all');

  // Single scoped album (if exactly one album/EP is selected)
  const singleSelectedAlbum = useMemo(() => {
    if (!isMusic || !artistDetails || selectedAlbums.size !== 1) return undefined;
    const firstId = Array.from(selectedAlbums)[0];
    return artistDetails.studioAlbums.find((a) => a.id === firstId);
  }, [isMusic, artistDetails, selectedAlbums]);

  // Fetch quality profiles and root folders
  useEffect(() => {
    if (!item) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('arr_token');
        const res = await fetch(`/api/settings/profiles/${item.service}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.qualityProfiles || []);
          setRootFolders(data.rootFolders || []);
          if (data.qualityProfiles && data.qualityProfiles.length > 0) {
            setSelectedProfileId(data.qualityProfiles[0].id);
          }
          if (data.rootFolders && data.rootFolders.length > 0) {
            setSelectedRootPath(data.rootFolders[0].path);
          } else {
            setSelectedRootPath(
              `/data/media/${item.service === 'sonarr' ? 'tv' : item.service === 'radarr' ? 'movies' : 'music'}`
            );
          }
        }
      } catch (err) {
        console.error('Failed to load profiles', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [item]);

  // Fetch TV show seasons & episodes breakdown if Sonarr / TV
  useEffect(() => {
    if (!item || !isTvShow) return;

    const fetchTvBreakdown = async () => {
      setLoadingTvDetails(true);
      try {
        const token = localStorage.getItem('arr_token');
        const url = `/api/arr/series/details?title=${encodeURIComponent(item.title)}&foreignId=${item.foreignId || ''}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const details: TvShowDetails = await res.json();
          setTvDetails(details);

          // Default selection: select all seasons and all episodes
          const allSeasons = new Set<number>();
          const allEpisodes = new Set<string>();

          for (const s of details.seasons) {
            allSeasons.add(s.seasonNumber);
            for (const ep of s.episodes) {
              allEpisodes.add(`${s.seasonNumber}_${ep.episodeNumber}`);
            }
          }

          setSelectedSeasons(allSeasons);
          setSelectedEpisodes(allEpisodes);
          // Expand the first season by default
          if (details.seasons.length > 0) {
            setExpandedSeasons(new Set([details.seasons[0].seasonNumber]));
          }
        }
      } catch (err) {
        console.error('Failed to fetch TV details breakdown', err);
      } finally {
        setLoadingTvDetails(false);
      }
    };

    fetchTvBreakdown();
  }, [item, isTvShow]);

  // Fetch Music Studio Albums if Lidarr / Music
  useEffect(() => {
    if (!item || !isMusic) return;

    const fetchArtistBreakdown = async () => {
      setLoadingArtistDetails(true);
      try {
        const token = localStorage.getItem('arr_token');
        const artistName = item.authorOrArtist || item.title;
        const url = `/api/arr/artist/details?artist=${encodeURIComponent(artistName)}&id=${encodeURIComponent(String(item.foreignId || ''))}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const details: ArtistDetails = await res.json();
          setArtistDetails(details);
          const allIds = new Set(details.studioAlbums.map((a) => a.id));
          setSelectedAlbums(allIds);
        }
      } catch (err) {
        console.error('Failed to fetch artist studio albums breakdown', err);
      } finally {
        setLoadingArtistDetails(false);
      }
    };

    fetchArtistBreakdown();
  }, [item, isMusic]);

  if (!item) return null;

  // Toggle Season Selection (checks/unchecks all episodes in that season)
  const handleToggleSeason = (seasonNum: number) => {
    if (!tvDetails) return;
    const season = tvDetails.seasons.find((s) => s.seasonNumber === seasonNum);
    if (!season) return;

    const newSeasons = new Set(selectedSeasons);
    const newEpisodes = new Set(selectedEpisodes);
    const isCurrentlySelected = newSeasons.has(seasonNum);

    if (isCurrentlySelected) {
      newSeasons.delete(seasonNum);
      for (const ep of season.episodes) {
        newEpisodes.delete(`${seasonNum}_${ep.episodeNumber}`);
      }
    } else {
      newSeasons.add(seasonNum);
      for (const ep of season.episodes) {
        newEpisodes.add(`${seasonNum}_${ep.episodeNumber}`);
      }
    }

    setSelectedSeasons(newSeasons);
    setSelectedEpisodes(newEpisodes);
  };

  // Toggle Single Episode Selection
  const handleToggleEpisode = (seasonNum: number, episodeNum: number) => {
    if (!tvDetails) return;
    const season = tvDetails.seasons.find((s) => s.seasonNumber === seasonNum);
    if (!season) return;

    const key = `${seasonNum}_${episodeNum}`;
    const newEpisodes = new Set(selectedEpisodes);
    const newSeasons = new Set(selectedSeasons);

    if (newEpisodes.has(key)) {
      newEpisodes.delete(key);
    } else {
      newEpisodes.add(key);
    }

    // Check if season has any selected episodes remaining
    const seasonSelectedCount = season.episodes.filter((ep) =>
      newEpisodes.has(`${seasonNum}_${ep.episodeNumber}`)
    ).length;

    if (seasonSelectedCount > 0) {
      newSeasons.add(seasonNum);
    } else {
      newSeasons.delete(seasonNum);
    }

    setSelectedEpisodes(newEpisodes);
    setSelectedSeasons(newSeasons);
  };

  // Toggle Season Accordion Expand/Collapse
  const handleToggleExpandSeason = (seasonNum: number) => {
    const next = new Set(expandedSeasons);
    if (next.has(seasonNum)) {
      next.delete(seasonNum);
    } else {
      next.add(seasonNum);
    }
    setExpandedSeasons(next);
  };

  // Preset Selection: Whole Show
  const selectWholeShow = () => {
    if (!tvDetails) return;
    setSelectionMode('whole_show');
    const allSeasons = new Set<number>();
    const allEpisodes = new Set<string>();
    for (const s of tvDetails.seasons) {
      allSeasons.add(s.seasonNumber);
      for (const ep of s.episodes) {
        allEpisodes.add(`${s.seasonNumber}_${ep.episodeNumber}`);
      }
    }
    setSelectedSeasons(allSeasons);
    setSelectedEpisodes(allEpisodes);
  };

  // Preset Selection: Specific Season Mode
  const selectSpecificSeasonsMode = () => {
    setSelectionMode('specific_seasons');
  };

  // Preset Selection: Individual Episodes Mode
  const selectIndividualEpisodesMode = () => {
    setSelectionMode('individual_episodes');
    // Auto-expand all seasons if none are expanded
    if (expandedSeasons.size === 0 && tvDetails?.seasons[0]) {
      setExpandedSeasons(new Set([tvDetails.seasons[0].seasonNumber]));
    }
  };

  // Preset: Latest Season Only
  const selectLatestSeasonOnly = () => {
    if (!tvDetails || tvDetails.seasons.length === 0) return;
    const latestSeason = tvDetails.seasons[tvDetails.seasons.length - 1];
    const newSeasons = new Set([latestSeason.seasonNumber]);
    const newEpisodes = new Set<string>();
    for (const ep of latestSeason.episodes) {
      newEpisodes.add(`${latestSeason.seasonNumber}_${ep.episodeNumber}`);
    }
    setSelectedSeasons(newSeasons);
    setSelectedEpisodes(newEpisodes);
    setExpandedSeasons(new Set([latestSeason.seasonNumber]));
  };

  // Preset: First Season Only
  const selectFirstSeasonOnly = () => {
    if (!tvDetails || tvDetails.seasons.length === 0) return;
    const firstSeason = tvDetails.seasons[0];
    const newSeasons = new Set([firstSeason.seasonNumber]);
    const newEpisodes = new Set<string>();
    for (const ep of firstSeason.episodes) {
      newEpisodes.add(`${firstSeason.seasonNumber}_${ep.episodeNumber}`);
    }
    setSelectedSeasons(newSeasons);
    setSelectedEpisodes(newEpisodes);
    setExpandedSeasons(new Set([firstSeason.seasonNumber]));
  };

  // Preset: Clear All
  const handleClearAll = () => {
    setSelectedSeasons(new Set());
    setSelectedEpisodes(new Set());
  };

  // Music Album Selection Helpers
  const selectAllStudioAlbums = () => {
    if (!artistDetails) return;
    setAlbumSelectionMode('all');
    setSelectedAlbums(new Set(artistDetails.studioAlbums.map((a) => a.id)));
  };

  const selectLatestAlbumOnly = () => {
    if (!artistDetails || artistDetails.studioAlbums.length === 0) return;
    setAlbumSelectionMode('latest');
    setSelectedAlbums(new Set([artistDetails.studioAlbums[0].id]));
  };

  const deselectAllStudioAlbums = () => {
    setAlbumSelectionMode('custom');
    setSelectedAlbums(new Set());
  };

  const handleToggleAlbum = (albumId: string | number) => {
    const next = new Set(selectedAlbums);
    if (next.has(albumId)) {
      next.delete(albumId);
    } else {
      next.add(albumId);
    }
    setSelectedAlbums(next);
    setAlbumSelectionMode('custom');
  };

  // Submission handler
  const executeAdd = async () => {
    if (!selectedRootPath) {
      error('Root Folder Required', 'Please select or enter a root folder destination.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('arr_token');
      
      const cleanForeignId = (item.foreignId && !String(item.foreignId).startsWith('tentpole-') && !String(item.foreignId).startsWith('wiki-'))
        ? item.foreignId
        : undefined;

      const payload: AddContentPayload = {
        service: item.service,
        title: item.title,
        foreignId: cleanForeignId,
        imdbId: item.imdbId || tvDetails?.imdbId,
        tvdbId: item.tvdbId || tvDetails?.tvdbId,
        tmdbId: item.tmdbId,
        rootFolderPath: selectedRootPath,
        qualityProfileId: selectedProfileId,
        monitored: isTvShow 
          ? (selectedEpisodes.size > 0 || selectionMode === 'whole_show') 
          : isMusic 
          ? (selectedAlbums.size > 0) 
          : monitorAll,
        searchForMissing: searchForMissing,
        monitorScope: isTvShow
          ? selectionMode === 'whole_show'
            ? 'all'
            : selectionMode === 'specific_seasons'
            ? 'specific_seasons'
            : 'specific_episodes'
          : undefined,
        selectedSeasons: isTvShow ? Array.from(selectedSeasons).sort((a, b) => a - b) : undefined,
        selectedEpisodes: isTvShow
          ? Array.from(selectedEpisodes).map((k) => {
              const [s, e] = k.split('_').map(Number);
              return { season: s, episode: e };
            })
          : undefined,
        selectedAlbums: isMusic ? Array.from(selectedAlbums) : undefined,
        metadata: {
          year: item.year,
          overview: item.overview,
          posterUrl: item.posterUrl,
          genres: item.genres,
          artistName: item.authorOrArtist
        }
      };

      const res = await fetch('/api/arr/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Added to Library', data.message || `Added "${item.title}" to ${item.service.toUpperCase()}`);
        onAdded();
        onClose();
      } else {
        error('Failed to Add', data.message || data.error || 'The service encountered an error while adding this item.');
      }
    } catch (err: any) {
      error('Connection Error', err.message || 'Unable to communicate with the service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAdd();
  };

  const totalEpisodesInDetails = tvDetails?.totalEpisodes || 0;
  const totalSeasonsInDetails = tvDetails?.totalSeasons || 0;
  const isAllEpisodesSelected =
    totalEpisodesInDetails > 0 && selectedEpisodes.size === totalEpisodesInDetails;

  const serviceBadgeClass =
    item.service === 'sonarr'
      ? 'bg-[#a8c7fa] text-[#041e49]'
      : item.service === 'radarr'
      ? 'bg-[#e0d0b8] text-[#3e2723]'
      : 'bg-[#b4e3be] text-[#072711]';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div 
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`bg-[#14171f] border border-white/[0.09] rounded-3xl w-full overflow-hidden shadow-2xl flex flex-col my-auto ${
        isTvShow || isMusic ? 'max-w-3xl max-h-[92vh]' : 'max-w-lg max-h-[90vh]'
      }`}
      >
        
        {/* Header with media summary */}
        <div className="relative p-5 sm:p-6 border-b border-white/[0.07] flex items-start gap-4 shrink-0 bg-[#0c0e12]/60">
          <div className="w-16 h-24 rounded-2xl bg-[#0c0e12] overflow-hidden shrink-0 border border-white/[0.08] shadow-md">
            <MediaPoster
              src={item.posterUrl}
              alt={item.title}
              title={item.title}
              artistOrAuthor={item.authorOrArtist}
              year={item.year}
              mediaType={item.mediaType}
              service={item.service}
              aspectRatio="custom"
              priority={true}
              className="w-full h-full"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 ${serviceBadgeClass}`}>
                {isTvShow ? <Tv className="w-2.5 h-2.5" /> : item.service === 'radarr' ? <Film className="w-2.5 h-2.5" /> : <Music className="w-2.5 h-2.5" />}
                <span>{getContentTypeLabel(item.service, item.mediaType)}</span>
              </span>
              {item.year && item.mediaType !== 'music' && item.service !== 'lidarr' && (
                <span className="text-xs text-[#9aa0a6] font-mono font-medium">{item.year}</span>
              )}
              {isTvShow && tvDetails && (
                <span className="text-xs font-semibold text-[#a8c7fa] bg-[#a8c7fa]/10 px-2.5 py-0.5 rounded-full border border-[#a8c7fa]/20">
                  {tvDetails.totalSeasons} {tvDetails.totalSeasons === 1 ? 'Season' : 'Seasons'} • {tvDetails.totalEpisodes} Episodes
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white truncate font-sans tracking-tight">
              {item.title}
            </h3>

            {item.authorOrArtist && (
              <p className="text-xs text-[#9aa0a6] truncate mt-0.5 font-medium">
                {item.authorOrArtist}
              </p>
            )}

            {/* Overview & Synopsis capped at 50 words */}
            <ExpandableSynopsis
              text={item.overview}
              fallbackText="No synopsis provided."
              maxWords={50}
              className="text-xs text-slate-300/90 mt-1.5 leading-relaxed"
            />
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-white p-2 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* TV SHOW SPECIALIZED SECTION: Scope Selector & Season / Episode Breakdown */}
          {isTvShow && (
            <div className="space-y-4">
              {/* Header Title & Scope Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                <div>
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#a8c7fa]" />
                    <span>Select Monitoring Scope</span>
                  </h4>
                  <p className="text-xs text-[#9aa0a6] mt-0.5">
                    Choose whether to monitor the entire series, specific season(s), or select individual episodes.
                  </p>
                </div>

                {/* Scope Selection Pills */}
                <div className="inline-flex p-1 rounded-full bg-[#1a1e28] border border-white/[0.08] self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={selectWholeShow}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectionMode === 'whole_show'
                        ? 'bg-white text-black shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>Whole Show</span>
                  </button>
                  <button
                    type="button"
                    onClick={selectSpecificSeasonsMode}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectionMode === 'specific_seasons'
                        ? 'bg-white text-black shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>Specific Seasons</span>
                  </button>
                  <button
                    type="button"
                    onClick={selectIndividualEpisodesMode}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectionMode === 'individual_episodes'
                        ? 'bg-white text-black shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>Individual Episodes</span>
                  </button>
                </div>
              </div>

              {/* Loading TV Episodes */}
              {loadingTvDetails && (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2 bg-[#1a1e28]/50 rounded-2xl border border-white/[0.05]">
                  <Loader2 className="w-6 h-6 text-[#a8c7fa] animate-spin" />
                  <span className="text-xs text-[#9aa0a6] font-medium">Loading season and episode guide...</span>
                </div>
              )}

              {/* TV Details Loaded */}
              {!loadingTvDetails && tvDetails && (
                <div className="space-y-4">
                  {/* Quick Preset Action Bar for Seasons & Episodes */}
                  <div className="flex items-center justify-between gap-2 flex-wrap bg-[#1a1e28]/60 p-2.5 px-3.5 rounded-2xl border border-white/[0.06] text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        Selected: <span className="text-[#a8c7fa] font-bold">{selectedEpisodes.size}</span> of {tvDetails.totalEpisodes} episodes
                      </span>
                      <span className="text-[#5f6368]">•</span>
                      <span className="text-[#9aa0a6]">
                        {selectedSeasons.size} of {tvDetails.totalSeasons} seasons
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={selectWholeShow}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        All Episodes
                      </button>
                      <button
                        type="button"
                        onClick={selectLatestSeasonOnly}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Latest Season
                      </button>
                      {tvDetails.seasons.length > 1 && (
                        <button
                          type="button"
                          onClick={selectFirstSeasonOnly}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Season 1 Only
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-[#9aa0a6] hover:text-red-400 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* MODE 1: WHOLE SHOW HIGHLIGHT */}
                  {selectionMode === 'whole_show' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#a8c7fa]/10 to-transparent border border-[#a8c7fa]/25 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#a8c7fa]/20 flex items-center justify-center text-[#a8c7fa] shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white">Full Series Monitoring Active</h5>
                          <p className="text-xs text-[#9aa0a6] mt-0.5">
                            All current {tvDetails.totalSeasons} seasons ({tvDetails.totalEpisodes} episodes) plus any future seasons will be monitored for downloads.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {tvDetails.seasons.map((s) => (
                          <div
                            key={s.seasonNumber}
                            className="px-3 py-1 rounded-full bg-white/[0.08] text-xs font-semibold text-white flex items-center gap-1.5 border border-white/[0.08]"
                          >
                            <Check className="w-3 h-3 text-[#b4e3be]" />
                            <span>{s.title}</span>
                            <span className="text-[10px] text-[#9aa0a6]">({s.episodeCount} eps)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MODE 2: SPECIFIC SEASONS CARDS */}
                  {selectionMode === 'specific_seasons' && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#9aa0a6]">
                        Click on season cards to toggle monitoring for that entire season:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {tvDetails.seasons.map((season) => {
                          const isSelected = selectedSeasons.has(season.seasonNumber);
                          return (
                            <button
                              key={season.seasonNumber}
                              type="button"
                              onClick={() => handleToggleSeason(season.seasonNumber)}
                              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1a2333] border-[#a8c7fa]/50 text-white ring-1 ring-[#a8c7fa]/30'
                                  : 'bg-[#1a1e28] border-white/[0.07] text-[#9aa0a6] hover:bg-[#222734] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-[#a8c7fa] text-[#041e49]' : 'border border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                                <div className="truncate">
                                  <span className="text-xs font-bold block text-white">{season.title}</span>
                                  <span className="text-[11px] text-[#9aa0a6] font-mono">
                                    {season.episodeCount} episodes
                                  </span>
                                </div>
                              </div>

                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]'
                                  : 'bg-white/[0.05] text-[#5f6368]'
                              }`}>
                                {isSelected ? 'Monitored' : 'Ignored'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* MODE 3: INDIVIDUAL EPISODES DRILL DOWN (ACCORDION) */}
                  {selectionMode === 'individual_episodes' && (
                    <div className="space-y-3">
                      <p className="text-xs text-[#9aa0a6]">
                        Expand any season below to check/uncheck individual episodes:
                      </p>

                      <div className="space-y-2">
                        {tvDetails.seasons.map((season) => {
                          const isExpanded = expandedSeasons.has(season.seasonNumber);
                          
                          // Count how many episodes are checked in this season
                          const checkedEpsInSeason = season.episodes.filter((ep) =>
                            selectedEpisodes.has(`${season.seasonNumber}_${ep.episodeNumber}`)
                          ).length;
                          const allCheckedInSeason =
                            checkedEpsInSeason === season.episodeCount && season.episodeCount > 0;
                          const someCheckedInSeason =
                            checkedEpsInSeason > 0 && checkedEpsInSeason < season.episodeCount;

                          return (
                            <div
                              key={season.seasonNumber}
                              className="rounded-2xl border border-white/[0.08] bg-[#1a1e28] overflow-hidden transition-all"
                            >
                              {/* Season Header Row */}
                              <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#202532] transition-colors">
                                <div className="flex items-center gap-3">
                                  {/* Season Level Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSeason(season.seasonNumber)}
                                    className="text-white hover:text-[#a8c7fa] transition-colors cursor-pointer p-0.5"
                                    title={allCheckedInSeason ? 'Deselect all in season' : 'Select all in season'}
                                  >
                                    {allCheckedInSeason ? (
                                      <CheckSquare className="w-5 h-5 text-[#a8c7fa]" />
                                    ) : someCheckedInSeason ? (
                                      <MinusSquare className="w-5 h-5 text-[#a8c7fa]" />
                                    ) : (
                                      <Square className="w-5 h-5 text-white/40" />
                                    )}
                                  </button>

                                  <div
                                    className="cursor-pointer"
                                    onClick={() => handleToggleExpandSeason(season.seasonNumber)}
                                  >
                                    <span className="text-xs font-bold text-white block">
                                      {season.title}
                                    </span>
                                    <span className="text-[11px] text-[#9aa0a6] font-mono">
                                      {checkedEpsInSeason} / {season.episodeCount} episodes selected
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSeason(season.seasonNumber)}
                                    className="text-[11px] text-[#9aa0a6] hover:text-white px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer"
                                  >
                                    {allCheckedInSeason ? 'Deselect Season' : 'Select Season'}
                                  </button>

                                  {/* Expand / Collapse Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExpandSeason(season.seasonNumber)}
                                    className="p-1 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                                    title={isExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Individual Episodes List */}
                              {isExpanded && (
                                <div className="border-t border-white/[0.06] bg-[#14171f]/80 p-2 space-y-1 max-h-64 overflow-y-auto">
                                  {season.episodes.map((ep) => {
                                    const epKey = `${season.seasonNumber}_${ep.episodeNumber}`;
                                    const isEpChecked = selectedEpisodes.has(epKey);

                                    return (
                                      <div
                                        key={ep.id}
                                        onClick={() => handleToggleEpisode(season.seasonNumber, ep.episodeNumber)}
                                        className={`p-2 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer text-xs ${
                                          isEpChecked
                                            ? 'bg-white/[0.06] text-white'
                                            : 'text-[#9aa0a6] hover:bg-white/[0.03] hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <button
                                            type="button"
                                            className="p-0.5 shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleEpisode(season.seasonNumber, ep.episodeNumber);
                                            }}
                                          >
                                            {isEpChecked ? (
                                              <CheckSquare className="w-4 h-4 text-[#a8c7fa]" />
                                            ) : (
                                              <Square className="w-4 h-4 text-white/30" />
                                            )}
                                          </button>

                                          <span className="font-mono text-[11px] font-bold text-[#a8c7fa] shrink-0 bg-[#a8c7fa]/10 px-1.5 py-0.5 rounded">
                                            E{ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                                          </span>

                                          <span className="truncate font-medium text-white">
                                            {ep.title}
                                          </span>
                                        </div>

                                        {ep.airDate && (
                                          <span className="text-[10px] text-[#5f6368] font-mono shrink-0">
                                            {ep.airDate}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MUSIC ARTIST SPECIALIZED SECTION: Studio Albums Breakdown & Monitoring */}
          {isMusic && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                <div>
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Disc3 className="w-4 h-4 text-[#b4e3be]" />
                    <span>Studio Albums & Monitoring Scope</span>
                  </h4>
                  <p className="text-xs text-[#9aa0a6] mt-0.5">
                    Select all studio albums, latest release only, or custom pick specific albums for Lidarr:
                  </p>
                </div>

                {/* Scope Selection Pills */}
                <div className="inline-flex p-1 rounded-full bg-[#1a1e28] border border-white/[0.08] self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={selectAllStudioAlbums}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      albumSelectionMode === 'all'
                        ? 'bg-[#b4e3be] text-[#072711] shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>All Studio Albums</span>
                  </button>
                  <button
                    type="button"
                    onClick={selectLatestAlbumOnly}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      albumSelectionMode === 'latest'
                        ? 'bg-[#b4e3be] text-[#072711] shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>Latest Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlbumSelectionMode('custom')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      albumSelectionMode === 'custom'
                        ? 'bg-[#b4e3be] text-[#072711] shadow-md'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <span>Custom</span>
                  </button>
                </div>
              </div>

              {/* Loading or Grid */}
              {loadingArtistDetails ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2 bg-[#1a1e28]/50 rounded-2xl border border-white/[0.05]">
                  <Loader2 className="w-6 h-6 text-[#b4e3be] animate-spin" />
                  <span className="text-xs text-[#9aa0a6] font-medium">Loading studio albums from Lidarr & Apple Music...</span>
                </div>
              ) : !artistDetails || artistDetails.studioAlbums.length === 0 ? (
                <div className="p-6 text-center bg-[#1a1e28]/40 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-xs text-[#9aa0a6]">No studio albums cataloged yet. Lidarr will index full discography upon addition.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#1a1e28]/60 p-2.5 px-3.5 rounded-2xl border border-white/[0.06]">
                    <span className="font-semibold text-white">
                      Selected: <span className="text-[#b4e3be] font-bold">{selectedAlbums.size}</span> of {artistDetails.studioAlbums.length} studio albums
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllStudioAlbums}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllStudioAlbums}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Albums Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar p-1">
                    {artistDetails.studioAlbums.map((album) => {
                      const isSelected = selectedAlbums.has(album.id);
                      return (
                        <div
                          key={album.id}
                          onClick={() => handleToggleAlbum(album.id)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#14231b] border-[#b4e3be]/60 ring-1 ring-[#b4e3be]/30'
                              : 'bg-[#14171f] border-white/[0.07] hover:border-white/20 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="aspect-square w-full rounded-xl bg-[#0c0e12] overflow-hidden relative mb-2 shadow-sm">
                            <MediaPoster
                              src={album.coverUrl}
                              alt={album.title}
                              title={album.title}
                              artistOrAuthor={item.authorOrArtist || item.title}
                              mediaType="music"
                              service="lidarr"
                              aspectRatio="square"
                              className="w-full h-full"
                            />
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center ${
                              isSelected ? 'bg-[#b4e3be] text-[#072711]' : 'bg-black/60 text-white/40 border border-white/20'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            {album.year && (
                              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white font-bold">
                                {album.year}
                              </span>
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white line-clamp-1" title={album.title}>
                              {album.title}
                            </h5>
                            <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] mt-0.5">
                              <span>{album.trackCount} tracks</span>
                              <span className={isSelected ? 'text-[#b4e3be] font-bold' : 'text-slate-500'}>
                                {isSelected ? 'Monitored' : 'Ignored'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* EPs & Mini-Albums Section if present */}
                  {artistDetails.eps && artistDetails.eps.length > 0 && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#a8c7fa]" />
                          <span>EPs & Mini-Albums ({artistDetails.eps.length})</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto custom-scrollbar p-1">
                        {artistDetails.eps.map((ep) => {
                          const isSelected = selectedAlbums.has(ep.id);
                          return (
                            <div
                              key={ep.id}
                              onClick={() => handleToggleAlbum(ep.id)}
                              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#141b2a] border-[#a8c7fa]/60 ring-1 ring-[#a8c7fa]/30'
                                  : 'bg-[#14171f] border-white/[0.07] hover:border-white/20 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <div className="aspect-square w-full rounded-xl bg-[#0c0e12] overflow-hidden relative mb-2 shadow-sm">
                                <MediaPoster
                                  src={ep.coverUrl}
                                  alt={ep.title}
                                  title={ep.title}
                                  artistOrAuthor={item.authorOrArtist || item.title}
                                  mediaType="music"
                                  service="lidarr"
                                  aspectRatio="square"
                                  className="w-full h-full"
                                />
                                <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center ${
                                  isSelected ? 'bg-[#a8c7fa] text-[#041e49]' : 'bg-black/60 text-white/40 border border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                {ep.year && (
                                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white font-bold">
                                    {ep.year}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white line-clamp-1" title={ep.title}>
                                  {ep.title}
                                </h5>
                                <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] mt-0.5">
                                  <span>{ep.trackCount} tracks</span>
                                  <span className={isSelected ? 'text-[#a8c7fa] font-bold' : 'text-slate-500'}>
                                    {isSelected ? 'Monitored' : 'Ignored'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GENERAL CONFIGURATION: Download Quality Profile & Root Storage Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Download Quality Profile */}
            <div className="bg-[#14171f] p-3.5 rounded-2xl border border-white/[0.08] shadow-sm">
              <label htmlFor="add-quality-profile-select" className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Quality Profile</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                  {item.service}
                </span>
              </label>
              <select
                id="add-quality-profile-select"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.12] hover:border-cyan-500/40 focus:border-cyan-400 rounded-full text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30 cursor-pointer font-semibold"
              >
                {loading && profiles.length === 0 ? (
                  <option value={1}>Loading quality profiles...</option>
                ) : profiles.length === 0 ? (
                  <option value={1}>Default Quality Profile</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#14171f] text-white">
                      {p.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-[#9aa0a6] mt-1.5 leading-tight">
                Select release quality for download in {item.service.toUpperCase()} (e.g. Any, HD-1080p, Ultra-HD, Lossless).
              </p>
            </div>

            {/* Root Storage Path */}
            <div className="bg-[#14171f] p-3.5 rounded-2xl border border-white/[0.08] shadow-sm">
              <label htmlFor="add-root-folder-select" className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Root Storage Destination</span>
                </span>
              </label>
              {rootFolders.length > 0 ? (
                <select
                  id="add-root-folder-select"
                  value={selectedRootPath}
                  onChange={(e) => setSelectedRootPath(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.12] hover:border-white/25 focus:border-white/40 rounded-full text-xs text-white focus:outline-none cursor-pointer font-mono truncate"
                >
                  {rootFolders.map((rf) => (
                    <option key={rf.id} value={rf.path} className="bg-[#14171f] text-white">
                      {rf.path} {rf.freeSpaceBytes ? `(Free: ${(rf.freeSpaceBytes / 1e12).toFixed(1)} TB)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="add-root-folder-input"
                  type="text"
                  value={selectedRootPath}
                  onChange={(e) => setSelectedRootPath(e.target.value)}
                  placeholder="/data/media/..."
                  className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.12] rounded-full text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                />
              )}
              <p className="text-[11px] text-[#9aa0a6] mt-1.5 leading-tight">
                Filesystem folder destination where media will be organized.
              </p>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="toggle-search-missing"
                type="checkbox"
                checked={searchForMissing}
                onChange={(e) => setSearchForMissing(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Search for release immediately</span>
                <span className="text-[#9aa0a6] text-[11px]">
                  Indexers will immediately search releases and dispatch downloads for selected items.
                </span>
              </div>
            </label>

            {!isTvShow && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="toggle-monitor-all"
                  type="checkbox"
                  checked={monitorAll}
                  onChange={(e) => setMonitorAll(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">Monitor item</span>
                  <span className="text-[#9aa0a6] text-[11px]">
                    Keep media monitored for future updates and higher-quality upgrades.
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Action Footer Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-[#9aa0a6] hidden sm:block">
              {isTvShow ? (
                <span>
                  {selectedEpisodes.size === 0 ? (
                    <span className="text-amber-400">0 episodes selected (show will be unmonitored)</span>
                  ) : selectionMode === 'whole_show' ? (
                    <span>Monitoring all {tvDetails?.totalEpisodes || 0} episodes</span>
                  ) : (
                    <span>Monitoring {selectedEpisodes.size} selected episodes</span>
                  )}
                </span>
              ) : singleSelectedAlbum ? (
                <span className="text-emerald-400 font-semibold truncate block">
                  Scoping to {singleSelectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}: {singleSelectedAlbum.title}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 text-xs font-bold text-[#9aa0a6] hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
              >
                Cancel
              </button>

              <button
                id="add-modal-submit-btn"
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial justify-center px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full shadow transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer pixel-pill active:scale-[0.98]"
                title={`Add to ${item.service.toUpperCase()}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-black shrink-0" />
                    <span>{singleSelectedAlbum ? `Add Selected ${singleSelectedAlbum.albumType === 'EP' ? 'EP' : 'Album'}` : `Add to ${item.service.toUpperCase()}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
