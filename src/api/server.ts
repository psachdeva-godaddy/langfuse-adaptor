import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProductionConfig, validateProductionConfig, logConfiguration } from '../config/production';
import { initializeLogger, getLogger } from '../utils/logger';
import { ProductionRoutingStrategy } from './strategies/routing-strategy';
import { createPromptRoutes } from './routes/prompt-routes';
import { createTemplateRoutes } from './routes/template-routes';
import { createChainRoutes } from './routes/chain-routes';
import { createMetadataRoutes } from './routes/metadata-routes';
import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown,
  createSuccessResponse,
} from './middleware/error-handler';
import {
  requireJsonContent,
  validateRequestSize,
} from './middleware/validation';

/**
 * Production-ready server implementing the sequence diagram architecture
 */
class ProductionServer {
  private app: express.Application;
  private server: any;
  private config: ReturnType<typeof createProductionConfig>;
  private routingStrategy: ProductionRoutingStrategy;
  private logger: ReturnType<typeof getLogger>;

  constructor() {
    // Load and validate configuration
    this.config = createProductionConfig();
    validateProductionConfig(this.config);
    
    // Initialize logger
    initializeLogger(this.config.logging);
    this.logger = getLogger();
    
    // Log configuration (without sensitive data)
    logConfiguration(this.config);
    
    // Initialize Express app
    this.app = express();
    
    // Initialize routing strategy
    this.routingStrategy = new ProductionRoutingStrategy({
      defaultAdapter: 'langfuse',
      langfuseConfig: this.config.langfuse,
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware stack
   */
  private setupMiddleware(): void {
    this.logger.info('Setting up middleware stack');

    // Security middleware
    if (this.config.security.enableHelmet) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
      }));
    }

