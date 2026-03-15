import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '@/components/Screen';
import { apiGet } from '@/lib/client';
import { theme } from '@/lib/theme';

export default function ContractsScreen() {
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    apiGet<{ contracts: any[] }>(`/api/studio/contracts`)
      .then((data) => setContracts(data.contracts))
      .catch(() => null);
  }, []);

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Contracts</Text>
      {contracts.map((contract) => (
        <View key={contract.id} style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 12 }}>
          <Text style={{ fontWeight: '700' }}>Video: {contract.videoId}</Text>
          <Text style={{ color: theme.muted }}>{contract.rightsTier}</Text>
          <Text style={{ marginTop: 8 }}>{contract.contractText}</Text>
        </View>
      ))}
      {contracts.length === 0 ? <Text style={{ color: theme.muted }}>No contracts yet.</Text> : null}
    </Screen>
  );
}
