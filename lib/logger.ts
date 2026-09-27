type LogContext = Record<string, unknown>;

function formatEntry(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
  return JSON.stringify({
    level,
    message,
    service: 'ace-studio',
    ...context,
    timestamp: new Date().toISOString(),
  });
}

function buildStructuredLogger() {
  return {
    info: (context: LogContext, message: string = 'info') => {
      console.log(formatEntry('info', message, context));
    },
    warn: (context: LogContext, message: string = 'warn') => {
      console.warn(formatEntry('warn', message, context));
    },
    error: (context: LogContext, message: string = 'error') => {
      console.error(formatEntry('error', message, context));
    },
    child: (base: LogContext) => ({
      info: (context: LogContext, message: string = 'info') => {
        console.log(formatEntry('info', message, { ...base, ...context }));
      },
      warn: (context: LogContext, message: string = 'warn') => {
        console.warn(formatEntry('warn', message, { ...base, ...context }));
      },
      error: (context: LogContext, message: string = 'error') => {
        console.error(formatEntry('error', message, { ...base, ...context }));
      },
    }),
  };
}

export const logger = buildStructuredLogger();

/** Optional Sentry-compatible capture (no-op when ACE_SENTRY_DSN is unset). */
export function captureException(error: unknown, context: LogContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ ...context, err: message, stack: error instanceof Error ? error.stack : undefined }, 'exception');
  const dsn = process.env.ACE_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    console.error('[sentry-bridge]', JSON.stringify({ dsn: dsn.slice(0, 12) + '…', message, ...context }));
  } catch {
    /* */
  }
}