    // CORS configuration
    if (this.config.security.enableCors) {
      this.app.use(cors({
        origin: this.config.server.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type', 
          'Authorization', 
          'X-User-ID', 
          'X-Organization-ID', 
          'X-Environment', 
          'X-Region', 
          'X-Request-ID'
        ],
      }));
    }

    // Rate limiting
    if (this.config.security.enableRateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.security.rateLimitWindowMs,
        max: this.config.security.rateLimitMaxRequests,
        message: {
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(this.config.security.rateLimitWindowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          this.logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
          });
          res.status(429).json({
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(this.config.security.rateLimitWindowMs / 1000),
          });
        },
      });
      this.app.use('/api/', limiter);
    }

    // Request parsing middleware
    this.app.use(express.json({ limit: this.config.server.maxRequestSize }));
    this.app.use(express.urlencoded({ extended: true, limit: this.config.server.maxRequestSize }));

    // Request validation middleware
    this.app.use(requireJsonContent);
    // Parse maxRequestSize to bytes if it's a string
    const maxSizeBytes = typeof this.config.server.maxRequestSize === 'string' 
      ? parseInt(this.config.server.maxRequestSize.replace(/[^\d]/g, '')) * 1024 * 1024 // Convert MB to bytes
      : this.config.server.maxRequestSize;
    this.app.use(validateRequestSize(maxSizeBytes));

    // Request logging middleware
    if (this.config.logging.enableRequestLogging) {
      this.app.use((req, res, next) => {
        const start = Date.now();
        const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add request ID to request for downstream use
        (req as any).requestId = requestId;
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          this.logger.request(req.method, req.originalUrl, res.statusCode, duration, {
            requestId,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.headers['x-user-id'] as string,
            organizationId: req.headers['x-organization-id'] as string,
          });
        });
        
        next();
      });
    }

    // Request timeout
    this.app.use((req, res, next) => {
      res.setTimeout(this.config.server.requestTimeout, () => {
        this.logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout: this.config.server.requestTimeout,
        });
        res.status(408).json({
          error: 'Request timeout',
          timeout: this.config.server.requestTimeout,
        });
      });
      next();
    });
  }

  /**
   * Setup API routes using the controller pattern
   */
  private setupRoutes(): void {
    this.logger.info('Setting up API routes with controller pattern');

    // Health check endpoint (before API routes)
    this.app.get('/health', async (req, res) => {
      try {
        const healthChecks = await this.routingStrategy.healthCheckAll();
        const adapterStats = this.routingStrategy.getAdapterStats();
        
        const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
        const status = allHealthy ? 'healthy' : 'unhealthy';
        
        this.logger.health('system', status, { healthChecks, adapterStats });
        
        const response = createSuccessResponse({
          status,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: this.config.server.environment,
          adapters: healthChecks,
          adapterStats,
        });
        
        res.status(allHealthy ? 200 : 503).json(response);
      } catch (error) {
        this.logger.error('Health check failed', error as Error);
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // API routes with controller pattern
    const apiRouter = express.Router();

    // Mount route handlers using controllers and routing strategy
    apiRouter.use('/prompts', createPromptRoutes(this.routingStrategy));
    apiRouter.use('/templates', createTemplateRoutes(this.routingStrategy));
    apiRouter.use('/chains', createChainRoutes(this.routingStrategy));
    apiRouter.use('/metadata', createMetadataRoutes(this.routingStrategy));

    // Mount API router
    this.app.use('/api/v1', apiRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json(createSuccessResponse({
        name: 'Langfuse Prompt Management System',
        version: process.env.npm_package_version || '1.0.0',
        environment: this.config.server.environment,
        architecture: 'Controller Pattern with Routing Strategy',
        endpoints: {
          health: '/health',
          api: '/api/v1',
          prompts: '/api/v1/prompts',
          templates: '/api/v1/templates',
          chains: '/api/v1/chains',
          metadata: '/api/v1/metadata',  
        },
        documentation: 'See README.md for API documentation',
      }));
    });

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json(createSuccessResponse({
        version: 'v1',
        architecture: 'Controller Pattern with Routing Strategy',
        endpoints: {
          'GET /health': 'System health check',
          'GET /api/v1/prompts': 'List prompts',
          'POST /api/v1/prompts': 'Create prompt',
          'GET /api/v1/prompts/:id': 'Get prompt',
          'PUT /api/v1/prompts/:id': 'Update prompt',
          'DELETE /api/v1/prompts/:id': 'Delete prompt',
          'POST /api/v1/prompts/search': 'Search prompts',
          'GET /api/v1/templates': 'List templates',
          'POST /api/v1/templates': 'Create template',
          'POST /api/v1/templates/:id/render': 'Render template',
          'GET /api/v1/chains': 'List chains',
          'POST /api/v1/chains': 'Create chain',
          'POST /api/v1/chains/:id/execute': 'Execute chain',
          'GET /api/v1/metadata/stats': 'System statistics',
          'GET /api/v1/metadata/system': 'System health and stats',
          'POST /api/v1/metadata/search/global': 'Global search',
        },
      }));
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.logger.info('Setting up error handling');

    // Handle uncaught exceptions and unhandled rejections
    handleUncaughtException();
    handleUnhandledRejection();

    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use((error: any, req: any, res: any, next: any) => {
      this.logger.error('Unhandled error', error, {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
        userId: req.headers['x-user-id'],
        organizationId: req.headers['x-organization-id'],
      });
      
      errorHandler(error, req, res, next);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Connect all adapters
      this.logger.info('Connecting to adapters...');
      await this.routingStrategy.connectAll();
      this.logger.info('All adapters connected successfully');

      // Start HTTP server
      this.server = this.app.listen(this.config.server.port, this.config.server.host, () => {
        this.logger.info(`🚀 Production server started`, {
          port: this.config.server.port,
          host: this.config.server.host,
          environment: this.config.server.environment,
          architecture: 'Controller Pattern with Routing Strategy',
          pid: process.pid,
        });
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Setup health monitoring
      if (this.config.monitoring.enableHealthChecks) {
        this.setupHealthMonitoring();
      }

    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            this.logger.info('HTTP server closed');
          });
        }

        // Disconnect from adapters
        this.logger.info('Disconnecting from adapters...');
        await this.routingStrategy.disconnectAll();
        this.logger.info('All adapters disconnected');

        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown', error as Error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    this.logger.info('Setting up health monitoring', {
      interval: this.config.monitoring.healthCheckInterval,
    });

    setInterval(async () => {
      try {
        const healthChecks = await this.routingStrategy.healthCheckAll();
        const unhealthyServices = Object.entries(healthChecks)
          .filter(([_, check]) => check.status === 'unhealthy')
          .map(([service, check]) => ({ service, ...check }));

        if (unhealthyServices.length > 0) {
          this.logger.warn('Unhealthy services detected', { unhealthyServices });
        } else {
          this.logger.debug('All services healthy');
        }
      } catch (error) {
        this.logger.error('Health monitoring check failed', error as Error);
      }
    }, this.config.monitoring.healthCheckInterval);
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get server instance
   */
  getServer(): any {
    return this.server;
  }

  /**
   * Get routing strategy
   */
  getRoutingStrategy(): ProductionRoutingStrategy {
    return this.routingStrategy;
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new ProductionServer();
  server.start().catch((error) => {
    console.error('Failed to start production server:', error);
    process.exit(1);
  });
}

export { ProductionServer };
export default ProductionServer;
