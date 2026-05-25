import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  type CustomPlaylist,
} from '../services/playlists';
import type { SpotifyTrack } from '../services/api';

interface PlaylistsContextType {
  playlists: CustomPlaylist[];
  create: (name: string) => Promise<CustomPlaylist>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addTrack: (playlistId: string, track: SpotifyTrack) => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  playlistsContaining: (trackId: string) => string[];
}

const PlaylistsContext = createContext<PlaylistsContextType | null>(null);

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>([]);

  useEffect(() => {
    loadPlaylists().then(setPlaylists);
  }, []);

  const create = useCallback(async (name: string) => {
    const { playlist, all } = await createPlaylist(name);
    setPlaylists(all);
    return playlist;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    setPlaylists(await renamePlaylist(id, name));
  }, []);

  const remove = useCallback(async (id: string) => {
    setPlaylists(await deletePlaylist(id));
  }, []);

  const addTrack = useCallback(async (playlistId: string, track: SpotifyTrack) => {
    setPlaylists(await addTrackToPlaylist(playlistId, track));
  }, []);

  const removeTrack = useCallback(async (playlistId: string, trackId: string) => {
    setPlaylists(await removeTrackFromPlaylist(playlistId, trackId));
  }, []);

  const playlistsContaining = useCallback(
    (trackId: string) => playlists.filter(p => p.tracks.some(t => t.id === trackId)).map(p => p.id),
    [playlists]
  );

  return (
    <PlaylistsContext.Provider value={{ playlists, create, rename, remove, addTrack, removeTrack, playlistsContaining }}>
      {children}
    </PlaylistsContext.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error('usePlaylists must be used within PlaylistsProvider');
  return ctx;
}
