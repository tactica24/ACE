import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { BASE_URL } from '@/lib/client';
import { firebaseAuth } from '@/lib/firebase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, phone })
      });
      const data = await res.json();
      if (!res.ok) {
        await deleteUser(credential.user).catch(() => null);
        throw new Error(data.error || 'Register failed');
      }
      router.replace('/browse');
    } catch {
      alert('Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Create account</Text>
      <View style={{ gap: 12 }}>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderRadius: 12, padding: 12 }} autoCapitalize="none" />
        <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={{ borderWidth: 1, borderRadius: 12, padding: 12 }} />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={{ borderWidth: 1, borderRadius: 12, padding: 12 }} secureTextEntry />
      </View>
      <PrimaryButton label={loading ? 'Creating...' : 'Create account'} onPress={handleRegister} disabled={loading} />
      <SecondaryButton label="Sign in" onPress={() => router.push('/login')} />
    </Screen>
  );
}
