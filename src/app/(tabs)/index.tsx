import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getHomeFeed, getPlaylistCover, type FeedCategory, type PlaylistRef } from '@/services/api';
import { useSession, signOut } from '@/utils/authClient';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}


function openPlaylist(playlist: PlaylistRef) {
  router.push({ pathname: '/playlist/[id]', params: { id: playlist.id, title: playlist.title } });
}

// ── Quick-pick row item (2-column grid) ───────────────────────────────────────
function QuickItem({ item, width }: { item: PlaylistRef; width: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.quickItem, { width }]}
      onPress={() => openPlaylist(item)}
      activeOpacity={0.75}
    >
      {failed || !item.cover ? (
        <View style={styles.quickArtFallback}>
          <Ionicons name="musical-notes" size={22} color="#535353" />
        </View>
      ) : (
        <Image
          source={{ uri: item.cover }}
          style={styles.quickArt}
          contentFit="cover"
          recyclingKey={item.id}
          onError={() => setFailed(true)}
        />
      )}
      <Text style={styles.quickTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );
}

// ── Standard playlist card (horizontal scroll) ────────────────────────────────
function PlaylistCard({ item, size }: { item: PlaylistRef; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <TouchableOpacity
      style={{ width: size }}
      onPress={() => openPlaylist(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.cardImageWrap, { width: size, height: size }]}>
        {!failed && item.cover ? (
          <Image
            source={{ uri: item.cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={item.id}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={styles.cardFallback}>
            <Ionicons name="musical-notes" size={32} color="#535353" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 0, y: 1 }}
        />
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Featured hero card (first playlist of first section) ──────────────────────
function HeroCard({ item, width }: { item: PlaylistRef; width: number }) {
  return (
    <TouchableOpacity
      style={[styles.heroCard, { width }]}
      onPress={() => openPlaylist(item)}
      activeOpacity={0.85}
    >
      {item.cover ? (
        <Image
          source={{ uri: item.cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          recyclingKey={item.id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cardFallback]}>
          <Ionicons name="musical-notes" size={48} color="#535353" />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.heroContent}>
        <Text style={styles.heroLabel}>Featured playlist</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.heroPlayBtn}>
          <Ionicons name="play" size={22} color="#000" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<FeedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting] = useState(getGreeting);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { data: session } = useSession();

  const fetchFeed = useCallback(async () => {
    try {
      const raw = await getHomeFeed();
      const enriched = await Promise.all(
        raw.map(async (section) => {
          const playlists = await Promise.all(
            section.playlists.map(async (p) => {
              if (p.cover) return p;
              const cover = await getPlaylistCover(p.id).catch(() => '');
              return cover ? { ...p, cover } : p;
            })
          );
          return { ...section, playlists: playlists.filter((p) => p.cover) };
        })
      );
      setCategories(enriched.filter((s) => s.playlists.length > 0));
    } catch {}
  }, []);

  useEffect(() => {
    fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  }, [fetchFeed]);

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to log out');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // Layout constants
  const cardSize = 152;
  const quickColGap = 10;
  const quickColW = (width - 32 - quickColGap) / 2;
  const heroW = width - 32;

  const firstSection = categories[0];
  const restSections = categories.slice(1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#1DB954" size="large" />
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cloud-offline-outline" size={40} color="#535353" />
            </View>
            <Text style={styles.emptyTitle}>Nothing to show</Text>
            <Text style={styles.emptyText}>Pull down to refresh</Text>
          </View>
        ) : (
          <>
            {/* ── First section: hero + quick-pick grid ── */}
            {firstSection && (
              <>
                {/* Hero card */}
                {firstSection.playlists[0] && (
                  <View style={styles.heroWrap}>
                    <HeroCard item={firstSection.playlists[0]} width={heroW} />
                  </View>
                )}

                {/* Quick-pick 2-column grid (remaining playlists, up to 6) */}
                {firstSection.playlists.length > 1 && (
                  <>
                    <SectionHeader title={firstSection.title} />
                    <View style={styles.quickGrid}>
                      {firstSection.playlists.slice(1, 7).map((item) => (
                        <QuickItem key={item.id} item={item} width={quickColW} />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── Remaining sections: horizontal card scroll ── */}
            {restSections.map((section) => (
              <View key={section.title} style={styles.section}>
                <SectionHeader title={section.title} />
                <FlatList
                  data={section.playlists}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.cardRow}
                  renderItem={({ item }) => (
                    <PlaylistCard item={item} size={cardSize} />
                  )}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Account</Text>
              <View style={{ width: 24 }} />
            </View>

            {session ? (
              <>
                <View style={styles.profileSection}>
                  <View style={styles.profileAvatar}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                  <Text style={styles.userName}>{session.user?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{session.user?.email || ''}</Text>
                </View>

                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out" size={20} color="#fff" />
                  <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.profileSection}>
                <Text style={styles.notLoggedIn}>Not logged in</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    flex: 1,
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#535353',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: { paddingTop: 80, alignItems: 'center' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#9B9B9B', fontSize: 13 },

  // Hero
  heroWrap: { paddingHorizontal: 16, marginBottom: 20 },
  heroCard: {
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 28,
    paddingRight: 64,
  },
  heroPlayBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },

  // Section header
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Quick-pick grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 6,
    overflow: 'hidden',
    height: 56,
    gap: 12,
  },
  quickArt: { width: 56, height: 56 },
  quickArtFallback: {
    width: 56,
    height: 56,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    paddingRight: 8,
  },

  // Cards
  cardRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  cardImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#282828',
    justifyContent: 'flex-end',
  },
  cardFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#282828',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingBottom: 10,
    lineHeight: 17,
  },

  // Modal
  modalContent: {
    marginTop: 'auto',
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  userEmail: {
    color: '#B3B3B3',
    fontSize: 14,
    fontWeight: '500',
  },
  notLoggedIn: {
    color: '#B3B3B3',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#FF4444',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 10,
  },
  logoutBtnText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
