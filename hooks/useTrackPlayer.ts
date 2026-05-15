import { useCallback, useEffect, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { PLAYLIST, type Track } from '../data/trackData';
import { getStreamUrl, type SpotifyTrack } from '../services/api';

export function useTrackPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track>(PLAYLIST[0]);
  const [isPlaylistMode, setIsPlaylistMode] = useState(true);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

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

  const playSpotifyTrack = useCallback((spotifyTrack: SpotifyTrack) => {
    setIsPlaylistMode(false);
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
  }, [player]);

  // Clear loading once the player has buffered enough to start
  useEffect(() => {
    if (isLoadingTrack && !status.isBuffering && status.duration > 0) {
      setIsLoadingTrack(false);
    }
  }, [isLoadingTrack, status.isBuffering, status.duration]);

  useEffect(() => {
    if (status.didJustFinish && isPlaylistMode) {
      goToTrack((currentIndex + 1) % PLAYLIST.length);
    }
  }, [status.didJustFinish, currentIndex, isPlaylistMode, goToTrack]);

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

  return {
    player,
    status,
    currentTrack,
    isLoadingTrack: isLoadingTrack || status.isBuffering,
    handlePlayPause,
    formatTime,
    goToTrack,
    playSpotifyTrack,
    goToNext: () => { if (isPlaylistMode) goToTrack((currentIndex + 1) % PLAYLIST.length); },
    goToPrev: () => { if (isPlaylistMode) goToTrack((currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length); },
  };
}
