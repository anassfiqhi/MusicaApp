import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  loadDownloads,
  startDownload,
  removeDownload,
  type DownloadedTrack,
} from '../services/downloads';
import { useToast } from './ToastContext';

interface ActiveEntry {
  progress: number; // 0–1, or -1 for indeterminate
  error: boolean;
}

interface DownloadsContextType {
  downloads: DownloadedTrack[];
  activeDownloads: Record<string, ActiveEntry>;
  download: (track: { id: string; title: string; artist: string; artworkUrl?: string; audioUrl: string }) => void;
  remove: (trackId: string) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  isDownloading: (trackId: string) => boolean;
  getProgress: (trackId: string) => number;
}

const DownloadsContext = createContext<DownloadsContextType | null>(null);

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveEntry>>({});
  const inFlight = useRef<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    loadDownloads().then(setDownloads);
  }, []);

  const download = useCallback(
    (track: { id: string; title: string; artist: string; artworkUrl?: string; audioUrl: string }) => {
      if (inFlight.current.has(track.id)) return;
      inFlight.current.add(track.id);
      setActiveDownloads((p) => ({ ...p, [track.id]: { progress: 0, error: false } }));
      showToast(`Downloading "${track.title}"`, { icon: 'arrow-down-circle-outline', iconColor: '#9B9B9B', duration: 2000 });

      startDownload(track, (progress) => {
        setActiveDownloads((p) => ({ ...p, [track.id]: { progress, error: false } }));
      })
        .then((entry) => {
          setDownloads((p) => [entry, ...p.filter((d) => d.id !== track.id)]);
          setActiveDownloads((p) => { const n = { ...p }; delete n[track.id]; return n; });
          showToast(`"${track.title}" downloaded`);
        })
        .catch((err) => {
          console.log(`[download] error — "${track.title}":`, err?.message ?? err);
          setActiveDownloads((p) => ({ ...p, [track.id]: { progress: 0, error: true } }));
          showToast(`Download failed — "${track.title}"`, { icon: 'alert-circle', iconColor: '#E8115B', duration: 3500 });
          setTimeout(() => {
            setActiveDownloads((p) => { const n = { ...p }; delete n[track.id]; return n; });
          }, 3000);
        })
        .finally(() => {
          inFlight.current.delete(track.id);
        });
    },
    [showToast]
  );

  const remove = useCallback(async (trackId: string) => {
    const updated = await removeDownload(trackId);
    setDownloads(updated);
  }, []);

  const isDownloaded = useCallback(
    (trackId: string) => downloads.some((d) => d.id === trackId),
    [downloads]
  );

  const isDownloading = useCallback(
    (trackId: string) => !!activeDownloads[trackId],
    [activeDownloads]
  );

  const getProgress = useCallback(
    (trackId: string) => activeDownloads[trackId]?.progress ?? 0,
    [activeDownloads]
  );

  return (
    <DownloadsContext.Provider
      value={{ downloads, activeDownloads, download, remove, isDownloaded, isDownloading, getProgress }}
    >
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadsProvider');
  return ctx;
}
