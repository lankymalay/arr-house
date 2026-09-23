// Application Version and TrueNAS Deployment Build Tracking

export const APP_VERSION = '1.0.1';

export interface BuildInfo {
  version: string;
  buildId: string;
  buildTime: string;
  formattedDate: string;
  shortBuildString: string;
  fullBuildString: string;
}

export function getBuildInfo(): BuildInfo {
  // Build variables injected at build/bundle time via Vite define
  const buildTimeRaw = (import.meta as any).env?.VITE_APP_BUILD_TIME || new Date().toISOString();
  const buildId = (import.meta as any).env?.VITE_APP_BUILD_ID || Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  const version = (import.meta as any).env?.VITE_APP_VERSION || APP_VERSION;

  let formattedDate = 'Recent';
  try {
    const d = new Date(buildTimeRaw);
    formattedDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    formattedDate = buildTimeRaw.slice(0, 10);
  }

  return {
    version: `v${version.replace(/^v/, '')}`,
    buildId,
    buildTime: buildTimeRaw,
    formattedDate,
    shortBuildString: `v${version.replace(/^v/, '')} • ${buildId}`,
    fullBuildString: `v${version.replace(/^v/, '')} (build ${buildId} - ${formattedDate})`
  };
}
