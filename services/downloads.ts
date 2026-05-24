import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { getStreamUrl, getLyrics, serverDownloadTrack } from './api';
import type { Lyric } from '../data/trackData';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}musica-downloads/`;
const INDEX_FILE = `${DOWNLOADS_DIR}index.json`;

export interface DownloadedTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  localArtworkPath?: string;
  lyrics?: Lyric[];
  mediaLibraryAssetId?: string;
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

  const audioPath = `${DOWNLOADS_DIR}${track.id}.mp3`;
  const artworkPath = `${DOWNLOADS_DIR}${track.id}.jpg`;

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

  // Step 2: Download audio + artwork + lyrics in parallel
  onProgress(0);

  const audioDownload = FileSystem.createDownloadResumable(
    getStreamUrl(track.id),
    audioPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    }
  );

  const artworkDownload = track.artworkUrl
    ? FileSystem.downloadAsync(track.artworkUrl, artworkPath).catch(() => null)
    : Promise.resolve(null);

  const lyricsPromise = getLyrics(track.id, track.title, track.artist).catch(() => []);

  const [audioResult, , lyrics] = await Promise.all([
    audioDownload.downloadAsync(),
    artworkDownload,
    lyricsPromise,
  ]);

  if (!audioResult || audioResult.status !== 200) {
    throw new Error(`Audio download failed — HTTP ${audioResult?.status ?? 'unknown'}`);
  }

  const info = await FileSystem.getInfoAsync(audioPath);
  const fileSizeBytes = info.exists ? ((info as any).size ?? 0) : 0;

  const artworkInfo = await FileSystem.getInfoAsync(artworkPath);
  const localArtworkPath = artworkInfo.exists ? artworkPath : undefined;

  // Step 3: Save to device media library so it appears in the file explorer
  let mediaLibraryAssetId: string | undefined;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(audioPath);
      mediaLibraryAssetId = asset.id;
      console.log(`[download] saved to media library — asset ${asset.id}`);
    }
  } catch (e) {
    console.log(`[download] media library save skipped:`, e);
  }

  const entry: DownloadedTrack = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    localArtworkPath,
    lyrics: lyrics.length > 0 ? lyrics : undefined,
    mediaLibraryAssetId,
    filePath: audioPath,
    downloadedAt: Date.now(),
    fileSizeBytes,
  };

  const current = await loadDownloads();
  await persistDownloads([entry, ...current.filter((d) => d.id !== track.id)]);

  console.log(`[download] complete — "${track.title}" (${fileSizeBytes} bytes, ${lyrics.length} lyric lines)`);
  return entry;
}

export async function removeDownload(trackId: string): Promise<DownloadedTrack[]> {
  const list = await loadDownloads();
  const entry = list.find((d) => d.id === trackId);

  if (entry) {
    await Promise.all([
      // Delete local audio file
      entry.filePath
        ? FileSystem.deleteAsync(entry.filePath, { idempotent: true }).catch(() => {})
        : Promise.resolve(),
      // Delete local artwork file
      entry.localArtworkPath
        ? FileSystem.deleteAsync(entry.localArtworkPath, { idempotent: true }).catch(() => {})
        : Promise.resolve(),
      // Remove from device media library
      entry.mediaLibraryAssetId
        ? MediaLibrary.deleteAssetsAsync([entry.mediaLibraryAssetId]).catch(() => {})
        : Promise.resolve(),
    ]);
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
