import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface PlayerControlsProps {
  player: any;
  status: any;
  handlePlayPause: () => void;
  formatTime: (seconds: number) => string;
  onPrev: () => void;
  onNext: () => void;
}

export default function PlayerControls({ player, status, handlePlayPause, formatTime, onPrev, onNext }: PlayerControlsProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <>
      <View style={[styles.sliderContainer, isWide && styles.sliderContainerWide]}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={status.duration || 1}
          value={status.currentTime}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#535353"
          thumbTintColor="#1DB954"
          onValueChange={(value) => player.seekTo(value)}
          onSlidingComplete={(value) => player.seekTo(value)}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
        </View>
      </View>

      <View style={[styles.controls, isWide && styles.controlsWide]}>
        <TouchableOpacity>
          <Ionicons name="shuffle" size={isWide ? 22 : 32} color="#1DB954" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrev}>
          <Ionicons name="play-skip-back" size={isWide ? 28 : 40} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playButton, isWide && styles.playButtonWide]}
          onPress={handlePlayPause}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={isWide ? 28 : 40} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext}>
          <Ionicons name="play-skip-forward" size={isWide ? 28 : 40} color="white" />
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
