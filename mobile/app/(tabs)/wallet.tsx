import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import SecondaryButton from '@/components/SecondaryButton';
import { apiFetch, apiGet, apiPost } from '@/lib/client';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '@/lib/theme';

export default function WalletScreen() {
  const [balanceLabel, setBalanceLabel] = useState('NGN 0');
  const [credits, setCredits] = useState(0);
  const [passCreditsRemaining, setPassCreditsRemaining] = useState<number | null>(null);
  const [passPriceLabel, setPassPriceLabel] = useState('NGN 2,500');
  const [passCredits, setPassCredits] = useState(30);
  const [familyBundlePriceLabel, setFamilyBundlePriceLabel] = useState('NGN 2,500');
  const [familyBundleCredits, setFamilyBundleCredits] = useState(30);
  const [topupAmount, setTopupAmount] = useState('500');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const loadWallet = () => {
    apiGet<{
      balanceNaira: number;
      balanceLabel?: string;
      credits: number;
      passPriceLabel?: string;
      passCredits?: number;
      familyBundlePriceLabel?: string;
      familyBundleCredits?: number;
      pass?: { creditsRemaining: number } | null;
    }>(`/api/wallet`)
      .then((data) => {
        setBalanceLabel(data.balanceLabel ?? `NGN ${data.balanceNaira}`);
        setCredits(data.credits);
        setPassPriceLabel(data.passPriceLabel ?? 'NGN 2,500');
        setPassCredits(data.passCredits ?? 30);
        setFamilyBundlePriceLabel(data.familyBundlePriceLabel ?? 'NGN 2,500');
        setFamilyBundleCredits(data.familyBundleCredits ?? 30);
        setPassCreditsRemaining(data.pass?.creditsRemaining ?? null);
      })
      .catch(() => null);
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const verifyReference = async (reference?: string) => {
    if (!reference) return;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await apiFetch('/api/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({ reference })
      });
      if (res.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      break;
    }
  };

  const handleTopup = async () => {
    setLoading(true);
    try {
      const amountNaira = parseInt(topupAmount || '0', 10);
      const data = await apiPost<{ authorizationUrl: string; reference: string }>(`/api/wallet/topup`, { amountNaira });
      await WebBrowser.openBrowserAsync(data.authorizationUrl);
      await verifyReference(data.reference);
      loadWallet();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    setLoading(true);
    try {
      const data = await apiPost<{ authorizationUrl: string; reference: string }>(`/api/pass/subscribe`);
      await WebBrowser.openBrowserAsync(data.authorizationUrl);
      await verifyReference(data.reference);
      loadWallet();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Wallet</Text>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ color: theme.muted }}>Balance</Text>
        <Text style={{ fontSize: 24, fontWeight: '800' }}>{balanceLabel}</Text>
        <Text style={{ color: theme.muted }}>Credits: {credits}</Text>
        {passCreditsRemaining !== null ? <Text style={{ color: theme.muted }}>Active pass credits: {passCreditsRemaining}</Text> : null}
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Top up</Text>
        <TextInput
          value={topupAmount}
          onChangeText={setTopupAmount}
          keyboardType="numeric"
          style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
        />
        <PrimaryButton label={loading ? 'Starting...' : 'Top up wallet'} onPress={handleTopup} disabled={loading} />
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Hybrid Pass</Text>
        <Text style={{ color: theme.muted }}>{passPriceLabel} / month · {passCredits} credits</Text>
        <SecondaryButton label={loading ? 'Processing...' : 'Activate pass'} onPress={handlePass} />
      </View>
      <View style={{ backgroundColor: theme.surface, padding: 16, borderRadius: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Family Pass (Diaspora)</Text>
        <Text style={{ color: theme.muted, marginBottom: 8 }}>{familyBundlePriceLabel} · {familyBundleCredits} credits</Text>
        <TextInput
          placeholder="Recipient phone (Nigeria)"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 }}
        />
        <SecondaryButton
          label={loading ? 'Processing...' : 'Send Home Bundle'}
          onPress={async () => {
            if (!recipientPhone) return;
            setLoading(true);
            try {
              const data = await apiPost<{ authorizationUrl: string; reference: string }>(`/api/family/pass`, {
                recipientPhone
              });
              await WebBrowser.openBrowserAsync(data.authorizationUrl);
              await verifyReference(data.reference);
              loadWallet();
            } catch (error) {
              alert(error instanceof Error ? error.message : 'Family pass failed');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading || !recipientPhone}
        />
      </View>
    </Screen>
  );
}
