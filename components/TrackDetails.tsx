import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrackDetailsProps {
  title: string;
  artist: string;
  onDownload?: () => void;
  downloaded?: boolean;
  downloading?: boolean;
  dlProgress?: number;
}

export default function TrackDetails({ title, artist, onDownload, downloaded, downloading, dlProgress }: TrackDetailsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const iconSize = isWide ? 22 : 26;

  return (
    <View style={[styles.trackInfo, isWide && styles.trackInfoWide]}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, isWide && styles.titleWide]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.artist, isWide && styles.artistWide]} numberOfLines={1}>{artist}</Text>
      </View>
      <View style={styles.actions}>
        {onDownload !== undefined && (
          <TouchableOpacity
            onPress={() => { if (!downloaded && !downloading) onDownload(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionBtn}
          >
            {downloading ? (
              dlProgress != null && dlProgress > 0 && dlProgress < 1
                ? <Text style={styles.progressText}>{Math.round(dlProgress * 100)}%</Text>
                : <ActivityIndicator size="small" color="#1DB954" />
            ) : downloaded ? (
              <Ionicons name="checkmark-circle" size={iconSize} color="#1DB954" />
            ) : (
              <Ionicons name="arrow-down-circle-outline" size={iconSize} color="white" />
            )}
          </TouchableOpacity>
        )}
        <Ionicons name="heart-outline" size={iconSize} color="white" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 35,
  },
  trackInfoWide: { marginTop: 16 },
  textBlock: { flex: 1, marginRight: 12 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  titleWide: { fontSize: 18 },
  artist: { color: '#b3b3b3', fontSize: 16, marginTop: 4, fontWeight: '500' },
  artistWide: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', minWidth: 28 },
  progressText: { color: '#1DB954', fontSize: 10, fontWeight: '700' },
});
