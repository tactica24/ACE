const baseUrl = (process.env.ACE_PRODUCTION_SMOKE_BASE_URL || process.env.ACE_APP_BASE_URL || 'https://www.acestudio.ng').trim();

const checks = [];

function addResult(name, status, note) {
  checks.push({ name, status, note });
}

async function expectJson(name, path, validate) {
  const url = new URL(path, baseUrl).toString();
  const res = await fetch(url, {
    headers: {
      'x-ace-smoke': '1',
      accept: 'application/json'
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}${body ? ` :: ${body.slice(0, 200)}` : ''}`);
  }

  const data = await res.json();
  await validate(data, res);
  addResult(name, 'DONE', `${url} -> ${res.status}`);
}

async function expectHtml(name, path) {
  const url = new URL(path, baseUrl).toString();
  const res = await fetch(url, {
    headers: {
      'x-ace-smoke': '1',
      accept: 'text/html'
    }
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const body = await res.text();
  if (!body.toLowerCase().includes('<html')) {
    throw new Error('response was not HTML');
  }

  addResult(name, 'DONE', `${url} -> ${res.status}`);
}

async function expectAndroidApk(name, path) {
  const url = new URL(path, baseUrl).toString();
  const initial = await fetch(url, {
    redirect: 'manual',
    headers: {
      'x-ace-smoke': '1',
      range: 'bytes=0-0'
    }
  });

  const apkContentTypes = [
    'application/vnd.android.package-archive',
    'application/octet-stream'
  ];

  if ([200, 206].includes(initial.status)) {
    const contentType = (initial.headers.get('content-type') || '').toLowerCase();
    if (!apkContentTypes.some((value) => contentType.includes(value))) {
      throw new Error(`unexpected direct APK content-type: ${contentType || 'missing'}`);
    }

    addResult(name, 'DONE', `${url} -> ${initial.status} direct APK`);
    return;
  }

  if (![301, 302, 303, 307, 308].includes(initial.status)) {
    const body = await initial.text();
    throw new Error(`${initial.status} ${initial.statusText}${body ? ` :: ${body.slice(0, 200)}` : ''}`);
  }

  const location = initial.headers.get('location');
  if (!location) {
    throw new Error('redirect location missing');
  }

  const redirectUrl = new URL(location, url).toString();
  const redirected = await fetch(redirectUrl, {
    headers: {
      range: 'bytes=0-0'
    }
  });

  if (![200, 206].includes(redirected.status)) {
    throw new Error(`redirect target responded ${redirected.status} ${redirected.statusText}`);
  }

  const contentType = (redirected.headers.get('content-type') || '').toLowerCase();
  if (!apkContentTypes.some((value) => contentType.includes(value))) {
    throw new Error(`unexpected redirected APK content-type: ${contentType || 'missing'}`);
  }

  addResult(name, 'DONE', `${url} -> ${initial.status} redirect -> ${redirected.status}`);
}

async function getCatalogVideos(limit = 3) {
  const url = new URL(`/api/videos?limit=${limit}`, baseUrl).toString();
  const res = await fetch(url, {
    headers: {
      'x-ace-smoke': '1',
      accept: 'application/json'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data?.videos) || data.videos.length === 0) {
    throw new Error(`catalog did not return smoke-testable videos (${res.status})`);
  }
  return data.videos;
}

async function expectCatalogPosters() {
  const videos = await getCatalogVideos();
  for (const video of videos) {
    const url = new URL(`/api/movies/${encodeURIComponent(video.id)}/poster`, baseUrl).toString();
    const res = await fetch(url, {
      headers: {
        'x-ace-smoke': '1',
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml'
      }
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !contentType.startsWith('image/')) {
      throw new Error(`${video.title}: ${res.status} ${contentType || 'missing content-type'} at ${res.url}`);
    }
  }
  addResult('Catalog posters', 'DONE', `${videos.length} poster routes returned image responses`);
}

async function expectCatalogTrailers() {
  const videos = await getCatalogVideos();
  let checked = 0;
  for (const video of videos) {
    const playbackUrl = new URL(
      `/api/movies/${encodeURIComponent(video.id)}/playback?teaser=1`,
      baseUrl
    ).toString();
    const playbackRes = await fetch(playbackUrl, {
      headers: {
        'x-ace-smoke': '1',
        accept: 'application/json'
      }
    });
    const playback = await playbackRes.json().catch(() => ({}));
    const previewUrl = playback?.playback?.previewUrl;
    if (!playbackRes.ok || typeof previewUrl !== 'string' || !previewUrl) {
      throw new Error(`${video.title}: preview source unavailable (${playbackRes.status})`);
    }

    if (/\.m3u8(?:$|[?#])/i.test(previewUrl)) {
      const manifestRes = await fetch(previewUrl);
      const manifest = await manifestRes.text();
      if (!manifestRes.ok || !manifest.includes('#EXTM3U')) {
        throw new Error(`${video.title}: invalid HLS trailer manifest (${manifestRes.status})`);
      }
    }
    checked += 1;
  }
  addResult('Catalog trailers', 'DONE', `${checked} preview sources returned playable manifests or media URLs`);
}

async function main() {
  let failed = false;

  const checksToRun = [
    {
      name: 'Health endpoint',
      run: () => expectJson('Health endpoint', '/api/health', async (data) => {
      if (!data?.ok) {
        throw new Error('health response did not report ok=true');
      }
      }),
    },
    {
      name: 'Firebase mobile config',
      run: () => expectJson('Firebase mobile config', '/api/mobile/firebase-config', async (data) => {
      const firebase = data?.firebase;
      const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missing = required.filter((key) => !firebase?.[key]);
      if (missing.length) {
        throw new Error(`missing firebase keys: ${missing.join(', ')}`);
      }
      }),
    },
    {
      name: 'Mobile titles API',
      run: () => expectJson('Mobile titles API', '/api/mobile/titles?limit=2', async (data) => {
      if (!Array.isArray(data?.titles)) {
        throw new Error('titles response did not contain a titles array');
      }
      }),
    },
    {
      name: 'Web catalog API',
      run: () => expectJson('Web catalog API', '/api/videos?limit=2', async (data) => {
      if (!Array.isArray(data?.videos)) {
        throw new Error('videos response did not contain a videos array');
      }
      }),
    },
    {
      name: 'Catalog posters',
      run: expectCatalogPosters,
    },
    {
      name: 'Catalog trailers',
      run: expectCatalogTrailers,
    },
    {
      name: 'Android APK delivery',
      run: () => expectAndroidApk('Android APK delivery', '/api/mobile/android-apk'),
    },
    {
      name: 'Homepage',
      run: () => expectHtml('Homepage', '/'),
    },
    {
      name: 'Download page',
      run: () => expectHtml('Download page', '/download'),
    },
  ];

  for (const check of checksToRun) {
    try {
      await check.run();
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      addResult(check.name, 'BLOCKED', message);
    }
  }

  console.log('\nACE Production Smoke\n');
  for (const item of checks) {
    const mark = item.status === 'DONE' ? '[x]' : '[ ]';
    console.log(`${mark} ${item.name} - ${item.status}`);
    console.log(`    ${item.note}`);
  }

  const done = checks.filter((item) => item.status === 'DONE').length;
  const blocked = checks.filter((item) => item.status === 'BLOCKED').length;
  console.log(`\nSummary: ${done} DONE / ${blocked} BLOCKED\n`);

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
