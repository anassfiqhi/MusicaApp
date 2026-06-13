import React, { useEffect } from 'react';
import { View, ImageSourcePropType, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

interface AlbumArtProps {
  source: ImageSourcePropType;
}

export default function AlbumArt({ source }: AlbumArtProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const artSize = isWide ? Math.min(width * 0.28, 280) : width - 40;
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );
  }, [source]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.albumArtContainer}>
      <Animated.Image
        source={source}
        style={[styles.albumArt, { width: artSize, height: artSize }, animatedStyle]}
      />
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
