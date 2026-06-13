import TrackPlayer, { Event, PlaybackState, PlayerCommand, usePlaybackState, useProgress } from '@rntp/player';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Track } from '../data/trackData';
import { getLyrics, getStreamUrl, prefetchTrack, type SpotifyTrack } from '../services/api';
import type { DownloadedTrack } from '../services/downloads';

// Initialize TrackPlayer
function initializePlayer() {
  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
    autoUpdateMetadataFromStream: true,
    audioMixing: 'exclusive',
  });

  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Seek,
    ],
    handling: 'hybrid',
  });

  TrackPlayer.setVolume(1);
}

export function useTrackPlayer(
  getDownloaded?: (id: string) => DownloadedTrack | undefined
) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Track metadata for display (library handles actual queue)
  const trackMetadataRef = useRef<Map<string, Track>>(new Map());
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playbackState = usePlaybackState();
  const progress = useProgress();

  // Initialize player on mount and set initial queue state
  useEffect(() => {
    try {
      initializePlayer();
      const queue = TrackPlayer.getQueue();
      setQueueLength(queue.length);
      const index = TrackPlayer.getActiveMediaItemIndex();
      if (index !== null) {
        setCurrentIndex(index);
      }
    } catch (error) {
      console.log('[player] initialization error:', error);
    }
  }, []);

  // Update queue and track info when media item transitions
  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(
      Event.MediaItemTransition,
      (event) => {
        console.log('[MediaItemTransition] Track changed:', event.item?.title, 'Index:', event.index);

        const queue = TrackPlayer.getQueue();
        setQueueLength(queue.length);
        setCurrentIndex(event.index);

        if (!event.item) {
          console.log('[MediaItemTransition] No item in event');
          return;
        }

        // Try to get from metadata first
        const mediaId = event.item.mediaId as string;
        if (mediaId && trackMetadataRef.current.has(mediaId)) {
          console.log('[MediaItemTransition] Found in metadata:', mediaId);
          const track = trackMetadataRef.current.get(mediaId) as Track | undefined;
          if (track) {
            setCurrentTrack(track);
            console.log('[MediaItemTransition] Updated from metadata:', track.title);

            // If it's a streaming track without lyrics, fetch them
            if (!track.lyrics && track.audioSource?.uri?.includes('/stream-audio/')) {
              setIsLoadingLyrics(true);
              const trackId = track.id;
              getLyrics(trackId, track.title, track.artist)
                .then((lines) => {
                  setCurrentTrack((prev) =>
                    prev?.id === trackId
                      ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
                      : prev
                  );
                })
                .catch(() => { })
                .finally(() => setIsLoadingLyrics(false));
            }
            return;
          }
        }

        // Fallback: construct track from MediaItem
        console.log('[MediaItemTransition] Constructing from event.item');
        const artworkUri = event.item.artworkUrl
          ? { uri: event.item.artworkUrl.toString() }
          : require('@/assets/images/playlist/album_art.png');

        const constructedTrack: Track = {
          id: mediaId || event.item.url.toString(),
          title: event.item.title || 'Unknown',
          artist: event.item.artist || 'Unknown',
          audioSource: { uri: event.item.url.toString() },
          artwork: artworkUri,
          gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
        };

        setCurrentTrack(constructedTrack);
        console.log('[MediaItemTransition] Updated from event:', constructedTrack.title);

        // Try to fetch lyrics for Spotify tracks
        if (event.item.url.toString().includes('/stream-audio/')) {
          setIsLoadingLyrics(true);
          const trackId = constructedTrack.id;
          getLyrics(trackId, constructedTrack.title, constructedTrack.artist)
            .then((lines) => {
              setCurrentTrack((prev) =>
                prev?.id === trackId
                  ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
                  : prev
              );
            })
            .catch(() => { })
            .finally(() => setIsLoadingLyrics(false));
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Core: load and play a single SpotifyTrack — shared by all Spotify play paths
  const playSpotifyTrackCore = useCallback(async (spotifyTrack: SpotifyTrack) => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);

    try {
      // Use local file if downloaded — includes cached lyrics and artwork
      const downloaded = getDownloaded?.(spotifyTrack.id);
      if (downloaded) {
        const artworkUri = downloaded.localArtworkPath ?? downloaded.artworkUrl;
        const track: Track = {
          id: downloaded.id,
          title: downloaded.title,
          artist: downloaded.artist,
          audioSource: { uri: downloaded.filePath },
          artwork: artworkUri ? { uri: artworkUri } : require('@/assets/images/playlist/album_art.png'),
          gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
          lyrics: downloaded.lyrics,
        };

        setCurrentTrack(track);
        trackMetadataRef.current.set(downloaded.id, track);

        TrackPlayer.setMediaItem({
          url: downloaded.filePath,
          title: downloaded.title,
          artist: downloaded.artist,
          artworkUrl: artworkUri,
          mediaId: downloaded.id,
          duration: 0, // Duration will be detected from file
        });
        TrackPlayer.play();
        setIsLoadingTrack(false);
        setIsLoadingLyrics(false);
        return;
      }

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
      trackMetadataRef.current.set(spotifyTrack.id, track);

      TrackPlayer.setMediaItem({
        url,
        title: spotifyTrack.name,
        artist: spotifyTrack.artists,
        artworkUrl: spotifyTrack.images,
        duration: spotifyTrack.duration_ms ? spotifyTrack.duration_ms / 1000 : 0,
        mediaId: spotifyTrack.id,
      });
      TrackPlayer.play();

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

      setIsLoadingTrack(false);

      // Fetch lyrics
      setIsLoadingLyrics(true);
      getLyrics(spotifyTrack.id, spotifyTrack.name, spotifyTrack.artists)
        .then((lines) => {
          setCurrentTrack((prev) =>
            prev?.id === spotifyTrack.id
              ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
              : prev
          );
        })
        .catch(() => { })
        .finally(() => setIsLoadingLyrics(false));
    } catch (error) {
      console.error('[stream] error:', error);
      setTrackError(`Error loading track: ${error}`);
      setIsLoadingTrack(false);
    }
  }, [getDownloaded]);

  // Play a downloaded track — uses local file, artwork, and cached lyrics directly
  const playLocalTrack = useCallback(async (downloaded: DownloadedTrack) => {
    const artworkUri = downloaded.localArtworkPath ?? downloaded.artworkUrl;
    const track: Track = {
      id: downloaded.id,
      title: downloaded.title,
      artist: downloaded.artist,
      audioSource: { uri: downloaded.filePath },
      artwork: artworkUri ? { uri: artworkUri } : require('@/assets/images/playlist/album_art.png'),
      gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
      lyrics: downloaded.lyrics,
    };

    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);
    setCurrentTrack(track);
    trackMetadataRef.current.set(downloaded.id, track);

    try {
      TrackPlayer.setMediaItem({
        url: downloaded.filePath,
        title: downloaded.title,
        artist: downloaded.artist,
        artworkUrl: artworkUri,
        mediaId: downloaded.id,
        duration: 0, // Duration will be detected from file
      });
      TrackPlayer.play();
      setIsLoadingTrack(false);
    } catch (error) {
      console.error('[local] error:', error);
      setTrackError(`Error playing track: ${error}`);
      setIsLoadingTrack(false);
    }
  }, []);

  // Play downloaded tracks as a queue starting at startIndex
  const playLocalPlaylist = useCallback((tracks: DownloadedTrack[], startIndex: number) => {
    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);

    const mediaItems = tracks.map(d => {
      const artworkUri = d.localArtworkPath ?? d.artworkUrl;
      const track: Track = {
        id: d.id,
        title: d.title,
        artist: d.artist,
        audioSource: { uri: d.filePath },
        artwork: artworkUri ? { uri: artworkUri } : require('@/assets/images/playlist/album_art.png'),
        gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
        lyrics: d.lyrics,
      };
      trackMetadataRef.current.set(d.id, track);

      return {
        url: d.filePath,
        title: d.title,
        artist: d.artist,
        artworkUrl: artworkUri,
        mediaId: d.id,
        duration: 0, // Duration will be detected from file
      };
    });

    setQueueLength(mediaItems.length);
    setCurrentIndex(startIndex);

    // Set the current track from metadata
    if (trackMetadataRef.current.has(tracks[startIndex].id)) {
      setCurrentTrack(trackMetadataRef.current.get(tracks[startIndex].id) || null);
    }

    // Load entire queue and play from startIndex
    TrackPlayer.setMediaItems(mediaItems, startIndex);
    TrackPlayer.play();
    setIsLoadingTrack(false);
  }, []);

  // Play a single Spotify track (no queue)
  const playSpotifyTrack = useCallback((spotifyTrack: SpotifyTrack) => {
    void playSpotifyTrackCore(spotifyTrack);
  }, [playSpotifyTrackCore]);

  // Play a Spotify playlist starting at startIndex
  const playSpotifyPlaylist = useCallback((tracks: SpotifyTrack[], startIndex: number) => {
    setHasStartedPlayback(true);
    setIsLoadingTrack(true);
    setTrackError(null);

    const mediaItems = tracks.map(t => {
      const track: Track = {
        id: t.id,
        title: t.name,
        artist: t.artists,
        audioSource: { uri: getStreamUrl(t.id) },
        artwork: { uri: t.images },
        gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
      };
      trackMetadataRef.current.set(t.id, track);

      return {
        url: getStreamUrl(t.id),
        title: t.name,
        artist: t.artists,
        artworkUrl: t.images,
        duration: t.duration_ms ? t.duration_ms / 1000 : 0,
        mediaId: t.id,
      };
    });

    setQueueLength(mediaItems.length);
    setCurrentIndex(startIndex);

    // Set the current track from metadata
    const startTrack = tracks[startIndex];
    if (trackMetadataRef.current.has(startTrack.id)) {
      setCurrentTrack(trackMetadataRef.current.get(startTrack.id) || null);
    }

    // Load entire queue and play from startIndex
    TrackPlayer.setMediaItems(mediaItems, startIndex);
    TrackPlayer.play();
    setIsLoadingTrack(false);

    // Fetch lyrics for the starting track
    setIsLoadingLyrics(true);
    getLyrics(startTrack.id, startTrack.name, startTrack.artists)
      .then((lines) => {
        setCurrentTrack((prev) =>
          prev?.id === startTrack.id
            ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
            : prev
        );
      })
      .catch(() => { })
      .finally(() => setIsLoadingLyrics(false));

    if (startIndex + 1 < tracks.length) {
      prefetchTrack(tracks[startIndex + 1].id);
    }
  }, []);

  // Poll for track changes to keep UI in sync with native playback
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const currentItem = TrackPlayer.getActiveMediaItem();
        const currentIdx = TrackPlayer.getActiveMediaItemIndex();

        if (!currentItem || currentIdx === null) return;

        // Check if track has changed
        if (currentTrack?.id !== (currentItem.mediaId || currentItem.url.toString())) {
          console.log('[Poll] Track changed detected:', currentItem.title);
          setCurrentIndex(currentIdx);

          let track: Track | undefined;

          // Try to get from metadata first
          if (currentItem.mediaId && trackMetadataRef.current.has(currentItem.mediaId)) {
            track = trackMetadataRef.current.get(currentItem.mediaId) as Track | undefined;
            if (track) {
              console.log('[Poll] Updating from metadata:', track.title);
              setCurrentTrack(track);
            }
          }

          // If not in metadata, construct from library item
          if (!track) {
            console.log('[Poll] Constructing track from library item');
            const artworkUri = currentItem.artworkUrl
              ? { uri: currentItem.artworkUrl.toString() }
              : require('@/assets/images/playlist/album_art.png');

            track = {
              id: (currentItem.mediaId as string) || currentItem.url.toString(),
              title: currentItem.title || 'Unknown',
              artist: currentItem.artist || 'Unknown',
              audioSource: { uri: currentItem.url.toString() },
              artwork: artworkUri,
              gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
            };

            setCurrentTrack(track);
          }

          // Always try to fetch lyrics for streaming tracks that don't have them
          const isStreamingTrack = currentItem.url.toString().includes('/stream-audio/');
          const needsLyrics = !track?.lyrics && isStreamingTrack;

          console.log('[Poll] Is streaming:', isStreamingTrack, 'Needs lyrics:', needsLyrics);

          if (needsLyrics && track) {
            console.log('[Poll] Fetching lyrics for:', track.title);
            setIsLoadingLyrics(true);
            const trackId = track.id;
            const trackTitle = track.title;
            const trackArtist = track.artist;

            getLyrics(trackId, trackTitle, trackArtist)
              .then((lines) => {
                console.log('[Poll] Lyrics fetched:', lines.length, 'lines');
                setCurrentTrack((prev) =>
                  prev?.id === trackId
                    ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
                    : prev
                );
              })
              .catch((error) => {
                console.log('[Poll] Lyrics fetch error:', error);
              })
              .finally(() => setIsLoadingLyrics(false));
          }
        }
      } catch (error) {
        console.log('[Poll] Error checking track:', error);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(pollInterval);
  }, [currentTrack?.id]);

  // Sync current track with library state
  const syncCurrentTrack = useCallback(() => {
    try {
      const currentItem = TrackPlayer.getActiveMediaItem();
      const currentIdx = TrackPlayer.getActiveMediaItemIndex();

      console.log('[sync] Current item:', currentItem?.mediaId, currentItem?.title);
      console.log('[sync] Metadata keys:', Array.from(trackMetadataRef.current.keys()));

      if (currentItem && currentIdx !== null) {
        setCurrentIndex(currentIdx);

        // Try to get from metadata first
        if (currentItem.mediaId && trackMetadataRef.current.has(currentItem.mediaId)) {
          const track = trackMetadataRef.current.get(currentItem.mediaId) as Track | undefined;
          console.log('[sync] Found track in metadata:', track?.title);
          setCurrentTrack(track || null);

          // Fetch lyrics for streaming tracks if missing
          if (track && !track.lyrics && track.audioSource?.uri?.includes('/stream-audio/')) {
            setIsLoadingLyrics(true);
            const trackId = track.id;
            getLyrics(trackId, track.title, track.artist)
              .then((lines) => {
                setCurrentTrack((prev) =>
                  prev?.id === trackId
                    ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
                    : prev
                );
              })
              .catch(() => { })
              .finally(() => setIsLoadingLyrics(false));
          }
        } else {
          // Construct track from MediaItem if not in metadata
          console.log('[sync] Track not in metadata, constructing from MediaItem');
          const artworkUri = currentItem.artworkUrl
            ? { uri: currentItem.artworkUrl.toString() }
            : require('@/assets/images/playlist/album_art.png');

          const constructedTrack: Track = {
            id: (currentItem.mediaId as string) || currentItem.url.toString(),
            title: currentItem.title || 'Unknown',
            artist: currentItem.artist || 'Unknown',
            audioSource: { uri: currentItem.url.toString() },
            artwork: artworkUri,
            gradientColors: ['#0a1a0a', '#1a1a1a', '#000000'],
          };

          setCurrentTrack(constructedTrack);

          // Try to fetch lyrics for Spotify tracks
          if (currentItem.url.toString().includes('/stream-audio/')) {
            setIsLoadingLyrics(true);
            const trackId = constructedTrack.id;
            const trackTitle = constructedTrack.title;
            const trackArtist = constructedTrack.artist;
            getLyrics(trackId, trackTitle, trackArtist)
              .then((lines) => {
                setCurrentTrack((prev) =>
                  prev?.id === trackId
                    ? { ...prev, lyrics: lines.length > 0 ? lines : undefined }
                    : prev
                );
              })
              .catch(() => { })
              .finally(() => setIsLoadingLyrics(false));
          }
        }
      }
    } catch (error) {
      console.log('[sync] Error syncing current track:', error);
    }
  }, []);

  // Listen for remote commands and playback state changes
  useEffect(() => {
    const remotePlay = TrackPlayer.addEventListener(Event.RemotePlay, () => {
      TrackPlayer.play();
    });

    const remotePause = TrackPlayer.addEventListener(Event.RemotePause, () => {
      TrackPlayer.pause();
    });

    const remoteNext = TrackPlayer.addEventListener(Event.RemoteNext, () => {
      console.log('[RemoteNext] pressed');
      TrackPlayer.skipToNext();
      // MediaItemTransition event will handle the UI update
    });

    const remotePrevious = TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      console.log('[RemotePrevious] pressed');
      TrackPlayer.skipToPrevious();
      // MediaItemTransition event will handle the UI update
    });

    const playingChanged = TrackPlayer.addEventListener(Event.IsPlayingChanged, (event) => {
      setIsPlaying(event.playing);
    });

    return () => {
      remotePlay.remove();
      remotePause.remove();
      remoteNext.remove();
      remotePrevious.remove();
      playingChanged.remove();
    };
  }, [syncCurrentTrack]);

  const clearError = () => setTrackError(null);

  const dismiss = () => {
    TrackPlayer.pause();
    setHasStartedPlayback(false);
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      TrackPlayer.pause();
    } else {
      TrackPlayer.play();
    }
  };

  const formatTime = (seconds: number) => {
    // Handle invalid values - ensure positive number
    const validSeconds = Math.max(0, Math.abs(seconds || 0));
    const mins = Math.floor(validSeconds / 60);
    const secs = Math.floor(validSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };


  const goToNext = useCallback(() => {
    if (queueLength > 0) TrackPlayer.skipToNext();
  }, [queueLength]);

  const goToPrev = useCallback(() => {
    if (queueLength > 0) TrackPlayer.skipToPrevious();
  }, [queueLength]);

  const hasNext = !currentTrack ? false : currentIndex + 1 < queueLength;
  const hasPrev = !currentTrack ? false : currentIndex > 0;

  return {
    player: {
      seekTo: (position: number) => TrackPlayer.seekTo(position),
    },
    status: {
      playing: isPlaying,
      isPlaying,
      isBuffering: playbackState === PlaybackState.Buffering,
      duration: progress.duration,
      currentTime: progress.position,
      position: progress.position,
      didJustFinish: playbackState === PlaybackState.Ended,
    },
    currentTrack,
    hasStartedPlayback,
    isLoadingTrack,
    isLoadingLyrics,
    trackError,
    clearError,
    dismiss,
    handlePlayPause,
    formatTime,
    playSpotifyTrack,
    playSpotifyPlaylist,
    playLocalTrack,
    playLocalPlaylist,
    goToNext,
    goToPrev,
    hasNext,
    hasPrev,
  };
}
