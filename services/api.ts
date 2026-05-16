import { Platform } from 'react-native';

const SPOTFLAC =
  process.env.EXPO_PUBLIC_SPOTFLAC_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8001' : 'http://localhost:8001');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;      // "Queen" or "Artist 1, Artist 2"
  album_name: string;
  images: string;       // direct artwork URL
  duration_ms: number;
  external_urls?: string;
}

export interface LyricLine {
  time: number;   // seconds
  text: string;
}

export interface PlaylistRef {
  id: string;
  title: string;
  cover?: string;
}

export interface FeedCategory {
  title: string;
  playlists: PlaylistRef[];
}

// ── Feed categories (mirrors Spotify home sections) ───────────────────────────

export const FEED_CATEGORIES: FeedCategory[] = [
  {
    title: 'Charts',
    playlists: [
      { id: '37i9dQZEVXbMDoHDwVN2tF', title: 'Global Top 50',   cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg' },
      { id: '37i9dQZEVXbG9PaY9ysBUa', title: 'Viral 50 Global', cover: 'https://charts-images.scdn.co/assets/regionclients/global/viral/default.jpg' },
      { id: '37i9dQZEVXbLiRSasKsNU9', title: 'Hot Hits USA',    cover: 'https://i.scdn.co/image/ab67706f000000023b8bcd87f2873e76d9e2f5e2' },
      { id: '37i9dQZEVXbLnolsZ8PSNw', title: 'UK Top 50',       cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_gb_default.jpg' },
      { id: '37i9dQZF1DXcBWIGoYBM5M', title: "Today's Top Hits", cover: 'https://i.scdn.co/image/ab67706f000000027ea4d505212b9de1f72b5f4b' },
    ],
  },
  {
    title: 'New Releases',
    playlists: [
      { id: '37i9dQZF1DX4JAvHpjipBk', title: 'New Music Friday',    cover: 'https://i.scdn.co/image/ab67706f00000002b34cb31be6e81f5e9f9abff7' },
      { id: '37i9dQZF1DX4W3atWv6Um5', title: 'New Music Friday UK' },
      { id: '37i9dQZF1DX2pSTOxoPbx9', title: 'Fresh Finds' },
    ],
  },
  {
    title: 'Mood',
    playlists: [
      { id: '37i9dQZF1DXdPec7aLTmlC', title: 'Happy Hits' },
      { id: '37i9dQZF1DX3YSRoSdA634', title: 'Sad Songs' },
      { id: '37i9dQZF1DX4sWSpwq3LiO', title: 'Peaceful Piano' },
      { id: '37i9dQZF1DWZeKCadgRdKQ', title: 'Deep Focus' },
    ],
  },
  {
    title: 'Decades',
    playlists: [
      { id: '37i9dQZF1DX4UtSsGT1Sk5', title: 'All Out 80s' },
      { id: '37i9dQZF1DXbG22YGu2p27', title: 'All Out 90s' },
      { id: '37i9dQZF1DX4o1oenSJRJd', title: 'All Out 2000s' },
      { id: '37i9dQZF1DX5Opy0CPft2d', title: 'All Out 2010s' },
    ],
  },
  {
    title: 'Hip-Hop',
    playlists: [
      { id: '37i9dQZF1DX0XUsuxWHRQd', title: 'Rap Caviar' },
      { id: '37i9dQZF1DX2vMjgTAMasj', title: 'Most Necessary' },
      { id: '37i9dQZF1DWUW2bvSkjcJ9', title: 'Trap Nation' },
    ],
  },
  {
    title: 'Rock',
    playlists: [
      { id: '37i9dQZF1DWXRqgorJj26U', title: 'Rock Classics' },
      { id: '37i9dQZF1DX9GRpeH4CL0S', title: 'Alternative' },
      { id: '37i9dQZF1DWWOaP4kN0kGo', title: 'Metal' },
    ],
  },
];

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchTracks(q: string, limit = 20): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${SPOTFLAC}/search?q=${encodeURIComponent(q)}&limit=${limit}&type=track`
  );
  const json = await res.json();
  // SpotiFLAC returns { tracks: [...] } for type=track, or { results: [...] }
  return (json.tracks ?? json.results ?? []) as SpotifyTrack[];
}

// ── Playlist ──────────────────────────────────────────────────────────────────

export interface PlaylistData {
  cover: string;
  description: string;
  owner: string;
  followers: number;
  totalTracks: number;
  tracks: SpotifyTrack[];
}

export async function getPlaylist(playlistId: string, limit = 50): Promise<PlaylistData> {
  const url = `https://open.spotify.com/playlist/${playlistId}`;
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  const json = await res.json();

  const info = json.playlist_info ?? {};
  const tracks = ((json.track_list ?? []) as any[])
    .slice(0, limit)
    .map((t) => ({
      id: t.spotify_id ?? t.id ?? '',
      name: t.name ?? '',
      artists: t.artists ?? '',
      album_name: t.album_name ?? '',
      images: t.images ?? '',
      duration_ms: t.duration_ms ?? 0,
      external_urls: t.external_urls ?? '',
    }));

  return {
    cover: info.cover ?? '',
    description: info.description ?? '',
    owner: info.owner?.display_name ?? 'Spotify',
    followers: info.followers?.total ?? 0,
    totalTracks: info.tracks?.total ?? tracks.length,
    tracks,
  };
}

// ── Lyrics ────────────────────────────────────────────────────────────────────

export async function getLyrics(
  trackId: string,
  track: string,
  artist: string
): Promise<LyricLine[]> {
  const res = await fetch(
    `${SPOTFLAC}/lyrics/${trackId}?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}&format=json`
  );
  const json = await res.json();
  const lines: any[] = json.lyrics?.lines ?? [];

  return lines
    .filter((l) => {
      const ms = parseInt(l.startTimeMs, 10);
      return l.words?.trim() && !isNaN(ms) && ms >= 0;
    })
    .map((l) => ({
      time: parseInt(l.startTimeMs, 10) / 1000,
      text: l.words,
    }));
}

// ── Track metadata ────────────────────────────────────────────────────────────

export async function getTrackMetadata(trackId: string): Promise<any> {
  const url = `https://open.spotify.com/track/${trackId}`;
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  return res.json();
}

// ── Stream URL ────────────────────────────────────────────────────────────────
// Returns a full lossless FLAC stream URL via the /stream-audio/ endpoint.

export function getStreamUrl(spotifyId: string): string {
  return `${SPOTFLAC}/stream-audio/${spotifyId}`;
}

// ── Prefetch ──────────────────────────────────────────────────────────────────
// Fires a background download on the server so /stream-audio/ is ready sooner.

export function prefetchTrack(spotifyId: string): void {
  fetch(`${SPOTFLAC}/prefetch/${spotifyId}`).catch(() => {});
}
