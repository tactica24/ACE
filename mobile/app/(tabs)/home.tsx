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
    apiGet<{ titles: any[] }>(`/api/mobile/titles?limit=6`)
      .then((data) => setHighlights(data.titles.slice(0, 6)))
      .catch(() => null);
  }, []);

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.ink }}>Ace Studio</Text>
        <Text style={{ color: theme.muted }}>
          Sign in, browse available titles, and watch content that already has active access on your account.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <PrimaryButton label="Explore Catalog" onPress={() => router.push('/browse')} />
        <SecondaryButton label="My Access" onPress={() => router.push('/library')} />
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
