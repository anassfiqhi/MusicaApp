import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { SpotifyTrack } from '../services/api';

const PLACEHOLDER = require('../assets/images/playlist/album_art.png');

interface Option {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  track: SpotifyTrack | null;
  onClose: () => void;
  onAddToPlaylist: () => void;
  extraOptions?: Option[];
}

export default function TrackOptionsSheet({
  visible,
  track,
  onClose,
  onAddToPlaylist,
  extraOptions,
}: Props) {
  if (!track) return null;

  const handleAddToPlaylist = () => {
    onClose();
    // small delay so the first sheet fully closes before the next opens
    setTimeout(onAddToPlaylist, 150);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Track info header */}
        <View style={styles.header}>
          <Image
            source={track.images ? { uri: track.images } : PLACEHOLDER}
            style={styles.artwork}
            contentFit="cover"
          />
          <View style={styles.headerText}>
            <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{track.artists}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Add to playlist */}
        <TouchableOpacity style={styles.option} onPress={handleAddToPlaylist} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.optionIcon} />
          <Text style={styles.optionLabel}>Add to playlist</Text>
        </TouchableOpacity>

        {/* Extra options (e.g. Remove download) */}
        {extraOptions?.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={styles.option}
            onPress={() => { onClose(); opt.onPress(); }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={opt.icon as any}
              size={24}
              color={opt.destructive ? '#e5534b' : '#fff'}
              style={styles.optionIcon}
            />
            <Text style={[styles.optionLabel, opt.destructive && styles.destructiveLabel]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#535353',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  artwork: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#1a1a1a' },
  headerText: { flex: 1 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: '#9B9B9B', fontSize: 13, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#3E3E3E', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 18,
  },
  optionIcon: { width: 24, textAlign: 'center' },
  optionLabel: { color: '#fff', fontSize: 15 },
  destructiveLabel: { color: '#e5534b' },
});
