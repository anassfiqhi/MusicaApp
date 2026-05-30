import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import TrackOptionsSheet from '@/components/TrackOptionsSheet';
import { useDownloads } from '@/context/DownloadsContext';
import { usePlaylists } from '@/context/PlaylistsContext';
import { useTrackPlayerContext } from '@/context/TrackPlayerContext';
import type { SpotifyTrack } from '@/services/api';
import type { DownloadedTrack } from '@/services/downloads';
import { formatBytes } from '@/services/downloads';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Segment = 'playlists' | 'downloads';

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
  const { playlists, create: createPlaylist, remove: removePlaylist, rename } = usePlaylists();

  const [segment, setSegment] = useState<Segment>('playlists');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [renamingPlaylist, setRenamingPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [optionsTrack, setOptionsTrack] = useState<SpotifyTrack | null>(null);
  const [addTrack, setAddTrack] = useState<SpotifyTrack | null>(null);

  const handlePlaylistOptions = (id: string, name: string) => {
    Alert.alert(name, undefined, [
      { text: 'Rename', onPress: () => setRenamingPlaylist({ id, name }) },
      { text: 'Delete', style: 'destructive', onPress: () => removePlaylist(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

  const handleShuffle = () => {
    const shuffled = [...downloads].sort(() => Math.random() - 0.5);
    playLocalPlaylist(shuffled, 0);
    router.push('/player');
  };

  const handleCreatePlaylist = async (name: string) => {
    const playlist = await createPlaylist(name);
    setCreatingPlaylist(false);
    router.push(`/my-playlist/${playlist.id}`);
  };

  const totalSize = downloads.reduce((sum, d) => sum + d.fileSizeBytes, 0);

  return (
    <LinearGradient colors={['#1a1a2e', '#12122a', '#000000']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.topBar}>
          <Text style={[styles.heading, isWide && styles.headingWide]}>Your Library</Text>
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
                <Text style={styles.emptyPlaylistsSub}>It&apos;s easy, we&apos;ll help you</Text>
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
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handlePlaylistOptions(p.id, p.name); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.playlistOptionsBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color="#9B9B9B" />
                    </TouchableOpacity>
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
              <View style={styles.emptyActions}>
                <TouchableOpacity style={styles.discoverBtn} onPress={() => router.navigate('/(tabs)')}>
                  <Ionicons name="compass-outline" size={16} color="#000" />
                  <Text style={styles.discoverBtnText}>Discover</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchBtn} onPress={() => router.navigate('/(tabs)/explore')}>
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            >
              {/* Toolbar */}
              <View style={styles.downloadsToolbar}>
                <View>
                  <Text style={styles.downloadsCount}>
                    {downloads.length} {downloads.length === 1 ? 'song' : 'songs'}
                  </Text>
                  <Text style={styles.storageText}>{formatBytes(totalSize)} on device</Text>
                </View>
                <View style={styles.toolbarActions}>
                  <TouchableOpacity
                    style={styles.shuffleBtn}
                    onPress={handleShuffle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="shuffle" size={24} color="#9B9B9B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.playCircleBtn}
                    onPress={() => { playLocalPlaylist(downloads, 0); router.push('/player'); }}
                  >
                    <Ionicons name="play" size={isWide ? 22 : 26} color="#000" />
                  </TouchableOpacity>
                </View>
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
                    <View style={styles.trackIndicator}>
                      {isActive && <Ionicons name="musical-note" size={14} color="#1DB954" />}
                    </View>
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
                      <Text style={[styles.trackArtist, isWide && styles.trackArtistWide, isActive && styles.trackArtistActive]} numberOfLines={1}>
                        {d.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setOptionsTrack(toSpotifyTrack(d)); }}
                      style={styles.actionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={isWide ? 18 : 20} color="#9B9B9B" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}

              {/* Find more */}
              <View style={styles.findMoreSection}>
                <Text style={styles.findMoreTitle}>Find more music to download</Text>
                <View style={styles.findMoreBtns}>
                  <TouchableOpacity style={styles.findMoreBtn} onPress={() => router.navigate('/(tabs)')}>
                    <Ionicons name="compass-outline" size={18} color="#000" />
                    <Text style={styles.findMoreBtnText}>Discover</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.findMoreBtn, styles.findMoreBtnOutline]} onPress={() => router.navigate('/(tabs)/explore')}>
                    <Ionicons name="search-outline" size={18} color="#fff" />
                    <Text style={[styles.findMoreBtnText, styles.findMoreBtnTextOutline]}>Search</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
      <CreatePlaylistModal
        visible={renamingPlaylist !== null}
        initialName={renamingPlaylist?.name ?? ''}
        title="Rename playlist"
        confirmLabel="Save"
        onCancel={() => setRenamingPlaylist(null)}
        onCreate={async (newName) => {
          if (renamingPlaylist) await rename(renamingPlaylist.id, newName);
          setRenamingPlaylist(null);
        }}
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
  heading: { color: 'white', fontSize: 22, fontWeight: '800' },
  headingWide: { fontSize: 18 },

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
  playlistOptionsBtn: {
    padding: 6,
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
  emptyActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1DB954',
  },
  discoverBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  findMoreSection: {
    marginTop: 24,
    marginBottom: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 14,
  },
  findMoreTitle: { color: '#9B9B9B', fontSize: 13, fontWeight: '500' },
  findMoreBtns: { flexDirection: 'row', gap: 12 },
  findMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1DB954',
  },
  findMoreBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  findMoreBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  findMoreBtnTextOutline: { color: '#fff' },

  downloadsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  downloadsCount: { color: 'white', fontSize: 15, fontWeight: '600' },
  storageText: { color: '#9B9B9B', fontSize: 12, marginTop: 2 },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  shuffleBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 12,
  },
  trackRowActive: { backgroundColor: 'rgba(29,185,84,0.08)' },
  trackIndicator: { width: 16, alignItems: 'center', justifyContent: 'center' },
  trackArtwork: { width: 50, height: 50, borderRadius: 4, backgroundColor: '#282828' },
  trackArtworkWide: { width: 44, height: 44 },
  trackInfo: { flex: 1, gap: 3 },
  trackTitle: { color: 'white', fontSize: 15, fontWeight: '500' },
  trackTitleWide: { fontSize: 13 },
  trackTitleActive: { color: '#1DB954' },
  trackArtist: { color: '#9B9B9B', fontSize: 13 },
  trackArtistWide: { fontSize: 11 },
  trackArtistActive: { color: '#1DB954' },
  actionBtn: { padding: 8 },
});
