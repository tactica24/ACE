import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiGet, apiPost, BASE_URL } from '@/lib/client';
import { getDeviceSessionId } from '@/lib/device-session';
import { theme } from '@/lib/theme';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [data, setData] = useState<any>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [deviceSessionId, setDeviceSessionId] = useState<string>('');
  const [preparingOffline, setPreparingOffline] = useState(false);
  const [watermarkText, setWatermarkText] = useState('Ace Studio Preview');

  useEffect(() => {
    if (!id) return;
    apiGet<{ video: any; price: { currency: string; amountMinor: number }; unlocked: boolean }>(`/api/videos/${id}`)
      .then((payload) => {
        setData(payload);
        setUnlocked(payload.unlocked);
      })
      .catch(() => null);
  }, [id]);

  useEffect(() => {
    getDeviceSessionId()
      .then((value) => setDeviceSessionId(value))
      .catch(() => null);
  }, []);

  useEffect(() => {
    apiGet<{ user: { name?: string | null; email?: string | null } | null }>('/api/me')
      .then((payload) => {
        const preferredName = payload.user?.name?.trim();
        const emailHandle = payload.user?.email?.split('@')[0]?.trim();
        const nextWatermark = preferredName || emailHandle;
        if (nextWatermark) {
          setWatermarkText(nextWatermark);
        }
      })
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
      const payload = await apiGet<{ token: string; guest?: boolean }>(`/api/stream/token?${query.toString()}`);
      setStreamUrl(`${BASE_URL}/api/stream/${id}?token=${payload.token}`);
      setAuthRequired(false);
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

  const handleUnlock = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await apiPost('/api/unlock', { videoId: id });
      setUnlocked(true);
      setShowPaywall(false);
      await loadStream();
      videoRef.current?.playAsync();
    } catch {
      alert('Sign in to unlock or top up your wallet.');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareOffline = async () => {
    if (!id || !unlocked) {
      return;
    }

    setPreparingOffline(true);
    try {
      await apiPost('/api/offline/packages', { videoId: id });
      Alert.alert(
        'Secure ACE package ready',
        'Your protected ACE package is ready. Open Downloads to save it into the app for offline use.'
      );
      router.push('/downloads');
    } catch (error) {
      Alert.alert(
        'Offline package',
        error instanceof Error ? error.message : 'This title could not be prepared for protected offline use.'
      );
    } finally {
      setPreparingOffline(false);
    }
  };

  const handleSeek = async (sec: number) => {
    try {
      await videoRef.current?.setPositionAsync(sec * 1000);
      await videoRef.current?.playAsync();
    } catch {
      return;
    }
  };

  const teaserSec = data?.video?.teaserSec ?? 0;
  const highlightSeconds: number[] = data?.video?.highlightSeconds ?? [];
  const maxPreview = unlocked ? Number.POSITIVE_INFINITY : Math.max(teaserSec - 2, 0);
  const priceLabel = data?.price
    ? data.price.currency === 'NGN'
      ? `NGN ${Math.round(data.price.amountMinor / 100)}`
      : `${data.price.currency} ${(data.price.amountMinor / 100).toFixed(2)}`
    : null;

  return (
    <Screen>
      <Text style={styles.title}>{data?.video?.title ?? 'Loading...'}</Text>
      <Text style={styles.desc}>{data?.video?.description}</Text>
      <Text style={styles.meta}>{[data?.video?.category, data?.video?.videoType, data?.video?.ageRating].filter(Boolean).join(' | ')}</Text>
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
              if (!unlocked && currentSec >= teaserSec) {
                videoRef.current?.pauseAsync();
                setShowPaywall(true);
              }
            }}
          />
          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>{watermarkText}</Text>
          </View>
          {showPaywall && !unlocked ? (
            <View style={styles.paywall}>
              <Text style={styles.paywallTitle}>Unlock full video</Text>
              <Text style={styles.paywallSub}>{priceLabel ? `Pay ${priceLabel} to continue.` : 'Pay to continue.'}</Text>
              <PrimaryButton label={loading ? 'Processing...' : 'Pay to unlock'} onPress={handleUnlock} disabled={loading} />
            </View>
          ) : null}
        </View>
      ) : authRequired ? (
        <View style={styles.card}>
          <Text style={styles.desc}>Sign in to play this title.</Text>
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

      {unlocked ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Offline in ACE app</Text>
          <Text style={styles.desc}>
            Save this unlocked title as a protected `.ace` package for app-only offline access and secure sharing.
          </Text>
          <PrimaryButton
            label={preparingOffline ? 'Preparing secure package...' : 'Prepare secure download'}
            onPress={handlePrepareOffline}
            disabled={preparingOffline}
          />
          <SecondaryButton label="Open Downloads" onPress={() => router.push('/downloads')} />
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
  watermark: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  watermarkText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
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
