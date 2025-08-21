import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { LangfusePromptSDK } from '../sdk';

// Load environment variables
config();
import { createPromptRoutes } from './routes/prompts';
import { createTemplateRoutes } from './routes/templates';
import { createChainRoutes } from './routes/chains';
import { createMetadataRoutes } from './routes/metadata';
import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown,
} from './middleware/error-handler';
import {
  requireJsonContent,
  validateRequestSize,
  rateLimit,
} from './middleware/validation';
import { createSuccessResponse } from './middleware/error-handler';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();
const port = process.env.PORT || 8080;

// Initialize SDK
const sdk = new LangfusePromptSDK({
  autoConnect: true,
});

// Security middleware
app.use(helmet({
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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// Rate limiting
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request validation middleware
app.use(requireJsonContent);
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB max request size

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await sdk.healthCheck();
    const response = createSuccessResponse({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      details: health.details,
    });
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Health check failed',
        code: 'HEALTH_CHECK_FAILED',
        details: (error as Error).message,
      },
    });
  }
});

// API info endpoint
app.get('/info', (req, res) => {
  res.json(createSuccessResponse({
    name: 'Langfuse Prompt Management API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'A unified interface for prompt management using Langfuse server with Adapter Pattern',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      prompts: '/api/v1/prompts',
      templates: '/api/v1/templates',
      chains: '/api/v1/chains',
      metadata: '/api/v1/metadata',
      health: '/health',
      info: '/info',
    },
    documentation: {
      swagger: '/api/docs', // Could be implemented later
      postman: '/api/postman', // Could be implemented later
    },
  }));
});

// API routes
const apiRouter = express.Router();

// Mount route handlers
apiRouter.use('/prompts', createPromptRoutes(sdk));
apiRouter.use('/templates', createTemplateRoutes(sdk));
apiRouter.use('/chains', createChainRoutes(sdk));
apiRouter.use('/metadata', createMetadataRoutes(sdk));

// Mount API router
app.use('/api/v1', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json(createSuccessResponse({
    message: 'Welcome to Langfuse Prompt Management API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      health: '/health',
      info: '/info',
      api: '/api/v1',
    },
  }));
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(port, () => {
  console.log('🚀 Langfuse Prompt Management API Server');
  console.log('================================================');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Port:', port);
  console.log('Langfuse URL:', process.env.LANGFUSE_BASE_URL);
  console.log('Public Key:', process.env.LANGFUSE_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
  console.log('Secret Key:', process.env.LANGFUSE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  console.log('================================================');
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📖 API info: http://localhost:${port}/info`);
  console.log(`🔗 API base URL: http://localhost:${port}/api/v1`);
  console.log(`🎯 Server ready at: http://localhost:${port}`);
});

// Graceful shutdown handling
handleGracefulShutdown(server);

// SDK connection handling
sdk.connect()
  .then(() => {
    console.log('✅ SDK connected to Langfuse successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to connect SDK to Langfuse:', error.message);
    console.error('⚠️  Server will continue running but API calls may fail');
  });

// Handle SDK disconnection on server shutdown
process.on('SIGTERM', async () => {
  console.log('🔌 Disconnecting SDK...');
  try {
    await sdk.disconnect();
    console.log('✅ SDK disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting SDK:', error);
  }
});

process.on('SIGINT', async () => {
  console.log('🔌 Disconnecting SDK...');
  try {
    await sdk.disconnect();
    console.log('✅ SDK disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting SDK:', error);
  }
});

export { app, server, sdk };
