import { getHomeFeed, getPlaylistCover, type FeedCategory, type PlaylistRef } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
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

function CoverImage({ cover, id }: { cover?: string; id: string }) {
  const [resolvedCover, setResolvedCover] = useState(cover ?? '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cover) {
      getPlaylistCover(id).then((url) => { if (url) setResolvedCover(url); }).catch(() => {});
    }
  }, [cover, id]);

  return (
    <View style={styles.coverWrap}>
      {resolvedCover && !failed ? (
        <Image
          source={{ uri: resolvedCover }}
          style={styles.cover}
          contentFit="cover"
          recyclingKey={id}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="musical-notes" size={36} color="#535353" />
        </View>
      )}
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<FeedCategory[]>([]);
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
});
