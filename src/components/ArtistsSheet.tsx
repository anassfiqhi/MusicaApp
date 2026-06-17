import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { searchArtists } from '../services/api';

interface Props {
  visible: boolean;
  artists: string[];
  onClose: () => void;
  onSelectArtist: (artistName: string, artistId?: string) => void;
  trackId?: string;
}

interface ArtistData {
  name: string;
  image?: string;
  id?: string;
  loading?: boolean;
}

const artistCache = new Map<string, ArtistData>();

export default function ArtistsSheet({
  visible,
  artists,
  onClose,
  onSelectArtist,
  trackId,
}: Props) {
  const [artistsData, setArtistsData] = useState<ArtistData[]>([]);

  useEffect(() => {
    if (!visible) {
      setArtistsData([]);
      return;
    }

    if (artists.length === 0) return;

    // Show artists immediately without waiting for images
    setArtistsData(artists.map(name => ({ name, loading: true })));

    // Fetch images in background with caching
    const fetchArtistImages = async () => {
      const data: ArtistData[] = await Promise.all(
        artists.map(async (artistName) => {
          // Check cache first
          if (artistCache.has(artistName)) {
            return artistCache.get(artistName)!;
          }

          try {
            const results = await searchArtists(artistName, 1);
            const artistData: ArtistData = {
              name: artistName,
              image: results[0]?.images,
              id: results[0]?.id,
              loading: false,
            };
            artistCache.set(artistName, artistData);
            return artistData;
          } catch {
            const artistData: ArtistData = { name: artistName, loading: false };
            artistCache.set(artistName, artistData);
            return artistData;
          }
        })
      );
      setArtistsData(data);
    };

    fetchArtistImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, artists.join(','), trackId]);

  const isScrollable = artistsData.length > 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, isScrollable && styles.sheetScrollable]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Artists</Text>
        </View>

        <View style={styles.divider} />

        {artistsData.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
          </View>
        ) : (
          <FlatList
            data={artistsData}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.artistItem}
                onPress={() => {
                  onSelectArtist(item.name, item.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.artistImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : item.loading ? (
                  <View style={styles.artistImagePlaceholder}>
                    <ActivityIndicator size="small" color="#1DB954" />
                  </View>
                ) : (
                  <View style={styles.artistImagePlaceholder}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                )}
                <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
            scrollEnabled={artistsData.length > 3}
            contentContainerStyle={styles.listContent}
            scrollEventThrottle={16}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 40,
  },
  sheetScrollable: {
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#535353',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#3E3E3E',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {},
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 18,
  },
  artistImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
  },
  artistImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
