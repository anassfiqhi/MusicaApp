import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import type { DownloadedTrack } from '@/services/downloads';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const PLACEHOLDER = require('@/assets/images/playlist/album_art.png');

function artwork(d: DownloadedTrack) {
  return d.artworkUrl ? { uri: d.artworkUrl } : PLACEHOLDER;
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { playLocalTrack, currentTrack } = useTrackPlayerContext();
  const { downloads, remove } = useDownloads();
  const isWide = width >= 768;

  const handlePlay = (d: DownloadedTrack) => {
    playLocalTrack(d);
    router.push('/player');
  };

  const gridTracks = downloads.slice(0, 6);

  return (
    <LinearGradient colors={['#1a1a2e', '#12122a', '#000000']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>

        <View style={styles.topBar}>
          <Text style={[styles.greeting, isWide && styles.greetingWide]}>
            {getGreeting()}
          </Text>
          <View style={styles.avatar}>
            <Ionicons name="person" size={isWide ? 16 : 18} color="white" />
          </View>
        </View>

        {downloads.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={64} color="#535353" />
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptySubtitle}>
              Download tracks from Search or Discover to build your library
            </Text>
            <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.discoverBtnText}>Browse Discover</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          >
            {/* Quick-access grid */}
            <View style={[styles.grid, isWide && styles.gridWide]}>
              {gridTracks.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.gridItem,
                    isWide && styles.gridItemWide,
                    currentTrack?.id === d.id && styles.gridItemActive,
                  ]}
                  onPress={() => handlePlay(d)}
                >
                  <Image source={artwork(d)} style={styles.gridArtwork} contentFit="cover" recyclingKey={d.id} />
                  <Text style={styles.gridTitle} numberOfLines={1}>{d.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
              Downloads
            </Text>

            {downloads.map((d) => (
              <View
                key={d.id}
                style={[styles.trackRow, currentTrack?.id === d.id && styles.trackRowActive]}
              >
                <TouchableOpacity
                  style={styles.trackPressable}
                  onPress={() => handlePlay(d)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={artwork(d)}
                    style={[styles.trackArtwork, isWide && styles.trackArtworkWide]}
                    contentFit="cover"
                    recyclingKey={d.id}
                  />
                  <View style={styles.trackInfo}>
                    <Text
                      style={[
                        styles.trackTitle,
                        isWide && styles.trackTitleWide,
                        currentTrack?.id === d.id && styles.trackTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                    <Text style={[styles.trackArtist, isWide && styles.trackArtistWide]}>
                      {d.artist}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(d.id)}
                  style={styles.removeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="checkmark-circle" size={isWide ? 18 : 20} color="#1DB954" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  greeting: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  greetingWide: { fontSize: 18 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  discoverBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1DB954',
  },
  discoverBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  scrollContent: {},
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  gridWide: { gap: 10, marginBottom: 24 },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    overflow: 'hidden',
    width: '48.5%',
    height: 56,
  },
  gridItemWide: { height: 48 },
  gridItemActive: { backgroundColor: 'rgba(29,185,84,0.25)' },
  gridArtwork: { width: 56, height: 56 },
  gridTitle: { color: 'white', fontSize: 13, fontWeight: '600', flex: 1, paddingHorizontal: 10 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  sectionTitleWide: { fontSize: 16, marginBottom: 12 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  trackPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  trackRowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  trackArtwork: { width: 52, height: 52, borderRadius: 4 },
  trackArtworkWide: { width: 42, height: 42 },
  trackInfo: { flex: 1, paddingHorizontal: 12 },
  trackTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
  trackTitleWide: { fontSize: 13 },
  trackTitleActive: { color: '#1DB954' },
  trackArtist: { color: '#b3b3b3', fontSize: 13, marginTop: 2 },
  trackArtistWide: { fontSize: 11 },
  removeBtn: { padding: 4, alignItems: 'center', justifyContent: 'center', minWidth: 28 },
});
