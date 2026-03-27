import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiGet, apiPost, BASE_URL, getAuthHeaders } from '@/lib/client';
import { theme } from '@/lib/theme';

type DownloadItem = {
  video: {
    id: string;
    title: string;
    description: string;
    posterKey?: string | null;
  };
  package: {
    id: string;
    aceFileKey: string;
    status: string;
    createdAt: string;
  } | null;
};

export default function DownloadsScreen() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(() => {
    apiGet<{ items: DownloadItem[] }>('/api/offline/packages')
      .then((payload) => setItems(payload.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handlePrepare = async (videoId: string) => {
    setBusyId(videoId);
    try {
      await apiPost('/api/offline/packages', { videoId });
      loadItems();
    } catch (error) {
      Alert.alert('Offline package', error instanceof Error ? error.message : 'Could not prepare this package right now.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (item: DownloadItem) => {
    if (!item.package) {
      return;
    }

    setBusyId(item.video.id);
    try {
      const downloadsDirectory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}ace-downloads/`;
      await FileSystem.makeDirectoryAsync(downloadsDirectory, { intermediates: true });

      const targetPath = `${downloadsDirectory}${item.package.aceFileKey}`;
      const headers = await getAuthHeaders();
      const result = await FileSystem.downloadAsync(
        `${BASE_URL}/api/offline/packages/${item.package.id}/file`,
        targetPath,
        { headers }
      );

      if (result.status !== 200) {
        await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => null);
        throw new Error('The ACE package could not be downloaded right now.');
      }

      Alert.alert('Downloaded to ACE storage', 'The encrypted ACE package has been saved to your device for protected use and sharing.');
    } catch (error) {
      Alert.alert('Download failed', error instanceof Error ? error.message : 'The ACE package could not be downloaded.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.ink }}>My Downloads</Text>
      <Text style={{ color: theme.muted }}>
        Prepare protected ACE packages only after a title has been unlocked. These packages are encrypted and not plain MP4 files.
      </Text>

      {items.length ? (
        items.map((item) => (
          <View
            key={item.video.id}
            style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(27,26,23,0.08)' }}
          >
            <Text style={{ fontWeight: '700', color: theme.ink }}>{item.video.title}</Text>
            <Text style={{ color: theme.muted }}>{item.video.description}</Text>
            <Text style={{ color: theme.muted }}>
              {item.package ? `Package ready: ${item.package.aceFileKey}` : 'No protected package prepared yet.'}
            </Text>
            {item.package ? (
              <PrimaryButton
                label={busyId === item.video.id ? 'Downloading...' : 'Download encrypted ACE package'}
                onPress={() => handleDownload(item)}
                disabled={busyId === item.video.id}
              />
            ) : (
              <SecondaryButton
                label={busyId === item.video.id ? 'Preparing...' : 'Prepare offline package'}
                onPress={() => handlePrepare(item.video.id)}
                disabled={busyId === item.video.id}
              />
            )}
          </View>
        ))
      ) : (
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}>
          <Text style={{ color: theme.muted }}>Unlock a title first, then it will appear here for protected ACE packaging.</Text>
        </View>
      )}
    </Screen>
  );
}
