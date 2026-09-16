import React from 'react';

interface PirateShipIconProps {
  className?: string;
  withBadge?: boolean;
}

export const PirateShipIcon: React.FC<PirateShipIconProps> = ({
  className = 'w-8 h-8',
  withBadge = false
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Background Badge Gradient - Rich, Clean, Deep Obsidian */}
        <linearGradient id="tvStackBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111726" />
          <stop offset="100%" stopColor="#080c14" />
        </linearGradient>

        {/* 1. Sonarr - Clear Vibrant Electric Cyan */}
        <linearGradient id="sonarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0099ff" />
        </linearGradient>

        {/* 2. Radarr - Clear Vibrant Warm Amber Gold */}
        <linearGradient id="radarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffc107" />
          <stop offset="100%" stopColor="#ff9800" />
        </linearGradient>

        {/* 3. Lidarr - Clear Vibrant Vivid Emerald Green */}
        <linearGradient id="lidarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10e070" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* 4. Prowlarr - Clear Vibrant Deep Coral Orange */}
        <linearGradient id="prowlarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff6b35" />
          <stop offset="100%" stopColor="#e63946" />
        </linearGradient>
      </defs>

      {/* Optional Outer Container Badge */}
      {withBadge && (
        <>
          <rect width="64" height="64" rx="16" fill="url(#tvStackBg)" />
          <rect
            width="62"
            height="62"
            x="1"
            y="1"
            rx="15"
            stroke="#2e3b52"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}

      {/* TV Aerial Antenna (High Contrast Silver & Pure White Tips) */}
      <line
        x1="32"
        y1="19.5"
        x2="25"
        y2="15.2"
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="25" cy="15.2" r="1.6" fill="#ffffff" />

      <line
        x1="32"
        y1="19.5"
        x2="39"
        y2="15.2"
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="39" cy="15.2" r="1.6" fill="#ffffff" />

      <circle cx="32" cy="19.5" r="1.8" fill="#94a3b8" />

      {/* Four Stacked Service Blocks (Clear, Vibrant, High-Contrast 36x36 Composition) */}
      {/* 1. Sonarr (Cyan - TV) */}
      <rect x="14" y="19.7" width="36" height="6.6" rx="2" fill="url(#sonarrGrad)" />
      <line x1="16" y1="20.5" x2="48" y2="20.5" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" />

      {/* 2. Radarr (Amber Gold - Movies) */}
      <rect x="14" y="27.6" width="36" height="6.6" rx="2" fill="url(#radarrGrad)" />
      <line x1="16" y1="28.4" x2="48" y2="28.4" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" />

      {/* 3. Lidarr (Emerald Green - Music) */}
      <rect x="14" y="35.5" width="36" height="6.6" rx="2" fill="url(#lidarrGrad)" />
      <line x1="16" y1="36.3" x2="48" y2="36.3" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" />

      {/* 4. Prowlarr (Deep Coral Orange - Indexers) */}
      <rect x="14" y="43.4" width="36" height="6.6" rx="2" fill="url(#prowlarrGrad)" />
      <line x1="16" y1="44.2" x2="48" y2="44.2" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" />
    </svg>
  );
};
