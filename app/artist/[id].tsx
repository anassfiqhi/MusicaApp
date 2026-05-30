import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getArtist,
  getStreamUrl,
  prefetchTrack,
  type ArtistData,
  type SpotifyTrack,
  type SpotifyAlbum,
} from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';

const HEADER_HEIGHT = 300;
const COLLAPSED_HEIGHT = 56;

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playSpotifyPlaylist, playSpotifyTrack, currentTrack } = useTrackPlayerContext();
  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();

  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    console.log(`[artist] loading id=${id}`);
    setLoading(true);
    setError(false);
    getArtist(id)
      .then((data) => {
        console.log(`[artist] loaded: name="${data.name}" top_tracks=${data.top_tracks.length} albums=${data.albums.length}`);
        setArtist(data);
      })
      .catch((err) => {
        console.error(`[artist] load error id=${id}:`, err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePlayTrack = useCallback((track: SpotifyTrack) => {
    console.log(`[artist] play track id=${track.id} name="${track.name}"`);
    playSpotifyTrack(track);
  }, [playSpotifyTrack]);

  const handlePlayAll = useCallback(() => {
    if (!artist || artist.top_tracks.length === 0) return;
    console.log(`[artist] play all ${artist.top_tracks.length} tracks for "${artist.name}"`);
    playSpotifyPlaylist(artist.top_tracks, 0);
  }, [artist, playSpotifyPlaylist]);

  const handleShuffle = useCallback(() => {
    if (!artist || artist.top_tracks.length === 0) return;
    console.log(`[artist] shuffle ${artist.top_tracks.length} tracks for "${artist.name}"`);
    const shuffled = [...artist.top_tracks].sort(() => Math.random() - 0.5);
    playSpotifyPlaylist(shuffled, 0);
  }, [artist, playSpotifyPlaylist]);

  const handleDownload = useCallback((track: SpotifyTrack) => {
    console.log(`[artist] download track id=${track.id} name="${track.name}"`);
    download({
      id: track.id,
      title: track.name,
      artist: track.artists,
      artworkUrl: track.images,
      audioUrl: getStreamUrl(track.id),
    });
  }, [download]);

  // Animated header opacity: image fades out as you scroll
  const headerImageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - COLLAPSED_HEIGHT - insets.top],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Artist name appears in top bar after scrolling
  const topBarNameOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - COLLAPSED_HEIGHT - insets.top - 30, HEADER_HEIGHT - COLLAPSED_HEIGHT - insets.top],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const topBarBgOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - COLLAPSED_HEIGHT - insets.top - 60, HEADER_HEIGHT - COLLAPSED_HEIGHT - insets.top],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#1DB954" size="large" />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load artist</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const visibleTracks = showAllTracks ? artist.top_tracks : artist.top_tracks.slice(0, 5);

  return (
    <View style={styles.container}>

      {/* ── Collapsing header image ── */}
      <Animated.View style={[styles.headerImage, { opacity: headerImageOpacity }]}>
        {artist.images ? (
          <Image source={{ uri: artist.images }} style={{ width, height: HEADER_HEIGHT }} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#1a1a2e', '#0f0f1a', '#121212']}
            style={{ width, height: HEADER_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="person" size={90} color="rgba(29,185,84,0.25)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(18,18,18,0.6)', '#121212']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>

      {/* ── Top bar (appears on scroll) ── */}
      <Animated.View style={[styles.topBar, { paddingTop: insets.top, opacity: topBarBgOpacity }]}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.topBarBg, { opacity: topBarBgOpacity }]} />
        </View>
      </Animated.View>

      {/* ── Back button (always visible) ── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Scrolling top-bar artist name ── */}
      <Animated.Text
        style={[styles.topBarName, { top: insets.top + 14, opacity: topBarNameOpacity }]}
        numberOfLines={1}
      >
        {artist.name}
      </Animated.Text>

      {/* ── Main scrollable content ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Space for header image */}
        <View style={{ height: HEADER_HEIGHT - 60 }} />

        {/* Artist name + meta */}
        <View style={styles.artistInfo}>
          <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
          {(artist.monthly_listeners != null || artist.followers != null) && (
            <Text style={styles.listenerCount}>
              {artist.monthly_listeners != null
                ? `${formatCount(artist.monthly_listeners)} monthly listeners`
                : `${formatCount(artist.followers!)} followers`}
            </Text>
          )}
          {artist.genres && artist.genres.length > 0 && (
            <Text style={styles.genres} numberOfLines={1}>
              {artist.genres.slice(0, 3).join(' · ')}
            </Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.shuffleBtn}
            onPress={handleShuffle}
            disabled={artist.top_tracks.length === 0}
          >
            <Ionicons
              name="shuffle"
              size={24}
              color={artist.top_tracks.length === 0 ? '#535353' : '#1DB954'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.playBtn, artist.top_tracks.length === 0 && styles.playBtnDisabled]}
            onPress={handlePlayAll}
            disabled={artist.top_tracks.length === 0}
          >
            <Ionicons name="play" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Popular tracks */}
        {artist.top_tracks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Popular</Text>
            {visibleTracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              const downloaded = isDownloaded(track.id);
              const downloading = isDownloading(track.id);
              const progress = getProgress(track.id);

              return (
                <TouchableOpacity
                  key={`${track.id}-${index}`}
                  style={[styles.trackRow, isActive && styles.trackRowActive]}
                  onPress={() => handlePlayTrack(track)}
                  onPressIn={() => prefetchTrack(track.id)}
                  activeOpacity={0.7}
                >
                  {isActive
                    ? <Ionicons name="musical-note" size={14} color="#1DB954" />
                    : <Text style={styles.trackNum}>{index + 1}</Text>
                  }
                  <Image
                    source={{ uri: track.images }}
                    style={styles.trackArt}
                    contentFit="cover"
                  />
                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackName, isActive && styles.trackNameActive]} numberOfLines={1}>
                      {track.name}
                    </Text>
                    <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!downloaded && !downloading) handleDownload(track);
                    }}
                    style={styles.actionBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {downloading ? (
                      progress > 0 && progress < 1 ? (
                        <View style={styles.progressRing}>
                          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                        </View>
                      ) : (
                        <ActivityIndicator size="small" color="#1DB954" />
                      )
                    ) : downloaded ? (
                      <Ionicons name="arrow-down-circle" size={20} color="#1DB954" />
                    ) : (
                      <Ionicons name="arrow-down-circle-outline" size={20} color="#535353" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setOptionsTrack(track); }}
                    style={styles.actionBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#9B9B9B" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {artist.top_tracks.length > 5 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllTracks(v => !v)}
              >
                <Text style={styles.seeMoreText}>
                  {showAllTracks ? 'Show less' : `See ${artist.top_tracks.length - 5} more`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Albums */}
        {artist.albums.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Discography</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.albumsScroll}
            >
              {artist.albums.map((album: SpotifyAlbum) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumCard}
                  onPress={() => router.push(`/album/${album.id}`)}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{ uri: album.images }}
                    style={styles.albumArt}
                    contentFit="cover"
                  />
                  <Text style={styles.albumName} numberOfLines={2}>{album.name}</Text>
                  {album.release_date && (
                    <Text style={styles.albumYear}>{album.release_date.slice(0, 4)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </Animated.ScrollView>

      <TrackOptionsSheet
        visible={optionsTrack !== null}
        track={optionsTrack}
        onClose={() => setOptionsTrack(null)}
        onAddToPlaylist={() => setAddTrack(optionsTrack)}
      />
      <AddToPlaylistModal
        visible={addTrack !== null}
        track={addTrack}
        onClose={() => setAddTrack(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { alignItems: 'center', justifyContent: 'center' },

  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: COLLAPSED_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  topBarBg: { backgroundColor: '#121212' },
  topBarName: {
    position: 'absolute',
    left: 56,
    right: 56,
    zIndex: 11,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },

  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  artistInfo: { paddingHorizontal: 16, gap: 4, marginBottom: 4 },
  artistName: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  listenerCount: { color: '#9B9B9B', fontSize: 13 },
  genres: { color: '#9B9B9B', fontSize: 12, textTransform: 'capitalize', marginTop: 2 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 20,
  },
  shuffleBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  playBtnDisabled: { backgroundColor: '#535353', shadowOpacity: 0 },

  sectionLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 14,
  },
  trackRowActive: { backgroundColor: 'rgba(29,185,84,0.08)' },
  trackNum: { width: 20, color: '#9B9B9B', fontSize: 14, textAlign: 'center' },
  trackArt: { width: 46, height: 46, borderRadius: 4, backgroundColor: '#282828' },
  trackInfo: { flex: 1, gap: 3 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  trackNameActive: { color: '#1DB954' },
  trackDuration: { color: '#9B9B9B', fontSize: 12 },
  actionBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 28 },
  progressRing: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#1DB954', fontSize: 8, fontWeight: '700' },

  seeMoreBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  seeMoreText: { color: '#9B9B9B', fontSize: 14, fontWeight: '600' },

  albumsScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  albumCard: { width: 140 },
  albumArt: {
    width: 140,
    height: 140,
    borderRadius: 6,
    backgroundColor: '#282828',
    marginBottom: 8,
  },
  albumName: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  albumYear: { color: '#9B9B9B', fontSize: 12, marginTop: 2 },

  errorText: { color: '#9B9B9B', fontSize: 16, marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
