import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { authClient } from '@/utils/authClient';
import { Ionicons } from '@expo/vector-icons';
import { MusicaInput } from '@/components/MusicaInput';

const ACCENT_COLOR = '#1DB954';
const DARK_BG = '#121212';
const SECONDARY_BG = '#1E1E1E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#B3B3B3';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        Alert.alert('Signup Failed', result.error.message || 'An error occurred');
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 32 }}>
          {/* Header with Logo */}
          <View>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: ACCENT_COLOR,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24
              }}>
                <Ionicons name="musical-notes" size={32} color={DARK_BG} />
              </View>
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: TEXT_PRIMARY,
                letterSpacing: -0.5
              }}>
                Musica
              </Text>
              <Text style={{
                fontSize: 14,
                color: TEXT_SECONDARY,
                marginTop: 8,
                fontWeight: '500'
              }}>
                Create your account
              </Text>
            </View>

            {/* Name Input */}
            <MusicaInput
              label="FULL NAME"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              editable={!loading}
              autoCapitalize="words"
            />

            {/* Email Input */}
            <MusicaInput
              label="EMAIL ADDRESS"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Password Input */}
            <MusicaInput
              label="PASSWORD"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry
            />
            <Text style={{
              fontSize: 11,
              color: TEXT_SECONDARY,
              marginTop: -10,
              marginBottom: 16,
              fontWeight: '400',
            }}>
              Minimum 6 characters
            </Text>

            {/* Confirm Password Input */}
            <MusicaInput
              label="CONFIRM PASSWORD"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
              secureTextEntry
            />
            <Text style={{
              fontSize: 11,
              color: TEXT_SECONDARY,
              marginTop: -10,
              marginBottom: 32,
              fontWeight: '400',
            }}>
              Must match password
            </Text>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={{
                backgroundColor: ACCENT_COLOR,
                paddingVertical: 12,
                borderRadius: 24,
                alignItems: 'center',
                opacity: loading ? 0.7 : 1,
                marginBottom: 24
              }}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={DARK_BG} size="small" />
              ) : (
                <Text style={{
                  color: DARK_BG,
                  fontSize: 16,
                  fontWeight: '700',
                  letterSpacing: 0.5
                }}>
                  SIGN UP
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Log In Link */}
          <View style={{
            alignItems: 'center',
            paddingBottom: 20,
            borderTopWidth: 1,
            borderTopColor: SECONDARY_BG,
            paddingTop: 24
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: TEXT_SECONDARY }}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text style={{
                    fontSize: 14,
                    color: ACCENT_COLOR,
                    fontWeight: '700'
                  }}>
                    Log in
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
    </SafeAreaView>
  );
}
