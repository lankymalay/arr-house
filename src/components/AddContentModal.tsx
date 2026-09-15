import React, { useState, useEffect } from 'react';
import { X, Plus, Folder, Sparkles, Check, DownloadCloud, AlertCircle } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header with image preview */}
        <div className="relative p-5 border-b border-slate-800 flex items-start gap-4">
          <div className="w-16 h-24 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
            {item.posterUrl ? (
              <img src={item.posterUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No image</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {item.service}
              </span>
              <span className="text-xs text-slate-400">{item.year}</span>
            </div>
            <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
            {item.authorOrArtist && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{item.authorOrArtist}</p>
            )}
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.overview || 'No synopsis available.'}</p>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quality Profile */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Quality / Metadata Profile
            </label>
            <select
              id="add-quality-profile-select"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Root Folder Path */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Root Storage Path (TrueNAS Host)</span>
            </label>
            {rootFolders.length > 0 ? (
              <select
                id="add-root-folder-select"
                value={selectedRootPath}
                onChange={(e) => setSelectedRootPath(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {rootFolders.map((rf) => (
                  <option key={rf.id} value={rf.path}>
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
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="toggle-search-missing"
                type="checkbox"
                checked={searchForMissing}
                onChange={(e) => setSearchForMissing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">Start search for missing items immediately</span>
                <span className="text-slate-400">Prowlarr indexers will immediately query download releases</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="toggle-monitor-all"
                type="checkbox"
                checked={monitorAll}
                onChange={(e) => setMonitorAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">Monitor new/all seasons/albums/books</span>
                <span className="text-slate-400">Keep media monitored for future updates and quality upgrades</span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="add-modal-submit-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Adding & Grabbing...</span>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Add & Start Monitoring</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
