import { ImageSourcePropType } from 'react-native';
import { LYRICS as medellinLyrics } from './lyrics/una-noche-en-medellin';
import { LYRICS as resenhaLyrics } from './lyrics/resenha-na-laje';
import { LYRICS as hawaiLyrics } from './lyrics/hawai';
import { LYRICS as helloLyrics } from './lyrics/hello';
import { LYRICS as montagemSantaFe2Lyrics } from './lyrics/montagem-santa-fe-2';
import { LYRICS as montagemXonadaLyrics } from './lyrics/montagem-xonada';
import { LYRICS as takaLaDentroLyrics } from './lyrics/taka-la-dentro';
import { LYRICS as vaiCairLyrics } from './lyrics/vai-cair';

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
    artist: 'MC MN, DJ L & DJ Guuga',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/VEM%20SEM%20MEDO.mp3' },
    artwork: require('../assets/images/playlist/vem_sem_medo_album_art.jpg'),
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
  {
    id: 'montagem-mandela-1',
    title: 'Montagem Mandela',
    artist: 'MXZI, Dj Samir & volkz',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/MONTAGEM%20MANDELA.mp3' },
    artwork: require('../assets/images/playlist/montagem_mandela_album_art.jpg'),
    gradientColors: ['#1a3330', '#0d2220', '#000000'],
  },
  {
    id: 'montagem-santa-fe-2-1',
    title: 'Montagem Santa Fe 2',
    artist: 'qaraqshy & Dj B7 o Piranhão',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/MONTAGEM%20SANTA%20FE%202.mp3' },
    artwork: require('../assets/images/playlist/montagem_santa_fe_2_album_art.jpg'),
    gradientColors: ['#3d2010', '#28150a', '#000000'],
    lyrics: montagemSantaFe2Lyrics,
  },
  {
    id: 'montagem-xonada-1',
    title: 'Montagem Xonada',
    artist: 'MXZI, Dj Samir & DJ Javi26',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/MONTAGEM%20XONADA.mp3' },
    artwork: require('../assets/images/playlist/montagem_xonada_album_art.jpg'),
    gradientColors: ['#2a1f40', '#1c1430', '#000000'],
    lyrics: montagemXonadaLyrics,
  },
  {
    id: 'taka-la-dentro-1',
    title: 'Taka La Dentro',
    artist: 'SEKIMANE, shonci & Mc Gw',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/TAKA%20LA%20DENTRO.mp3' },
    artwork: require('../assets/images/playlist/taka_la_dentro_album_art.jpg'),
    gradientColors: ['#261c18', '#18110e', '#000000'],
    lyrics: takaLaDentroLyrics,
  },
  {
    id: 'vai-cair-1',
    title: 'Vai Cair',
    artist: 'DJ Asul',
    audioSource: { uri: 'https://bucket-production-1618.up.railway.app/musica-app/track/VAI%20CAIR.mp3' },
    artwork: require('../assets/images/playlist/vai_cair_album_art.jpg'),
    gradientColors: ['#1e2530', '#131820', '#000000'],
    lyrics: vaiCairLyrics,
  },
];

export const CURRENT_TRACK: Track = PLAYLIST[0];
