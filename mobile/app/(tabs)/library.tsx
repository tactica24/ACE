import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import VideoCard, { type MobileVideo } from '@/components/VideoCard';
import { apiGet } from '@/lib/client';
import { theme } from '@/lib/theme';

type LibraryTitle = MobileVideo & {
  accessGrantedAt: string;
  accessStatus: 'ACTIVE';
};

export default function LibraryScreen() {
  const router = useRouter();
  const [titles, setTitles] = useState<LibraryTitle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(() => {
    apiGet<{ titles: LibraryTitle[] }>('/api/mobile/me/library')
      .then((data) => {
        setTitles(data.titles);
        setError(null);
      })
      .catch((loadError) => {
        setTitles([]);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your access library right now.');
      });
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.ink }}>My Access</Text>
      <Text style={{ color: theme.muted }}>
        Titles with active access on this account appear here for quick playback.
      </Text>

      {titles.length ? (
        titles.map((title) => (
          <View key={title.id} style={{ gap: 6 }}>
            <VideoCard video={title} onPress={() => router.push(`/video/${title.id}`)} />
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Active on your account since {new Date(title.accessGrantedAt).toISOString().slice(0, 10)}
            </Text>
          </View>
        ))
      ) : (
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 12 }}>
          <Text style={{ color: theme.ink, fontWeight: '700' }}>No active access found</Text>
          <Text style={{ color: theme.muted }}>
            This account does not currently have any titles available in the app library.
          </Text>
          {error ? <Text style={{ color: theme.muted }}>{error}</Text> : null}
          <PrimaryButton label="Sign in" onPress={() => router.push('/login')} />
        </View>
      )}
    </Screen>
  );
}
