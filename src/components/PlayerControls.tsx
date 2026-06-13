import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface PlayerControlsProps {
  player: any;
  status: any;
  handlePlayPause: () => void;
  formatTime: (seconds: number) => string;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function PlayerControls({ player, status, handlePlayPause, formatTime, onPrev, onNext, isLoading, hasPrev = true, hasNext = true }: PlayerControlsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [seekValue, setSeekValue] = useState<number | null>(null);

  // Validate duration and position - ensure they're positive numbers
  const validDuration = Math.max(0, Math.abs(status.duration || 0));
  const validPosition = Math.max(0, Math.abs(status.currentTime ?? 0));
  const displayTime = seekValue ?? validPosition;

  return (
    <>
      <View style={[styles.sliderContainer, isWide && styles.sliderContainerWide]}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={validDuration || 1}
          value={seekValue ?? validPosition}
          minimumTrackTintColor={isLoading ? '#535353' : '#1DB954'}
          maximumTrackTintColor="#535353"
          thumbTintColor={isLoading ? 'transparent' : '#1DB954'}
          disabled={isLoading}
          onValueChange={(value) => setSeekValue(value)}
          onSlidingComplete={(value) => {
            player.seekTo(value);
            setSeekValue(null);
          }}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isLoading && styles.timeTextDisabled]}>
            {isLoading ? '--:--' : formatTime(displayTime)}
          </Text>
          <Text style={[styles.timeText, isLoading && styles.timeTextDisabled]}>
            {isLoading ? '--:--' : formatTime(validDuration)}
          </Text>
        </View>
      </View>

      <View style={[styles.controls, isWide && styles.controlsWide]}>
        <TouchableOpacity>
          <Ionicons name="shuffle" size={isWide ? 22 : 32} color="#1DB954" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrev} disabled={!hasPrev}>
          <Ionicons name="play-skip-back" size={isWide ? 28 : 40} color={hasPrev ? 'white' : '#535353'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playButton, isWide && styles.playButtonWide]}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="black" size={isWide ? 22 : 32} />
            : <Ionicons name={status.playing ? 'pause' : 'play'} size={isWide ? 28 : 40} color="black" />
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} disabled={!hasNext}>
          <Ionicons name="play-skip-forward" size={isWide ? 28 : 40} color={hasNext ? 'white' : '#535353'} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="repeat" size={isWide ? 22 : 32} color="white" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    marginTop: 30,
  },
  sliderContainerWide: {
    marginTop: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  timeText: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  timeTextDisabled: {
    color: '#3a3a3a',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  controlsWide: {
    marginTop: 16,
  },
  playButton: {
    backgroundColor: 'white',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playButtonWide: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
});
