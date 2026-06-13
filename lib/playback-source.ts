export function isHlsSource(url?: string | null) {
  if (typeof url !== 'string') return false;

  try {
    return new URL(url, 'https://ace.local').pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return /\.m3u8(?:$|[?#])/i.test(url);
  }
}
