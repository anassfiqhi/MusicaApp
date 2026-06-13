import { ImageSourcePropType } from 'react-native';

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
