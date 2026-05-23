import * as FileSystem from 'expo-file-system/legacy';
import { getStreamUrl, serverDownloadTrack } from './api';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}musica-downloads/`;
const INDEX_FILE = `${DOWNLOADS_DIR}index.json`;

export interface DownloadedTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  filePath: string;
  downloadedAt: number;
  fileSizeBytes: number;
}

export type ProgressCallback = (progress: number) => void;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

export async function loadDownloads(): Promise<DownloadedTrack[]> {
  try {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (!info.exists) return [];
    const json = await FileSystem.readAsStringAsync(INDEX_FILE);
    return JSON.parse(json) as DownloadedTrack[];
  } catch {
    return [];
  }
}

async function persistDownloads(list: DownloadedTrack[]): Promise<void> {
  await ensureDir();
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(list));
}

export async function startDownload(
  track: { id: string; title: string; artist: string; artworkUrl?: string; audioUrl: string },
  onProgress: ProgressCallback
): Promise<DownloadedTrack> {
  await ensureDir();

  console.log(`[download] start — "${track.title}" id=${track.id}`);
  onProgress(-1);

  console.log(`[download] POST /download — Tidal server-side fetch`);
  await serverDownloadTrack({
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
  });
  console.log(`[download] server download complete`);

  const entry: DownloadedTrack = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    filePath: getStreamUrl(track.id),
    downloadedAt: Date.now(),
    fileSizeBytes: 0,
  };

  const current = await loadDownloads();
  await persistDownloads([entry, ...current.filter((d) => d.id !== track.id)]);
  return entry;
}

export async function removeDownload(trackId: string): Promise<DownloadedTrack[]> {
  const list = await loadDownloads();
  const updated = list.filter((d) => d.id !== trackId);
  await persistDownloads(updated);
  return updated;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return 'Cached';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
