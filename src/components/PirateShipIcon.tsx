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
        <linearGradient id="legoIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#182235" />
          <stop offset="100%" stopColor="#0b0f17" />
        </linearGradient>

        {/* Pirate Pennant Yellow */}
        <linearGradient id="legoFlagGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>

        {/* House Roof Slope Brick (Lego Royal Blue) */}
        <linearGradient id="legoRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>

        {/* Cabin / Server Stack (Lego Navy Slate) */}
        <linearGradient id="legoCabinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#24334b" />
          <stop offset="100%" stopColor="#131b28" />
        </linearGradient>

        {/* Ship Hull Inverted Slope Brick (Deep Nautical Galleon) */}
        <linearGradient id="legoHullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Optional Outer Container Badge */}
      {withBadge && (
        <>
          <rect width="64" height="64" rx="16" fill="url(#legoIconBg)" />
          <rect
            width="62"
            height="62"
            x="1"
            y="1"
            rx="15"
            stroke="#2e3c54"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}

      {/* 1. LEGO MAST & PIRATE PENNANT (Top Piece) */}
      {/* Mast Top Stud Knob */}
      <rect x="30" y="5" width="4" height="2.2" rx="0.8" fill="#e2e8f0" />
      {/* Mast Post */}
      <rect x="30.5" y="7" width="3" height="9" rx="0.5" fill="#94a3b8" />
      {/* Lego Swallowtail Pennant Flag */}
      <path
        d="M 33.5 7 L 48 7 L 43.5 11 L 48 15 L 33.5 15 Z"
        fill="url(#legoFlagGrad)"
      />
      <rect x="33.5" y="7" width="14.5" height="1" fill="#fef08a" opacity="0.6" />
      {/* Minimalist White Skull / Eye Stud Dot */}
      <circle cx="38" cy="11" r="1.3" fill="#ffffff" />

      {/* 2. LEGO ROOF SLOPE BRICK (Gable House Roof & Mainsail) */}
      {/* Lego Studs on Roof Ridge */}
      <g>
        <rect x="25.5" y="14.5" width="4.5" height="2.4" rx="0.8" fill="#60a5fa" />
        <rect x="25.5" y="14.5" width="4.5" height="0.8" fill="#bfdbfe" opacity="0.8" />
      </g>
      <g>
        <rect x="34" y="14.5" width="4.5" height="2.4" rx="0.8" fill="#60a5fa" />
        <rect x="34" y="14.5" width="4.5" height="0.8" fill="#bfdbfe" opacity="0.8" />
      </g>
      {/* 45° Roof Slope Brick Body */}
      <path
        d="M 23.5 16.9 L 40.5 16.9 L 50 26.5 L 50 28.5 L 14 28.5 L 14 26.5 Z"
        fill="url(#legoRoofGrad)"
      />
      {/* Top Edge Specular Plastic Highlight */}
      <path d="M 23.5 16.9 L 40.5 16.9" stroke="#93c5fd" strokeWidth="0.9" />
      {/* Attic Window / Media Server Core */}
      <circle cx="32" cy="23.5" r="3.2" fill="#0b0f17" />
      <circle cx="32" cy="23.5" r="1.8" fill="#38bdf8" />

      {/* 3. LEGO HOUSE CABIN / SERVER STACK (Modular 2x4 Brick) */}
      {/* Brick Body with Rounded Plastic Corners */}
      <rect
        x="14"
        y="29.8"
        width="36"
        height="9.2"
        rx="1.2"
        fill="url(#legoCabinGrad)"
        stroke="#334155"
        strokeWidth="0.9"
      />
      {/* Top Surface Highlight */}
      <line x1="15" y1="30.5" x2="49" y2="30.5" stroke="#475569" strokeWidth="0.8" />
      {/* Horizontal Seam Divider Between Plates */}
      <line x1="14" y1="34.4" x2="50" y2="34.4" stroke="#101724" strokeWidth="0.9" />

      {/* Server Blade 1 Details */}
      <rect x="18" y="31.5" width="13" height="1.8" rx="0.75" fill="#090d14" />
      <circle cx="43.5" cy="32.4" r="1.1" fill="#38bdf8" />

      {/* Server Blade 2 Details */}
      <rect x="18" y="35.6" width="13" height="1.8" rx="0.75" fill="#090d14" />
      <circle cx="43.5" cy="36.5" r="1.1" fill="#22c55e" />

      {/* 4. LEGO PIRATE SHIP HULL (Inverted Boat Slope Brick) */}
      {/* Exposed Shoulder Studs (Hull extends beyond cabin) */}
      <g>
        <rect x="10.5" y="38" width="3.5" height="2.2" rx="0.75" fill="#38bdf8" />
        <rect x="10.5" y="38" width="3.5" height="0.7" fill="#bae6fd" opacity="0.9" />
      </g>
      <g>
        <rect x="50" y="38" width="3.5" height="2.2" rx="0.75" fill="#38bdf8" />
        <rect x="50" y="38" width="3.5" height="0.7" fill="#bae6fd" opacity="0.9" />
      </g>
      {/* Inverted Slope Hull Body */}
      <path
        d="M 9.5 40.2 L 54.5 40.2 L 46 49.5 L 18 49.5 Z"
        fill="url(#legoHullGrad)"
        stroke="#38bdf8"
        strokeWidth="0.9"
      />
      {/* Hull Top Rim Highlight */}
      <line
        x1="10.5"
        y1="41"
        x2="53.5"
        y2="41"
        stroke="#38bdf8"
        strokeWidth="0.8"
        opacity="0.8"
      />

      {/* Cannonport / Porthole Studs on Hull Face */}
      <circle cx="23.5" cy="45.5" r="2.2" fill="#0b0f17" stroke="#38bdf8" strokeWidth="0.8" />
      <circle cx="23.5" cy="45.5" r="1.1" fill="#38bdf8" />

      <circle cx="32" cy="45.5" r="2.2" fill="#0b0f17" stroke="#fbbf24" strokeWidth="0.8" />
      <circle cx="32" cy="45.5" r="1.1" fill="#fbbf24" />

      <circle cx="40.5" cy="45.5" r="2.2" fill="#0b0f17" stroke="#38bdf8" strokeWidth="0.8" />
      <circle cx="40.5" cy="45.5" r="1.1" fill="#38bdf8" />

      {/* 5. WATER BASEPLATE TILE (Smooth Lego Wake Plate) */}
      <rect x="16" y="52.8" width="32" height="2.6" rx="1.3" fill="#38bdf8" />
      <rect x="17" y="53" width="30" height="0.8" fill="#e0f2fe" opacity="0.6" />
    </svg>
  );
};
