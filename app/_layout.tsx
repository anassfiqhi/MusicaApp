import { Stack, useSegments } from 'expo-router';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrackPlayerProvider } from '../context/TrackPlayerContext';
import { DownloadsProvider } from '../context/DownloadsContext';
import { PlaylistsProvider } from '../context/PlaylistsContext';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <DownloadsProvider>
      <PlaylistsProvider>
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
          <Stack.Screen
            name="my-playlist/[id]"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
        <FloatingMiniPlayer />
      </TrackPlayerProvider>
      </PlaylistsProvider>
      </DownloadsProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
