import React from 'react';

interface PirateShipIconProps {
  className?: string;
  size?: number;
  withBadge?: boolean;
}

export const PirateShipIcon: React.FC<PirateShipIconProps> = ({
  className = 'w-6 h-6',
  size,
  withBadge = false,
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="psiBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#090d16" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="psiSailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="psiHullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="psiFlagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {withBadge && (
        <>
          <rect width="64" height="64" rx="16" fill="url(#psiBgGrad)" />
          <rect
            width="62"
            height="62"
            x="1"
            y="1"
            rx="15"
            stroke="#06b6d4"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            fill="none"
          />
        </>
      )}

      {/* Main Rigging / Masts */}
      <line x1="33" y1="9" x2="33" y2="40" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="21" y1="18" x2="21" y2="40" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="45" y1="39" x2="55" y2="30" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />

      {/* Pirate Jolly Roger Pennant / Flag atop Main Mast */}
      <path d="M33 9 L44 12 L33 15 Z" fill="url(#psiFlagGrad)" />
      <circle cx="37" cy="12" r="1.1" fill="#0f172a" />
      <line x1="39" y1="11" x2="41" y2="13" stroke="#0f172a" strokeWidth="0.7" />

      {/* Foremast Pennant */}
      <path d="M21 17 L27 19 L21 21 Z" fill="#38bdf8" />

      {/* Main Topsail */}
      <path
        d="M27 16 C31 15 35 15 39 16 C38 20 35 22 28 22 C28 19 27 17 27 16 Z"
        fill="url(#psiSailGrad)"
      />
      {/* Main Course (Lower big sail) */}
      <path
        d="M25 24 C31 23 37 23 42 24 C41 32 37 36 26 36 C27 30 26 26 25 24 Z"
        fill="url(#psiSailGrad)"
      />

      {/* Foremast Sail */}
      <path
        d="M15 22 C19 21 23 21 27 22 C26 29 23 32 16 32 C17 27 16 24 15 22 Z"
        fill="url(#psiSailGrad)"
      />

      {/* Jib Sail */}
      <path d="M36 26 L51 36 L36 36 Z" fill="url(#psiSailGrad)" fillOpacity="0.85" />

      {/* Galleon Pirate Ship Hull */}
      <path
        d="M11 37 C14 36 17 38 21 39 L47 39 C50 39 53 37 54 35 C52 42 46 45 32 45 C18 45 12 42 11 37 Z"
        fill="url(#psiHullGrad)"
      />
      {/* Hull Gunports / Trim Line */}
      <path d="M16 41 C24 43 38 43 47 41" stroke="#06b6d4" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="23" cy="41.2" r="0.8" fill="#0f172a" />
      <circle cx="29" cy="41.5" r="0.8" fill="#0f172a" />
      <circle cx="35" cy="41.5" r="0.8" fill="#0f172a" />
      <circle cx="41" cy="41.2" r="0.8" fill="#0f172a" />

      {/* Cresting Ocean Waves */}
      <path
        d="M9 48 C14 45.5 19 45.5 24 48 C29 50.5 34 50.5 39 48 C44 45.5 49 45.5 55 48"
        stroke="#22d3ee"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M13 52 C17 50.5 22 50.5 26 52 C30 53.5 35 53.5 39 52 C43 50.5 48 50.5 52 52"
        stroke="#0284c7"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  );
};
