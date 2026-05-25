import React, { createContext, useCallback, useContext, ReactNode } from 'react';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import { useDownloads } from './DownloadsContext';

type TrackPlayerContextType = ReturnType<typeof useTrackPlayer>;

const TrackPlayerContext = createContext<TrackPlayerContextType | null>(null);

export function TrackPlayerProvider({ children }: { children: ReactNode }) {
  const { downloads } = useDownloads();
  const getDownloaded = useCallback(
    (id: string) => downloads.find(d => d.id === id),
    [downloads]
  );
  const value = useTrackPlayer(getDownloaded);
  return (
    <TrackPlayerContext.Provider value={value}>
      {children}
    </TrackPlayerContext.Provider>
  );
}

export function useTrackPlayerContext() {
  const ctx = useContext(TrackPlayerContext);
  if (!ctx) throw new Error('useTrackPlayerContext must be used within TrackPlayerProvider');
  return ctx;
}
