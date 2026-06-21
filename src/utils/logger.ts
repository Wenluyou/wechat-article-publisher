const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
type LogLevel = typeof LOG_LEVELS[number]

function log(level: LogLevel, message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  if (level === 'error') {
    console.error(prefix, message, ...args)
  } else if (level === 'warn') {
    console.warn(prefix, message, ...args)
  } else {
    console.log(prefix, message, ...args)
  }
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
  info: (msg: string, ...args: unknown[]) => log('info', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log('warn', msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
}
