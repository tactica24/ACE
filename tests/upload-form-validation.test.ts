import assert from 'node:assert/strict';
import test from 'node:test';

import { isSupportedImageFile, validateFileSize } from '../lib/upload-form-validation';

test('validateFileSize rejects oversized files', () => {
  assert.equal(validateFileSize({ size: 100 }, 1000, 'Poster'), null);
  const msg = validateFileSize({ size: 2000 }, 1000, 'Poster');
  assert.ok(msg && /Poster/.test(msg));
});

test('isSupportedImageFile accepts jpg/png/webp names', () => {
  assert.equal(isSupportedImageFile({ name: 'a.JPG', type: 'image/jpeg' }), true);
  assert.equal(isSupportedImageFile({ name: 'a.png', type: 'image/png' }), true);
  assert.equal(isSupportedImageFile({ name: 'a.gif', type: 'image/gif' }), false);
  assert.equal(isSupportedImageFile(null), true);
});
