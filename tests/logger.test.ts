import assert from 'node:assert/strict';
import test from 'node:test';

import { captureException, logger } from '../lib/logger';

test('logger is a structured pino instance', () => {
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
  assert.equal(typeof logger.child, 'function');
  const child = logger.child({ requestId: 'req-1', route: '/api/test' });
  assert.equal(typeof child.info, 'function');
  child.info({ ok: true }, 'child-info');
  captureException(new Error('boom'), { route: '/api/test' });
});
