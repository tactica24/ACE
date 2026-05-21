import { firebaseAuth } from '@/lib/firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = await firebaseAuth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    ...extraHeaders
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders({
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });
  return res;
}

async function readErrorMessage(res: Response) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = await res.json().catch(() => null) as { error?: string; message?: string } | null;
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;
  }

  const text = await res.text();
  return text || 'Request failed';
}

export async function apiGet<T>(path: string) {
  const res = await apiFetch(path, { method: 'GET' });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown) {
  const res = await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<T>;
}

export { BASE_URL };
