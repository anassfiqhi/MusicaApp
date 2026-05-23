import { getPlaylist, prefetchTrack, getStreamUrl, type SpotifyTrack } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playSpotifyPlaylist } = useTrackPlayerContext();
  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();

  const [cover, setCover] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('Spotify');
  const [followers, setFollowers] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlaylist(id).then((data) => {
      setCover(data.cover);
      setDescription(data.description);
      setOwner(data.owner);
      setFollowers(data.followers);
      setTotalTracks(data.totalTracks);
      setTracks(data.tracks);
      setLoading(false);
    });
  }, [id]);

  const handlePlay = (track: SpotifyTrack, index: number) => {
    playSpotifyPlaylist(tracks, index);
    router.push('/player');
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    playSpotifyPlaylist(tracks, 0);
    router.push('/player');
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playSpotifyPlaylist(shuffled, 0);
    router.push('/player');
  };

  const handleDownload = (track: SpotifyTrack) => {
    download({
      id: track.id,
      title: track.name,
      artist: track.artists,
      artworkUrl: track.images,
      audioUrl: getStreamUrl(track.id),
    });
  };

  const coverSize = width;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Cover + gradient header */}
        <View style={{ width: coverSize, height: coverSize }}>
          {cover
            ? <Image source={{ uri: cover }} style={{ width: coverSize, height: coverSize }} contentFit="cover" />
            : <View style={[{ width: coverSize, height: coverSize }, styles.coverPlaceholder]} />
          }
          <LinearGradient
            colors={['transparent', '#121212']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
          />
        </View>

        {/* Playlist info */}
        <View style={styles.info}>
          <Text style={styles.playlistTitle} numberOfLines={2}>{title}</Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          ) : null}
          <Text style={styles.meta}>
            By {owner}
            {followers > 0 ? ` · ${formatFollowers(followers)} likes` : ''}
            {totalTracks > 0 ? ` · ${totalTracks} songs` : ''}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsLeft}>
            <Ionicons name="heart-outline" size={26} color="#9B9B9B" style={{ marginRight: 24 }} />
            <Ionicons name="ellipsis-horizontal" size={26} color="#9B9B9B" />
          </View>
          <View style={styles.controlsRight}>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle}>
              <Ionicons name="shuffle" size={22} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
              <Ionicons name="play" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Track list */}
        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 40 }} />
        ) : (
          tracks.map((track, index) => {
            const downloaded = isDownloaded(track.id);
            const downloading = isDownloading(track.id);
            const progress = getProgress(track.id);
            return (
              <View key={`${track.id}-${index}`} style={styles.trackRow}>
                <TouchableOpacity
                  style={styles.trackPressable}
                  activeOpacity={0.7}
                  onPressIn={() => prefetchTrack(track.id)}
                  onPress={() => handlePlay(track, index)}
                >
                  <Image source={{ uri: track.images }} style={styles.trackArt} />
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>{track.artists}</Text>
                  </View>
                  <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { if (!downloaded && !downloading) handleDownload(track); }}
                  style={styles.dlBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
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
                    <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
                  ) : (
                    <Ionicons name="arrow-down-circle-outline" size={20} color="#9B9B9B" />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating back button */}
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
  coverPlaceholder: { backgroundColor: '#282828' },
  info: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  playlistTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: { color: '#9B9B9B', fontSize: 13, lineHeight: 18 },
  meta: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  controlsLeft: { flexDirection: 'row', alignItems: 'center' },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  shuffleBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
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
  dlBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 32 },
  progressRing: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#1DB954', fontSize: 9, fontWeight: '700' },
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
