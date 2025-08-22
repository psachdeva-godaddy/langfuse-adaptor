import { config } from 'dotenv';
import { LangfuseConfig } from './langfuse';

// Load environment variables
config();

/**
 * Production configuration interface
 */
export interface ProductionConfig {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'staging' | 'production';
    corsOrigin: string | string[];
    requestTimeout: number;
    maxRequestSize: string;
  };
  
  langfuse: LangfuseConfig;
  
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    enableRequestLogging: boolean;
    enableErrorTracking: boolean;
  };
  
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    enableMetrics: boolean;
    metricsPort?: number;
  };
  
  security: {
    enableRateLimit: boolean;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    enableHelmet: boolean;
    enableCors: boolean;
  };
  
  database: {
    connectionTimeout: number;
    queryTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * Create production configuration from environment variables
 */
export function createProductionConfig(): ProductionConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
  
  return {
    server: {
      port: parseInt(process.env.PORT || '8080', 10),
      host: process.env.HOST || '0.0.0.0',
      environment: nodeEnv,
      corsOrigin: process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
        ['http://localhost:3000'],
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    },
    
    langfuse: {
      baseUrl: process.env.LANGFUSE_BASE_URL || 'http://localhost:3000',
      publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
      secretKey: process.env.LANGFUSE_SECRET_KEY || '',
      debug: process.env.LANGFUSE_DEBUG === 'true',
    },
    
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
      format: (process.env.LOG_FORMAT || 'json') as 'json' | 'text',
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
    },
    
    monitoring: {
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      metricsPort: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : undefined,
    },
    
    security: {
      enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      enableCors: process.env.ENABLE_CORS !== 'false',
    },
    
    database: {
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000', 10),
    },
  };
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(config: ProductionConfig): void {
  const errors: string[] = [];
  
  // Validate required Langfuse configuration
  if (!config.langfuse.publicKey) {
    errors.push('LANGFUSE_PUBLIC_KEY is required');
  }
  
  if (!config.langfuse.secretKey) {
    errors.push('LANGFUSE_SECRET_KEY is required');
  }
  
  if (!config.langfuse.baseUrl) {
    errors.push('LANGFUSE_BASE_URL is required');
  }
  
  // Validate server configuration
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  if (config.server.requestTimeout < 1000) {
    errors.push('REQUEST_TIMEOUT must be at least 1000ms');
  }
  
  // Validate logging configuration
  if (!['error', 'warn', 'info', 'debug'].includes(config.logging.level)) {
    errors.push('LOG_LEVEL must be one of: error, warn, info, debug');
  }
  
  // Validate security configuration
  if (config.security.rateLimitMaxRequests < 1) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }
  
  if (config.security.rateLimitWindowMs < 1000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(): ProductionConfig {
  const config = createProductionConfig();
  validateProductionConfig(config);
  
  // Environment-specific overrides
  if (config.server.environment === 'production') {
    // Production-specific settings
    config.logging.level = 'warn';
    config.security.enableRateLimit = true;
    config.monitoring.enableHealthChecks = true;
  } else if (config.server.environment === 'development') {
    // Development-specific settings
    config.logging.level = 'debug';
    config.logging.format = 'text';
    config.security.enableRateLimit = false;
  }
  
  return config;
}

/**
 * Log configuration (without sensitive data)
 */
export function logConfiguration(config: ProductionConfig): void {
  const safeConfig = {
    server: config.server,
          langfuse: {
        baseUrl: config.langfuse.baseUrl,
        debug: config.langfuse.debug,
        // Don't log keys
      },
    logging: config.logging,
    monitoring: config.monitoring,
    security: {
      ...config.security,
      // Don't log sensitive security settings
    },
    database: config.database,
  };
  
  console.log('🔧 Configuration loaded:', JSON.stringify(safeConfig, null, 2));
}
