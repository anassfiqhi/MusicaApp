import React from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '../components/Header';
import AlbumArt from '../components/AlbumArt';
import TrackDetails from '../components/TrackDetails';
import PlayerControls from '../components/PlayerControls';
import LyricsView from '../components/LyricsView';
import { useTrackPlayerContext } from '../context/TrackPlayerContext';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { player, status, currentTrack, handlePlayPause, formatTime, goToNext, goToPrev } =
    useTrackPlayerContext();

  return (
    <LinearGradient colors={currentTrack.gradientColors} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Header onBack={() => router.back()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            width >= 768 && styles.scrollContentWide,
          ]}
        >
          <View style={[styles.inner, width >= 768 && styles.innerWide]}>
            <AlbumArt source={currentTrack.artwork} />
            <TrackDetails title={currentTrack.title} artist={currentTrack.artist} />
            <PlayerControls
              player={player}
              status={status}
              handlePlayPause={handlePlayPause}
              formatTime={formatTime}
              onPrev={goToPrev}
              onNext={goToNext}
            />
            <LyricsView currentTime={status.currentTime} lyrics={currentTrack.lyrics} />
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentWide: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
  innerWide: {
    maxWidth: 420,
    width: '100%',
  },
});
