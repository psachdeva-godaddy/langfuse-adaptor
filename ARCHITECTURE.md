# Langfuse Adaptor Architecture

## Overview

The Langfuse Adaptor has been refactored to implement a **Controller Pattern with Routing Strategy** architecture that follows the sequence diagram specifications. This architecture provides a clean separation of concerns, production-ready features, and extensibility for future adapters.

## Architecture Components

### 🏗️ **Core Architecture Pattern**

```
HTTP Request
    ↓
Express Server + Middleware
    ↓
Controller Layer (PromptController, TemplateController, etc.)
    ↓
Routing Strategy (determines which adapter to use)
    ↓
Manager Layer (PromptManager, TemplateManager, etc.)
    ↓
Adapter Layer (LangfuseAdapter, future: OpenAIAdapter, etc.)
    ↓
External Service (Langfuse, OpenAI, etc.)
```

### 📁 **Directory Structure**

```
src/
├── api/                          # REST API Layer
│   ├── controllers/              # 🆕 Controller Pattern Implementation
│   │   ├── base-controller.ts    # Common controller functionality
│   │   ├── prompt-controller.ts  # Prompt HTTP request handling
│   │   ├── template-controller.ts
│   │   ├── chain-controller.ts
│   │   └── metadata-controller.ts
│   ├── strategies/               # 🆕 Routing Strategy Pattern
│   │   └── routing-strategy.ts   # Intelligent adapter selection
│   ├── routes/                   # Route definitions using controllers
│   │   ├── prompt-routes.ts
│   │   ├── template-routes.ts
│   │   ├── chain-routes.ts
│   │   └── metadata-routes.ts
│   ├── middleware/               # Express middleware
│   │   ├── error-handler.ts
│   │   └── validation.ts
│   └── server.ts                 # 🆕 Production-ready Express server
├── sdk/                          # Node.js SDK Layer
│   ├── prompt-manager.ts         # Business logic for prompts
│   ├── template-manager.ts       # Business logic for templates
│   ├── chain-manager.ts          # Business logic for chains
│   ├── metadata-manager.ts       # Business logic for metadata
│   └── index.ts                  # 🆕 Unified SDK + Factory functions
├── adapters/                     # Adapter Pattern Implementation
│   ├── base-adapter.ts           # Adapter interface
│   └── langfuse/
│       ├── langfuse-adapter.ts   # Langfuse implementation
│       └── langfuse-client.ts
├── config/                       # Configuration Management
│   ├── langfuse.ts
│   └── production.ts             # 🆕 Production configuration
├── utils/                        # Utilities
│   ├── logger.ts                 # 🆕 Structured logging
│   ├── template-engine.ts
│   ├── validation.ts
│   └── versioning.ts
└── types/                        # TypeScript type definitions
    ├── prompt.ts
    ├── template.ts
    ├── chain.ts
    └── common.ts
```

## 🔄 **Request Flow (Sequence Diagram Implementation)**

### REST API Flow
```
1. HTTP Client → Express Server
2. Express Server → UnifiedAuthMiddleware (security, validation)
3. Express Server → PromptController.createPrompt()
4. PromptController → RoutingStrategy.getPromptAdapter(context)
5. RoutingStrategy → Returns LangfuseAdapter (based on context)
6. PromptController → PromptManager.createPrompt()
7. PromptManager → LangfuseAdapter.createPrompt()
8. LangfuseAdapter → Langfuse SDK
9. Response flows back through the chain
```

### SDK Flow
```
1. Node.js App → LangfuseSDK.prompts.createPrompt()
2. LangfuseSDK → PromptManager.createPrompt()
3. PromptManager → LangfuseAdapter.createPrompt()
4. LangfuseAdapter → Langfuse SDK
5. Response flows back through the chain
```

## 🎯 **Key Features**

### 1. **Controller Pattern**
- **BaseController**: Common functionality (error handling, response formatting)
- **Specific Controllers**: Handle HTTP requests for each resource type
- **Context Extraction**: Extract routing context from headers (user, org, environment)

### 2. **Routing Strategy Pattern**
- **IRoutingStrategy**: Interface for adapter selection logic
- **ProductionRoutingStrategy**: Current implementation (Langfuse only)
- **Context-Aware**: Routes based on user, organization, environment, region
- **Future-Ready**: Easy to extend for multiple adapters

### 3. **Production Features**
- **Structured Logging**: JSON/text logging with request tracking
- **Configuration Management**: Environment-based config with validation
- **Health Monitoring**: Automated health checks and monitoring
- **Security**: Rate limiting, CORS, Helmet, input validation
- **Error Handling**: Comprehensive error tracking and reporting
- **Graceful Shutdown**: Proper cleanup on server termination

### 4. **Unified SDK**
- **LangfuseSDK**: Single entry point for all operations
- **Factory Functions**: `createPromptManager()`, `createTemplateManager()`, etc.
- **Manager Access**: Direct access to individual managers
- **Backward Compatibility**: Works with existing code

## 🚀 **Usage Examples**

