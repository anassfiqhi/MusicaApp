import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaylists } from '../context/PlaylistsContext';
import type { SpotifyTrack } from '../services/api';
import CreatePlaylistModal from './CreatePlaylistModal';

interface Props {
  visible: boolean;
  track: SpotifyTrack | null;
  onClose: () => void;
}

export default function AddToPlaylistModal({ visible, track, onClose }: Props) {
  const { playlists, create, addTrack, playlistsContaining } = usePlaylists();
  const [showCreate, setShowCreate] = useState(false);

  const inPlaylists = track ? new Set(playlistsContaining(track.id)) : new Set<string>();

  const handleAdd = async (playlistId: string) => {
    if (!track) return;
    await addTrack(playlistId, track);
    onClose();
  };

  const handleCreated = async (name: string) => {
    const playlist = await create(name);
    if (track) await addTrack(playlist.id, track);
    setShowCreate(false);
    onClose();
  };

  const handleClose = () => {
    setShowCreate(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
        <View style={styles.handle} />
        <Text style={styles.title}>Add to playlist</Text>

        {/* New playlist */}
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <View style={styles.newIconWrap}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <Text style={styles.newBtnText}>New playlist</Text>
        </TouchableOpacity>

        <CreatePlaylistModal
          visible={showCreate}
          initialName={track?.name ?? ''}
          onCancel={() => setShowCreate(false)}
          onCreate={handleCreated}
        />

        {/* Existing playlists */}
        <FlatList
          data={playlists}
          keyExtractor={p => p.id}
          style={styles.list}
          renderItem={({ item }) => {
            const added = inPlaylists.has(item.id);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => !added && handleAdd(item.id)}
                activeOpacity={added ? 1 : 0.7}
              >
                <View style={styles.cover}>
                  <Ionicons name="musical-notes" size={22} color="#3a3a3a" />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.tracks.length} tracks</Text>
                </View>
                {added
                  ? <Ionicons name="checkmark-circle" size={24} color="#1DB954" />
                  : <Ionicons name="add-circle-outline" size={24} color="#9B9B9B" />
                }
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No playlists yet — create one above</Text>
          }
        />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    flex: 1,
    maxHeight: '75%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#535353',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, marginBottom: 8 },
  newIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#535353',
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  cover: { width: 48, height: 48, borderRadius: 4, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowMeta: { color: '#9B9B9B', fontSize: 13, marginTop: 2 },
  empty: { color: '#535353', fontSize: 13, textAlign: 'center', marginTop: 24 },
});
