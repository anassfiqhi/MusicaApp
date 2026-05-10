import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrackDetailsProps {
  title: string;
  artist: string;
}

export default function TrackDetails({ title, artist }: TrackDetailsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <View style={[styles.trackInfo, isWide && styles.trackInfoWide]}>
      <View>
        <Text style={[styles.title, isWide && styles.titleWide]}>{title}</Text>
        <Text style={[styles.artist, isWide && styles.artistWide]}>{artist}</Text>
      </View>
      <Ionicons name="heart-outline" size={isWide ? 22 : 28} color="white" />
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
  trackInfoWide: {
    marginTop: 16,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleWide: {
    fontSize: 18,
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  artistWide: {
    fontSize: 13,
    marginTop: 2,
  },
});