### REST API Usage
```bash
# Start production server
npm run dev

# API endpoints
GET    /api/v1/prompts
POST   /api/v1/prompts
GET    /api/v1/prompts/:id
PUT    /api/v1/prompts/:id
DELETE /api/v1/prompts/:id

# With context headers
curl -X POST /api/v1/prompts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -H "X-Organization-ID: org456" \
  -H "X-Environment: production" \
  -d '{"name": "greeting", "content": "Hello {{name}}!"}'
```

### SDK Usage

#### Option 1: Unified SDK (Recommended)
```typescript
import { LangfuseSDK } from 'langfuse-adaptor';

const sdk = new LangfuseSDK({ autoConnect: true });

// Use different managers
await sdk.prompts.createPrompt({ name: 'test', content: 'Hello {{name}}' });
await sdk.templates.renderTemplate({ templateId: 'id', variables: { name: 'Alice' } });
await sdk.chains.executeChain({ chainId: 'id', initialData: {} });

// Unified operations
await sdk.connect();
await sdk.disconnect();
const health = await sdk.healthCheck();
```

#### Option 2: Individual Managers
```typescript
import { createPromptManager, createTemplateManager } from 'langfuse-adaptor';

const promptManager = createPromptManager({ autoConnect: true });
const templateManager = createTemplateManager({ autoConnect: true });

await promptManager.createPrompt({ name: 'test', content: 'Hello {{name}}' });
await templateManager.renderTemplate({ templateId: 'id', variables: { name: 'Alice' } });
```

#### Option 3: Factory Function
```typescript
import { createManagers } from 'langfuse-adaptor';

const { prompts, templates, chains, metadata } = createManagers({ autoConnect: true });

await prompts.createPrompt({ name: 'test', content: 'Hello {{name}}' });
await templates.renderTemplate({ templateId: 'id', variables: { name: 'Alice' } });
```

## 🔧 **Configuration**

### Environment Variables
```bash
# Required
LANGFUSE_BASE_URL=http://localhost:3000
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_SECRET_KEY=your_secret_key

# Optional Production Settings
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
ENABLE_RATE_LIMIT=true
ENABLE_HEALTH_CHECKS=true
ENABLE_REQUEST_LOGGING=true
CORS_ORIGIN=https://yourdomain.com
PORT=8080
```

### Programmatic Configuration
```typescript
import { createProductionConfig, ProductionServer } from 'langfuse-adaptor';

const config = createProductionConfig();
const server = new ProductionServer();
await server.start();
```

## 🎯 **Benefits Achieved**

1. **✅ Follows Sequence Diagram**: Exact architecture implementation
2. **✅ Production Ready**: Comprehensive logging, monitoring, security
3. **✅ Scalable**: Easy to add new adapters (OpenAI, Anthropic, etc.)
4. **✅ Context-Aware**: Intelligent routing based on request context
5. **✅ Type Safe**: Full TypeScript implementation with proper types
6. **✅ Maintainable**: Clean separation of concerns
7. **✅ Observable**: Structured logging and health monitoring
8. **✅ Secure**: Rate limiting, CORS, input validation, error handling
9. **✅ Resilient**: Graceful shutdown, connection management
10. **✅ Flexible**: Multiple usage patterns (SDK, REST API, individual managers)

## 🔮 **Future Extensions**

The architecture is designed for easy extension:

### Adding New Adapters
```typescript
// 1. Implement the adapter
class OpenAIAdapter implements IAdapter {
  // Implementation
}

// 2. Update routing strategy
const routingStrategy = new ProductionRoutingStrategy({
  defaultAdapter: 'langfuse',
  langfuseConfig: {...},
  openaiConfig: {...},      // 🆕 New adapter config
});

// 3. Intelligent routing
routingStrategy.getAdapter({
  userId: 'user123',
  organizationId: 'org456', 
  environment: 'production',
  // Strategy can route to best adapter based on context
});
```

### Adding New Controllers
```typescript
class CustomController extends BaseController {
  constructor(private routingStrategy: IRoutingStrategy) {
    super();
  }
  
  async customOperation(req: Request, res: Response): Promise<void> {
    // Implementation using routing strategy
  }
}
```

## 📊 **Monitoring & Observability**

### Health Checks
```bash
GET /health
{
  "status": "healthy",
  "adapters": {
    "langfuse": { "status": "healthy" }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Structured Logging
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "service": "langfuse-adaptor",
  "message": "POST /api/v1/prompts 201 45ms",
  "type": "request",
  "method": "POST",
  "url": "/api/v1/prompts",
  "statusCode": 201,
  "responseTime": 45,
  "userId": "user123",
  "organizationId": "org456"
}
```

## 🎉 **Summary**

The refactored Langfuse Adaptor now implements a production-ready, enterprise-grade architecture that:

- **Follows the sequence diagram exactly**
- **Provides multiple usage patterns** (REST API, SDK, individual managers)
- **Includes comprehensive production features** (logging, monitoring, security)
- **Supports future extensibility** (multiple adapters, intelligent routing)
- **Maintains backward compatibility** while providing a cleaner API

The system is ready for production deployment and can scale to support multiple AI providers and complex routing scenarios.
