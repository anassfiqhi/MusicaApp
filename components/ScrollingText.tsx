import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ScrollingTextProps {
  text: string;
  style?: any;
  maxWidth?: number;
}

export default function ScrollingText({
  text,
  style,
  maxWidth = 200,
}: ScrollingTextProps) {
  const [textWidth, setTextWidth] = useState(0);
  const measuringTextRef = useRef<Text>(null);
  const offsetX = useSharedValue(0);

  useEffect(() => {
    if (!measuringTextRef.current) return;

    const timer = setTimeout(() => {
      measuringTextRef.current?.measure((x, y, width) => {
        setTextWidth(width);
        if (width > maxWidth) {
          const distance = width + 32 - maxWidth;
          offsetX.value = withRepeat(
            withTiming(-distance, {
              duration: Math.max(distance * 50, 3000),
              easing: Easing.linear,
            }),
            -1,
            true
          );
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [text, maxWidth, offsetX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  const shouldScroll = textWidth > maxWidth;

  if (!shouldScroll) {
    return (
      <Text
        ref={measuringTextRef}
        style={style}
        numberOfLines={1}
      >
        {text}
      </Text>
    );
  }

  return (
    <View style={[styles.container, { width: maxWidth }]}>
      <Animated.View style={animatedStyle}>
        <Text ref={measuringTextRef} style={style}>
          {text}
          {'  •  '}
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
