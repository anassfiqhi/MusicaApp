import { Platform } from 'react-native';

const SPOTFLAC =
  process.env.EXPO_PUBLIC_SPOTFLAC_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8001' : 'http://localhost:8001');

const SUNNIFY = process.env.EXPO_PUBLIC_SUNNIFY_URL ?? 'https://sunnify-spotify-downloader-server.up.railway.app';

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
  return `${SUNNIFY}/stream-audio/${spotifyId}`;
}

// ── Prefetch ──────────────────────────────────────────────────────────────────
// Fires a background download on the server so /stream-audio/ is ready sooner.

export function prefetchTrack(spotifyId: string): void {
  fetch(`${SUNNIFY}/prefetch/${spotifyId}`).catch(() => {});
}

// ── Server-side download ──────────────────────────────────────────────────────
// Tells SpotiFLAC to download the track via Tidal (avoids Amazon/Qobuz cooldowns).
// The file is stored on the server; /stream-audio/ serves it for playback.

export async function serverDownloadTrack(track: {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
}): Promise<void> {
  console.log(`[download] POST /download service=auto`);
  const res = await fetch(`${SUNNIFY}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'auto',
      spotify_id: track.id,
      track_name: track.title,
      artist_name: track.artist,
      cover_url: track.artworkUrl ?? '',
      allow_fallback: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
}

// ── Artists ───────────────────────────────────────────────────────────────────

export interface SpotifyArtist {
  id: string;
  name: string;
  images: string;
  followers?: number;
  genres?: string[];
}

export interface ArtistData {
  name: string;
  images: string;
  followers?: number;
  monthly_listeners?: number;
  genres?: string[];
  top_tracks: SpotifyTrack[];
  albums: SpotifyAlbum[];
}

export async function searchArtists(q: string, limit = 6): Promise<SpotifyArtist[]> {
  console.log(`[searchArtists] q="${q}" limit=${limit}`);
  const res = await fetch(
    `${SPOTFLAC}/search?q=${encodeURIComponent(q)}&limit=${limit}&type=artist`
  );
  console.log(`[searchArtists] HTTP ${res.status}`);
  const json = await res.json();
  console.log(`[searchArtists] raw keys:`, Object.keys(json), '| raw json:', JSON.stringify(json).slice(0, 400));
  const results = (json.artists ?? json.results ?? []) as SpotifyArtist[];
  console.log(`[searchArtists] returning ${results.length} artists`);
  return results;
}

export async function getArtist(artistId: string): Promise<ArtistData> {
  const url = `https://open.spotify.com/artist/${artistId}`;
  console.log(`[getArtist] fetching id=${artistId}`);
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  console.log(`[getArtist] HTTP ${res.status}`);
  const json = await res.json();
  console.log(`[getArtist] raw keys:`, Object.keys(json));
  console.log(`[getArtist] raw json:`, JSON.stringify(json).slice(0, 600));

  const info = json.artist_info ?? json.playlist_info ?? {};
  console.log(`[getArtist] info keys:`, Object.keys(info));
  const topTracks = ((json.top_tracks ?? json.track_list ?? []) as any[]).map((t) => ({
    id: t.spotify_id ?? t.id ?? '',
    name: t.name ?? '',
    artists: t.artists ?? info.name ?? '',
    album_name: t.album_name ?? '',
    images: t.images ?? info.images ?? '',
    duration_ms: t.duration_ms ?? 0,
    external_urls: t.external_urls ?? '',
  }));

  const albums = ((json.albums ?? []) as any[]).map((a) => ({
    id: a.id ?? '',
    name: a.name ?? '',
    artists: a.artists ?? info.name ?? '',
    images: a.images ?? '',
    release_date: a.release_date ?? '',
    total_tracks: a.total_tracks ?? 0,
  }));

  const result: ArtistData = {
    name: info.name ?? '',
    images: info.images ?? info.cover ?? '',
    followers: info.followers?.total ?? info.followers ?? undefined,
    monthly_listeners: info.monthly_listeners ?? undefined,
    genres: info.genres ?? [],
    top_tracks: topTracks,
    albums,
  };
  console.log(`[getArtist] parsed: name="${result.name}" top_tracks=${result.top_tracks.length} albums=${result.albums.length} followers=${result.followers} monthly_listeners=${result.monthly_listeners}`);
  return result;
}

// ── Albums ────────────────────────────────────────────────────────────────────

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: string;
  images: string;
  release_date?: string;
  total_tracks?: number;
}

export interface AlbumData {
  cover: string;
  name: string;
  artists: string;
  release_date?: string;
  total_tracks: number;
  tracks: SpotifyTrack[];
}

export async function searchAlbums(q: string, limit = 8): Promise<SpotifyAlbum[]> {
  console.log(`[searchAlbums] q="${q}" limit=${limit}`);
  const res = await fetch(
    `${SPOTFLAC}/search?q=${encodeURIComponent(q)}&limit=${limit}&type=album`
  );
  console.log(`[searchAlbums] HTTP ${res.status}`);
  const json = await res.json();
  console.log(`[searchAlbums] raw keys:`, Object.keys(json), '| raw json:', JSON.stringify(json).slice(0, 400));
  const results = (json.albums ?? json.results ?? []) as SpotifyAlbum[];
  console.log(`[searchAlbums] returning ${results.length} albums`);
  return results;
}

export async function getAlbum(albumId: string): Promise<AlbumData> {
  const url = `https://open.spotify.com/album/${albumId}`;
  console.log(`[getAlbum] fetching id=${albumId}`);
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  console.log(`[getAlbum] HTTP ${res.status}`);
  const json = await res.json();
  console.log(`[getAlbum] raw keys:`, Object.keys(json));
  console.log(`[getAlbum] raw json:`, JSON.stringify(json).slice(0, 600));

  const info = json.album_info ?? json.playlist_info ?? {};
  console.log(`[getAlbum] info keys:`, Object.keys(info));
  const tracks = ((json.track_list ?? []) as any[]).map((t) => ({
    id: t.spotify_id ?? t.id ?? '',
    name: t.name ?? '',
    artists: t.artists ?? info.artists ?? '',
    album_name: info.name ?? t.album_name ?? '',
    images: t.images ?? info.cover ?? '',
    duration_ms: t.duration_ms ?? 0,
    external_urls: t.external_urls ?? '',
  }));

  const result: AlbumData = {
    cover: info.cover ?? '',
    name: info.name ?? '',
    artists: info.artists ?? '',
    release_date: info.release_date ?? '',
    total_tracks: info.total_tracks ?? tracks.length,
    tracks,
  };
  console.log(`[getAlbum] parsed: name="${result.name}" artists="${result.artists}" tracks=${result.tracks.length} year=${result.release_date?.slice(0,4)}`);
  return result;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export async function getRecommendations(trackId: string, limit = 20): Promise<SpotifyTrack[]> {
  const res = await fetch(`${SPOTFLAC}/recommendations/${trackId}?limit=${limit}`);
  if (!res.ok) throw new Error(`recommendations HTTP ${res.status}`);
  const json = await res.json();
  return (json.tracks ?? []) as SpotifyTrack[];
}
