import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  DownloadCloud, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Layers,
  HardDrive
} from 'lucide-react';
import type { InteractiveRelease, ServiceId, MediaType } from '../types.js';
import { getContentTypeLabel } from '../types.js';
import { useToast } from '../context/ToastContext.js';

export interface InteractiveGrabTarget {
  service: ServiceId;
  title: string;
  year?: number;
  mediaType: MediaType;
  posterUrl?: string;
  foreignId?: string | number;
  season?: number;
  episode?: number;
  albumTitle?: string;
  artistName?: string;
  contextSubtitle?: string;
}

interface InteractiveGrabModalProps {
  target: InteractiveGrabTarget | null;
  onClose: () => void;
  onGrabSuccess?: (releaseTitle: string) => void;
}

export const InteractiveGrabModal: React.FC<InteractiveGrabModalProps> = ({
  target,
  onClose,
  onGrabSuccess
}) => {
  const { success, error } = useToast();
  const [releases, setReleases] = useState<InteractiveRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [grabbingId, setGrabbingId] = useState<string | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);

  // Filters
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedProtocol, setSelectedProtocol] = useState<'all' | 'torrent' | 'usenet'>('all');
  const [onlyProfileMatches, setOnlyProfileMatches] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'size' | 'seeders' | 'age'>('score');

  useEffect(() => {
    if (!target) return;
    const initialQuery = target.albumTitle 
      ? (target.artistName ? `${target.artistName} - ${target.albumTitle}` : target.albumTitle)
      : target.title;
    setSearchQuery(initialQuery);
    fetchReleases(initialQuery);
  }, [target]);

  const fetchReleases = async (queryToSearch: string) => {
    if (!target) return;
    setLoading(true);
    setGrabbedId(null);

    try {
      const token = localStorage.getItem('arr_token');
      const params = new URLSearchParams({
        service: target.service,
        title: queryToSearch || target.title,
        mediaType: target.mediaType
      });

      if (target.year) params.set('year', String(target.year));
      if (target.foreignId) params.set('foreignId', String(target.foreignId));
      if (target.season) params.set('season', String(target.season));
      if (target.episode) params.set('episode', String(target.episode));
      if (target.albumTitle) params.set('albumTitle', target.albumTitle);
      if (target.artistName) params.set('artistName', target.artistName);

      const res = await fetch(`/api/arr/releases?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases || []);
      } else {
        error('Release Search Failed', 'Could not query indexers for releases.');
      }
    } catch (err) {
      console.error('Failed to load releases:', err);
      error('Error', 'Failed to retrieve release candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrabSpecific = async (rel: InteractiveRelease) => {
    if (!target) return;
    setGrabbingId(rel.id);

    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/grab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: target.service,
          title: target.title,
          albumTitle: target.albumTitle,
          artistName: target.artistName,
          year: target.year,
          mediaType: target.mediaType,
          posterUrl: target.posterUrl,
          mode: 'interactive',
          release: rel,
          foreignId: target.foreignId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGrabbedId(rel.id);
        success('Grab Successful', `Selected release sent to download client: ${rel.quality}`);
        if (onGrabSuccess) onGrabSuccess(rel.title);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        error('Grab Failed', data.error || 'Could not queue this release.');
      }
    } catch (err: any) {
      error('Network Error', err.message || 'Failed to dispatch grab request.');
    } finally {
      setGrabbingId(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Distinct qualities available
  const availableQualities = useMemo(() => {
    const set = new Set<string>();
    releases.forEach((r) => {
      if (r.quality) set.add(r.quality);
    });
    return Array.from(set);
  }, [releases]);

  // Filtered and sorted releases
  const filteredReleases = useMemo(() => {
    return releases
      .filter((r) => {
        if (selectedQuality !== 'all' && r.quality !== selectedQuality) return false;
        if (selectedProtocol !== 'all' && r.protocol !== selectedProtocol) return false;
        if (onlyProfileMatches && !r.isProfileMatch) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return (b.qualityScore || 0) - (a.qualityScore || 0);
        if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
        if (sortBy === 'seeders') return (b.seeders || 0) - (a.seeders || 0);
        if (sortBy === 'age') return (a.ageDays || 0) - (b.ageDays || 0);
        return 0;
      });
  }, [releases, selectedQuality, selectedProtocol, onlyProfileMatches, sortBy]);

  if (!target) return null;

  const serviceBadgeClass = 
    target.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
    target.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
    'bg-[#b4e3be] text-[#072711]';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
    >
      <motion.div 
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#14171f] border border-white/[0.08] rounded-3xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#11141c]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${serviceBadgeClass}`}>
                {getContentTypeLabel(target.service, target.mediaType)}
              </span>
              <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-full">
                Interactive Grab
              </span>
              {target.year && (
                <span className="text-xs text-slate-400 font-mono">{target.year}</span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white truncate tracking-tight flex items-center gap-2">
              <span>{target.title}</span>
              {target.contextSubtitle && (
                <span className="text-xs text-[#a8c7fa] font-mono font-normal">
                  • {target.contextSubtitle}
                </span>
              )}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query & Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-[#181c25] border-b border-white/[0.06] space-y-3">
          {/* Search bar for tweaking release query */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              fetchReleases(searchQuery);
            }} 
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search release title, scene tag, resolution..."
                className="w-full bg-[#11141c] border border-white/[0.08] focus:border-cyan-400 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 pixel-pill"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Searching Indexers...' : 'Search Indexers'}</span>
            </button>
          </form>

          {/* Filter Pills & Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Protocol Filter */}
              <div className="flex items-center bg-[#11141c] p-0.5 rounded-full border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedProtocol('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                    selectedProtocol === 'all' ? 'bg-white text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Protocols
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProtocol('torrent')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                    selectedProtocol === 'torrent' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Torrents
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProtocol('usenet')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                    selectedProtocol === 'usenet' ? 'bg-indigo-400 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Usenet
                </button>
              </div>

              {/* Quality Selector */}
              {availableQualities.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedQuality('all')}
                    className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer ${
                      selectedQuality === 'all'
                        ? 'bg-white/10 text-white border-white/20 font-bold'
                        : 'border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    All Qualities
                  </button>
                  {availableQualities.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuality(q)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border whitespace-nowrap cursor-pointer ${
                        selectedQuality === q
                          ? 'bg-white/10 text-white border-white/20 font-bold'
                          : 'border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Profile Match Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 ml-1">
                <input
                  type="checkbox"
                  checked={onlyProfileMatches}
                  onChange={(e) => setOnlyProfileMatches(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-cyan-400 focus:ring-0 cursor-pointer"
                />
                <span>Profile matches only</span>
              </label>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-[#11141c] border border-white/[0.08] text-white rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer"
              >
                <option value="score">Profile Score</option>
                <option value="seeders">Seeders</option>
                <option value="size">Size</option>
                <option value="age">Age</option>
              </select>
            </div>
          </div>
        </div>

        {/* Release Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Scanning indexers for candidate releases...</p>
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400/80 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Matching Releases Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No indexed releases matched your current quality and protocol filters. Try relaxing your filters or modifying the search terms above.
              </p>
            </div>
          ) : (
            filteredReleases.map((rel) => {
              const isGrabbing = grabbingId === rel.id;
              const isGrabbed = grabbedId === rel.id;

              return (
                <div
                  key={rel.id}
                  id={`release-row-${rel.id}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isGrabbed
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : rel.isProfileMatch
                      ? 'bg-[#181c25] hover:bg-[#1f2430] border-white/[0.06] hover:border-white/20'
                      : 'bg-[#181c25]/50 border-white/[0.03] opacity-80'
                  }`}
                >
                  {/* Release Meta */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Top tags row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quality Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-mono">
                        {rel.quality}
                      </span>

                      {/* Protocol Badge */}
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        rel.protocol === 'torrent' ? 'bg-teal-900/40 text-teal-300' : 'bg-indigo-900/40 text-indigo-300'
                      }`}>
                        {rel.protocol}
                      </span>

                      {/* Indexer Source */}
                      <span className="text-[10px] text-slate-400 font-mono bg-white/[0.05] px-2 py-0.5 rounded-full">
                        {rel.indexer}
                      </span>

                      {/* Profile Match / Rejection status */}
                      {rel.isProfileMatch ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Meets Profile</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1" title={rel.rejectionReasons?.join(', ')}>
                          <AlertCircle className="w-3 h-3" />
                          <span>{rel.rejectionReasons?.[0] || 'Quality mismatch'}</span>
                        </span>
                      )}
                    </div>

                    {/* Full Release Title */}
                    <h5 className="text-xs font-mono font-medium text-white break-all leading-snug hover:text-cyan-300 transition-colors" title={rel.title}>
                      {rel.title}
                    </h5>

                    {/* Specs Row: Size, Seeders/Age, Codec, Audio */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                      <span className="font-bold text-slate-200">
                        {formatBytes(rel.sizeBytes)}
                      </span>

                      {rel.protocol === 'torrent' && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">▲ {rel.seeders ?? 0}</span>
                          <span className="text-slate-500">▼ {rel.leechers ?? 0}</span>
                        </span>
                      )}

                      {rel.ageDays !== undefined && (
                        <span>{rel.ageDays}d old</span>
                      )}

                      {rel.codec && (
                        <span className="text-slate-300">{rel.codec}</span>
                      )}

                      {rel.audio && (
                        <span className="text-slate-300">{rel.audio}</span>
                      )}
                    </div>
                  </div>

                  {/* Grab Action Button */}
                  <div className="shrink-0 w-full sm:w-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleGrabSpecific(rel)}
                      disabled={isGrabbing || isGrabbed}
                      className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer pixel-pill ${
                        isGrabbed
                          ? 'bg-emerald-500 text-black shadow'
                          : isGrabbing
                          ? 'bg-white/20 text-white animate-pulse'
                          : rel.isProfileMatch
                          ? 'bg-white hover:bg-neutral-200 text-black shadow'
                          : 'bg-[#1f2430] hover:bg-white/20 text-slate-200 border border-white/10'
                      }`}
                    >
                      {isGrabbed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Grabbed!</span>
                        </>
                      ) : isGrabbing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Grabbing...</span>
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Grab Release</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#11141c] border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-mono font-bold text-white">{filteredReleases.length}</span> indexed release candidates
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/15 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
};
