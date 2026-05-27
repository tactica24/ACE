import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiGet, BASE_URL } from '@/lib/client';
import { getDeviceSessionId } from '@/lib/device-session';
import { theme } from '@/lib/theme';

type TitleAccess = {
  hasAccess: boolean;
  status: 'ACTIVE' | 'NO_ACCESS' | 'SIGN_IN_REQUIRED';
  message: string;
};

type TitleDetailPayload = {
  title: {
    id: string;
    title: string;
    description: string;
    videoType: string;
    ageRating: string;
    category: string;
    genres: string[];
    teaserSec: number;
    durationSec: number;
    releaseYear?: number | null;
    highlightSeconds: number[];
  };
  access: TitleAccess;
};

function toAbsoluteApiUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [data, setData] = useState<TitleDetailPayload | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [showAccessNotice, setShowAccessNotice] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [deviceSessionId, setDeviceSessionId] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    apiGet<TitleDetailPayload>(`/api/mobile/titles/${id}`)
      .then((payload) => setData(payload))
      .catch(() => null);
  }, [id]);

  useEffect(() => {
    getDeviceSessionId()
      .then((value) => setDeviceSessionId(value))
      .catch(() => null);
  }, []);

  const loadStream = useCallback(async () => {
    if (!id) return;
    const query = new URLSearchParams({ videoId: id, teaser: '1' });
    if (deviceSessionId) {
      query.set('deviceSessionId', deviceSessionId);
    }

    setPlayerError(null);
    try {
      const payload = await apiGet<{
        token: string;
        guest?: boolean;
        playback?: {
          preferred?: 'progressive' | 'unavailable';
          progressiveUrl?: string | null;
        };
      }>(`/api/stream/token?${query.toString()}`);
      const preferredUrl = payload.playback?.progressiveUrl;
      const fallbackUrl = payload.playback?.progressiveUrl ?? `${BASE_URL}/api/stream/${id}?token=${payload.token}`;
      setStreamUrl(toAbsoluteApiUrl(preferredUrl ?? fallbackUrl));
      setAuthRequired(false);
      setShowAccessNotice(false);
    } catch (error) {
      setStreamUrl('');
      setAuthRequired(true);
      if (error instanceof Error) {
      setPlayerError(error.message);
      }
    }
  }, [deviceSessionId, id]);

  useEffect(() => {
    if (!id) return;
    void loadStream();
  }, [id, loadStream]);

  const handleSeek = async (sec: number) => {
    try {
      await videoRef.current?.setPositionAsync(sec * 1000);
      await videoRef.current?.playAsync();
    } catch {
      return;
    }
  };

  const teaserSec = data?.title.teaserSec ?? 0;
  const highlightSeconds: number[] = data?.title.highlightSeconds ?? [];
  const hasAccess = Boolean(data?.access.hasAccess);
  const maxPreview = hasAccess ? Number.POSITIVE_INFINITY : Math.max(teaserSec - 2, 0);

  return (
    <Screen>
      <Text style={styles.title}>{data?.title.title ?? 'Loading...'}</Text>
      <Text style={styles.desc}>{data?.title.description}</Text>
      <Text style={styles.meta}>{[data?.title.category, data?.title.videoType, data?.title.ageRating].filter(Boolean).join(' | ')}</Text>
      {streamUrl ? (
        <View style={styles.player}>
          <Video
            ref={videoRef as any}
            source={{ uri: streamUrl }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            style={styles.video}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              const currentSec = status.positionMillis / 1000;
              if (!hasAccess && currentSec >= teaserSec) {
                videoRef.current?.pauseAsync();
                setShowAccessNotice(true);
              }
            }}
          />
          {showAccessNotice && !hasAccess ? (
            <View style={styles.paywall}>
              <Text style={styles.paywallTitle}>Playback unavailable</Text>
              <Text style={styles.paywallSub}>{data?.access.message ?? 'You do not currently have access to this title.'}</Text>
              <PrimaryButton label="Sign in" onPress={() => router.push('/login')} />
            </View>
          ) : null}
        </View>
      ) : authRequired ? (
        <View style={styles.card}>
          <Text style={styles.desc}>Please sign in with an account that has access.</Text>
          <PrimaryButton label="Sign in" onPress={() => router.push('/login')} />
        </View>
      ) : (
        <View style={styles.card}><Text style={styles.desc}>Loading stream...</Text></View>
      )}

      {playerError && !streamUrl ? (
        <View style={styles.card}>
          <Text style={styles.desc}>{playerError}</Text>
          <SecondaryButton label="Retry playback" onPress={() => void loadStream()} />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Access</Text>
        <Text style={styles.desc}>{data?.access.message ?? 'Playback availability will appear here once this title loads.'}</Text>
        {!hasAccess ? (
          <SecondaryButton label="Open My Access" onPress={() => router.push('/library')} />
        ) : null}
      </View>

      {hasAccess ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Active access</Text>
          <Text style={styles.desc}>This title is available for playback on your account.</Text>
        </View>
      ) : null}

      {highlightSeconds.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preview moments</Text>
          <View style={styles.badgeRow}>
            {highlightSeconds.map((sec) => {
              const locked = sec > maxPreview;
              return (
                <Pressable
                  key={sec}
                  style={[styles.badge, locked && styles.badgeDisabled]}
                  onPress={() => !locked && handleSeek(sec)}
                >
                  <Text style={styles.badgeText}>{locked ? 'Locked' : 'Preview'} {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: theme.ink },
  desc: { color: theme.muted },
  meta: { color: theme.muted, marginBottom: 8 },
  player: { backgroundColor: '#111', borderRadius: 16, overflow: 'hidden' },
  video: { width: '100%', height: 220 },
  paywall: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16
  },
  paywallTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  paywallSub: { color: 'white', opacity: 0.85 },
  card: { backgroundColor: theme.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(27,26,23,0.08)' },
  sectionTitle: { fontWeight: '700', marginBottom: 8, color: theme.ink },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: '#f1e7d8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: theme.ink, fontSize: 12 },
  badgeDisabled: { opacity: 0.6 }
});
