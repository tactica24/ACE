import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAgeRating,
  isPriceTier,
  isRightsTier,
  isVideoType,
  PRICE_TIERS,
  RIGHTS_TIERS,
} from '../lib/studio-tiers';

test('isPriceTier accepts only catalog tiers', () => {
  for (const tier of PRICE_TIERS) {
    assert.equal(isPriceTier(tier), true);
  }
  assert.equal(isPriceTier('VIP'), false);
  assert.equal(isPriceTier(undefined), false);
});

test('isRightsTier accepts SHARED and EXCLUSIVE only', () => {
  for (const tier of RIGHTS_TIERS) {
    assert.equal(isRightsTier(tier), true);
  }
  assert.equal(isRightsTier('LEASE'), false);
});

test('isVideoType and isAgeRating validate enums', () => {
  assert.equal(isVideoType('FEATURE'), true);
  assert.equal(isVideoType('PODCAST'), false);
  assert.equal(isAgeRating('PG13'), true);
  assert.equal(isAgeRating('R'), false);
});
