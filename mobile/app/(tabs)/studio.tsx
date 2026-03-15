import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiGet } from '@/lib/client';
import { useRouter } from 'expo-router';
import { theme } from '@/lib/theme';

export default function StudioScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    apiGet(`/api/studio/analytics`).then(setAnalytics).catch(() => null);
    apiGet<{ videos: any[] }>(`/api/studio/library`).then((data) => setVideos(data.videos)).catch(() => null);
  }, []);

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Creator Studio</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16, minWidth: 140 }}>
          <Text style={{ color: theme.muted }}>Unlocks today</Text>
          <Text style={{ fontWeight: '800' }}>{analytics?.unlocksToday ?? '--'}</Text>
        </View>
        <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16, minWidth: 140 }}>
          <Text style={{ color: theme.muted }}>Revenue today</Text>
          <Text style={{ fontWeight: '800' }}>₦{analytics?.revenueToday ?? '--'}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <PrimaryButton label="Upload" onPress={() => router.push('/studio/upload')} />
        <SecondaryButton label="Contracts" onPress={() => router.push('/studio/contracts')} />
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Library</Text>
        {videos.map((video) => (
          <View key={video.id} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: '700' }}>{video.title}</Text>
            <Text style={{ color: theme.muted }}>{video.status} · {video.priceTier}</Text>
          </View>
        ))}
        {videos.length === 0 ? <Text style={{ color: theme.muted }}>No uploads yet.</Text> : null}
      </View>
    </Screen>
  );
}
