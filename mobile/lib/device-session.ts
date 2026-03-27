import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_SESSION_KEY = 'ace_device_session_id';

export async function getDeviceSessionId() {
  const existing = await AsyncStorage.getItem(DEVICE_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const nextValue = `ace-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_SESSION_KEY, nextValue);
  return nextValue;
}
