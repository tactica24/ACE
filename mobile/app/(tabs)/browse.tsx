import { useEffect, useState } from 'react';
import Screen from '@/components/Screen';
import VideoCard, { MobileVideo } from '@/components/VideoCard';
import { apiGet } from '@/lib/client';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

export default function BrowseScreen() {
  const [videos, setVideos] = useState<MobileVideo[]>([]);
  const router = useRouter();

  useEffect(() => {
    apiGet<{ videos: MobileVideo[] }>('/api/videos?limit=24')
      .then((data) => setVideos(data.videos))
      .catch(() => setVideos([]));
  }, []);

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Browse</Text>
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onPress={() => router.push(`/video/${video.id}`)} />
      ))}
    </Screen>
  );
}
