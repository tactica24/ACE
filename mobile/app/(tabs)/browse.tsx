import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import VideoCard, { type MobileVideo } from '@/components/VideoCard';
import { apiGet } from '@/lib/client';
import { theme } from '@/lib/theme';

export default function BrowseScreen() {
  const [titles, setTitles] = useState<MobileVideo[]>([]);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    apiGet<{ titles: MobileVideo[] }>('/api/mobile/titles?limit=24')
      .then((data) => setTitles(data.titles))
      .catch(() => setTitles([]));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTitles = titles.filter((title) => {
    const searchableText = [title.title, title.description, title.category, title.videoType].filter(Boolean).join(' ').toLowerCase();
    return searchableText.includes(normalizedQuery);
  });

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Browse</Text>
      <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(27,26,23,0.08)' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles"
          style={{ borderWidth: 1, borderColor: 'rgba(27,26,23,0.12)', borderRadius: 12, padding: 12 }}
        />
      </View>
      {filteredTitles.map((title) => (
        <VideoCard key={title.id} video={title} onPress={() => router.push(`/video/${title.id}`)} />
      ))}
      {!filteredTitles.length ? <Text style={{ color: theme.muted }}>No titles matched your search.</Text> : null}
    </Screen>
  );
}
