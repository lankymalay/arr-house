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
        {/* Background Badge Gradient - Luminous Indigo/Slate with subtle contrast */}
        <linearGradient id="tvStackBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#222b3e" />
          <stop offset="50%" stopColor="#182030" />
          <stop offset="100%" stopColor="#0f1522" />
        </linearGradient>

        {/* Luminous Outer Border Gradient */}
        <linearGradient id="tvBadgeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        {/* 1. Sonarr - Vivid Electric Cyan */}
        <linearGradient id="sonarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* 2. Radarr - Vivid Radiant Amber Gold */}
        <linearGradient id="radarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        {/* 3. Lidarr - Vivid Brilliant Emerald Green */}
        <linearGradient id="lidarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* 4. Prowlarr - Vivid Rose/Coral Pink */}
        <linearGradient id="prowlarrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
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
            stroke="url(#tvBadgeBorder)"
            strokeWidth="1.6"
            strokeOpacity="0.75"
            fill="none"
          />
        </>
      )}

      {/* TV Aerial Antenna (Bright White with Luminous Receiver Nodes) */}
      <line
        x1="32"
        y1="18.5"
        x2="24"
        y2="13.5"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="13.5" r="2" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />

      <line
        x1="32"
        y1="18.5"
        x2="40"
        y2="13.5"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="40" cy="13.5" r="2" fill="#fbbf24" stroke="#ffffff" strokeWidth="0.8" />

      <circle cx="32" cy="18.5" r="2.2" fill="#e2e8f0" />

      {/* Four Stacked Service Blocks (High-Contrast, Vibrant 40px Wide Composition) */}
      {/* 1. Sonarr (Cyan - TV) */}
      <rect x="12" y="19" width="40" height="7.2" rx="2.5" fill="url(#sonarrGrad)" />
      <line x1="14" y1="20" x2="50" y2="20" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />

      {/* 2. Radarr (Amber Gold - Movies) */}
      <rect x="12" y="27.6" width="40" height="7.2" rx="2.5" fill="url(#radarrGrad)" />
      <line x1="14" y1="28.6" x2="50" y2="28.6" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />

      {/* 3. Lidarr (Emerald Green - Music) */}
      <rect x="12" y="36.2" width="40" height="7.2" rx="2.5" fill="url(#lidarrGrad)" />
      <line x1="14" y1="37.2" x2="50" y2="37.2" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />

      {/* 4. Prowlarr (Rose/Coral - Indexers) */}
      <rect x="12" y="44.8" width="40" height="7.2" rx="2.5" fill="url(#prowlarrGrad)" />
      <line x1="14" y1="45.8" x2="50" y2="45.8" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />
    </svg>
  );
};
