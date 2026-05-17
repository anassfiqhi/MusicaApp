import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import Header from '../components/Header';
import AlbumArt from '../components/AlbumArt';
import TrackDetails from '../components/TrackDetails';
import PlayerControls from '../components/PlayerControls';
import LyricsView from '../components/LyricsView';
import { useTrackPlayerContext } from '../context/TrackPlayerContext';
import { getRecommendations, prefetchTrack, type SpotifyTrack } from '../services/api';

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isSpotifyTrack(audioSourceUri?: string): boolean {
  return typeof audioSourceUri === 'string' && audioSourceUri.includes('/stream-audio/');
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    player,
    status,
    currentTrack,
    isLoadingTrack,
    isLoadingLyrics,
    handlePlayPause,
    formatTime,
    goToNext,
    goToPrev,
    playSpotifyPlaylist,
  } = useTrackPlayerContext();

  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const lastFetchedId = useRef<string>('');

  const audioUri = (currentTrack.audioSource as any)?.uri as string | undefined;
  const spotifyMode = isSpotifyTrack(audioUri);

  useEffect(() => {
    if (!spotifyMode || !currentTrack.id || currentTrack.id === lastFetchedId.current) return;
    lastFetchedId.current = currentTrack.id;
    setRecommendations([]);
    setLoadingRecs(true);
    getRecommendations(currentTrack.id, 20)
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [currentTrack.id, spotifyMode]);

  const handlePlayRec = (track: SpotifyTrack, index: number) => {
    playSpotifyPlaylist(recommendations, index);
  };

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
              isLoading={isLoadingTrack}
            />
            <LyricsView currentTime={status.currentTime} lyrics={currentTrack.lyrics} isLoading={isLoadingLyrics} />

            {/* Similar tracks */}
            {spotifyMode && (loadingRecs || recommendations.length > 0) && (
              <View style={styles.recsSection}>
                <Text style={styles.recsTitle}>Similar Tracks</Text>
                {loadingRecs ? (
                  <ActivityIndicator color="#1DB954" style={{ marginTop: 16 }} />
                ) : (
                  recommendations.map((track, index) => (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.recRow}
                      activeOpacity={0.7}
                      onPressIn={() => prefetchTrack(track.id)}
                      onPress={() => handlePlayRec(track, index)}
                    >
                      <Image
                        source={{ uri: track.images }}
                        style={styles.recArt}
                        contentFit="cover"
                        recyclingKey={track.id}
                      />
                      <View style={styles.recInfo}>
                        <Text style={styles.recName} numberOfLines={1}>{track.name}</Text>
                        <Text style={styles.recArtist} numberOfLines={1}>{track.artists}</Text>
                      </View>
                      <Text style={styles.recDuration}>{formatDuration(track.duration_ms)}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
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
  recsSection: {
    marginTop: 32,
  },
  recsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  recArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  recInfo: {
    flex: 1,
    gap: 3,
  },
  recName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  recArtist: {
    color: '#9B9B9B',
    fontSize: 12,
  },
  recDuration: {
    color: '#9B9B9B',
    fontSize: 12,
  },
});
