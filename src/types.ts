export type UserRole = 'admin' | 'standard' | 'readonly';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export type ServiceId = 'sonarr' | 'radarr' | 'lidarr' | 'prowlarr';

export type MediaType = 'tv' | 'movie' | 'music';

export interface ServiceConfig {
  id: ServiceId;
  name: string;
  enabled: boolean;
  baseUrl: string;
  port?: number | null;
  disablePort?: boolean;
  apiKey: string;
  useSsl: boolean;
  defaultRootFolder?: string;
  defaultQualityProfileId?: number;
  status: 'connected' | 'error' | 'untested';
  version?: string;
  appTitle?: string;
  latencyMs?: number;
  lastChecked?: string;
  errorMessage?: string;
}

export interface AppSettings {
  services: Record<ServiceId, ServiceConfig>;
  demoMode: boolean;
  calendarToken: string;
  systemName: string;
}

export interface MediaItem {
  id: string | number;
  service: ServiceId;
  mediaType: MediaType;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  bannerUrl?: string;
  monitored: boolean;
  status: 'downloaded' | 'missing' | 'unreleased' | 'downloading';
  qualityProfile?: string;
  qualityProfileId?: number;
  rootFolder?: string;
  sizeBytes?: number;
  episodeCount?: number;
  episodeFileCount?: number;
  seasonCount?: number;
  trackCount?: number;
  pageCount?: number;
  artist?: string;
  author?: string;
  genres?: string[];
  rating?: number;
  path?: string;
  added?: string;
  releaseDate?: string;
}

export interface QueueItem {
  id: string | number;
  service: ServiceId;
  title: string;
  mediaType: MediaType;
  sizeBytes: number;
  sizeLeftBytes: number;
  progress: number; // 0 to 100
  etaSeconds?: number;
  timeleft?: string;
  status: 'downloading' | 'queued' | 'paused' | 'importing' | 'completed' | 'warning';
  downloadClient: string;
  protocol: 'torrent' | 'usenet';
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  outputPath?: string;
}

export interface CalendarEvent {
  id: string | number;
  service: ServiceId;
  mediaType: MediaType;
  title: string;
  seriesOrArtistTitle?: string;
  date: string; // YYYY-MM-DD
  airDateUtc?: string;
  episodeNumber?: string;
  seasonNumber?: number;
  hasFile: boolean;
  monitored: boolean;
  overview?: string;
}

export interface ExternalReleaseItem {
  id: string;
  title: string;
  mediaType: 'tv' | 'movie' | 'music';
  seriesOrArtistTitle?: string;
  date: string; // YYYY-MM-DD
  rating: number; // e.g. 8.5
  ratingCount?: string;
  overview: string;
  posterUrl: string;
  genres: string[];
  status: 'upcoming' | 'premiering' | 'album_drop';
  popularityScore: number;
}

export interface ProwlarrIndexer {
  id: number;
  name: string;
  enable: boolean;
  protocol: 'torrent' | 'usenet';
  priority: number;
  status: 'healthy' | 'warning' | 'error';
  grabs24h: number;
  queries24h: number;
  avgResponseTimeMs: number;
  categories?: string[];
}

export interface QualityProfile {
  id: number;
  name: string;
}

export interface RootFolder {
  id: number;
  path: string;
  freeSpaceBytes?: number;
}

export interface SearchResultItem {
  foreignId: string | number;
  service: ServiceId;
  mediaType: MediaType;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  genres?: string[];
  alreadyInLibrary?: boolean;
  existingId?: string | number;
  authorOrArtist?: string;
  seasonsCount?: number;
  albumCount?: number;
}

export interface TvEpisodeItem {
  id: string | number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  overview?: string;
  monitored?: boolean;
}

export interface TvSeasonItem {
  seasonNumber: number;
  title: string;
  episodeCount: number;
  monitored: boolean;
  episodes: TvEpisodeItem[];
}

export interface TvShowDetails {
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  network?: string;
  genres?: string[];
  totalSeasons: number;
  totalEpisodes: number;
  seasons: TvSeasonItem[];
}

export interface AddContentPayload {
  service: ServiceId;
  title: string;
  foreignId: string | number;
  rootFolderPath: string;
  qualityProfileId: number;
  monitored: boolean;
  searchForMissing: boolean;
  metadata?: any;
  monitorScope?: 'all' | 'specific_seasons' | 'specific_episodes';
  selectedSeasons?: number[];
  selectedEpisodes?: { season: number; episode: number }[];
}
