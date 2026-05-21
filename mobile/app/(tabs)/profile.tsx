import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiGet } from '@/lib/client';
import { signOutMobileUser } from '@/lib/auth';
import { theme } from '@/lib/theme';

type ViewerUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<ViewerUser | null>(null);

  const loadProfile = useCallback(() => {
    apiGet<{ user: ViewerUser | null }>('/api/mobile/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSignOut = async () => {
    await signOutMobileUser().catch(() => null);
    setUser(null);
    router.replace('/login');
  };

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.ink }}>Profile</Text>
      <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.muted }}>Account</Text>
        <Text style={{ fontWeight: '700', color: theme.ink }}>{user?.name?.trim() || 'ACE Studio viewer'}</Text>
        <Text style={{ color: theme.muted }}>{user?.email ?? 'Sign in to view your account details.'}</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: '700', color: theme.ink }}>Help</Text>
        <Text style={{ color: theme.muted }}>
          If playback is unavailable, sign in with an account that has active access or contact ACE Studio support.
        </Text>
      </View>
      {user ? (
        <SecondaryButton label="Sign out" onPress={handleSignOut} />
      ) : (
        <PrimaryButton label="Sign in" onPress={() => router.push('/login')} />
      )}
    </Screen>
  );
}
