export function getSignedStoredMediaUrl(token: string, storedUrl: string) {
  const parsed = new URL(storedUrl);
  parsed.searchParams.set('token', token);
  return parsed.toString();
}
