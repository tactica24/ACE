import { useEffect, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Screen from '@/components/Screen';
import { apiGet, apiPost } from '@/lib/client';
import { theme } from '@/lib/theme';

export default function AdminScreen() {
  const [node, setNode] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const loadData = () => {
    apiGet(`/api/admin/node`).then(setNode).catch(() => null);
    apiGet<{ items: any[] }>(`/api/admin/moderation`).then((data) => setItems(data.items)).catch(() => null);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await apiPost(`/api/admin/moderation/${action}`, { id });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert('Action failed');
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Admin</Text>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Node health</Text>
        <Text style={{ color: theme.muted }}>CPU: {node ? (node.cpuLoad * 100).toFixed(1) : '--'}%</Text>
        <Text style={{ color: theme.muted }}>Memory: {node ? (node.memoryUsed * 100).toFixed(1) : '--'}%</Text>
        <Text style={{ color: theme.muted }}>Cache: {node ? (node.cacheHitRate * 100).toFixed(1) : '--'}%</Text>
        <Text style={{ color: theme.muted }}>Latency: {node ? node.latencyMs.toFixed(1) : '--'} ms</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Moderation queue</Text>
        {items.map((item) => (
          <View key={item.id} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '700' }}>{item.video.title}</Text>
            <Text style={{ color: theme.muted }}>{item.video.description}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Pressable style={styles.actionPrimary} onPress={() => handleAction(item.id, 'approve')}>
                <Text style={styles.actionText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.actionGhost} onPress={() => handleAction(item.id, 'reject')}>
                <Text style={styles.actionTextDark}>Reject</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {items.length === 0 ? <Text style={{ color: theme.muted }}>No pending items.</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionPrimary: {
    backgroundColor: theme.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8
  },
  actionGhost: {
    borderWidth: 1,
    borderColor: 'rgba(27,26,23,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  actionText: { color: 'white', fontWeight: '700' as const },
  actionTextDark: { color: theme.ink, fontWeight: '700' as const }
});
