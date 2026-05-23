import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { PLAYLIST } from '@/data/trackData';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { goToTrack, currentTrack } = useTrackPlayerContext();
  const isWide = width >= 768;

  const handleTrackPress = (index: number) => {
    goToTrack(index);
    router.push('/player');
  };

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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        >
          <View style={[styles.grid, isWide && styles.gridWide]}>
            {PLAYLIST.map((track, index) => (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.gridItem,
                  isWide && styles.gridItemWide,
                  currentTrack?.id === track.id && styles.gridItemActive,
                ]}
                onPress={() => handleTrackPress(index)}
              >
                <Image source={track.artwork} style={styles.gridArtwork} />
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {track.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
            All Tracks
          </Text>
          {PLAYLIST.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.trackRow,
                currentTrack?.id === track.id && styles.trackRowActive,
              ]}
              onPress={() => handleTrackPress(index)}
            >
              <Image source={track.artwork} style={[styles.trackArtwork, isWide && styles.trackArtworkWide]} />
              <View style={styles.trackInfo}>
                <Text
                  style={[
                    styles.trackTitle,
                    isWide && styles.trackTitleWide,
                    currentTrack?.id === track.id && styles.trackTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  {track.title}
                </Text>
                <Text style={[styles.trackArtist, isWide && styles.trackArtistWide]}>
                  {track.artist}
                </Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={isWide ? 18 : 20} color="#b3b3b3" />
            </TouchableOpacity>
          ))}
        </ScrollView>

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
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 4,
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
});
