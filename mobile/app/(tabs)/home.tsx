import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { useRouter } from 'expo-router';
import { theme } from '@/lib/theme';
import { apiGet } from '@/lib/client';

export default function HomeScreen() {
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    apiGet<{ videos: any[] }>(`/api/videos?limit=6`)
      .then((data) => setHighlights(data.videos.slice(0, 6)))
      .catch(() => null);
  }, []);

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.ink }}>Ace Studio</Text>
        <Text style={{ color: theme.muted }}>
          Africa-first video marketplace with instant wallet unlocks.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <PrimaryButton label="Explore Catalog" onPress={() => router.push('/browse')} />
        <SecondaryButton label="Sign in" onPress={() => router.push('/login')} />
        <SecondaryButton label="Create account" onPress={() => router.push('/register')} />
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Highlights</Text>
        {highlights.map((video) => (
          <Pressable key={video.id} onPress={() => router.push(`/video/${video.id}`)} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: '700' }}>{video.title}</Text>
            <Text style={{ color: theme.muted }}>{video.category} · {video.videoType} · {video.ageRating}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
