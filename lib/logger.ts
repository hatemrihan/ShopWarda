/**
 * Structured JSON logger.
 * In production, outputs JSON lines. In dev, outputs human-readable text.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const rid = entry.requestId ? ` (${entry.requestId})` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${prefix}${rid} ${entry.message}${data}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>, requestId?: string) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(data && { data }),
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      if (isDev) console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>, requestId?: string) =>
    log('info', message, data, requestId),

  warn: (message: string, data?: Record<string, unknown>, requestId?: string) =>
    log('warn', message, data, requestId),

  error: (message: string, data?: Record<string, unknown>, requestId?: string) =>
    log('error', message, data, requestId),

  debug: (message: string, data?: Record<string, unknown>, requestId?: string) =>
    log('debug', message, data, requestId),
};

export default logger;
