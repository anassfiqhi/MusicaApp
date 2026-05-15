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

export interface FeedSection {
  title: string;
  playlist_id: string;
  cover: string;
}

export interface LyricLine {
  time: number;   // seconds
  text: string;
}

// ── Feed (static — SpotiFLAC has no feed endpoint) ───────────────────────────

export const FEED_SECTIONS: FeedSection[] = [
  {
    title: 'Global Top 50',
    playlist_id: '37i9dQZEVXbMDoHDwVN2tF',
    cover: 'https://charts-images.scdn.co/assets/regionclients/global/primary/default.jpg',
  },
  {
    title: "Today's Top Hits",
    playlist_id: '37i9dQZF1DXcBWIGoYBM5M',
    cover: 'https://i.scdn.co/image/ab67706f000000027ea4d505212b9de1f72b5f4b',
  },
  {
    title: 'New Music Friday',
    playlist_id: '37i9dQZF1DX4JAvHpjipBk',
    cover: 'https://i.scdn.co/image/ab67706f00000002b34cb31be6e81f5e9f9abff7',
  },
  {
    title: 'Hot Hits USA',
    playlist_id: '37i9dQZEVXbLiRSasKsNU9',
    cover: 'https://i.scdn.co/image/ab67706f000000023b8bcd87f2873e76d9e2f5e2',
  },
  {
    title: 'Viral 50 Global',
    playlist_id: '37i9dQZEVXbG9PaY9ysBUa',
    cover: 'https://charts-images.scdn.co/assets/regionclients/global/viral/default.jpg',
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

export async function getPlaylist(playlistId: string, limit = 30): Promise<SpotifyTrack[]> {
  const url = `https://open.spotify.com/playlist/${playlistId}`;
  const res = await fetch(`${SPOTFLAC}/metadata?url=${encodeURIComponent(url)}`);
  const json = await res.json();

  return ((json.track_list ?? []) as any[])
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
    .filter((l) => l.words?.trim())
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
// Resolves a playable audio URL for a Spotify track ID via Deezer 30s preview.

export async function getStreamUrl(spotifyId: string): Promise<string | null> {
  const avail = await fetch(`${SPOTFLAC}/availability/${spotifyId}`);
  const json = await avail.json();

  const deezerUrl: string | undefined = json.deezer_url;
  if (deezerUrl) {
    const deezerId = deezerUrl.split('/track/')[1]?.split('?')[0];
    if (deezerId) {
      const deezer = await fetch(`https://api.deezer.com/track/${deezerId}`);
      const deezerJson = await deezer.json();
      if (deezerJson.preview) return deezerJson.preview as string;
    }
  }

  return null;
}
