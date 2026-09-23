import React, { useState, useEffect } from 'react';
import { Tv, Film, Music, Disc3 } from 'lucide-react';
import type { ServiceId } from '../types.js';
import { getContentTypeLabel } from '../types.js';

export interface MediaPosterProps {
  src?: string | null;
  alt: string;
  title?: string;
  artistOrAuthor?: string;
  year?: number | string;
  mediaType?: 'tv' | 'movie' | 'music';
  service?: ServiceId;
  className?: string;
  aspectRatio?: 'poster' | 'square' | 'video' | 'custom';
  priority?: boolean;
  showHoverZoom?: boolean;
  onLoad?: () => void;
}

export const MediaPoster: React.FC<MediaPosterProps> = ({
  src,
  alt,
  title,
  artistOrAuthor,
  year,
  mediaType = 'movie',
  service,
  className = '',
  aspectRatio = 'poster',
  priority = false,
  showHoverZoom = true,
  onLoad
}) => {
  // Determine actual media type from service if not explicitly specified
  const effectiveMediaType: 'tv' | 'movie' | 'music' = 
    mediaType || 
    (service === 'sonarr' ? 'tv' : service === 'lidarr' ? 'music' : 'movie');

  const artistName = artistOrAuthor || (effectiveMediaType === 'music' ? title : '');
  const artworkApiFallback = artistName
    ? `/api/arr/artist/artwork?artist=${encodeURIComponent(artistName)}`
    : null;

  // Initial source calculation with automatic image-proxy wrapping for hotlink-protected sources
  const getInitialSource = () => {
    if (!src) {
      if (effectiveMediaType === 'music' && artworkApiFallback) {
        return artworkApiFallback;
      }
      return null;
    }

    const trimmed = src.trim();
    // Auto-proxy Wikimedia URLs to prevent browser CORS, Referrer, and hotlink 403 blocks
    if (trimmed.includes('wikimedia.org') || trimmed.includes('wikipedia.org')) {
      if (!trimmed.startsWith('/api/arr/image-proxy')) {
        return `/api/arr/image-proxy?url=${encodeURIComponent(trimmed)}`;
      }
    }

    return trimmed;
  };

  const [currentSrc, setCurrentSrc] = useState<string | null>(getInitialSource);
  const [triedFallback, setTriedFallback] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(!src && !(effectiveMediaType === 'music' && artworkApiFallback));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Synchronize when prop changes
  useEffect(() => {
    const nextSrc = getInitialSource();
    setCurrentSrc(nextSrc);
    setTriedFallback(false);
    setHasError(!nextSrc);
    setIsLoaded(false);
  }, [src, artistOrAuthor, title, effectiveMediaType]);

  const handleImageError = () => {
    // If the image was a direct external URL and failed, retry via our server image proxy
    if (
      currentSrc &&
      (currentSrc.startsWith('http://') || currentSrc.startsWith('https://')) &&
      !currentSrc.startsWith('/api/arr/image-proxy') &&
      !triedFallback
    ) {
      setTriedFallback(true);
      setCurrentSrc(`/api/arr/image-proxy?url=${encodeURIComponent(currentSrc)}`);
      return;
    }

    // If it's music and we haven't tried the high-resolution artwork resolver yet, try it!
    if (effectiveMediaType === 'music' && artworkApiFallback && !triedFallback && currentSrc !== artworkApiFallback) {
      setTriedFallback(true);
      setCurrentSrc(artworkApiFallback);
      return;
    }

    // Show rich styled fallback card
    setHasError(true);
    setCurrentSrc(null);
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const aspectClass =
    aspectRatio === 'poster' ? 'aspect-[2/3]' :
    aspectRatio === 'square' ? 'aspect-square' :
    aspectRatio === 'video' ? 'aspect-[16/10]' : '';

  // Theme colors for stylized fallback cards
  const themeConfig = {
    tv: {
      bg: 'from-[#0e1726] via-[#121c2e] to-[#0a101d]',
      border: 'border-cyan-500/20',
      icon: Tv,
      iconColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    movie: {
      bg: 'from-[#1c1510] via-[#241a12] to-[#120d09]',
      border: 'border-amber-500/20',
      icon: Film,
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    music: {
      bg: 'from-[#0d1f18] via-[#102920] to-[#081410]',
      border: 'border-emerald-500/20',
      icon: Music,
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }
  }[effectiveMediaType];

  const IconComponent = themeConfig.icon;
  const displayTitle = title || alt || 'Untitled';

  return (
    <div className={`relative w-full overflow-hidden bg-[#0c0f17] flex items-center justify-center select-none ${aspectClass} ${className}`}>
      {/* 1. Underlying Stylized Typographic Fallback (Rendered whenever error or while loading) */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${themeConfig.bg} p-3.5 flex flex-col justify-between items-center text-center transition-opacity duration-300 ${
          isLoaded && !hasError ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-full flex justify-between items-center opacity-60">
          <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-semibold">
            {getContentTypeLabel(service, effectiveMediaType)}
          </span>
          {year && effectiveMediaType !== 'music' && (
            <span className="text-[10px] font-mono text-slate-400">
              {year}
            </span>
          )}
        </div>

        <div className="my-auto flex flex-col items-center justify-center p-2">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner mb-2.5">
            {effectiveMediaType === 'music' ? (
              <Disc3 className={`w-8 h-8 ${themeConfig.iconColor} opacity-75`} />
            ) : (
              <IconComponent className={`w-8 h-8 ${themeConfig.iconColor} opacity-75`} />
            )}
          </div>
          <span className="text-xs font-semibold text-white/90 line-clamp-2 px-1 tracking-tight">
            {displayTitle}
          </span>
          {artistOrAuthor && artistOrAuthor !== displayTitle && (
            <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {artistOrAuthor}
            </span>
          )}
        </div>

        <div className="w-full text-center">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border ${themeConfig.badgeBg}`}>
            {effectiveMediaType.toUpperCase()}
          </span>
        </div>
      </div>

      {/* 2. Image Element */}
      {currentSrc && !hasError && (
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-all duration-300 ${
            showHoverZoom ? 'group-hover:scale-[1.03] group-hover:brightness-110' : ''
          } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
