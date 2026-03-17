import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

export type MobileVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: 'SNACK' | 'STANDARD' | 'PREMIERE';
  price?: { currency: string; amountMinor: number };
  category?: string;
  videoType?: string;
  ageRating?: string;
};

const priceMap = {
  SNACK: 100,
  STANDARD: 200,
  PREMIERE: 500
};

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

export default function VideoCard({ video, onPress }: { video: MobileVideo; onPress?: () => void }) {
  const priceLabel = video.price
    ? video.price.currency === 'NGN'
      ? `₦${Math.round(video.price.amountMinor / 100)}`
      : `${video.price.currency} ${(video.price.amountMinor / 100).toFixed(2)}`
    : `₦${priceMap[video.priceTier]}`;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumb}>
        <Text style={styles.thumbText}>AS</Text>
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
        <Text style={styles.price}>{priceLabel}</Text>
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
  thumbText: {
    fontWeight: '700',
    color: theme.brand
  },
  metaBlock: { padding: 14, gap: 6 },
  title: { fontWeight: '700', color: theme.ink, fontSize: 16 },
  desc: { color: theme.muted },
  metaText: { color: theme.muted, fontSize: 12 },
  price: { color: theme.accent, fontWeight: '700' }
});
