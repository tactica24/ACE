const rawTargets = process.env.ACE_SMOKE_TARGETS || process.env.ACE_APP_BASE_URL || 'http://localhost:3000';
const targets = rawTargets.split(',').map((value) => value.trim()).filter(Boolean);

async function checkTarget(baseUrl) {
  const url = new URL('/api/health', baseUrl).toString();
  const startedAt = Date.now();
  const res = await fetch(url, { headers: { 'x-ace-smoke': '1' } });
  const elapsedMs = Date.now() - startedAt;
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    baseUrl,
    elapsedMs,
    deliveryMode: data.deliveryMode,
    timestamp: data.timestamp
  };
}

async function main() {
  const results = await Promise.allSettled(targets.map(checkTarget));
  let failed = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      console.log(`[ok] ${value.baseUrl} ${value.elapsedMs}ms deliveryMode=${value.deliveryMode} timestamp=${value.timestamp}`);
    } else {
      failed = true;
      console.error(`[fail] ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
