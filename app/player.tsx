import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Share,
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
import { useDownloads } from '../context/DownloadsContext';
import { getRecommendations, getStreamUrl, searchArtists, searchAlbums, prefetchTrack, type SpotifyTrack } from '../services/api';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Ionicons } from '@expo/vector-icons';

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
    trackError,
    clearError,
    handlePlayPause,
    formatTime,
    goToNext,
    goToPrev,
    hasNext,
    hasPrev,
    playSpotifyPlaylist,
  } = useTrackPlayerContext();

  const { download, isDownloaded, isDownloading, getProgress } = useDownloads();
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const lastFetchedId = useRef<string>('');

  const audioUri = (currentTrack?.audioSource as any)?.uri as string | undefined;
  const spotifyMode = isSpotifyTrack(audioUri);

  useEffect(() => {
    if (!currentTrack) {
      router.back();
      return;
    }
    if (!spotifyMode || !currentTrack.id || currentTrack.id === lastFetchedId.current) return;
    lastFetchedId.current = currentTrack.id;
    setRecommendations([]);
    setLoadingRecs(true);
    getRecommendations(currentTrack.id, 20)
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [currentTrack, spotifyMode]);

  const handlePlayRec = (_track: SpotifyTrack, index: number) => {
    playSpotifyPlaylist(recommendations, index);
  };

  if (!currentTrack) return null;

  const trackId = currentTrack.id ?? '';
  const downloaded = isDownloaded(trackId);
  const downloading = isDownloading(trackId);
  const dlProgress = getProgress(trackId);

  const handleDownload = () => {
    if (!spotifyMode || downloaded || downloading) return;
    download({
      id: trackId,
      title: currentTrack.title,
      artist: currentTrack.artist,
      artworkUrl: typeof currentTrack.artwork === 'object' && 'uri' in (currentTrack.artwork as object)
        ? (currentTrack.artwork as { uri: string }).uri
        : undefined,
      audioUrl: getStreamUrl(trackId),
    });
  };

  const currentAsSpotify: SpotifyTrack = {
    id: trackId,
    name: currentTrack.title,
    artists: currentTrack.artist,
    album_name: '',
    images: typeof currentTrack.artwork === 'object' && 'uri' in (currentTrack.artwork as object)
      ? (currentTrack.artwork as { uri: string }).uri : '',
    duration_ms: Math.round((status.duration ?? 0) * 1000),
  };

  const handleGoToArtist = async () => {
    setOptionsOpen(false);
    try {
      const results = await searchArtists(currentTrack.artist, 1);
      if (results[0]) router.push(`/artist/${results[0].id}` as `/${string}`);
    } catch {}
  };

  const handleGoToAlbum = async () => {
    setOptionsOpen(false);
    try {
      const albumQuery = (currentTrack as any).album_name || currentTrack.title;
      const results = await searchAlbums(`${albumQuery} ${currentTrack.artist}`, 1);
      if (results[0]) router.push(`/album/${results[0].id}` as `/${string}`);
    } catch {}
  };

  const handleShare = () => {
    setOptionsOpen(false);
    Share.share({ message: `${currentTrack.title} by ${currentTrack.artist}` });
  };

  return (
    <LinearGradient colors={currentTrack.gradientColors} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Header onBack={() => router.back()} onMore={() => setOptionsOpen(true)} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            width >= 768 && styles.scrollContentWide,
          ]}
        >
          <View style={[styles.inner, width >= 768 && styles.innerWide]}>
            <AlbumArt source={currentTrack.artwork} />
            <TrackDetails
              title={currentTrack.title}
              artist={currentTrack.artist}
              onDownload={spotifyMode || downloaded ? handleDownload : undefined}
              downloaded={downloaded}
              downloading={downloading}
              dlProgress={dlProgress}
              onAddToPlaylist={() => setAddTrack(currentAsSpotify)}
            />

            <PlayerControls
              player={player}
              status={status}
              handlePlayPause={handlePlayPause}
              formatTime={formatTime}
              onPrev={goToPrev}
              onNext={goToNext}
              isLoading={isLoadingTrack}
              hasPrev={hasPrev}
              hasNext={hasNext}
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

      <AddToPlaylistModal
        visible={addTrack !== null}
        track={addTrack}
        onClose={() => setAddTrack(null)}
      />

      {/* ── Track options sheet ── */}
      <Modal
        visible={optionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsOpen(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setOptionsOpen(false)}
        >
          <View style={styles.optionsSheet}>
            {/* Track info */}
            <View style={styles.optionsTrackRow}>
              <Image
                source={currentTrack.artwork}
                style={styles.optionsArt}
                contentFit="cover"
              />
              <View style={styles.optionsTrackInfo}>
                <Text style={styles.optionsTrackName} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.optionsTrackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
            </View>
            <View style={styles.optionsDivider} />

            {[
              { icon: 'add-circle-outline', label: 'Add to playlist', onPress: () => { setOptionsOpen(false); setAddTrack(currentAsSpotify); } },
              { icon: 'person-outline',     label: 'Go to artist',    onPress: handleGoToArtist },
              { icon: 'disc-outline',       label: 'Go to album',     onPress: handleGoToAlbum },
              { icon: 'share-outline',      label: 'Share',           onPress: handleShare },
            ].map(({ icon, label, onPress }) => (
              <TouchableOpacity key={label} style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
                <Ionicons name={icon as any} size={22} color="#fff" />
                <Text style={styles.optionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!trackError}
        transparent
        animationType="fade"
        onRequestClose={clearError}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Playback Error</Text>
            <Text style={styles.modalMessage}>{trackError}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={clearError} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  optionsTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  optionsArt: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  optionsTrackInfo: { flex: 1 },
  optionsTrackName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  optionsTrackArtist: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },
  optionsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, marginBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  optionLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '700',
  },
  modalMessage: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 8,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
