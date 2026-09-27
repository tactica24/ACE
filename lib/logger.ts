import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { service: 'ace-studio' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  browser: {
    asObject: true,
  },
});

type LogContext = Record<string, unknown>;

export function captureException(error: unknown, context: LogContext = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ ...context, err: err.message, stack: err.stack }, 'exception');
  try {
    // Optional Sentry — initialized from instrumentation when DSN is set
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
    if (process.env.ACE_SENTRY_DSN || process.env.SENTRY_DSN) {
      Sentry.captureException(err, { extra: context });
    }
  } catch {
    /* optional */
  }
}
