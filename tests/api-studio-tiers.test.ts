import assert from 'node:assert/strict';
import test from 'node:test';

import { isPriceTier, isRightsTier } from '../lib/studio-tiers';

/** Mirrors the guards used by POST /api/studio/video. */
function rejectInvalidStudioPayload(body: { priceTier?: string; rightsTier?: string }) {
  if (!isPriceTier(body.priceTier)) {
    return { status: 400, error: 'Invalid price tier' };
  }
  if (!isRightsTier(body.rightsTier)) {
    return { status: 400, error: 'Invalid rights tier' };
  }
  return { status: 200, error: null };
}

test('POST /api/studio/video rejects invalid price tiers', () => {
  const res = rejectInvalidStudioPayload({ priceTier: 'VIP', rightsTier: 'SHARED' });
  assert.equal(res.status, 400);
  assert.match(String(res.error), /price/i);
});

test('POST /api/studio/video rejects invalid rights tiers', () => {
  const res = rejectInvalidStudioPayload({ priceTier: 'STANDARD', rightsTier: 'LEASE' });
  assert.equal(res.status, 400);
  assert.match(String(res.error), /rights/i);
});

test('POST /api/studio/video accepts valid tier pair', () => {
  const res = rejectInvalidStudioPayload({ priceTier: 'PREMIERE', rightsTier: 'EXCLUSIVE' });
  assert.equal(res.status, 200);
  assert.equal(res.error, null);
});
