import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import { useDownloads } from '@/context/DownloadsContext';
import { usePlaylists } from '@/context/PlaylistsContext';
import { formatBytes } from '@/services/downloads';
import type { DownloadedTrack } from '@/services/downloads';
import type { SpotifyTrack } from '@/services/api';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';

type Segment = 'playlists' | 'downloads';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PLACEHOLDER = require('@/assets/images/playlist/album_art.png');

function getArtwork(d: DownloadedTrack) {
  return d.artworkUrl ? { uri: d.artworkUrl } : PLACEHOLDER;
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = Math.min(width, height) >= 600;

  const { playLocalPlaylist, currentTrack } = useTrackPlayerContext();
  const { downloads, remove } = useDownloads();
  const { playlists, create: createPlaylist } = usePlaylists();

  const [segment, setSegment] = useState<Segment>('playlists');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);

  const toSpotifyTrack = (d: DownloadedTrack): SpotifyTrack => ({
    id: d.id,
    name: d.title,
    artists: d.artist,
    album_name: '',
    images: d.artworkUrl ?? '',
    duration_ms: 0,
  });

  const handlePlay = (d: DownloadedTrack) => {
    const index = downloads.indexOf(d);
    playLocalPlaylist(downloads, index >= 0 ? index : 0);
    router.push('/player');
  };

  const handleDelete = (d: DownloadedTrack) => {
    Alert.alert('Remove download', `Remove "${d.title}" from downloads?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(d.id) },
    ]);
  };

  const handleCreatePlaylist = async (name: string) => {
    const playlist = await createPlaylist(name);
    setCreatingPlaylist(false);
    router.push(`/my-playlist/${playlist.id}`);
  };

  const gridTracks = downloads.slice(0, 6);
  const totalSize = downloads.reduce((sum, d) => sum + d.fileSizeBytes, 0);

  return (
    <LinearGradient colors={['#1a1a2e', '#12122a', '#000000']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.topBar}>
          <Text style={[styles.greeting, isWide && styles.greetingWide]}>{getGreeting()}</Text>
          <View style={styles.avatar}>
            <Ionicons name="person" size={isWide ? 16 : 18} color="white" />
          </View>
        </View>

        {/* Segment pills */}
        <View style={styles.segments}>
          {(['playlists', 'downloads'] as Segment[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, segment === s && styles.pillActive]}
              onPress={() => setSegment(s)}
            >
              <Text style={[styles.pillText, segment === s && styles.pillTextActive]}>
                {s === 'playlists'
                  ? 'Playlists'
                  : `Downloads${downloads.length > 0 ? ` · ${downloads.length}` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Playlists ── */}
        {segment === 'playlists' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyPlaylists}>
                <View style={styles.emptyPlaylistsArt}>
                  <Ionicons name="musical-notes" size={52} color="#1DB954" />
                </View>
                <Text style={styles.emptyPlaylistsTitle}>Create your first playlist</Text>
                <Text style={styles.emptyPlaylistsSub}>It's easy, we'll help you</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setCreatingPlaylist(true)}>
                  <Text style={styles.createBtnText}>Create playlist</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.newPlaylistRow} onPress={() => setCreatingPlaylist(true)} activeOpacity={0.7}>
                  <View style={styles.newPlaylistIcon}>
                    <Ionicons name="add" size={24} color="white" />
                  </View>
                  <Text style={styles.newPlaylistText}>New Playlist</Text>
                </TouchableOpacity>

                {playlists.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.playlistRow}
                    onPress={() => router.push(`/my-playlist/${p.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.playlistArt, isWide && styles.playlistArtWide]}>
                      <Ionicons name="musical-notes" size={isWide ? 22 : 26} color="#9B9B9B" />
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={[styles.playlistName, isWide && styles.playlistNameWide]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[styles.playlistMeta, isWide && styles.playlistMetaWide]}>
                        {`Playlist · ${p.tracks.length} ${p.tracks.length === 1 ? 'song' : 'songs'}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#535353" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* ── Downloads ── */}
        {segment === 'downloads' && (
          downloads.length === 0 ? (
            <View style={styles.emptyDownloads}>
              <View style={styles.emptyDownloadsArt}>
                <Ionicons name="arrow-down-circle-outline" size={52} color="#1DB954" />
              </View>
              <Text style={styles.emptyTitle}>No downloads yet</Text>
              <Text style={styles.emptySub}>
                Tap the download icon on any track to save it for offline playback
              </Text>
              <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push('/(tabs)/discover')}>
                <Text style={styles.discoverBtnText}>Browse Discover</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            >
              {/* Quick-access grid */}
              <View style={[styles.grid, isWide && styles.gridWide]}>
                {gridTracks.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.gridItem, isWide && styles.gridItemWide, currentTrack?.id === d.id && styles.gridItemActive]}
                    onPress={() => handlePlay(d)}
                  >
                    <Image source={getArtwork(d)} style={styles.gridArtwork} contentFit="cover" recyclingKey={d.id} />
                    <Text style={styles.gridTitle} numberOfLines={1}>{d.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Storage bar + Play all */}
              <View style={styles.downloadsToolbar}>
                <Text style={styles.storageText}>
                  {downloads.length} track{downloads.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
                </Text>
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => { playLocalPlaylist(downloads, 0); router.push('/player'); }}
                >
                  <Ionicons name="play" size={16} color="black" />
                  <Text style={styles.playAllText}>Play all</Text>
                </TouchableOpacity>
              </View>

              {/* Track list */}
              {downloads.map(d => {
                const isActive = currentTrack?.id === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.trackRow, isActive && styles.trackRowActive]}
                    onPress={() => handlePlay(d)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={getArtwork(d)}
                      style={[styles.trackArtwork, isWide && styles.trackArtworkWide]}
                      contentFit="cover"
                      recyclingKey={d.id}
                    />
                    <View style={styles.trackInfo}>
                      <Text
                        style={[styles.trackTitle, isWide && styles.trackTitleWide, isActive && styles.trackTitleActive]}
                        numberOfLines={1}
                      >
                        {d.title}
                      </Text>
                      <Text style={[styles.trackArtist, isWide && styles.trackArtistWide]} numberOfLines={1}>
                        {d.artist}
                      </Text>
                      <Text style={styles.trackMeta}>
                        {formatBytes(d.fileSizeBytes)} · {formatDate(d.downloadedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setOptionsTrack(toSpotifyTrack(d))}
                      style={styles.actionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={isWide ? 18 : 20} color="#9B9B9B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(d)}
                      style={styles.actionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={isWide ? 18 : 20} color="#535353" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        )}

      </View>

      <TrackOptionsSheet
        visible={optionsTrack !== null}
        track={optionsTrack}
        onClose={() => setOptionsTrack(null)}
        onAddToPlaylist={() => setAddTrack(optionsTrack)}
        extraOptions={[{
          icon: 'trash-outline',
          label: 'Remove download',
          destructive: true,
          onPress: () => optionsTrack && remove(optionsTrack.id),
        }]}
      />
      <AddToPlaylistModal
        visible={addTrack !== null}
        track={addTrack}
        onClose={() => setAddTrack(null)}
      />
      <CreatePlaylistModal
        visible={creatingPlaylist}
        onCancel={() => setCreatingPlaylist(false)}
        onCreate={handleCreatePlaylist}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  greeting: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  greetingWide: { fontSize: 18 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  segments: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#282828',
  },
  pillActive: { backgroundColor: '#1DB954' },
  pillText: { color: '#9B9B9B', fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#000' },

  scrollContent: { paddingTop: 4 },

  // ── Playlists ──
  emptyPlaylists: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyPlaylistsArt: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(29,185,84,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyPlaylistsTitle: { color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyPlaylistsSub: { color: '#9B9B9B', fontSize: 14, textAlign: 'center' },
  createBtn: {
    marginTop: 8,
    backgroundColor: '#1DB954',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  newPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  newPlaylistIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlaylistText: { color: 'white', fontSize: 15, fontWeight: '600' },

  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  playlistArt: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistArtWide: { width: 46, height: 46 },
  playlistInfo: { flex: 1 },
  playlistName: { color: 'white', fontSize: 15, fontWeight: '600' },
  playlistNameWide: { fontSize: 13 },
  playlistMeta: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },
  playlistMetaWide: { fontSize: 11 },

  // ── Downloads ──
  emptyDownloads: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyDownloadsArt: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(29,185,84,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#9B9B9B', fontSize: 14, textAlign: 'center' },
  discoverBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1DB954',
  },
  discoverBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  gridWide: { gap: 10 },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    width: '48.5%',
    height: 56,
  },
  gridItemWide: { height: 48 },
  gridItemActive: { backgroundColor: 'rgba(29,185,84,0.25)' },
  gridArtwork: { width: 56, height: 56 },
  gridTitle: { color: 'white', fontSize: 13, fontWeight: '600', flex: 1, paddingHorizontal: 10 },

  downloadsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storageText: { color: '#9B9B9B', fontSize: 13 },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1DB954',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playAllText: { color: '#000', fontWeight: '700', fontSize: 13 },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 12,
  },
  trackRowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  trackArtwork: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#282828' },
  trackArtworkWide: { width: 44, height: 44 },
  trackInfo: { flex: 1, gap: 2 },
  trackTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
  trackTitleWide: { fontSize: 13 },
  trackTitleActive: { color: '#1DB954' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackArtistWide: { fontSize: 11 },
  trackMeta: { color: '#535353', fontSize: 11 },
  actionBtn: { padding: 8 },
});
