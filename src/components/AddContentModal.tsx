import React, { useState, useEffect } from 'react';
import { X, DownloadCloud } from 'lucide-react';
import type { SearchResultItem, QualityProfile, RootFolder } from '../types.js';
import { useToast } from '../context/ToastContext.js';

interface AddContentModalProps {
  item: SearchResultItem | null;
  onClose: () => void;
  onAdded: () => void;
}

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
            // Default media storage path
            setSelectedRootPath(`/data/media/${item.service === 'sonarr' ? 'tv' : item.service === 'radarr' ? 'movies' : 'music'}`);
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

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRootPath) {
      error('Root Folder Required', 'Please select or enter a root folder destination.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/arr/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          service: item.service,
          title: item.title,
          foreignId: item.foreignId,
          rootFolderPath: selectedRootPath,
          qualityProfileId: selectedProfileId,
          monitored: monitorAll,
          searchForMissing,
          metadata: {
            year: item.year,
            overview: item.overview,
            posterUrl: item.posterUrl,
            genres: item.genres
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Added to Library', data.message || `Added ${item.title} to ${item.service.toUpperCase()}`);
        onAdded();
        onClose();
      } else {
        error('Failed to Add', data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      error('Network Error', err.message || 'Could not reach server');
    } finally {
      setSubmitting(false);
    }
  };

  const serviceBadgeClass = 
    item.service === 'sonarr' ? 'bg-[#a8c7fa] text-[#041e49]' :
    item.service === 'radarr' ? 'bg-[#e0d0b8] text-[#3e2723]' :
    'bg-[#b4e3be] text-[#072711]';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#14171f] border border-white/[0.09] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header with image preview */}
        <div className="relative p-6 border-b border-white/[0.07] flex items-start gap-4">
          <div className="w-16 h-24 rounded-2xl bg-[#0c0e12] overflow-hidden shrink-0 border border-white/[0.08]">
            {item.posterUrl ? (
              <img src={item.posterUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#5f6368] text-xs">No image</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm ${serviceBadgeClass}`}>
                {item.service}
              </span>
              <span className="text-xs text-[#9aa0a6] font-mono">{item.year}</span>
            </div>
            <h3 className="text-base font-extrabold text-white truncate font-sans tracking-tight">{item.title}</h3>
            {item.authorOrArtist && (
              <p className="text-xs text-[#9aa0a6] truncate mt-0.5">{item.authorOrArtist}</p>
            )}
            <p className="text-xs text-[#9aa0a6] line-clamp-2 mt-1.5 leading-relaxed">{item.overview || 'No synopsis available.'}</p>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-white p-1.5 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quality Profile */}
          <div>
            <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
              Quality / Metadata Profile
            </label>
            <select
              id="add-quality-profile-select"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer font-medium"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#14171f] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Root Folder Path */}
          <div>
            <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Root Storage Path (Host)</span>
            </label>
            {rootFolders.length > 0 ? (
              <select
                id="add-root-folder-select"
                value={selectedRootPath}
                onChange={(e) => setSelectedRootPath(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer font-mono"
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
                className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30 font-mono"
              />
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="toggle-search-missing"
                type="checkbox"
                checked={searchForMissing}
                onChange={(e) => setSearchForMissing(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Search for release immediately</span>
                <span className="text-[#9aa0a6] text-[11px]">Indexers will immediately query releases and dispatch grab</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="toggle-monitor-all"
                type="checkbox"
                checked={monitorAll}
                onChange={(e) => setMonitorAll(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Monitor all seasons / tracks</span>
                <span className="text-[#9aa0a6] text-[11px]">Keep media monitored for future updates and upgrades</span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#9aa0a6] hover:text-white rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill"
            >
              Cancel
            </button>
            <button
              id="add-modal-submit-btn"
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full shadow transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer pixel-pill"
            >
              {submitting ? (
                <span>Adding & Grabbing...</span>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Add to Stack</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
