import { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrackPlayerProvider } from '../context/TrackPlayerContext';
import { DownloadsProvider } from '../context/DownloadsContext';
import { PlaylistsProvider } from '../context/PlaylistsContext';
import { ToastProvider } from '../context/ToastContext';
import { useSession } from '@/utils/authClient';
import MiniPlayer from '@/components/MiniPlayer';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

const HIDE_MINI_PLAYER_ON = new Set(['player']);

function FloatingMiniPlayer() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (HIDE_MINI_PLAYER_ON.has(segments[0] as string)) return null;

  const isTab = segments[0] === '(tabs)';
  const bottom = isTab
    ? TAB_BAR_HEIGHT + insets.bottom
    : Math.max(insets.bottom, 16) + 8;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom, zIndex: 100, elevation: 100 }}>
      <MiniPlayer />
    </View>
  );
}

function RootLayoutNav() {
  const { data: session, isPending } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, isPending]);

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ animationEnabled: false }} />
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
      <Stack.Screen
        name="album/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="artist/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const { isPending } = useSession();

  if (isPending) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <DownloadsProvider>
            <PlaylistsProvider>
              <TrackPlayerProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
                <FloatingMiniPlayer />
              </TrackPlayerProvider>
            </PlaylistsProvider>
          </DownloadsProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
