import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '@/lib/theme';

export default function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe}>
      <Wrapper contentContainerStyle={styles.content} style={styles.wrapper}>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  wrapper: { flex: 1 },
  content: { padding: 20, gap: 16 }
});
