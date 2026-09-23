import React, { useState } from 'react';
import { getBuildInfo, BuildInfo } from '../version.js';
import { Check, Copy, RefreshCw, Server, ShieldCheck, X } from 'lucide-react';

interface VersionBadgeProps {
  variant?: 'sidebar' | 'footer' | 'inline';
  collapsed?: boolean;
  className?: string;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  variant = 'sidebar',
  collapsed = false,
  className = ''
}) => {
  const [buildInfo] = useState<BuildInfo>(() => getBuildInfo());
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    online: boolean;
    uptime?: string;
    serverVersion?: string;
  } | null>(null);

  const copyBuildDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `Arr House Version: ${buildInfo.version}\nBuild ID: ${buildInfo.buildId}\nBuilt At: ${buildInfo.buildTime}\nTrueNAS Deployed Build: Verified`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyServerVersion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingServer(true);
    try {
      const res = await fetch('/api/version');
      if (res.ok) {
        const data = await res.json();
        const mins = Math.floor((data.uptimeSeconds || 0) / 60);
        const hours = Math.floor(mins / 60);
        const uptimeStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
        setServerStatus({
          online: true,
          uptime: uptimeStr,
          serverVersion: data.version
        });
      } else {
        setServerStatus({ online: false });
      }
    } catch {
      setServerStatus({ online: false });
    } finally {
      setCheckingServer(false);
    }
  };

  if (variant === 'sidebar') {
    if (collapsed) {
      return (
        <div className={`px-2 py-2 flex flex-col items-center justify-center ${className}`}>
          <button
            id="sidebar-version-btn-collapsed"
            onClick={() => setModalOpen(true)}
            title={`Arr House ${buildInfo.fullBuildString} - Click for TrueNAS release details`}
            className="flex items-center justify-center w-full p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono font-medium text-slate-400 hover:text-slate-200 transition-all border border-white/[0.05] cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          </button>

          {/* Details Modal */}
          {modalOpen && renderModal()}
        </div>
      );
    }

    return (
      <div className={`px-3 pt-2 pb-1 ${className}`}>
        <button
          id="sidebar-version-btn"
          onClick={() => setModalOpen(true)}
          title="Click to view full build details and TrueNAS sync status"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all text-[11px] font-mono cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition-transform" />
            <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">
              {buildInfo.version}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              • b.{buildInfo.buildId}
            </span>
          </div>

          <span className="text-[9px] uppercase tracking-wider font-sans font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
            TrueNAS
          </span>
        </button>

        {/* Details Modal */}
        {modalOpen && renderModal()}
      </div>
    );
  }

  // Footer or Inline variant
  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        id="footer-version-btn"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/40 border border-white/[0.08] text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-xs"
        title="View TrueNAS deployment version & build identifier"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="font-medium text-slate-300">{buildInfo.version}</span>
        <span className="text-[10px] text-slate-400">b.{buildInfo.buildId}</span>
      </button>

      {/* Details Modal */}
      {modalOpen && renderModal()}
    </div>
  );

  function renderModal() {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-text animate-fade-in"
        onClick={() => setModalOpen(false)}
      >
        <div 
          className="w-full max-w-sm rounded-2xl bg-[#141a29] border border-[#2d3c54] p-5 shadow-2xl relative space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  TrueNAS Deployment
                </h3>
                <p className="text-[11px] text-slate-400">
                  Release & Container Build Info
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Card */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/[0.05]">
              <span className="text-slate-400">App Version</span>
              <span className="font-mono font-bold text-white text-sm">
                {buildInfo.version}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/[0.05]">
              <span className="text-slate-400">Build Identifier</span>
              <span className="font-mono font-medium text-emerald-400">
                {buildInfo.buildId}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/[0.05]">
              <span className="text-slate-400">Build Timestamp</span>
              <span className="font-mono text-slate-300 text-[11px]">
                {buildInfo.formattedDate}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2 text-[11px] text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Automated TrueNAS Tracking</p>
                <p className="text-slate-300 mt-0.5">
                  This build ID updates whenever the app is built or pulled into your TrueNAS container.
                </p>
              </div>
            </div>

            {serverStatus && (
              <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                serverStatus.online 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                <span>Backend Container:</span>
                <span className="font-mono font-semibold">
                  {serverStatus.online ? `Online (Up ${serverStatus.uptime})` : 'Offline / Unreachable'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={copyBuildDetails}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white border border-white/[0.1] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Build Info'}</span>
            </button>

            <button
              onClick={verifyServerVersion}
              disabled={checkingServer}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Ping backend API to verify container status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingServer ? 'animate-spin' : ''}`} />
              <span>Verify Ping</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
};
