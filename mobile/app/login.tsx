import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { BASE_URL } from '@/lib/client';
import { firebaseAuth } from '@/lib/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (!res.ok) {
        await signOut(firebaseAuth).catch(() => null);
        throw new Error(data.error || 'Login failed');
      }
      router.replace('/browse');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Login failed');
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
