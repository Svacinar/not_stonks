import * as fs from 'fs';
import * as path from 'path';

/**
 * Log levels in order of severity (lowest to highest)
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output (default: 'info') */
  level: LogLevel;
  /** Path to log file (if set, logs will be written to file) */
  logFilePath?: string;
  /** Use JSON format for logs (default: true in production) */
  jsonFormat?: boolean;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

/**
 * Get configured log level from environment
 */
function getConfiguredLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info';
}

/**
 * Get log file path from environment
 */
function getLogFilePath(): string | undefined {
  return process.env.LOG_FILE_PATH;
}

/**
 * Check if we should use JSON format
 */
function shouldUseJsonFormat(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Format a log entry as a string
 */
function formatLogEntry(entry: LogEntry, jsonFormat: boolean): string {
  if (jsonFormat) {
    return JSON.stringify(entry);
  }

  const { timestamp, level, message, ...meta } = entry;
  const levelUpper = level.toUpperCase().padEnd(5);
  let formatted = `[${timestamp}] ${levelUpper} ${message}`;

  if (Object.keys(meta).length > 0) {
    formatted += ` ${JSON.stringify(meta)}`;
  }

  return formatted;
}

/**
 * Write log entry to file
 */
function writeToFile(filePath: string, entry: string): void {
  try {
    ensureLogDir(filePath);
    fs.appendFileSync(filePath, entry + '\n', { mode: 0o600 });
  } catch {
    // Fallback to console if file write fails
    console.error(`Failed to write to log file: ${filePath}`);
  }
}

/**
 * Get console method for log level
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'debug':
      return console.debug;
    default:
      return console.log;
  }
}

/**
 * Logger class with configurable levels and file output
 */
class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? getConfiguredLevel(),
      logFilePath: config?.logFilePath ?? getLogFilePath(),
      jsonFormat: config?.jsonFormat ?? shouldUseJsonFormat(),
    };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    const formatted = formatLogEntry(entry, this.config.jsonFormat ?? false);

    // Output to console
    const consoleMethod = getConsoleMethod(level);
    consoleMethod(formatted);

    // Output to file if configured
    if (this.config.logFilePath) {
      writeToFile(this.config.logFilePath, formatted);
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  /**
   * Log at info level
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  /**
   * Log at warn level
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  /**
   * Log at error level
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Create a child logger with additional default metadata
   */
  child(defaultMeta: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, defaultMeta);
  }
}

/**
 * Child logger that includes default metadata with all log entries
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultMeta: Record<string, unknown>
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.defaultMeta, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.defaultMeta, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.defaultMeta, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.parent.error(message, { ...this.defaultMeta, ...meta });
  }
}

/**
 * Default logger instance
 * Configured via environment variables:
 * - LOG_LEVEL: debug | info | warn | error (default: info)
 * - LOG_FILE_PATH: path to log file (optional)
 * - NODE_ENV: production enables JSON format
 */
export const logger = new Logger();

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export default logger;
