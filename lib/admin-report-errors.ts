/** Detect missing ReportStatement schema / table errors without requiring a live DB. */
export function isReportStatementStorageError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  if (code === 'P2021' || code === 'P2022') {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ReportStatement') || message.includes('ReportStatementItem');
}
