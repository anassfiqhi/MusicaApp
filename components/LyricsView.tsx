import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Lyric } from '../data/trackData';

interface LyricsViewProps {
  currentTime: number;
  lyrics?: Lyric[];
  isLoading?: boolean;
}

export default function LyricsView({ currentTime, lyrics, isLoading }: LyricsViewProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const lyricScrollView = useRef<ScrollView>(null);
  const lyricLayouts = useRef<{ [key: number]: number }>({});
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  useEffect(() => {
    if (!lyrics) return;
    const index = lyrics.findIndex((l, i) => {
      const nextTime = lyrics[i + 1]?.time || Infinity;
      return currentTime >= l.time && currentTime < nextTime;
    });

    if (index !== currentLyricIndex) {
      setCurrentLyricIndex(index);

      if (index === -1) {
        lyricScrollView.current?.scrollTo({ y: 0, animated: true });
      } else {
        const yPos = lyricLayouts.current[index];
        if (yPos !== undefined) {
          lyricScrollView.current?.scrollTo({
            y: Math.max(0, yPos - 120),
            animated: true
          });
        }
      }
    }
  }, [currentTime, currentLyricIndex, lyrics]);

  return (
    <View style={[styles.lyricsSection, isWide && styles.lyricsSectionWide]}>
      <Text style={[styles.lyricsHeader, isWide && styles.lyricsHeaderWide]}>Lyrics</Text>
      {lyrics ? (
        <ScrollView
          ref={lyricScrollView}
          style={styles.lyricsScroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {lyrics.map((lyric, index) => (
            <Text
              key={index}
              onLayout={(e) => {
                lyricLayouts.current[index] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.lyricLine,
                isWide && styles.lyricLineWide,
                index === currentLyricIndex && styles.activeLyricLine,
                index === currentLyricIndex && isWide && styles.activeLyricLineWide,
              ]}
            >
              {lyric.text}
            </Text>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noLyricsContainer}>
          {isLoading
            ? <ActivityIndicator color="rgba(255,255,255,0.4)" />
            : <Text style={styles.noLyricsText}>No lyrics available</Text>
          }
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lyricsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginTop: 35,
    marginBottom: 40,
    height: 350,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lyricsSectionWide: {
    marginTop: 16,
    height: 240,
    padding: 14,
  },
  lyricsHeader: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  lyricsHeaderWide: {
    fontSize: 14,
    marginBottom: 8,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricLine: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    lineHeight: 26,
  },
  lyricLineWide: {
    fontSize: 13,
    marginVertical: 5,
    lineHeight: 19,
  },
  activeLyricLine: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  activeLyricLineWide: {
    fontSize: 16,
  },
  noLyricsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLyricsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontStyle: 'italic',
  },
});
