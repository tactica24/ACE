import AsyncStorage from '@react-native-async-storage/async-storage';

export type MobileUser = {
  sub: string;
  email: string;
  phone: string;
  role: 'USER' | 'CREATOR' | 'ADMIN';
};

export async function saveToken(token: string) {
  await AsyncStorage.setItem('ace_token', token);
}

export async function clearToken() {
  await AsyncStorage.removeItem('ace_token');
}

export async function getToken() {
  return AsyncStorage.getItem('ace_token');
}
