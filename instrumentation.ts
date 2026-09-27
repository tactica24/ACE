export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.ACE_SENTRY_DSN || process.env.SENTRY_DSN;
    if (!dsn) return;
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        enabled: Boolean(dsn),
      });
    } catch {
      /* optional dependency */
    }
  }
}
