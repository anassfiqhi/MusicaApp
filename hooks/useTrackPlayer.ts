import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { PLAYLIST, type Track } from '../data/trackData';
import { getStreamUrl, getLyrics, prefetchTrack, type SpotifyTrack } from '../services/api';

export function useTrackPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track>(PLAYLIST[0]);
  const [isPlaylistMode, setIsPlaylistMode] = useState(true);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  // Spotify queue — stored in refs to avoid stale closures in callbacks
  const spotifyQueueRef = useRef<SpotifyTrack[]>([]);
  const spotifyQueueIndexRef = useRef<number>(-1);

  const player = useAudioPlayer(PLAYLIST[0].audioSource);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToTrack = useCallback((index: number) => {
    const track = PLAYLIST[index];
    setCurrentIndex(index);
    setCurrentTrack(track);
    setIsPlaylistMode(true);
    setHasStartedPlayback(true);
    player.replace(track.audioSource);
    player.play();
    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: undefined,
      });
    }
  }, [player]);

  // Core: load and play a single SpotifyTrack — shared by all Spotify play paths
  const playSpotifyTrackCore = useCallback((spotifyTrack: SpotifyTrack) => {
    setHasStartedPlayback(true);
    setIsLoadingTrack(true);

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
          prev.id === spotifyTrack.id
            ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
            : prev
        );
      })
      .catch(() => {})
      .finally(() => setIsLoadingLyrics(false));
  }, [player]);

  // Play a single Spotify track (no queue)
  const playSpotifyTrack = useCallback((spotifyTrack: SpotifyTrack) => {
    setIsPlaylistMode(false);
    spotifyQueueRef.current = [];
    spotifyQueueIndexRef.current = -1;
    playSpotifyTrackCore(spotifyTrack);
  }, [playSpotifyTrackCore]);

  // Play a Spotify playlist starting at startIndex
  const playSpotifyPlaylist = useCallback((tracks: SpotifyTrack[], startIndex: number) => {
    setIsPlaylistMode(false);
    spotifyQueueRef.current = tracks;
    spotifyQueueIndexRef.current = startIndex;
    playSpotifyTrackCore(tracks[startIndex]);
    // Prefetch the next track
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
    if (isPlaylistMode) {
      goToTrack((currentIndex + 1) % PLAYLIST.length);
    } else if (spotifyQueueRef.current.length > 0) {
      goToSpotifyNext();
    }
  }, [status.didJustFinish, isPlaylistMode, currentIndex, goToTrack, goToSpotifyNext]);

  const handlePlayPause = () => {
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
    if (isPlaylistMode) {
      goToTrack((currentIndex + 1) % PLAYLIST.length);
    } else if (spotifyQueueRef.current.length > 0) {
      goToSpotifyNext();
    }
  }, [isPlaylistMode, currentIndex, goToTrack, goToSpotifyNext]);

  const goToPrev = useCallback(() => {
    if (isPlaylistMode) {
      goToTrack((currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length);
    } else if (spotifyQueueRef.current.length > 0) {
      goToSpotifyPrev();
    }
  }, [isPlaylistMode, currentIndex, goToTrack, goToSpotifyPrev]);

  return {
    player,
    status,
    currentTrack,
    hasStartedPlayback,
    isLoadingTrack: isLoadingTrack || status.isBuffering,
    isLoadingLyrics,
    handlePlayPause,
    formatTime,
    goToTrack,
    playSpotifyTrack,
    playSpotifyPlaylist,
    goToNext,
    goToPrev,
  };
}
