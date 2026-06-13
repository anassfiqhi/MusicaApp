import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

interface MarqueeProps {
  duration?: number;
  reverse?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

interface MeasureElementProps {
  onLayout: (width: number) => void;
  children: ReactNode;
}

const MeasureElement = ({ onLayout, children }: MeasureElementProps) => (
  <Animated.ScrollView
    horizontal
    style={styles.hidden}
    pointerEvents="box-none">
    <View onLayout={(ev) => onLayout(ev.nativeEvent.layout.width)}>
      {children}
    </View>
  </Animated.ScrollView>
);

interface TranslatedElementProps {
  index: number;
  children: ReactNode;
  offset: SharedValue<number>;
  childrenWidth: number;
}

const TranslatedElement = ({ index, children, offset, childrenWidth }: TranslatedElementProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: (index - 1) * childrenWidth,
      transform: [
        {
          translateX: -offset.value,
        },
      ],
    };
  });
  return (
    <Animated.View style={[styles.animatedElement, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const getIndicesArray = (length: number): number[] => Array.from({ length }, (_, i) => i);

interface ClonerProps {
  count: number;
  renderChild: (index: number) => ReactNode;
}

const Cloner = ({ count, renderChild }: ClonerProps) => (
  <>{getIndicesArray(count).map(renderChild)}</>
);

interface ChildrenScrollerProps {
  duration: number;
  childrenWidth: number;
  parentWidth: number;
  reverse: boolean;
  children: ReactNode;
}

const ChildrenScroller = ({
  duration,
  childrenWidth,
  parentWidth,
  reverse,
  children,
}: ChildrenScrollerProps) => {
  const offset = useSharedValue(0);
  const coeff = useSharedValue(reverse ? 1 : -1);

  React.useEffect(() => {
    coeff.value = reverse ? 1 : -1;
  }, [reverse]);

  useFrameCallback((i) => {
    // prettier-ignore
    offset.value += (coeff.value * ((i.timeSincePreviousFrame ?? 1) * childrenWidth)) / duration;
    offset.value = offset.value % childrenWidth;
  }, true);

  const count = Math.round(parentWidth / childrenWidth) + 2;
  const renderChild = (index: number) => (
    <TranslatedElement
      key={`clone-${index}`}
      index={index}
      offset={offset}
      childrenWidth={childrenWidth}>
      {children}
    </TranslatedElement>
  );

  return <Cloner count={count} renderChild={renderChild} />;
};

export const Marquee = ({ duration = 2000, reverse = false, children, style }: MarqueeProps) => {
  const [parentWidth, setParentWidth] = React.useState(0);
  const [childrenWidth, setChildrenWidth] = React.useState(0);

  return (
    <View
      style={style}
      onLayout={(ev) => {
        setParentWidth(ev.nativeEvent.layout.width);
      }}
      pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <MeasureElement onLayout={setChildrenWidth}>{children}</MeasureElement>

        {childrenWidth > 0 && parentWidth > 0 && (
          <ChildrenScroller
            duration={duration}
            parentWidth={parentWidth}
            childrenWidth={childrenWidth}
            reverse={reverse}>
            {children}
          </ChildrenScroller>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: { opacity: 0, zIndex: -1 },
  row: { flexDirection: 'row', overflow: 'hidden' },
  animatedElement: {
    position: 'absolute',
  },
});
