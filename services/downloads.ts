import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
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

  const localPath = `${DOWNLOADS_DIR}${track.id}.mp3`;

  // Step 1: Tell server to prepare the file via yt-dlp (blocks until ready)
  onProgress(-1);
  console.log(`[download] POST /download — "${track.title}"`);
  await serverDownloadTrack({
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
  });
  console.log(`[download] server ready, downloading to device`);

  // Step 2: Download the MP3 from the server to the device with progress
  onProgress(0);
  const streamUrl = getStreamUrl(track.id);
  const resumable = FileSystem.createDownloadResumable(
    streamUrl,
    localPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    }
  );

  const result = await resumable.downloadAsync();
  if (!result || result.status !== 200) {
    throw new Error(`Download failed — HTTP ${result?.status ?? 'unknown'}`);
  }

  const info = await FileSystem.getInfoAsync(localPath, { size: true });
  const fileSizeBytes = info.exists && 'size' in info ? (info.size ?? 0) : 0;

  // Step 3: Save to device media library so it appears in the file explorer
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(localPath);
      console.log(`[download] saved to media library`);
    }
  } catch (e) {
    console.log(`[download] media library save skipped:`, e);
  }

  const entry: DownloadedTrack = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    filePath: localPath,
    downloadedAt: Date.now(),
    fileSizeBytes,
  };

  const current = await loadDownloads();
  await persistDownloads([entry, ...current.filter((d) => d.id !== track.id)]);

  console.log(`[download] complete — "${track.title}" (${fileSizeBytes} bytes)`);
  return entry;
}

export async function removeDownload(trackId: string): Promise<DownloadedTrack[]> {
  const list = await loadDownloads();
  const entry = list.find((d) => d.id === trackId);

  if (entry?.filePath && entry.filePath.startsWith('file://')) {
    try {
      const info = await FileSystem.getInfoAsync(entry.filePath);
      if (info.exists) await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
    } catch {}
  }

  const updated = list.filter((d) => d.id !== trackId);
  await persistDownloads(updated);
  return updated;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return 'Cached';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
