import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDownloads } from '@/context/DownloadsContext';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { formatBytes } from '@/services/downloads';
import type { DownloadedTrack } from '@/services/downloads';
import type { SpotifyTrack } from '@/services/api';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';

function getArtwork(d: DownloadedTrack) {
  return d.artworkUrl ? { uri: d.artworkUrl } : require('@/assets/images/playlist/album_art.png');
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { downloads, remove } = useDownloads();
  const { playLocalTrack, currentTrack } = useTrackPlayerContext();
  const isWide = width >= 768;
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);

  const toSpotifyTrack = (d: DownloadedTrack): SpotifyTrack => ({
    id: d.id,
    name: d.title,
    artists: d.artist,
    album_name: '',
    images: d.artworkUrl ?? '',
    duration_ms: 0,
  });

  const handlePlay = (d: DownloadedTrack) => {
    playLocalTrack(d);
    router.push('/player');
  };

  const handleDelete = (d: DownloadedTrack) => {
    Alert.alert('Remove download', `Remove "${d.title}" from downloads?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(d.id) },
    ]);
  };

  const totalSize = downloads.reduce((sum, d) => sum + d.fileSizeBytes, 0);

  return (
    <LinearGradient colors={['#0d1117', '#0a0a0f', '#000000']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.heading, isWide && styles.headingWide]}>Downloads</Text>
          {downloads.length > 0 && (
            <Text style={styles.subheading}>
              {downloads.length} track{downloads.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
            </Text>
          )}
        </View>

        {downloads.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="arrow-down-circle-outline" size={64} color="#535353" />
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the download icon on any track to save it for offline playback
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            {downloads.map((d) => {
              const isActive = currentTrack?.id === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => handlePlay(d)}
                  activeOpacity={0.7}
                >
                  <View style={styles.indicator}>
                    {isActive && <Ionicons name="musical-note" size={14} color="#1DB954" />}
                  </View>
                  <Image
                    source={getArtwork(d)}
                    style={[styles.artwork, isWide && styles.artworkWide]}
                    contentFit="cover"
                    recyclingKey={d.id}
                  />
                  <View style={styles.info}>
                    <Text
                      style={[styles.title, isWide && styles.titleWide, isActive && styles.titleActive]}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                    <Text style={[styles.artist, isWide && styles.artistWide]} numberOfLines={1}>
                      {d.artist}
                    </Text>
                    <Text style={styles.meta}>
                      {formatBytes(d.fileSizeBytes)} · {formatDate(d.downloadedAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setOptionsTrack(toSpotifyTrack(d))}
                    style={styles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={isWide ? 18 : 20} color="#9B9B9B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(d)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={isWide ? 18 : 20} color="#535353" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <TrackOptionsSheet
        visible={optionsTrack !== null}
        track={optionsTrack}
        onClose={() => setOptionsTrack(null)}
        onAddToPlaylist={() => setAddTrack(optionsTrack)}
        extraOptions={[{
          icon: 'trash-outline',
          label: 'Remove download',
          destructive: true,
          onPress: () => optionsTrack && remove(optionsTrack.id),
        }]}
      />
      <AddToPlaylistModal
        visible={addTrack !== null}
        track={addTrack}
        onClose={() => setAddTrack(null)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  header: { marginTop: 16, marginBottom: 24 },
  heading: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  headingWide: { fontSize: 22 },
  subheading: { color: '#9B9B9B', fontSize: 13, marginTop: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: '#9B9B9B', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 12,
  },
  rowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  indicator: { width: 16, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#282828' },
  artworkWide: { width: 44, height: 44 },
  info: { flex: 1, gap: 2 },
  title: { color: 'white', fontSize: 15, fontWeight: '600' },
  titleWide: { fontSize: 13 },
  titleActive: { color: '#1DB954' },
  artist: { color: '#9B9B9B', fontSize: 13 },
  artistWide: { fontSize: 11 },
  meta: { color: '#535353', fontSize: 11, marginTop: 2 },
  actionBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
});
