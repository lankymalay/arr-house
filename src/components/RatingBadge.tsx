import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  rating?: number;
  source?: string;
  votes?: number;
  variant?: 'thumbnail' | 'inline' | 'modal';
  className?: string;
  showSource?: boolean;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  source = 'TMDb',
  votes,
  variant = 'thumbnail',
  className = '',
  showSource = true
}) => {
  if (rating === undefined || rating === null || rating <= 0) {
    return null;
  }

  // Format rating to 1 decimal place (e.g. 8.4)
  const formattedRating = Number(rating).toFixed(1);

  // Clean source label
  const cleanSource = source.replace(/_/g, ' ');

  if (variant === 'modal') {
    return (
      <div className={`inline-flex items-center gap-2 bg-[#1a2235] px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-sm ${className}`}>
        <div className="flex items-center gap-1 text-amber-400">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          <span className="text-sm font-black font-mono tracking-tight text-amber-300">{formattedRating}</span>
          <span className="text-xs text-amber-500/80 font-medium">/ 10</span>
        </div>
        {showSource && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
            {cleanSource}
          </span>
        )}
        {votes !== undefined && votes > 0 && (
          <span className="text-[11px] text-slate-400 font-medium">
            ({votes >= 1000000 ? `${(votes / 1000000).toFixed(1)}M` : votes >= 1000 ? `${(votes / 1000).toFixed(0)}k` : votes})
          </span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold shadow-xs whitespace-nowrap shrink-0 ${className}`}
        title={`Rated ${formattedRating}/10 on ${cleanSource}${votes ? ` (${votes} votes)` : ''}`}
      >
        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
        <span className="font-mono">{formattedRating}</span>
        {showSource && (
          <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-tight">
            {cleanSource}
          </span>
        )}
      </span>
    );
  }

  // Thumbnail overlay badge - star rating only without source label
  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-amber-400/30 text-amber-300 shadow-md ${className}`}
      title={`Rating: ${formattedRating}/10${cleanSource ? ` (${cleanSource})` : ''}`}
    >
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
      <span className="text-[10px] font-black font-mono text-white leading-none">{formattedRating}</span>
    </div>
  );
};
