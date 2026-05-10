import { useCallback, useEffect, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { PLAYLIST } from '../data/trackData';

function getLockScreenArtwork(audioSource: any): string | undefined {
  if (typeof audioSource === 'object' && audioSource?.uri?.startsWith('http')) {
    return audioSource.uri;
  }
  return undefined;
}

export function useTrackPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const player = useAudioPlayer(PLAYLIST[0].audioSource);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });

    const track = PLAYLIST[0];
    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: getLockScreenArtwork(track.audioSource),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToTrack = useCallback((index: number) => {
    const track = PLAYLIST[index];
    setCurrentIndex(index);
    player.replace(track.audioSource);
    player.play();
    if (player.setActiveForLockScreen) {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: getLockScreenArtwork(track.audioSource),
      });
    }
  }, [player]);

  useEffect(() => {
    if (status.didJustFinish) {
      goToTrack((currentIndex + 1) % PLAYLIST.length);
    }
  }, [status.didJustFinish, currentIndex, goToTrack]);

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
    currentTrack: PLAYLIST[currentIndex],
    handlePlayPause,
    formatTime,
    goToTrack,
    goToNext: () => goToTrack((currentIndex + 1) % PLAYLIST.length),
    goToPrev: () => goToTrack((currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length),
  };
}
