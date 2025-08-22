import { ProductionConfig } from '../config/production';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Production-ready logger
 */
export class Logger {
  private config: ProductionConfig['logging'];
  private serviceName: string;

  constructor(config: ProductionConfig['logging'], serviceName: string = 'langfuse-adaptor') {
    this.config = config;
    this.serviceName = serviceName;
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('ERROR', message, metadata, error);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, metadata);
    }
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, metadata);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, metadata);
    }
  }

  /**
   * Log request
   */
  request(method: string, url: string, statusCode: number, responseTime: number, metadata?: Record<string, any>): void {
    if (this.config.enableRequestLogging) {
      this.info(`${method} ${url} ${statusCode} ${responseTime}ms`, {
        type: 'request',
        method,
        url,
        statusCode,
        responseTime,
        ...metadata,
      });
    }
  }

  /**
   * Log controller action
   */
  controller(controller: string, action: string, metadata?: Record<string, any>): void {
    this.debug(`${controller}.${action}`, {
      type: 'controller',
      controller,
      action,
      ...metadata,
    });
  }

  /**
   * Log adapter operation
   */
  adapter(adapter: string, operation: string, metadata?: Record<string, any>): void {
    this.debug(`${adapter}.${operation}`, {
      type: 'adapter',
      adapter,
      operation,
      ...metadata,
    });
  }

  /**
   * Log routing decision
   */
  routing(strategy: string, decision: string, metadata?: Record<string, any>): void {
    this.debug(`Routing: ${strategy} -> ${decision}`, {
      type: 'routing',
      strategy,
      decision,
      ...metadata,
    });
  }

  /**
   * Log health check
   */
  health(service: string, status: 'healthy' | 'unhealthy', metadata?: Record<string, any>): void {
    const level = status === 'healthy' ? 'info' : 'warn';
    this[level](`Health check: ${service} is ${status}`, {
      type: 'health',
      service,
      status,
      ...metadata,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config, this.serviceName);
    childLogger.log = (level, message, metadata, error) => {
      this.log(level, message, { ...context, ...metadata }, error);
    };
    return childLogger;
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (this.config.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const timestamp = entry.timestamp;
      const service = entry.service ? `[${entry.service}]` : '';
      const requestId = entry.requestId ? `[${entry.requestId}]` : '';
      const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
      const errorStr = error ? ` ${error.stack || error.message}` : '';
      
      console.log(`${timestamp} ${level} ${service}${requestId} ${message}${metadataStr}${errorStr}`);
    }
  }

  /**
   * Check if should log at given level
   */
  private shouldLog(level: LogLevel): boolean {
    const configLevel = this.getLogLevel(this.config.level);
    return level <= configLevel;
  }

  /**
   * Convert string log level to enum
   */
  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger;

/**
 * Initialize global logger
 */
export function initializeLogger(config: ProductionConfig['logging']): void {
  globalLogger = new Logger(config);
}

/**
 * Get global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return globalLogger;
}

/**
 * Create logger for specific service
 */
export function createLogger(serviceName: string, config?: ProductionConfig['logging']): Logger {
  if (config) {
    return new Logger(config, serviceName);
  }
  
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  
  return new Logger(globalLogger['config'], serviceName);
}
