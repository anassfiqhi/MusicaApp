import { FEED_CATEGORIES, getPlaylist, prefetchTrack, type FeedCategory, type PlaylistRef, type SpotifyTrack } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

  // Tracks pane
  const [selectedId, setSelectedId] = useState<string>(FEED_CATEGORIES[0].playlists[0].id);
  const [selectedTitle, setSelectedTitle] = useState<string>(FEED_CATEGORIES[0].playlists[0].title);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const loadingFor = useRef<string>('');

  // Cover cache: playlistId → url
  const [covers, setCovers] = useState<Record<string, string>>({});

  const loadPlaylist = useCallback((playlist: PlaylistRef) => {
    setSelectedId(playlist.id);
    setSelectedTitle(playlist.title);
    setLoadingTracks(true);
    loadingFor.current = playlist.id;

    getPlaylist(playlist.id, 20).then(({ cover, tracks: t }) => {
      if (loadingFor.current !== playlist.id) return;
      setTracks(t);
      setLoadingTracks(false);
      if (cover) setCovers((prev) => ({ ...prev, [playlist.id]: cover }));
    });
  }, []);

  useEffect(() => {
    loadPlaylist(FEED_CATEGORIES[0].playlists[0]);
  }, [loadPlaylist]);

  const handleTrackPress = useCallback((track: SpotifyTrack) => {
    playSpotifyTrack(track);
    router.push('/player');
  }, [playSpotifyTrack]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Discover</Text>

        {FEED_CATEGORIES.map((category: FeedCategory) => (
          <View key={category.title}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <FlatList
              data={category.playlists}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }: { item: PlaylistRef }) => {
                const active = item.id === selectedId;
                const cover = covers[item.id];
                return (
                  <TouchableOpacity
                    style={styles.playlistCard}
                    activeOpacity={0.8}
                    onPress={() => loadPlaylist(item)}
                  >
                    <View style={[styles.coverWrap, active && styles.coverWrapActive]}>
                      {cover
                        ? <Image source={{ uri: cover }} style={styles.cover} />
                        : <View style={[styles.cover, styles.coverPlaceholder]}>
                            {active && loadingTracks
                              ? <ActivityIndicator color="#1DB954" size="small" />
                              : null}
                          </View>
                      }
                    </View>
                    <Text style={[styles.cardTitle, active && styles.cardTitleActive]} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>{selectedTitle}</Text>
        {loadingTracks ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 20 }} />
        ) : (
          tracks.map((track, index) => (
            <TouchableOpacity
              key={`${track.id}-${index}`}
              style={styles.trackRow}
              activeOpacity={0.7}
              onPressIn={() => prefetchTrack(track.id)}
              onPress={() => handleTrackPress(track)}
            >
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
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  horizontalList: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  playlistCard: { width: 130 },
  coverWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  coverWrapActive: {
    borderColor: '#1DB954',
  },
  cover: { width: 126, height: 126 },
  coverPlaceholder: { backgroundColor: '#282828', alignItems: 'center', justifyContent: 'center' },
  cardTitle: {
    color: '#9B9B9B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  cardTitleActive: { color: '#1DB954' },
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
