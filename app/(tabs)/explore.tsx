import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchTracks, searchAlbums, prefetchTrack, getStreamUrl, type SpotifyTrack, type SpotifyAlbum } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';

const GENRES = [
  { label: 'Pop',        color: '#E8115B', query: 'pop hits' },
  { label: 'Hip-Hop',   color: '#BA5D07', query: 'hip hop rap' },
  { label: 'Rock',       color: '#4B917D', query: 'rock classic' },
  { label: 'Electronic', color: '#0D73EC', query: 'electronic dance' },
  { label: 'R&B',        color: '#8D67AB', query: 'rnb soul' },
  { label: 'Jazz',       color: '#1E3264', query: 'jazz' },
  { label: 'Classical',  color: '#148A08', query: 'classical orchestra' },
  { label: 'Latin',      color: '#E61E32', query: 'latin reggaeton' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playSpotifyTrack } = useTrackPlayerContext();
  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const [tracks, albumList] = await Promise.all([
        searchTracks(q.trim()),
        searchAlbums(q.trim()),
      ]);
      setResults(tracks);
      setAlbums(albumList);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => doSearch(query), [query, doSearch]);

  const handleGenre = useCallback((label: string, genreQuery: string) => {
    setQuery(label);
    doSearch(genreQuery);
  }, [doSearch]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setAlbums([]);
    setSearched(false);
  };

  const handleTrackPress = useCallback((track: SpotifyTrack) => {
    playSpotifyTrack(track);
    router.push('/player');
  }, [playSpotifyTrack]);

  const handleDownload = useCallback((track: SpotifyTrack) => {
    download({
      id: track.id,
      title: track.name,
      artist: track.artists,
      artworkUrl: track.images,
      audioUrl: getStreamUrl(track.id),
    });
  }, [download]);

  const cardW = (width - 40) / 2;
  const topTrack = results[0];
  const songResults = results.slice(1);

  const renderTrackRow = ({ item }: { item: SpotifyTrack }) => {
    const downloaded = isDownloaded(item.id);
    const downloading = isDownloading(item.id);
    const progress = getProgress(item.id);

    return (
      <TouchableOpacity
        style={styles.trackRow}
        onPress={() => handleTrackPress(item)}
        onPressIn={() => prefetchTrack(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.images }} style={styles.trackArt} contentFit="cover" />
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artists}</Text>
        </View>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); if (!downloaded && !downloading) handleDownload(item); }}
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
            <Ionicons name="arrow-down-circle" size={22} color="#1DB954" />
          ) : (
            <Ionicons name="arrow-down-circle-outline" size={22} color="#9B9B9B" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); setOptionsTrack(item); }}
          style={styles.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#9B9B9B" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <Text style={styles.heading}>Search</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#535353" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="What do you want to listen to?"
          placeholderTextColor="#535353"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#535353" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Browse (no search yet) ── */}
      {!searched && !loading && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <Text style={styles.sectionLabel}>Browse all</Text>
          <View style={styles.genreGrid}>
            {GENRES.map(g => (
              <TouchableOpacity
                key={g.label}
                style={[styles.genreCard, { backgroundColor: g.color, width: cardW }]}
                onPress={() => handleGenre(g.label, g.query)}
                activeOpacity={0.8}
              >
                <Text style={styles.genreLabel}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#1DB954" size="large" />
        </View>
      )}

      {/* ── No results ── */}
      {searched && !loading && results.length === 0 && albums.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsSub}>
            Try different keywords or check your spelling
          </Text>
        </View>
      )}

      {/* ── Results ── */}
      {searched && !loading && results.length > 0 && (
        <FlatList
          data={songResults}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <>
              {/* Top result card */}
              <Text style={styles.sectionLabel}>Top result</Text>
              <TouchableOpacity
                style={styles.topCard}
                onPress={() => handleTrackPress(topTrack)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: topTrack.images }} style={styles.topCardArt} contentFit="cover" />
                <Text style={styles.topCardName} numberOfLines={2}>{topTrack.name}</Text>
                <Text style={styles.topCardArtist} numberOfLines={1}>{topTrack.artists}</Text>
                <TouchableOpacity style={styles.topCardPlay} onPress={() => handleTrackPress(topTrack)}>
                  <Ionicons name="play" size={22} color="#000" />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Albums section */}
              {albums.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Albums</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.albumsScroll}
                  >
                    {albums.map((album) => (
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
                        <Text style={styles.albumArtist} numberOfLines={1}>{album.artists}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {songResults.length > 0 && (
                <Text style={[styles.sectionLabel, { marginTop: albums.length > 0 ? 4 : 0 }]}>Songs</Text>
              )}
            </>
          }
          renderItem={renderTrackRow}
        />
      )}

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

  heading: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    color: '#121212',
    fontSize: 15,
    fontWeight: '500',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  noResultsTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  noResultsSub: { color: '#9B9B9B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  sectionLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  genreCard: {
    height: 96,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  genreLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  topCard: {
    backgroundColor: '#282828',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
  },
  topCardArt: {
    width: 104,
    height: 104,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  topCardName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    paddingRight: 64,
  },
  topCardArtist: {
    color: '#9B9B9B',
    fontSize: 14,
    paddingRight: 64,
  },
  topCardPlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  trackArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  trackInfo: { flex: 1, gap: 4 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  actionBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 32 },
  progressRing: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#1DB954', fontSize: 9, fontWeight: '700' },

  albumsScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 14 },
  albumCard: { width: 132 },
  albumArt: {
    width: 132,
    height: 132,
    borderRadius: 6,
    backgroundColor: '#282828',
    marginBottom: 8,
  },
  albumName: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  albumArtist: { color: '#9B9B9B', fontSize: 12, marginTop: 2 },
});
