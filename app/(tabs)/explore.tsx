import React, { useCallback, useEffect, useState } from 'react';
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
import { searchTracks, searchAlbums, searchArtists, prefetchTrack, getStreamUrl, type SpotifyTrack, type SpotifyAlbum, type SpotifyArtist } from '@/services/api';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';

type GenreItem = { label: string; color: string; query: string };
type GenreSection = { title: string; items: GenreItem[] };

const GENRE_SECTIONS: GenreSection[] = [
  {
    title: 'Genres',
    items: [
      { label: 'Pop',          color: '#E8115B', query: 'pop hits' },
      { label: 'Hip-Hop',      color: '#BA5D07', query: 'hip hop rap' },
      { label: 'Rock',         color: '#E91429', query: 'rock classic' },
      { label: 'R&B',          color: '#8D67AB', query: 'rnb soul' },
      { label: 'Electronic',   color: '#0D73EC', query: 'electronic dance' },
      { label: 'Latin',        color: '#E61E32', query: 'latin reggaeton' },
      { label: 'Country',      color: '#4B917D', query: 'country music' },
      { label: 'Jazz',         color: '#1E3264', query: 'jazz' },
      { label: 'Classical',    color: '#148A08', query: 'classical orchestra' },
      { label: 'Metal',        color: '#509BF5', query: 'metal heavy' },
      { label: 'Indie',        color: '#F59B23', query: 'indie alternative' },
      { label: 'Alternative',  color: '#27856A', query: 'alternative rock' },
      { label: 'K-Pop',        color: '#E8115B', query: 'kpop korean' },
      { label: 'Afrobeats',    color: '#BA5D07', query: 'afrobeats afropop' },
      { label: 'Reggae',       color: '#148A08', query: 'reggae' },
      { label: 'Soul',         color: '#8D67AB', query: 'soul music' },
      { label: 'Blues',        color: '#1E3264', query: 'blues music' },
      { label: 'Folk',         color: '#4B917D', query: 'folk acoustic' },
      { label: 'Funk',         color: '#E91429', query: 'funk' },
      { label: 'Punk',         color: '#509BF5', query: 'punk rock' },
    ],
  },
  {
    title: 'Moods & Activities',
    items: [
      { label: 'Chill',        color: '#4B917D', query: 'chill relax' },
      { label: 'Party',        color: '#E91429', query: 'party hits' },
      { label: 'Workout',      color: '#E8115B', query: 'workout gym' },
      { label: 'Focus',        color: '#1E3264', query: 'focus study concentration' },
      { label: 'Sleep',        color: '#27856A', query: 'sleep ambient calm' },
      { label: 'Happy',        color: '#F59B23', query: 'happy upbeat' },
      { label: 'Romance',      color: '#E8115B', query: 'romantic love songs' },
      { label: 'Sad',          color: '#509BF5', query: 'sad emotional' },
    ],
  },
  {
    title: 'Decades',
    items: [
      { label: '2010s',        color: '#0D73EC', query: '2010s hits' },
      { label: '2000s',        color: '#E91429', query: '2000s hits' },
      { label: '90s',          color: '#BA5D07', query: '90s hits' },
      { label: '80s',          color: '#8D67AB', query: '80s hits' },
      { label: '70s',          color: '#4B917D', query: '70s hits' },
      { label: '60s',          color: '#1E3264', query: '60s hits' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { label: 'Gaming',       color: '#509BF5', query: 'gaming music' },
      { label: 'Anime',        color: '#E8115B', query: 'anime soundtrack' },
      { label: 'Soundtrack',   color: '#1E3264', query: 'movie soundtrack film score' },
      { label: 'Gospel',       color: '#148A08', query: 'gospel christian' },
      { label: 'Trap',         color: '#BA5D07', query: 'trap music' },
      { label: 'House',        color: '#0D73EC', query: 'house music' },
      { label: 'Ambient',      color: '#27856A', query: 'ambient atmospheric' },
      { label: 'Disco',        color: '#F59B23', query: 'disco' },
    ],
  },
];

const ALL_GENRES = GENRE_SECTIONS.flatMap(s => s.items);

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playSpotifyTrack } = useTrackPlayerContext();
  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);
  const [genreImages, setGenreImages] = useState<Record<string, string>>({});

  useEffect(() => {
    ALL_GENRES.forEach(async (g) => {
      try {
        const tracks = await searchTracks(g.query, 1);
        if (tracks[0]?.images) {
          setGenreImages(prev => ({ ...prev, [g.label]: tracks[0].images }));
        }
      } catch {}
    });
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    console.log(`[explore] search start: "${q}"`);
    setLoading(true);
    setSearched(true);
    try {
      const [tracks, albumList, artistList] = await Promise.all([
        searchTracks(q.trim()),
        searchAlbums(q.trim()),
        searchArtists(q.trim()),
      ]);
      console.log(`[explore] search done: ${tracks.length} tracks, ${albumList.length} albums, ${artistList.length} artists`);
      setResults(tracks);
      setAlbums(albumList);
      setArtists(artistList);
    } catch (err) {
      console.error(`[explore] search error:`, err);
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
    setArtists([]);
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
          <Text style={styles.browseHeading}>Browse all</Text>
          {GENRE_SECTIONS.map(section => (
            <View key={section.title}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              <View style={styles.genreGrid}>
                {section.items.map(g => (
                  <TouchableOpacity
                    key={g.label}
                    style={[styles.genreCard, { backgroundColor: g.color, width: cardW }]}
                    onPress={() => handleGenre(g.label, g.query)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.genreLabel}>{g.label}</Text>
                    {genreImages[g.label] && (
                      <Image
                        source={{ uri: genreImages[g.label] }}
                        style={styles.genreArt}
                        contentFit="cover"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#1DB954" size="large" />
        </View>
      )}

      {/* ── No results ── */}
      {searched && !loading && results.length === 0 && albums.length === 0 && artists.length === 0 && (
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
              {(() => {
                const downloaded = isDownloaded(topTrack.id);
                const downloading = isDownloading(topTrack.id);
                const progress = getProgress(topTrack.id);
                return (
                  <TouchableOpacity
                    style={styles.topCard}
                    onPress={() => handleTrackPress(topTrack)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: topTrack.images }} style={styles.topCardArt} contentFit="cover" />
                    <Text style={styles.topCardName} numberOfLines={2}>{topTrack.name}</Text>
                    <Text style={styles.topCardArtist} numberOfLines={1}>{topTrack.artists}</Text>

                    {/* Action row */}
                    <View style={styles.topCardActions}>
                      <TouchableOpacity
                        style={styles.topCardActionBtn}
                        onPress={(e) => { e.stopPropagation(); if (!downloaded && !downloading) handleDownload(topTrack); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {downloading ? (
                          progress > 0 && progress < 1
                            ? <Text style={styles.topCardProgress}>{Math.round(progress * 100)}%</Text>
                            : <ActivityIndicator size="small" color="#1DB954" />
                        ) : downloaded ? (
                          <Ionicons name="arrow-down-circle" size={24} color="#1DB954" />
                        ) : (
                          <Ionicons name="arrow-down-circle-outline" size={24} color="#9B9B9B" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.topCardActionBtn}
                        onPress={(e) => { e.stopPropagation(); setAddTrack(topTrack); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="add-circle-outline" size={24} color="#9B9B9B" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.topCardActionBtn}
                        onPress={(e) => { e.stopPropagation(); setOptionsTrack(topTrack); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#9B9B9B" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.topCardPlay} onPress={(e) => { e.stopPropagation(); handleTrackPress(topTrack); }}>
                      <Ionicons name="play" size={22} color="#000" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })()}

              {/* Artists section */}
              {artists.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Artists</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.artistsScroll}
                  >
                    {artists.map((artist) => (
                      <TouchableOpacity
                        key={artist.id}
                        style={styles.artistCard}
                        onPress={() => router.push(`/artist/${artist.id}`)}
                        activeOpacity={0.75}
                      >
                        <Image
                          source={{ uri: artist.images }}
                          style={styles.artistAvatar}
                          contentFit="cover"
                        />
                        <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                        <Text style={styles.artistLabel}>Artist</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

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

  browseHeading: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  sectionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 20,
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
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  genreLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    zIndex: 1,
  },
  genreArt: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 4,
    bottom: -6,
    right: -6,
    transform: [{ rotate: '25deg' }],
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
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
    paddingRight: 60,
  },
  topCardArtist: {
    color: '#9B9B9B',
    fontSize: 14,
    paddingRight: 60,
  },
  topCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingRight: 64,
  },
  topCardActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCardProgress: {
    color: '#1DB954',
    fontSize: 10,
    fontWeight: '700',
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

  artistsScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  artistCard: { width: 96, alignItems: 'center' },
  artistAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#282828',
    marginBottom: 8,
  },
  artistName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  artistLabel: { color: '#9B9B9B', fontSize: 11, marginTop: 2, textAlign: 'center' },

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
