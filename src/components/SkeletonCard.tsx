import React from 'react';

interface SkeletonCardProps {
  variant?: 'poster' | 'search-result' | 'queue-item';
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'poster', className = '' }) => {
  if (variant === 'search-result') {
    return (
      <div className={`sonos-card p-4 flex items-start gap-4 ${className}`}>
        <div className="w-24 h-36 rounded-xl animate-shimmer shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-3 w-20 rounded-full animate-shimmer" />
          <div className="h-5 w-3/4 rounded-full animate-shimmer" />
          <div className="h-3 w-1/2 rounded-full animate-shimmer" />
          <div className="space-y-2 mt-4">
            <div className="h-3 w-full rounded-full animate-shimmer" />
            <div className="h-3 w-5/6 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'queue-item') {
    return (
      <div className={`sonos-card p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-14 rounded-lg animate-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-full animate-shimmer" />
            <div className="h-3 w-1/3 rounded-full animate-shimmer" />
          </div>
        </div>
        <div className="h-2 w-full rounded-full animate-shimmer" />
        <div className="flex justify-between">
          <div className="h-3 w-16 rounded-full animate-shimmer" />
          <div className="h-3 w-20 rounded-full animate-shimmer" />
        </div>
      </div>
    );
  }

  // Default: poster variant
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}>
      <div className="aspect-[2/3] animate-shimmer rounded-2xl" />
      <div className="p-2 space-y-2">
        <div className="h-3 w-3/4 rounded-full animate-shimmer" />
        <div className="h-3 w-1/2 rounded-full animate-shimmer" />
      </div>
    </div>
  );
};
