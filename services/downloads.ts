import * as FileSystem from 'expo-file-system/legacy';

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

  const isSpotiFLAC = track.audioUrl.includes('/stream-audio/');
  const ext = isSpotiFLAC ? 'flac' : 'mp3';
  const filePath = `${DOWNLOADS_DIR}${track.id}.${ext}`;

  console.log(`[download] start — "${track.title}" url=${track.audioUrl}`);

  // SpotiFLAC blocks the connection while ffmpeg transcodes (no data sent for up to
  // several minutes). A HEAD request uses the same blocking logic and waits until the
  // server cache is warm, then the actual file download below is fast.
  if (isSpotiFLAC) {
    console.log(`[download] HEAD pre-warm — waiting for server cache...`);
    const res = await fetch(track.audioUrl, { method: 'HEAD' });
    console.log(`[download] HEAD response — status=${res.status}`);
    if (!res.ok) {
      const body = await fetch(track.audioUrl).then((r) => r.json()).catch(() => ({}));
      const msg = body?.error ?? `Track unavailable (HTTP ${res.status})`;
      console.log(`[download] HEAD failed — ${msg}`);
      throw new Error(msg);
    }
  }

  const existing = await FileSystem.getInfoAsync(filePath);
  if (existing.exists) {
    console.log(`[download] removing stale file at ${filePath}`);
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }

  console.log(`[download] createDownloadResumable → ${filePath}`);
  const resumable = FileSystem.createDownloadResumable(
    track.audioUrl,
    filePath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const pct = totalBytesExpectedToWrite > 0
        ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
        : -1;
      console.log(`[download] progress — ${totalBytesWritten}/${totalBytesExpectedToWrite} (${pct}%)`);
      onProgress(totalBytesExpectedToWrite > 0 ? totalBytesWritten / totalBytesExpectedToWrite : -1);
    }
  );

  const result = await resumable.downloadAsync();
  console.log(`[download] downloadAsync done — status=${result?.status} uri=${result?.uri}`);
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed with status ${result?.status ?? 'unknown'}`);
  }

  const info = await FileSystem.getInfoAsync(filePath);
  const fileSizeBytes = info.exists && 'size' in info ? (info as any).size as number : 0;
  console.log(`[download] complete — ${fileSizeBytes} bytes at ${filePath}`);

  const entry: DownloadedTrack = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    filePath,
    downloadedAt: Date.now(),
    fileSizeBytes,
  };

  const current = await loadDownloads();
  await persistDownloads([entry, ...current.filter((d) => d.id !== track.id)]);
  return entry;
}

export async function removeDownload(trackId: string): Promise<DownloadedTrack[]> {
  const list = await loadDownloads();
  const entry = list.find((d) => d.id === trackId);
  if (entry) {
    await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
  }
  const updated = list.filter((d) => d.id !== trackId);
  await persistDownloads(updated);
  return updated;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
