import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MarqueeTextProps {
  text: string;
  style?: any;
  maxWidth?: number;
}

export default function MarqueeText({
  text,
  style,
  maxWidth = 220,
}: MarqueeTextProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    const charLength = text.length;
    // If text is short, don't animate
    if (charLength < 18) {
      translateX.value = 0;
      return;
    }

    // Estimate text width: roughly 11px per character at default font size
    const estimatedTextWidth = charLength * 11;
    const distance = estimatedTextWidth + maxWidth;
    const duration = distance * 30; // 30ms per pixel for smooth motion

    // Start from right (off-screen), scroll to left
    translateX.value = withRepeat(
      withTiming(-distance, {
        duration: Math.max(duration, 3000),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [text, maxWidth, translateX]);

  // Initialize position to start from right
  React.useLayoutEffect(() => {
    translateX.value = maxWidth;
  }, [maxWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { width: maxWidth }]}>
      <Animated.Text
        style={[style, animatedStyle, styles.text, { width: 2000, flexShrink: 0 }]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  text: {
    flexShrink: 0,
  },
});
