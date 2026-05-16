import { FEED_CATEGORIES, getHomeFeed, type FeedCategory, type PlaylistRef } from '@/services/api';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<FeedCategory[]>(FEED_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeFeed()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openPlaylist = (playlist: PlaylistRef) => {
    router.push({ pathname: '/playlist/[id]', params: { id: playlist.id, title: playlist.title } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Discover</Text>

        {loading ? (
          <ActivityIndicator color="#1DB954" style={{ marginTop: 40 }} />
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
                    <View style={styles.coverWrap}>
                      {item.cover
                        ? <Image source={{ uri: item.cover }} style={styles.cover} contentFit="cover" recyclingKey={item.id} />
                        : <View style={styles.cover} />
                      }
                    </View>
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
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 17,
  },
});
