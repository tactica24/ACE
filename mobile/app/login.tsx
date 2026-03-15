import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { BASE_URL } from '@/lib/client';
import { saveToken } from '@/lib/auth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      await saveToken(data.token);
      router.replace('/browse');
    } catch {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Sign in</Text>
      <View style={{ gap: 12 }}>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderRadius: 12, padding: 12 }} autoCapitalize="none" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={{ borderWidth: 1, borderRadius: 12, padding: 12 }} secureTextEntry />
      </View>
      <PrimaryButton label={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} disabled={loading} />
      <SecondaryButton label="Create account" onPress={() => router.push('/register')} />
    </Screen>
  );
}
