const BASE_URL = 'https://musicaserver.up.railway.app';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  albumName: string;
  artworkUrl: string;
  durationMs: number;
}

export interface FeedSection {
  title: string;
  playlist_id: string;
  cover: string;
}

function extractArtwork(sources: { height: number; url: string }[]): string {
  return (
    sources.find((s) => s.height === 300)?.url ??
    sources.find((s) => s.height === 640)?.url ??
    sources[0]?.url ??
    ''
  );
}

function normalizeTrackData(data: any): SpotifyTrack | null {
  if (!data || data.__typename !== 'Track') return null;
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    artists: (data.artists?.items ?? []).map((a: any) => a.profile?.name ?? ''),
    albumName: data.albumOfTrack?.name ?? '',
    artworkUrl: extractArtwork(data.albumOfTrack?.coverArt?.sources ?? []),
    durationMs: data.duration?.totalMilliseconds ?? 0,
  };
}

export async function getFeed(): Promise<FeedSection[]> {
  const res = await fetch(`${BASE_URL}/feed`);
  const json = await res.json();
  return json.sections ?? [];
}

export async function searchTracks(q: string, limit = 20): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${BASE_URL}/search/tracks?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  const json = await res.json();
  const tracks: SpotifyTrack[] = [];

  for (const page of json.tracks ?? []) {
    for (const item of Array.isArray(page) ? page : page.items ?? []) {
      const data = item?.item?.data ?? item?.itemV2?.data;
      const track = normalizeTrackData(data);
      if (track) tracks.push(track);
    }
  }
  return tracks;
}

export async function getPlaylist(playlistId: string, limit = 30): Promise<SpotifyTrack[]> {
  const res = await fetch(`${BASE_URL}/playlist/${playlistId}?limit=${limit}`);
  const json = await res.json();
  const tracks: SpotifyTrack[] = [];

  for (const page of json.tracks ?? []) {
    for (const item of page.items ?? []) {
      const data = item?.itemV2?.data;
      const track = normalizeTrackData(data);
      if (track) tracks.push(track);
    }
  }
  return tracks;
}
