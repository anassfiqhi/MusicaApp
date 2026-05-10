import React from 'react';
import { View, Image, ImageSourcePropType, StyleSheet, useWindowDimensions } from 'react-native';

interface AlbumArtProps {
  source: ImageSourcePropType;
}

export default function AlbumArt({ source }: AlbumArtProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const artSize = isWide ? Math.min(width * 0.28, 280) : width - 40;

  return (
    <View style={styles.albumArtContainer}>
      <Image source={source} style={[styles.albumArt, { width: artSize, height: artSize }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  albumArtContainer: {
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  albumArt: {
    borderRadius: 8,
  },
});
