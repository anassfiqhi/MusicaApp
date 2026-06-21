import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';

interface MusicaInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const ACCENT_COLOR = '#1DB954';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#B3B3B3';
const INPUT_BG = '#282828';

export const MusicaInput = React.forwardRef<TextInput, MusicaInputProps>(
  ({ label, error, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={TEXT_SECONDARY}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </View>
        {error && <View style={styles.errorText}>{error}</View>}
      </View>
    );
  }
);

MusicaInput.displayName = 'MusicaInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: INPUT_BG,
    borderBottomWidth: 2,
    borderBottomColor: INPUT_BG,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrapperFocused: {
    borderBottomColor: ACCENT_COLOR,
    backgroundColor: '#383838',
  },
  inputWrapperError: {
    borderBottomColor: '#FF4444',
  },
  input: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    padding: 0,
  },
  errorText: {
    fontSize: 11,
    color: '#FF4444',
    marginTop: 6,
    fontWeight: '500',
  },
});
