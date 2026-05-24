import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { type Track } from '../data/trackData';
import { getStreamUrl, getLyrics, prefetchTrack, type SpotifyTrack } from '../services/api';
import type { DownloadedTrack } from '../services/downloads';

export function useTrackPlayer() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Spotify queue — stored in refs to avoid stale closures in callbacks
  const spotifyQueueRef = useRef<SpotifyTrack[]>([]);
  const spotifyQueueIndexRef = useRef<number>(-1);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Core: load and play a single SpotifyTrack — shared by all Spotify play paths
  const playSpotifyTrackCore = useCallback((spotifyTrack: SpotifyTrack) => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);

    const url = getStreamUrl(spotifyTrack.id);
    console.log(`[stream] loading "${spotifyTrack.name}" — ${url}`);

    const track: Track = {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists,
      audioSource: { uri: url },
      artwork: { uri: spotifyTrack.images },
      gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
    };

    setCurrentTrack(track);
    player.replace({ uri: url });
    player.play();

    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: spotifyTrack.images,
      });
    }

    // If the server hasn't delivered audio after 3 minutes, surface an error
    streamTimeoutRef.current = setTimeout(() => {
      setIsLoadingTrack((loading) => {
        if (loading) {
          console.log(`[stream] timeout — "${spotifyTrack.name}" never started`);
          setTrackError(`Could not stream "${spotifyTrack.name}" — track may be unavailable`);
          return false;
        }
        return loading;
      });
    }, 3 * 60 * 1000);

    setIsLoadingLyrics(true);
    getLyrics(spotifyTrack.id, spotifyTrack.name, spotifyTrack.artists)
      .then((lines) => {
        setCurrentTrack((prev) =>
          prev?.id === spotifyTrack.id
            ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
            : prev
        );
      })
      .catch(() => {})
      .finally(() => setIsLoadingLyrics(false));
  }, [player]);

  // Play a downloaded track — uses local file, artwork, and cached lyrics directly.
  const playLocalTrack = useCallback((downloaded: DownloadedTrack) => {
    spotifyQueueRef.current = [];
    spotifyQueueIndexRef.current = -1;

    const artworkUri = downloaded.localArtworkPath ?? downloaded.artworkUrl;
    const track: Track = {
      id: downloaded.id,
      title: downloaded.title,
      artist: downloaded.artist,
      audioSource: { uri: downloaded.filePath },
      artwork: artworkUri ? { uri: artworkUri } : require('../assets/images/playlist/album_art.png'),
      gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
      lyrics: downloaded.lyrics,
    };

    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);
    setCurrentTrack(track);
    player.replace({ uri: downloaded.filePath });
    player.play();

    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: downloaded.title,
        artist: downloaded.artist,
        artworkUrl: artworkUri,
      });
    }
  }, [player]);

  // Play a single Spotify track (no queue)
  const playSpotifyTrack = useCallback((spotifyTrack: SpotifyTrack) => {
    spotifyQueueRef.current = [];
    spotifyQueueIndexRef.current = -1;
    playSpotifyTrackCore(spotifyTrack);
  }, [playSpotifyTrackCore]);

  // Play a Spotify playlist starting at startIndex
  const playSpotifyPlaylist = useCallback((tracks: SpotifyTrack[], startIndex: number) => {
    spotifyQueueRef.current = tracks;
    spotifyQueueIndexRef.current = startIndex;
    playSpotifyTrackCore(tracks[startIndex]);
    if (startIndex + 1 < tracks.length) {
      prefetchTrack(tracks[startIndex + 1].id);
    }
  }, [playSpotifyTrackCore]);

  const goToSpotifyNext = useCallback(() => {
    const queue = spotifyQueueRef.current;
    const next = spotifyQueueIndexRef.current + 1;
    if (next < queue.length) {
      spotifyQueueIndexRef.current = next;
      playSpotifyTrackCore(queue[next]);
      if (next + 1 < queue.length) prefetchTrack(queue[next + 1].id);
    }
  }, [playSpotifyTrackCore]);

  const goToSpotifyPrev = useCallback(() => {
    const queue = spotifyQueueRef.current;
    const prev = spotifyQueueIndexRef.current - 1;
    if (prev >= 0) {
      spotifyQueueIndexRef.current = prev;
      playSpotifyTrackCore(queue[prev]);
    }
  }, [playSpotifyTrackCore]);

  // Clear loading once the player has buffered enough to start
  useEffect(() => {
    if (isLoadingTrack && !status.isBuffering && status.duration > 0) {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = null;
      }
      console.log(`[stream] playing — duration ${status.duration.toFixed(1)}s`);
      setIsLoadingTrack(false);
    }
  }, [isLoadingTrack, status.isBuffering, status.duration]);

  // Auto-advance on track finish
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (spotifyQueueRef.current.length > 0) {
      goToSpotifyNext();
    }
  }, [status.didJustFinish, goToSpotifyNext]);

  const clearError = () => setTrackError(null);

  const dismiss = () => {
    player.pause();
    setHasStartedPlayback(false);
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const goToNext = useCallback(() => {
    if (spotifyQueueRef.current.length > 0) goToSpotifyNext();
  }, [goToSpotifyNext]);

  const goToPrev = useCallback(() => {
    if (spotifyQueueRef.current.length > 0) goToSpotifyPrev();
  }, [goToSpotifyPrev]);

  const hasNext = !currentTrack ? false
    : spotifyQueueRef.current.length > 0 && spotifyQueueIndexRef.current + 1 < spotifyQueueRef.current.length;
  const hasPrev = !currentTrack ? false
    : spotifyQueueRef.current.length > 0 && spotifyQueueIndexRef.current > 0;

  return {
    player,
    status,
    currentTrack,
    hasStartedPlayback,
    isLoadingTrack: isLoadingTrack || status.isBuffering,
    isLoadingLyrics,
    trackError,
    clearError,
    dismiss,
    handlePlayPause,
    formatTime,
    playSpotifyTrack,
    playSpotifyPlaylist,
    playLocalTrack,
    goToNext,
    goToPrev,
    hasNext,
    hasPrev,
  };
}
