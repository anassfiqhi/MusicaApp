import { searchTracks, prefetchTrack, type SpotifyTrack } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { playSpotifyTrack } = useTrackPlayerContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleTrackPress = useCallback((track: SpotifyTrack) => {
    playSpotifyTrack(track);
    router.push('/player');
  }, [playSpotifyTrack]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const tracks = await searchTracks(query.trim());
      setResults(tracks);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Search Bar ── */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Artists, songs, or podcasts"
          placeholderTextColor="#9B9B9B"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Results ── */}
      {loading ? (
        <ActivityIndicator color="#1DB954" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched && !loading ? (
              <Text style={styles.empty}>No results for &quot;{query}&quot;</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.trackRow} activeOpacity={0.7} onPressIn={() => prefetchTrack(item.id)} onPress={() => handleTrackPress(item)}>
              <Image source={{ uri: item.images }} style={styles.trackArt} />
              <View style={styles.trackInfo}>
                <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.trackMeta} numberOfLines={1}>
                  {item.artists} · {item.album_name}
                </Text>
              </View>
              <Text style={styles.duration}>{formatDuration(item.duration_ms)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    color: '#121212',
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    color: '#9B9B9B',
    fontSize: 16,
    paddingLeft: 8,
  },
  list: {
    paddingBottom: 120,
  },
  empty: {
    color: '#9B9B9B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  trackArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  trackInfo: {
    flex: 1,
    gap: 3,
  },
  trackName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  trackMeta: {
    color: '#9B9B9B',
    fontSize: 12,
  },
  duration: {
    color: '#9B9B9B',
    fontSize: 13,
  },
});
