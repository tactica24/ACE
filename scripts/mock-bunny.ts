export function mockBunnyConfig() {
  return {
    enabled: process.env.MOCK_BUNNY === '1' || process.env.NODE_ENV === 'test',
    apiKey: process.env.BUNNY_STORAGE_API_KEY || 'mock-bunny-api-key',
    zone: process.env.BUNNY_STORAGE_ZONE || 'mock-zone',
    endpoint: process.env.BUNNY_STORAGE_ENDPOINT || 'https://example.invalid',
  };
}

export function getMockBunnyHeaders() {
  return {
    Authorization: `Bearer ${process.env.BUNNY_STORAGE_API_KEY || 'mock-bunny-api-key'}`,
    'Content-Type': 'application/json',
  };
}

export function createMockBunnyUrl(pathname: string) {
  const base = process.env.BUNNY_STORAGE_ENDPOINT || 'https://example.invalid';
  return `${base.replace(/\/+$/, '')}/${pathname.replace(/^\/+/, '')}`;
}

export function logMockBunnyStatus() {
  if (process.env.MOCK_BUNNY !== '1' && process.env.NODE_ENV !== 'test') {
    return;
  }

  console.log('Using mock Bunny configuration for local development and tests.');
}
