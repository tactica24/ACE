type LogContext = Record<string, unknown>;

function formatEntry(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
  return JSON.stringify({
    level,
    message,
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
  };
}

export const logger = buildStructuredLogger();
