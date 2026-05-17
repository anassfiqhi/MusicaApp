import { Stack, useSegments } from 'expo-router';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrackPlayerProvider } from '../context/TrackPlayerContext';
import MiniPlayer from '@/components/MiniPlayer';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

function FloatingMiniPlayer() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (segments[0] === 'player') return null;

  const bottom = segments[0] === '(tabs)'
    ? TAB_BAR_HEIGHT + insets.bottom
    : insets.bottom + 8;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom, zIndex: 10, elevation: 10 }}>
      <MiniPlayer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TrackPlayerProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="player"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="playlist/[id]"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
        <FloatingMiniPlayer />
      </TrackPlayerProvider>
    </SafeAreaProvider>
  );
}
