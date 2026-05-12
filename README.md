# Musica

A Spotify-style music player built with Expo and React Native.

## Features

- Full-screen player with dynamic per-track gradient backgrounds
- Synchronized scrolling lyrics
- Mini player persistent across screens
- Background audio playback with lock screen controls
- Prev / next track navigation with auto-advance on finish
- Responsive layout — works on phone and tablet
- Dark mode support

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo 54 / React Native 0.81 |
| Navigation | Expo Router (file-based) |
| Audio | expo-audio |
| Animations | React Native Reanimated 4 |
| Gradients | expo-linear-gradient |
| Images | expo-image |
| Language | TypeScript / React 19 |
| Package manager | pnpm |

## Project Structure

```
app/
  (tabs)/
    index.tsx       Home tab
    explore.tsx     Explore tab
  player.tsx        Full-screen player (fullScreenModal)
  _layout.tsx       Root layout + TrackPlayerProvider

components/
  AlbumArt.tsx      Animated artwork with entry animation
  PlayerControls.tsx Playback bar, seek slider, prev/next
  LyricsView.tsx    Time-synced lyrics list
  MiniPlayer.tsx    Persistent bottom player strip
  Header.tsx        Back button header
  TrackDetails.tsx  Title + artist display

context/
  TrackPlayerContext.tsx  Global player state via useTrackPlayer

data/
  trackData.ts      Track list (id, title, artist, audioSource, artwork, gradient, lyrics)
  lyrics/           Per-track lyric files with timestamps

hooks/
  useTrackPlayer.ts Audio engine — playback, queue, lock screen metadata
```

## Getting Started

```bash
pnpm install
pnpm start
```

Run on a specific platform:

```bash
pnpm ios       # iOS simulator
pnpm android   # Android emulator
pnpm web       # Web browser
```

## Adding Tracks

Add an entry to `data/trackData.ts`:

```ts
{
  id: 'unique-id',
  title: 'Track Title',
  artist: 'Artist Name',
  audioSource: { uri: 'https://your-cdn.com/track.mp3' },
  artwork: require('../assets/images/playlist/your_art.jpg'),
  gradientColors: ['#1a0a0a', '#2d0a0a', '#000000'],
  lyrics: optionalLyricsArray,  // see data/lyrics/ for format
}
```

## Adding Lyrics

Create a file in `data/lyrics/your-track.ts`:

```ts
export const LYRICS = [
  { time: 0,    text: 'First line at 0 seconds' },
  { time: 14.5, text: 'Second line at 14.5 seconds' },
  // ...
];
```

Time values are in seconds and must be in ascending order.

## Audio Hosting

Track audio files are hosted on Railway at `bucket-production-1618.up.railway.app`. Any publicly accessible HTTPS URL works as `audioSource.uri`.

## Build

```bash
# iOS
pnpm build:ios

# Android
pnpm build:android
```

Both commands run `expo prebuild` followed by a release build.
