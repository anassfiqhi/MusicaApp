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

// ── Home feed ─────────────────────────────────────────────────────────────────
// Fetches live Spotify browse sections from the server (featured + categories).

export async function getHomeFeed(): Promise<FeedCategory[]> {
  const res = await fetch(`${SPOTFLAC}/home`);
  if (!res.ok) throw new Error(`home feed HTTP ${res.status}`);
  const json: { title: string; playlists: { id: string; title: string; cover: string }[] }[] = await res.json();
  return json.map((s) => ({
    title: s.title,
    playlists: s.playlists.map((p) => ({ id: p.id, title: p.title, cover: p.cover || undefined })),
  }));
}

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

// ── Playlist cover ────────────────────────────────────────────────────────────
// Lightweight cover-only fetch (no tracks). Used as fallback in discover.

const coverCache = new Map<string, string>();

export async function getPlaylistCover(playlistId: string): Promise<string> {
  if (coverCache.has(playlistId)) return coverCache.get(playlistId)!;
  const url = `https://open.spotify.com/playlist/${playlistId}`;
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  const json = await res.json();
  const cover: string = json.playlist_info?.cover ?? '';
  coverCache.set(playlistId, cover);
  return cover;
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

// ── Recommendations ───────────────────────────────────────────────────────────

export async function getRecommendations(trackId: string, limit = 20): Promise<SpotifyTrack[]> {
  const res = await fetch(`${SPOTFLAC}/recommendations/${trackId}?limit=${limit}`);
  if (!res.ok) throw new Error(`recommendations HTTP ${res.status}`);
  const json = await res.json();
  return (json.tracks ?? []) as SpotifyTrack[];
}
