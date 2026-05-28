import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/lib/client';
import { theme } from '@/lib/theme';

export type MobileVideo = {
  id: string;
  title: string;
  description: string;
  category?: string;
  videoType?: string;
  ageRating?: string;
  posterUrl?: string | null;
};

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

function toAbsolutePosterUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function VideoCard({ video, onPress }: { video: MobileVideo; onPress?: () => void }) {
  const posterUrl = toAbsolutePosterUrl(video.posterUrl);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumb}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <Text style={styles.thumbText}>AS</Text>
        )}
      </View>
      <View style={styles.metaBlock}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{video.description}</Text>
        {(video.category || video.videoType || video.ageRating) ? (
          <Text style={styles.metaText}>
            {[video.category, video.videoType, video.ageRating ? (ageLabel[video.ageRating] ?? video.ageRating) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(27, 26, 23, 0.08)'
  },
  thumb: {
    height: 140,
    backgroundColor: '#f1e7d8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  poster: {
    width: '100%',
    height: '100%'
  },
  thumbText: {
    fontWeight: '700',
    color: theme.brand
  },
  metaBlock: { padding: 14, gap: 6 },
  title: { fontWeight: '700', color: theme.ink, fontSize: 16 },
  desc: { color: theme.muted },
  metaText: { color: theme.muted, fontSize: 12 }
});
