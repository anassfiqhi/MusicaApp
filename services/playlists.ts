import * as FileSystem from 'expo-file-system/legacy';
import type { SpotifyTrack } from './api';

const FILE = `${FileSystem.documentDirectory}musica-playlists.json`;

export interface CustomPlaylist {
  id: string;
  name: string;
  tracks: SpotifyTrack[];
  createdAt: number;
  updatedAt: number;
}

async function read(): Promise<CustomPlaylist[]> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return [];
    return JSON.parse(await FileSystem.readAsStringAsync(FILE));
  } catch {
    return [];
  }
}

async function write(list: CustomPlaylist[]): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(list));
}

export async function loadPlaylists(): Promise<CustomPlaylist[]> {
  return read();
}

export async function createPlaylist(name: string): Promise<{ playlist: CustomPlaylist; all: CustomPlaylist[] }> {
  const list = await read();
  const playlist: CustomPlaylist = {
    id: `pl_${Date.now()}`,
    name: name.trim(),
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = [playlist, ...list];
  await write(all);
  return { playlist, all };
}

export async function renamePlaylist(id: string, name: string): Promise<CustomPlaylist[]> {
  const list = await read();
  const updated = list.map(p => p.id === id ? { ...p, name: name.trim(), updatedAt: Date.now() } : p);
  await write(updated);
  return updated;
}

export async function deletePlaylist(id: string): Promise<CustomPlaylist[]> {
  const list = await read();
  const updated = list.filter(p => p.id !== id);
  await write(updated);
  return updated;
}

export async function addTrackToPlaylist(playlistId: string, track: SpotifyTrack): Promise<CustomPlaylist[]> {
  const list = await read();
  const updated = list.map(p => {
    if (p.id !== playlistId) return p;
    if (p.tracks.some(t => t.id === track.id)) return p;
    return { ...p, tracks: [...p.tracks, track], updatedAt: Date.now() };
  });
  await write(updated);
  return updated;
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<CustomPlaylist[]> {
  const list = await read();
  const updated = list.map(p =>
    p.id === playlistId
      ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId), updatedAt: Date.now() }
      : p
  );
  await write(updated);
  return updated;
}
