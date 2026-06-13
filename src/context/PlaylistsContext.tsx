import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  savePlaylists,
  type CustomPlaylist,
} from '../services/playlists';
import type { SpotifyTrack } from '../services/api';

export const LIKED_PLAYLIST_ID = 'pl_liked';

interface PlaylistsContextType {
  playlists: CustomPlaylist[];
  create: (name: string) => Promise<CustomPlaylist>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addTrack: (playlistId: string, track: SpotifyTrack) => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  playlistsContaining: (trackId: string) => string[];
  toggleLike: (track: SpotifyTrack) => Promise<void>;
  isLiked: (trackId: string) => boolean;
}

const PlaylistsContext = createContext<PlaylistsContextType | null>(null);

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>([]);

  useEffect(() => {
    loadPlaylists().then(async (loaded) => {
      const hasLiked = loaded.some(p => p.id === LIKED_PLAYLIST_ID);
      if (!hasLiked) {
        const { all: created } = await createPlaylist('Liked Songs');
        const withLiked = created.map((p, idx) =>
          idx === 0 ? { ...p, id: LIKED_PLAYLIST_ID } : p
        );
        await savePlaylists(withLiked);
        setPlaylists(withLiked);
      } else {
        setPlaylists(loaded);
      }
    });
  }, []);

  const create = useCallback(async (name: string) => {
    const { playlist, all } = await createPlaylist(name);
    setPlaylists(all);
    return playlist;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    if (id === LIKED_PLAYLIST_ID) return;
    setPlaylists(await renamePlaylist(id, name));
  }, []);

  const remove = useCallback(async (id: string) => {
    if (id === LIKED_PLAYLIST_ID) return;
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

  const isLiked = useCallback(
    (trackId: string) => playlistsContaining(trackId).includes(LIKED_PLAYLIST_ID),
    [playlistsContaining]
  );

  const toggleLike = useCallback(async (track: SpotifyTrack) => {
    if (isLiked(track.id)) {
      await removeTrack(LIKED_PLAYLIST_ID, track.id);
    } else {
      await addTrack(LIKED_PLAYLIST_ID, track);
    }
  }, [isLiked, removeTrack, addTrack]);

  return (
    <PlaylistsContext.Provider value={{ playlists, create, rename, remove, addTrack, removeTrack, playlistsContaining, toggleLike, isLiked }}>
      {children}
    </PlaylistsContext.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error('usePlaylists must be used within PlaylistsProvider');
  return ctx;
}
