import { getHomeFeed, getPlaylistCover, type FeedCategory, type PlaylistRef } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CoverImage({ cover, id }: { cover: string; id: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.coverWrap}>
      {failed ? (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="musical-notes" size={36} color="#535353" />
        </View>
      ) : (
        <Image
          source={{ uri: cover }}
          style={styles.cover}
          contentFit="cover"
          recyclingKey={id}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<FeedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const raw = await getHomeFeed();
      // Resolve missing covers concurrently while the spinner is still visible
      const enriched = await Promise.all(
        raw.map(async (section) => {
          const playlists = await Promise.all(
            section.playlists.map(async (p) => {
              if (p.cover) return p;
              const cover = await getPlaylistCover(p.id).catch(() => '');
              return cover ? { ...p, cover } : p;
            })
          );
          return { ...section, playlists: playlists.filter((p) => p.cover) };
        })
      );
      setCategories(enriched.filter((s) => s.playlists.length > 0));
    } catch {}
  }, []);

  useEffect(() => {
    fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  }, [fetchFeed]);

  const openPlaylist = (playlist: PlaylistRef) => {
    router.push({ pathname: '/playlist/[id]', params: { id: playlist.id, title: playlist.title } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        <Text style={styles.heading}>Discover</Text>

        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 40 }} />
        ) : categories.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color="#535353" />
            <Text style={styles.emptyText}>Pull down to refresh</Text>
          </View>
        ) : (
          categories.map((category: FeedCategory) => (
            <View key={category.title}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
              <FlatList
                data={category.playlists}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.row}
                renderItem={({ item }: { item: PlaylistRef }) => (
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => openPlaylist(item)}
                  >
                    <CoverImage cover={item.cover} id={item.id} />
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { paddingBottom: 120 },
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
    marginTop: 24,
    marginBottom: 12,
  },
  row: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  card: { width: 140 },
  coverWrap: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#282828' },
  cover: { width: 140, height: 140 },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 17,
  },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#535353', fontSize: 14 },
});
