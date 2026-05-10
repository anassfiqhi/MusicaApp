import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrackPlayerContext } from '../context/TrackPlayerContext';

export default function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentTrack, status, handlePlayPause, goToNext } = useTrackPlayerContext();
  const isWide = width >= 768;

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
      <TouchableOpacity
        style={[styles.container, isWide && styles.containerWide]}
        onPress={() => router.push('/player')}
        activeOpacity={0.95}
      >
        <View style={styles.row}>
          <Image source={currentTrack.artwork} style={[styles.artwork, isWide && styles.artworkWide]} />

          <View style={styles.info}>
            <Text style={[styles.title, isWide && styles.titleWide]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[styles.artist, isWide && styles.artistWide]} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); handlePlayPause(); }}
            style={styles.iconBtn}
          >
            <Ionicons
              name={status.playing ? 'pause' : 'play'}
              size={isWide ? 22 : 26}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); goToNext(); }}
            style={styles.iconBtn}
          >
            <Ionicons name="play-skip-forward" size={isWide ? 20 : 24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 8,
    paddingTop: 4,
    marginBottom: 5,
  },
  container: {
    backgroundColor: '#282828',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  containerWide: {},
  progressTrack: {
    marginHorizontal: 10,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#1DB954',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    gap: 4,
  },
  artwork: {
    width: 46,
    height: 46,
    borderRadius: 4,
  },
  artworkWide: {
    width: 38,
    height: 38,
  },
  info: {
    flex: 1,
    paddingHorizontal: 10,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  titleWide: {
    fontSize: 12,
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
  },
  artistWide: {
    fontSize: 11,
  },
  iconBtn: {
    padding: 8,
  },
});
