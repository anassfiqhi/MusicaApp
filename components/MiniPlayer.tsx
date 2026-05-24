import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTrackPlayerContext } from '../context/TrackPlayerContext';

export default function MiniPlayer() {
  const { width } = useWindowDimensions();
  const {
    currentTrack,
    status,
    handlePlayPause,
    goToNext,
    goToPrev,
    hasStartedPlayback,
    hasNext,
    hasPrev,
    isLoadingTrack,
    dismiss,
  } = useTrackPlayerContext();
  const isWide = width >= 768;

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const openPlayer = () => router.push('/player');

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY * 0.4;
        opacity.value = Math.max(0, 1 - e.translationY / 120);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 60 || e.velocityY > 600) {
        opacity.value = withTiming(0, { duration: 120 }, (finished) => {
          if (finished) runOnJS(dismiss)();
        });
      } else if (e.translationY < -40 || e.velocityY < -600) {
        runOnJS(openPlayer)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
        opacity.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!hasStartedPlayback || !currentTrack) return null;

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
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
              onPress={(e) => { e.stopPropagation(); goToPrev(); }}
              style={styles.iconBtn}
              disabled={!hasPrev}
            >
              <Ionicons name="play-skip-back" size={isWide ? 20 : 24} color={hasPrev ? 'white' : '#535353'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handlePlayPause(); }}
              style={[styles.iconBtn, isWide ? styles.playBtnWide : styles.playBtn]}
              disabled={isLoadingTrack}
            >
              {isLoadingTrack
                ? <ActivityIndicator color="white" size={isWide ? 18 : 22} />
                : <Ionicons name={status.playing ? 'pause' : 'play'} size={isWide ? 22 : 26} color="white" />
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); goToNext(); }}
              style={styles.iconBtn}
              disabled={!hasNext}
            >
              <Ionicons name="play-skip-forward" size={isWide ? 20 : 24} color={hasNext ? 'white' : '#535353'} />
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 42,
    height: 42,
  },
  playBtnWide: {
    width: 38,
    height: 38,
  },
});
