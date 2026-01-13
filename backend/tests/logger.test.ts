import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger, LogLevel } from '../src/utils/logger';

describe('Logger', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE_PATH;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('log levels', () => {
    it('should log at info level by default', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log debug when level is info', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger({ level: 'info' });

      logger.debug('debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log debug when level is debug', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger({ level: 'debug' });

      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warn when level is warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger({ level: 'warn' });

      logger.warn('warn message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error when level is error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createLogger({ level: 'error' });

      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log info when level is warn', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ level: 'warn' });

      logger.info('info message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not log warn when level is error', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger({ level: 'error' });

      logger.warn('warn message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('environment configuration', () => {
    it('should use LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger();

      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle uppercase LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger();

      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fall back to info for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';
      const logger = createLogger();

      expect(logger.getLevel()).toBe('info');
    });
  });

  describe('log format', () => {
    it('should output human-readable format in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ jsonFormat: false });

      logger.info('test message');

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(output).toContain('INFO');
      expect(output).toContain('test message');
    });

    it('should output JSON format in production', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ jsonFormat: true });

      logger.info('test message');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('test message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include metadata in log output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ jsonFormat: true });

      logger.info('test message', { userId: 123, action: 'login' });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe('login');
    });
  });

  describe('file logging', () => {
    const testLogPath = path.join(__dirname, '../temp/test.log');

    beforeEach(() => {
      // Clean up test log file
      const dir = path.dirname(testLogPath);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test log file
      const dir = path.dirname(testLogPath);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
    });

    it('should write logs to file when logFilePath is set', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({
        logFilePath: testLogPath,
        jsonFormat: false,
      });

      logger.info('file log test');

      expect(fs.existsSync(testLogPath)).toBe(true);
      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content).toContain('file log test');
    });

    it('should create log directory if it does not exist', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const nestedPath = path.join(__dirname, '../temp/nested/deep/test.log');
      const logger = createLogger({
        logFilePath: nestedPath,
        jsonFormat: false,
      });

      logger.info('nested test');

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up
      fs.rmSync(path.join(__dirname, '../temp/nested'), { recursive: true });
    });

    it('should use LOG_FILE_PATH from environment', () => {
      process.env.LOG_FILE_PATH = testLogPath;
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.info('env file path test');

      expect(fs.existsSync(testLogPath)).toBe(true);
    });
  });

  describe('level management', () => {
    it('should return current log level', () => {
      const logger = createLogger({ level: 'warn' });
      expect(logger.getLevel()).toBe('warn');
    });

    it('should allow changing log level dynamically', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger({ level: 'info' });

      logger.debug('should not log');
      expect(consoleSpy).not.toHaveBeenCalled();

      logger.setLevel('debug');
      logger.debug('should log');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('should include default metadata in child logger', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ jsonFormat: true });
      const childLogger = logger.child({ service: 'test-service' });

      childLogger.info('child message');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.service).toBe('test-service');
      expect(parsed.message).toBe('child message');
    });

    it('should merge child metadata with call metadata', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ jsonFormat: true });
      const childLogger = logger.child({ service: 'test-service' });

      childLogger.info('child message', { requestId: 'abc123' });

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.service).toBe('test-service');
      expect(parsed.requestId).toBe('abc123');
    });
  });

  describe('console methods', () => {
    it('should use console.error for error level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createLogger();

      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use console.warn for warn level', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger();

      logger.warn('warn message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use console.log for info level', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.info('info message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use console.debug for debug level', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createLogger({ level: 'debug' });

      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
