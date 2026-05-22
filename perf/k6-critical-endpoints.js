// k6 Load Test - ACE Critical Endpoints (2026-05-22)
// Target: stream token (video playback), unlock, auth, and payment flows
// Usage:
//   k6 run --vus 50 --duration 2m perf/k6-critical-endpoints.js
//   k6 run --vus 200 --duration 5m --out json=results.json perf/k6-critical-endpoints.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp-up
    { duration: '2m',  target: 100 },  // normal load
    { duration: '1m',  target: 300 },  // spike (heavy usage test)
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],   // 95% under 800ms
    http_req_failed: ['rate<0.01'],     // <1% errors
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.ACE_BASE_URL || 'https://ace-studio.app'; // change for staging

// Example test data - replace with real test video IDs in your env
const TEST_VIDEO_ID = __ENV.TEST_VIDEO_ID || 'test-video-123';
const TEST_USER_TOKEN = __ENV.TEST_FIREBASE_TOKEN || ''; // optional authenticated token

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(TEST_USER_TOKEN && { Authorization: `Bearer ${TEST_USER_TOKEN}` }),
  };

  // 1. Stream token (most critical for video playback)
  const streamRes = http.get(`${BASE_URL}/api/stream/token?videoId=${TEST_VIDEO_ID}&quality=adaptive`, {
    headers,
    tags: { name: 'stream_token' },
  });

  check(streamRes, {
    'stream/token 200 or 401 (auth)': (r) => r.status === 200 || r.status === 401,
    'stream/token has playback or error': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.playback || body.error;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  // 2. Unlock attempt (rate limited endpoint)
  const unlockRes = http.post(
    `${BASE_URL}/api/unlock`,
    JSON.stringify({ videoId: TEST_VIDEO_ID }),
    { headers, tags: { name: 'unlock' } }
  );

  check(unlockRes, {
    'unlock 200/402/403/429': (r) =>
      [200, 402, 403, 429].includes(r.status),
  }) || errorRate.add(1);

  // 3. Lightweight health check
  const healthRes = http.get(`${BASE_URL}/api/health`, { tags: { name: 'health' } });
  check(healthRes, { 'health 200': (r) => r.status === 200 }) || errorRate.add(1);

  sleep(1 + Math.random() * 2); // realistic user think time
}

export function handleSummary(data) {
  return {
    'perf/k6-summary.json': JSON.stringify(data, null, 2),
  };
}
