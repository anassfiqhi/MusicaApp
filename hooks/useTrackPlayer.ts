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
  const playSpotifyTrackCore = useCallback(async (spotifyTrack: SpotifyTrack) => {
    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);

    const url = getStreamUrl(spotifyTrack.id);
    const track: Track = {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists,
      audioSource: { uri: url },
      artwork: { uri: spotifyTrack.images },
      gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
    };

    setCurrentTrack(track);

    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) {
        const body = await fetch(url).then((r) => r.json()).catch(() => ({}));
        setTrackError(body?.error ?? `Track unavailable (HTTP ${res.status})`);
        setIsLoadingTrack(false);
        return;
      }
    } catch {
      setTrackError('Network error — could not reach server');
      setIsLoadingTrack(false);
      return;
    }

    player.replace({ uri: url });
    player.play();

    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: spotifyTrack.images,
      });
    }

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

  // Play a downloaded track — server-cached tracks use the Spotify play path for
  // loading state and lyrics; truly local file:// tracks play directly.
  const playLocalTrack = useCallback((downloaded: DownloadedTrack) => {
    spotifyQueueRef.current = [];
    spotifyQueueIndexRef.current = -1;

    if (downloaded.filePath.startsWith('http')) {
      playSpotifyTrackCore({
        id: downloaded.id,
        name: downloaded.title,
        artists: downloaded.artist,
        images: downloaded.artworkUrl ?? '',
        album_name: '',
        duration_ms: 0,
      });
      return;
    }

    const track: Track = {
      id: downloaded.id,
      title: downloaded.title,
      artist: downloaded.artist,
      audioSource: { uri: downloaded.filePath },
      artwork: downloaded.artworkUrl ? { uri: downloaded.artworkUrl } : require('../assets/images/playlist/album_art.png'),
      gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
    };
    setHasStartedPlayback(true);
    setCurrentTrack(track);
    setTrackError(null);
    player.replace({ uri: downloaded.filePath });
    player.play();
    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: downloaded.title,
        artist: downloaded.artist,
        artworkUrl: downloaded.artworkUrl,
      });
    }
  }, [player, playSpotifyTrackCore]);

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
