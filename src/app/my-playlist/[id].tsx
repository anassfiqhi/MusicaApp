import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlaylists, LIKED_PLAYLIST_ID } from '@/context/PlaylistsContext';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';

const PLACEHOLDER = require('@/assets/images/playlist/album_art.png');

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MyPlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const isWide = Math.min(width, screenHeight) >= 600;

  const { playlists, remove: removePlaylist, removeTrack, rename } = usePlaylists();
  const { playSpotifyPlaylist, currentTrack } = useTrackPlayerContext();

  const [renaming, setRenaming] = useState(false);

  const playlist = playlists.find(p => p.id === id);
  const isLiked = id === LIKED_PLAYLIST_ID;

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

  const coverH = Math.min(width * (isWide ? 0.45 : 0.68), 320);
  const artTracks = playlist.tracks.filter(t => t.images);

  const handlePlay = (index: number) => {
    if (playlist.tracks.length === 0) return;
    playSpotifyPlaylist(playlist.tracks, index);
  };

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    playSpotifyPlaylist(playlist.tracks, 0);
  };

  const handleShuffle = () => {
    if (playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    playSpotifyPlaylist(shuffled, 0);
  };

  const handleMore = () => {
    if (isLiked) return;
    Alert.alert(playlist.name, undefined, [
      { text: 'Rename playlist', onPress: () => setRenaming(true) },
      {
        text: 'Delete playlist',
        style: 'destructive',
        onPress: () => { removePlaylist(playlist.id); router.back(); },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleTrackMore = (trackId: string, trackName: string) => {
    Alert.alert(trackName, undefined, [
      {
        text: isLiked ? 'Unlike' : 'Remove from playlist',
        style: 'destructive',
        onPress: () => removeTrack(playlist.id, trackId),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRename = async (newName: string) => {
    await rename(playlist.id, newName);
    setRenaming(false);
  };

  const totalMs = playlist.tracks.reduce((sum, t) => sum + t.duration_ms, 0);
  const totalMin = Math.round(totalMs / 60000);

  // ── Cover ──
  const renderCover = () => {
    if (artTracks.length >= 4) {
      const half = width / 2;
      const halfH = coverH / 2;
      return (
        <View style={{ width, height: coverH }}>
          <View style={styles.coverGrid}>
            {artTracks.slice(0, 4).map((t, i) => (
              <Image
                key={i}
                source={{ uri: t.images }}
                style={{ width: half, height: halfH }}
                contentFit="cover"
              />
            ))}
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.65)', '#121212']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
      );
    }

    if (artTracks.length > 0) {
      return (
        <View style={{ width, height: coverH }}>
          <Image
            source={{ uri: artTracks[0].images }}
            style={{ width, height: coverH }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.65)', '#121212']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
      );
    }

    return (
      <LinearGradient
        colors={isLiked ? ['#2a1a2e', '#1a0f1a', '#121212'] : ['#1a3a28', '#0f2018', '#121212']}
        style={{ width, height: coverH, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'musical-notes'}
          size={80}
          color={isLiked ? 'rgba(29,185,84,0.5)' : 'rgba(29,185,84,0.35)'}
        />
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {renderCover()}

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, isWide && styles.titleWide]} numberOfLines={2}>
            {playlist.name}
          </Text>
          <Text style={styles.meta}>
            {playlist.tracks.length === 0
              ? 'No songs yet'
              : `${playlist.tracks.length} ${playlist.tracks.length === 1 ? 'song' : 'songs'}${totalMin > 0 ? ` · ${totalMin} min` : ''}`}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!isLiked && (
            <TouchableOpacity
              onPress={handleMore}
              style={styles.moreBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={28} color="#9B9B9B" />
            </TouchableOpacity>
          )}
          {isLiked && <View style={styles.moreBtn} />}

          <View style={styles.controlsRight}>
            <TouchableOpacity
              style={styles.shuffleBtn}
              onPress={handleShuffle}
              disabled={playlist.tracks.length === 0}
            >
              <Ionicons
                name="shuffle"
                size={isWide ? 20 : 24}
                color={playlist.tracks.length === 0 ? '#535353' : '#1DB954'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, isWide && styles.playBtnWide, playlist.tracks.length === 0 && styles.playBtnDisabled]}
              onPress={handlePlayAll}
              disabled={playlist.tracks.length === 0}
            >
              <Ionicons name="play" size={isWide ? 22 : 26} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Track list or empty state */}
        {playlist.tracks.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyArt}>
              <Ionicons name={isLiked ? 'heart-outline' : 'musical-notes-outline'} size={44} color="#535353" />
            </View>
            <Text style={styles.emptyTitle}>No tracks yet</Text>
            <Text style={styles.emptySub}>
              {isLiked
                ? 'Songs you like will appear here'
                : 'Go to Discover or Search to find tracks and add them here'}
            </Text>
            <TouchableOpacity style={styles.discoverBtn} onPress={() => router.navigate('/(tabs)')}>
              <Text style={styles.discoverBtnText}>Browse Discover</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {playlist.tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <TouchableOpacity
                  key={`${track.id}-${index}`}
                  style={[styles.trackRow, isActive && styles.trackRowActive]}
                  onPress={() => handlePlay(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.trackIndex}>
                    {isActive
                      ? <Ionicons name="musical-note" size={14} color="#1DB954" />
                      : <Text style={styles.trackNum}>{index + 1}</Text>}
                  </View>
                  <Image
                    source={track.images ? { uri: track.images } : PLACEHOLDER}
                    style={[styles.trackArt, isWide && styles.trackArtWide]}
                    contentFit="cover"
                  />
                  <View style={styles.trackInfo}>
                    <Text
                      style={[styles.trackName, isWide && styles.trackNameWide, isActive && styles.trackNameActive]}
                      numberOfLines={1}
                    >
                      {track.name}
                    </Text>
                    <Text style={[styles.trackArtist, isWide && styles.trackArtistWide]} numberOfLines={1}>
                      {track.artists}
                    </Text>
                  </View>
                  <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); handleTrackMore(track.id, track.name); }}
                    style={styles.trackMore}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#535353" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* Find more */}
            <TouchableOpacity
              style={styles.findMore}
              onPress={() => router.navigate('/(tabs)')}
              activeOpacity={0.7}
            >
              <View style={styles.findMoreIcon}>
                <Ionicons name="add" size={22} color="white" />
              </View>
              <Text style={styles.findMoreText}>Find more tracks</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      <CreatePlaylistModal
        visible={renaming}
        initialName={playlist.name}
        title="Rename playlist"
        confirmLabel="Save"
        onCancel={() => setRenaming(false)}
        onCreate={handleRename}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },

  coverGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  info: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  titleWide: { fontSize: 20 },
  meta: { color: '#9B9B9B', fontSize: 13 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  moreBtn: { padding: 4 },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  shuffleBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnWide: { width: 50, height: 50, borderRadius: 25 },
  playBtnDisabled: { backgroundColor: '#535353', shadowOpacity: 0 },

  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 10 },
  emptyArt: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#9B9B9B', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  discoverBtn: {
    marginTop: 8,
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  discoverBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  trackRowActive: { backgroundColor: 'rgba(29,185,84,0.08)' },
  trackIndex: { width: 24, alignItems: 'center' },
  trackNum: { color: '#535353', fontSize: 14 },
  trackArt: { width: 46, height: 46, borderRadius: 4, backgroundColor: '#282828' },
  trackArtWide: { width: 38, height: 38 },
  trackInfo: { flex: 1, gap: 3 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  trackNameWide: { fontSize: 13 },
  trackNameActive: { color: '#1DB954' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackArtistWide: { fontSize: 11 },
  trackDuration: { color: '#535353', fontSize: 12 },
  trackMore: { padding: 4 },

  findMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  findMoreIcon: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMoreText: { color: '#9B9B9B', fontSize: 15, fontWeight: '500' },

  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
