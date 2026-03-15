import { Tabs } from 'expo-router';
import { theme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarStyle: { backgroundColor: 'white' }
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Tabs.Screen name="studio" options={{ title: 'Studio' }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
    </Tabs>
  );
}
