import assert from 'node:assert/strict';
import test from 'node:test';

import { isReportStatementStorageError } from '../lib/admin-report-errors';
import {
  compressStatementData,
  decompressStatementData,
  formatDayLabel,
  formatMonthLabel,
  normalizeReportMonthKey,
} from '../lib/report-formatting';

test('normalizeReportMonthKey accepts valid YYYY-MM and falls back otherwise', () => {
  assert.equal(normalizeReportMonthKey('2026-03'), '2026-03');
  assert.equal(normalizeReportMonthKey('2026-13'), normalizeReportMonthKey(undefined));
  assert.equal(normalizeReportMonthKey(['2026-01']), normalizeReportMonthKey(undefined));
  assert.match(normalizeReportMonthKey(''), /^\d{4}-(0[1-9]|1[0-2])$/);
});

test('formatMonthLabel and formatDayLabel use UTC formatting', () => {
  const date = new Date(Date.UTC(2026, 0, 15));
  assert.equal(formatMonthLabel(date), 'January 2026');
  assert.equal(formatDayLabel(date), 'Jan 15');
});

test('compressStatementData / decompressStatementData round-trip', () => {
  const payload = {
    monthKey: '2026-01',
    lines: [{ title: 'Film A', grossNaira: 1200 }],
    nested: { ok: true },
  };
  const encoded = compressStatementData(payload);
  assert.equal(typeof encoded, 'string');
  assert.ok(encoded.length > 8);
  assert.deepEqual(decompressStatementData(encoded), payload);
});

test('isReportStatementStorageError detects storage / schema errors', () => {
  assert.equal(isReportStatementStorageError({ code: 'P2021' }), true);
  assert.equal(isReportStatementStorageError({ code: 'P2022' }), true);
  assert.equal(isReportStatementStorageError(new Error('ReportStatement table missing')), true);
  assert.equal(isReportStatementStorageError(new Error('unrelated failure')), false);
});
