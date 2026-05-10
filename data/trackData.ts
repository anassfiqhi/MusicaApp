import { ImageSourcePropType } from 'react-native';
import { LYRICS as medellinLyrics } from './lyrics/una-noche-en-medellin';
import { LYRICS as resenhaLyrics } from './lyrics/resenha-na-laje';
import { LYRICS as hawaiLyrics } from './lyrics/hawai';
import { LYRICS as helloLyrics } from './lyrics/hello';

export interface Lyric {
  time: number;
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  audioSource: any;
  artwork: ImageSourcePropType;
  gradientColors: [string, string, string];
  lyrics?: Lyric[];
}

export const PLAYLIST: Track[] = [
  {
    id: 'medellin-1',
    title: 'Una Noche En Medellín',
    artist: 'Cris MJ',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/Una%20Noche%20en%20Medelli%CC%81n%20-%20Cris%20Mj.mp3' },
    artwork: require('../assets/images/playlist/album_art.png'),
    gradientColors: ['#0a3d35', '#0d5240', '#000000'],
    lyrics: medellinLyrics,
  },
  {
    id: 'vem-sem-medo-1',
    title: 'Vem Sem Medo',
    artist: 'Unknown',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/VEM%20SEM%20MEDO.mp3' },
    artwork: require('../assets/images/playlist/album_art_copy.png'),
    gradientColors: ['#120828', '#1e0f3e', '#000000'],
  },
  {
    id: 'resenha-na-laje-1',
    title: 'Resenha Na Laje',
    artist: 'Kew & DJGILCASTRO',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/Resenha%20Na%20Laje.mp3' },
    artwork: require('../assets/images/playlist/resenha_na_laje.jpg'),
    gradientColors: ['#004d6b', '#006b80', '#000000'],
    lyrics: resenhaLyrics,
  },
  {
    id: 'hawai-1',
    title: 'Hawái',
    artist: 'Maluma',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/Hawa%CC%81i.mp3' },
    artwork: require('../assets/images/playlist/hawai_album_art.jpg'),
    gradientColors: ['#1a0833', '#0d1a40', '#000000'],
    lyrics: hawaiLyrics,
  },
  {
    id: 'hello-1',
    title: 'Hello',
    artist: 'Adele',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app:443/spotify-bucket/ffmpeg-rest/2026-05-03-abb82bad-5cde-4540-acf5-338b9d1213b4/Hello.mp3' },
    artwork: require('../assets/images/playlist/hello_album_art.jpg'),
    gradientColors: ['#1a0a0a', '#2d0a0a', '#000000'],
    lyrics: helloLyrics,
  },
];

export const CURRENT_TRACK: Track = PLAYLIST[0];
