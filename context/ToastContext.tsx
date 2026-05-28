import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface ToastOptions {
  duration?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>('checkmark-circle');
  const [iconColor, setIconColor] = useState('#1DB954');

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, opts: ToastOptions = {}) => {
    const { duration = 2500, icon: ic = 'checkmark-circle', iconColor: ic2 = '#1DB954' } = opts;

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    setMessage(msg);
    setIcon(ic);
    setIconColor(ic2);

    // Stop any running animation then slide in
    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 120, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }, duration);
  }, [translateY, opacity]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastBanner
        message={message}
        icon={icon}
        iconColor={iconColor}
        translateY={translateY}
        opacity={opacity}
      />
    </ToastContext.Provider>
  );
}

interface BannerProps {
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  translateY: Animated.Value;
  opacity: Animated.Value;
}

function ToastBanner({ message, icon, iconColor, translateY, opacity }: BannerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 80,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={styles.text} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
