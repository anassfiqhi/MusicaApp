import { FEED_SECTIONS, getPlaylist, prefetchTrack, type FeedSection, type SpotifyTrack } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { playSpotifyTrack } = useTrackPlayerContext();
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlaylist('37i9dQZEVXbMDoHDwVN2tF', 15)
      .then(setTopTracks)
      .finally(() => setLoading(false));
  }, []);

  const handleTrackPress = useCallback((track: SpotifyTrack) => {
    playSpotifyTrack(track);
    router.push('/player');
  }, [playSpotifyTrack]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Discover</Text>

        <Text style={styles.sectionTitle}>Featured</Text>
        <FlatList
          data={FEED_SECTIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.playlist_id}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }: { item: FeedSection }) => (
            <TouchableOpacity style={styles.playlistCard} activeOpacity={0.8}>
              <Image source={{ uri: item.cover }} style={styles.playlistCover} />
              <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.sectionTitle}>Global Top 50</Text>
        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 20 }} />
        ) : (
          topTracks.map((track, index) => (
            <TouchableOpacity key={`${track.id}-${index}`} style={styles.trackRow} activeOpacity={0.7} onPressIn={() => prefetchTrack(track.id)} onPress={() => handleTrackPress(track)}>
              <Text style={styles.trackIndex}>{index + 1}</Text>
              <Image source={{ uri: track.images }} style={styles.trackArt} />
              <View style={styles.trackInfo}>
                <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artists}</Text>
              </View>
              <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { paddingBottom: 100 },
  heading: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  horizontalList: { paddingHorizontal: 16, gap: 12, marginBottom: 28 },
  playlistCard: { width: 140 },
  playlistCover: { width: 140, height: 140, borderRadius: 8, backgroundColor: '#282828' },
  playlistTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 8 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  trackIndex: { color: '#9B9B9B', fontSize: 14, width: 20, textAlign: 'center' },
  trackArt: { width: 46, height: 46, borderRadius: 4, backgroundColor: '#282828' },
  trackInfo: { flex: 1, gap: 2 },
  trackName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackDuration: { color: '#9B9B9B', fontSize: 13 },
});
