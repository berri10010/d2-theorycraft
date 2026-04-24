'use client';

import React from 'react';

interface DamageIconProps {
  type: string;
  /** Tailwind class string for sizing and colour; defaults to "w-3.5 h-3.5" */
  className?: string;
}

/**
 * Minimal SVG icons for each D2 damage type.
 * Size/colour are applied via the `className` prop.
 */
export function DamageIcon({ type, className = 'w-3.5 h-3.5' }: DamageIconProps) {
  const svg = { viewBox: '0 0 16 16', 'aria-hidden': true as const, className };

  switch (type) {
    case 'kinetic':
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'arc':
      return (
        <svg {...svg} fill="currentColor">
          {/* Lightning bolt */}
          <path d="M10 1.5 4.5 8.5H8L6 14.5 11.5 7.5H8L10 1.5z" />
        </svg>
      );

    case 'solar':
      return (
        <svg {...svg} fill="currentColor">
          {/* Flame */}
          <path d="M8 1.5c-.3 2.2-.6 4.7-.7 5.5-1-.1-1.9-1-1.9-1S5 7 5 8a3 3 0 0 0 6 0c0-1-.5-2-.5-2s-.5 1.5-1.8 2C9 6.5 8.5 4 8 1.5z" />
        </svg>
      );

    case 'void':
      return (
        <svg {...svg} fill="currentColor">
          {/* Diamond */}
          <path d="M8 2 14.5 8 8 14 1.5 8z" />
        </svg>
      );

    case 'stasis':
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          {/* 6-pointed snowflake */}
          <line x1="8" y1="2" x2="8" y2="14" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="3.3" y1="3.3" x2="12.7" y2="12.7" />
          <line x1="12.7" y1="3.3" x2="3.3" y2="12.7" />
        </svg>
      );

    case 'strand':
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {/* Two intertwined S-curves */}
          <path d="M2 6.5C4 6.5 5.5 9.5 8 9.5s4-3 6-3" />
          <path d="M2 9.5C4 9.5 5.5 6.5 8 6.5s4 3 6 3" />
        </svg>
      );

    default:
      return (
        <svg {...svg} fill="currentColor">
          <circle cx="8" cy="8" r="5" />
        </svg>
      );
  }
}
