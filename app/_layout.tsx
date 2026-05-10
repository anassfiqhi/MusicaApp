import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TrackPlayerProvider } from '../context/TrackPlayerContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TrackPlayerProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="player"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </TrackPlayerProvider>
    </SafeAreaProvider>
  );
}
