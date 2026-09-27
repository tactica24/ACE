import { gzipSync, gunzipSync } from 'fflate';

/** Compress statement JSON for storage (base64 gzip). */
export function compressStatementData(data: unknown): string {
  const jsonString = JSON.stringify(data);
  const compressed = gzipSync(Buffer.from(jsonString));
  return Buffer.from(compressed).toString('base64');
}

/** Decompress a previously stored statement blob. */
export function decompressStatementData(encoded: string): unknown {
  const buffer = Buffer.from(encoded, 'base64');
  const decompressed = gunzipSync(buffer);
  return JSON.parse(Buffer.from(decompressed).toString());
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

/** Accept YYYY-MM or fall back to the current UTC month. */
export function normalizeReportMonthKey(input?: string | string[]) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }
  return currentMonthKey();
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
