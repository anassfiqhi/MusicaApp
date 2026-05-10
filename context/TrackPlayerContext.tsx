import React, { createContext, useContext, ReactNode } from 'react';
import { useTrackPlayer } from '../hooks/useTrackPlayer';

type TrackPlayerContextType = ReturnType<typeof useTrackPlayer>;

const TrackPlayerContext = createContext<TrackPlayerContextType | null>(null);

export function TrackPlayerProvider({ children }: { children: ReactNode }) {
  const value = useTrackPlayer();
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
