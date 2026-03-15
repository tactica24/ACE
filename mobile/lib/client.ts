import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('ace_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });
  return res;
}

export async function apiGet<T>(path: string) {
  const res = await apiFetch(path, { method: 'GET' });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown) {
  const res = await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export { BASE_URL };
