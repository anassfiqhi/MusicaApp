import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlaylists } from '@/context/PlaylistsContext';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';

const PLACEHOLDER = require('@/assets/images/playlist/album_art.png');

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MyPlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playlists, remove: removePlaylist, removeTrack } = usePlaylists();
  const { playSpotifyPlaylist } = useTrackPlayerContext();

  const playlist = playlists.find(p => p.id === id);

  if (!playlist) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#9B9B9B' }}>Playlist not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#1DB954' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverSize = width;

  const handlePlay = (index: number) => {
    if (playlist.tracks.length === 0) return;
    playSpotifyPlaylist(playlist.tracks, index);
    router.push('/player');
  };

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    playSpotifyPlaylist(playlist.tracks, 0);
    router.push('/player');
  };

  const handleShuffle = () => {
    if (playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    playSpotifyPlaylist(shuffled, 0);
    router.push('/player');
  };

  const handleDeletePlaylist = () => {
    removePlaylist(playlist.id);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Cover placeholder */}
        <View style={[{ width: coverSize, height: coverSize * 0.6 }, styles.coverPlaceholder]}>
          <Ionicons name="musical-notes" size={80} color="#3a3a3a" />
          <LinearGradient
            colors={['transparent', '#121212']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.playlistTitle} numberOfLines={2}>{playlist.name}</Text>
          <Text style={styles.meta}>{playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleDeletePlaylist} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={24} color="#9B9B9B" />
          </TouchableOpacity>
          <View style={styles.controlsRight}>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle} disabled={playlist.tracks.length === 0}>
              <Ionicons name="shuffle" size={22} color={playlist.tracks.length === 0 ? '#535353' : '#1DB954'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll} disabled={playlist.tracks.length === 0}>
              <Ionicons name="play" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Track list */}
        {playlist.tracks.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color="#535353" />
            <Text style={styles.emptyText}>No tracks yet</Text>
            <Text style={styles.emptySubtext}>Browse playlists and add tracks here</Text>
          </View>
        ) : (
          playlist.tracks.map((track, index) => (
            <View key={`${track.id}-${index}`} style={styles.trackRow}>
              <TouchableOpacity
                style={styles.trackPressable}
                activeOpacity={0.7}
                onPress={() => handlePlay(index)}
              >
                <Image
                  source={track.images ? { uri: track.images } : PLACEHOLDER}
                  style={styles.trackArt}
                  contentFit="cover"
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{track.artists}</Text>
                </View>
                <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeTrack(playlist.id, track.id)}
                style={styles.removeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Ionicons name="remove-circle-outline" size={22} color="#9B9B9B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  coverPlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  playlistTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  meta: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  deleteBtn: { padding: 4 },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  shuffleBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#9B9B9B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  trackPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  trackArt: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#282828' },
  trackInfo: { flex: 1, gap: 3 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackDuration: { color: '#9B9B9B', fontSize: 13 },
  removeBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 32 },
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
