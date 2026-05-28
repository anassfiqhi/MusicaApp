import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAlbum, getStreamUrl, prefetchTrack, type AlbumData, type SpotifyTrack } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatYear(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 4);
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const isWide = Math.min(width, screenHeight) >= 600;
  const { playSpotifyPlaylist, currentTrack } = useTrackPlayerContext();
  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();

  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    console.log(`[album] loading id=${id}`);
    setLoading(true);
    setError(false);
    getAlbum(id)
      .then((data) => {
        console.log(`[album] loaded: name="${data.name}" artists="${data.artists}" tracks=${data.tracks.length} year=${data.release_date?.slice(0,4)}`);
        setAlbum(data);
      })
      .catch((err) => {
        console.error(`[album] load error id=${id}:`, err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePlay = useCallback((index: number) => {
    if (!album || album.tracks.length === 0) return;
    console.log(`[album] play from index=${index} in "${album.name}"`);
    playSpotifyPlaylist(album.tracks, index);
    router.push('/player');
  }, [album, playSpotifyPlaylist]);

  const handlePlayAll = useCallback(() => handlePlay(0), [handlePlay]);

  const handleShuffle = useCallback(() => {
    if (!album || album.tracks.length === 0) return;
    console.log(`[album] shuffle ${album.tracks.length} tracks in "${album.name}"`);
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    playSpotifyPlaylist(shuffled, 0);
    router.push('/player');
  }, [album, playSpotifyPlaylist]);

  const handleDownload = useCallback((track: SpotifyTrack) => {
    console.log(`[album] download track id=${track.id} name="${track.name}"`);
    download({
      id: track.id,
      title: track.name,
      artist: track.artists,
      artworkUrl: track.images,
      audioUrl: getStreamUrl(track.id),
    });
  }, [download]);

  const coverH = Math.min(width * (isWide ? 0.5 : 0.72), 340);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#1DB954" size="large" />
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load album</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backBtnAbs, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const year = formatYear(album.release_date);
  const totalMin = Math.round(
    album.tracks.reduce((sum, t) => sum + t.duration_ms, 0) / 60000
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Cover */}
        <View style={{ width, height: coverH }}>
          {album.cover ? (
            <Image source={{ uri: album.cover }} style={{ width, height: coverH }} contentFit="cover" />
          ) : (
            <View style={[{ width, height: coverH }, styles.coverPlaceholder]}>
              <Ionicons name="disc" size={80} color="rgba(29,185,84,0.35)" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.7)', '#121212']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.albumName, isWide && styles.albumNameWide]} numberOfLines={2}>
            {album.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>{album.artists}</Text>
          <Text style={styles.meta}>
            {[
              'Album',
              year,
              album.tracks.length > 0
                ? `${album.tracks.length} ${album.tracks.length === 1 ? 'song' : 'songs'}`
                : null,
              totalMin > 0 ? `${totalMin} min` : null,
            ].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.shuffleBtn}
            onPress={handleShuffle}
            disabled={album.tracks.length === 0}
          >
            <Ionicons
              name="shuffle"
              size={isWide ? 20 : 24}
              color={album.tracks.length === 0 ? '#535353' : '#1DB954'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.playBtn, isWide && styles.playBtnWide, album.tracks.length === 0 && styles.playBtnDisabled]}
            onPress={handlePlayAll}
            disabled={album.tracks.length === 0}
          >
            <Ionicons name="play" size={isWide ? 22 : 26} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Track list */}
        {album.tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          const downloaded = isDownloaded(track.id);
          const downloading = isDownloading(track.id);
          const progress = getProgress(track.id);

          return (
            <TouchableOpacity
              key={`${track.id}-${index}`}
              style={[styles.trackRow, isActive && styles.trackRowActive]}
              onPress={() => handlePlay(index)}
              onPressIn={() => prefetchTrack(track.id)}
              activeOpacity={0.7}
            >
              <View style={styles.trackIndex}>
                {isActive
                  ? <Ionicons name="musical-note" size={14} color="#1DB954" />
                  : <Text style={styles.trackNum}>{index + 1}</Text>}
              </View>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackName, isActive && styles.trackNameActive]} numberOfLines={1}>
                  {track.name}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artists}</Text>
              </View>
              <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (!downloaded && !downloading) handleDownload(track);
                }}
                style={styles.downloadBtn}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtnAbs, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { alignItems: 'center', justifyContent: 'center' },

  coverPlaceholder: {
    backgroundColor: '#1a2a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: { paddingHorizontal: 16, paddingTop: 10, gap: 4 },
  albumName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  albumNameWide: { fontSize: 20 },
  artistName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meta: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    gap: 20,
  },
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

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  trackRowActive: { backgroundColor: 'rgba(29,185,84,0.08)' },
  trackIndex: { width: 24, alignItems: 'center' },
  trackNum: { color: '#535353', fontSize: 14 },
  trackInfo: { flex: 1, gap: 3 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  trackNameActive: { color: '#1DB954' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackDuration: { color: '#535353', fontSize: 12 },
  downloadBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 28 },
  progressRing: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#1DB954', fontSize: 8, fontWeight: '700' },

  backBtnAbs: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: '#9B9B9B', fontSize: 16, marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
