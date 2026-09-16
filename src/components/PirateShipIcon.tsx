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
        {/* Background Badge Gradient */}
        <linearGradient id="tvStackBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#161e2e" />
          <stop offset="100%" stopColor="#0a0e16" />
        </linearGradient>

        {/* 1. Sonarr Cyan Gradient */}
        <linearGradient id="sonarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* 2. Radarr Yellow Gradient */}
        <linearGradient id="radarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>

        {/* 3. Lidarr Green Gradient */}
        <linearGradient id="lidarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>

        {/* 4. Prowlarr Orange Gradient */}
        <linearGradient id="prowlarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
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
            stroke="#263347"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}

      {/* TV Aerial Antenna (Compact Rabbit Ears - Square Aspect Ratio) */}
      <line
        x1="32"
        y1="19.5"
        x2="25"
        y2="15.5"
        stroke="#94a3b8"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="25" cy="15.5" r="1.5" fill="#e2e8f0" />

      <line
        x1="32"
        y1="19.5"
        x2="39"
        y2="15.5"
        stroke="#94a3b8"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="39" cy="15.5" r="1.5" fill="#e2e8f0" />

      <circle cx="32" cy="19.5" r="1.6" fill="#475569" />

      {/* Four Stacked Service Blocks (Mathematically Square 36x36 Bounding Box) */}
      {/* 1. Sonarr (Cyan - TV) */}
      <rect x="14" y="19.7" width="36" height="6.6" rx="2" fill="url(#sonarrGrad)" />

      {/* 2. Radarr (Yellow - Movies) */}
      <rect x="14" y="27.6" width="36" height="6.6" rx="2" fill="url(#radarrGrad)" />

      {/* 3. Lidarr (Green - Music) */}
      <rect x="14" y="35.5" width="36" height="6.6" rx="2" fill="url(#lidarrGrad)" />

      {/* 4. Prowlarr (Orange - Indexers) */}
      <rect x="14" y="43.4" width="36" height="6.6" rx="2" fill="url(#prowlarrGrad)" />
    </svg>
  );
};
