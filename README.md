# Langfuse Prompt Management System

A comprehensive Node.js TypeScript application that provides a unified interface for prompt management using a self-hosted Langfuse server (v3). The system implements the **Adapter Pattern** to wrap the Langfuse SDK and provides consistent interfaces for both Node SDK consumers and REST API clients.

## 🏗️ Architecture

### Dual Integration Approach
- **Node Applications** → Direct Node SDK usage
- **Non-Node Applications** → REST APIs (which internally use Node SDK)
- **Node SDK** → Wraps Langfuse SDK using Adapter Pattern

### Key Features
- ✅ **Prompt Management**: CRUD operations with versioning and rollback
- ✅ **Template System**: Variable substitution with multiple syntax support
- ✅ **Chain Composition**: Sequential and parallel prompt execution
- ✅ **Metadata Management**: Comprehensive resource organization and analytics
- ✅ **REST API**: Full HTTP interface for non-Node applications
- ✅ **Type Safety**: Complete TypeScript implementation
- ✅ **Validation**: Request/response validation with Joi
- ✅ **Error Handling**: Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Self-hosted Langfuse server v3 running on localhost:3000
- Langfuse public and secret keys

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd langfuse-adaptor

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Langfuse credentials
LANGFUSE_BASE_URL=http://localhost:3000
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_SECRET_KEY=your_secret_key
PORT=8080
NODE_ENV=development
```

### Development

```bash
# Start development server
npm run dev

# Run production demo
npm run demo

# Build for production
npm run build

# Start production server
npm start
```

## 📚 Usage

### Quick Start

```bash
# Run the comprehensive demo
npm run demo

# Or explore the REST API
./examples/api-usage.sh
```

### Node SDK Usage

```typescript
import { LangfusePromptSDK } from 'langfuse-adaptor';

// Initialize SDK
const sdk = new LangfusePromptSDK({
  autoConnect: true
});

// Create a template with default values
const template = await sdk.createTemplate('email', 
  'Dear {{name}},\n\n{{content}}\n\nBest regards,\n{{sender}}', {
  syntax: 'simple',
  defaultValues: { sender: 'System' }
});

// Render template (defaults will be used)
const rendered = await sdk.renderTemplate(template.id, {
  name: 'John',
  content: 'Welcome to our platform!'
});

// Create and execute a chain
const chain = await sdk.createChain('workflow', [
  { name: 'email-step', type: 'template', resourceId: template.id }
], { executionOrder: 'sequential' });

const result = await sdk.executeChain(chain.id, {
  name: 'John', content: 'Welcome!'
});
```

> 💡 **See `examples/production-demo.ts` for a complete working example**

### REST API Usage

#### Prompts

```bash
# Create prompt
curl -X POST http://localhost:8080/api/v1/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "greeting",
    "content": "Hello {{name}}!",
    "description": "A simple greeting",
    "tags": ["greeting"]
  }'

# Get prompt
curl http://localhost:8080/api/v1/prompts/{id}

# List prompts
curl "http://localhost:8080/api/v1/prompts?page=1&limit=10&tags=greeting"

# Update prompt
curl -X PUT http://localhost:8080/api/v1/prompts/{id} \
  -H "Content-Type: application/json" \
  -d '{"content": "Hi {{name}}!"}'

# Rollback prompt
curl -X POST http://localhost:8080/api/v1/prompts/{id}/rollback \
  -H "Content-Type: application/json" \
  -d '{"targetVersion": "1.0.0"}'
```

#### Templates

```bash
# Create template
curl -X POST http://localhost:8080/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "email",
    "content": "Dear {{name}},\n\n{{content}}\n\nBest,\n{{sender}}",
    "syntax": "simple",
    "defaultValues": {"sender": "System"}
  }'

# Render template
curl -X POST http://localhost:8080/api/v1/templates/{id}/render \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "name": "John",
      "content": "Welcome!"
    }
  }'
```

#### Chains

```bash
# Create chain
curl -X POST http://localhost:8080/api/v1/chains \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome-flow",
    "steps": [
      {"name": "greeting", "type": "prompt", "resourceId": "prompt-id"},
      {"name": "email", "type": "template", "resourceId": "template-id"}
    ],
    "executionOrder": "sequential"
  }'

# Execute chain
curl -X POST http://localhost:8080/api/v1/chains/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "initialData": {
      "name": "John",
      "content": "Welcome!"
    }
  }'
```

## 🏛️ Project Structure

```
src/
├── adapters/              # Adapter pattern implementation
│   ├── langfuse/         # Langfuse-specific adapter
│   │   ├── langfuse-adapter.ts
│   │   ├── langfuse-client.ts
│   │   └── types.ts
│   └── base-adapter.ts   # Base adapter interface
├── sdk/                  # Node SDK layer
│   ├── prompt-manager.ts
│   ├── template-manager.ts
│   ├── chain-manager.ts
│   ├── metadata-manager.ts
│   └── index.ts
├── api/                  # REST API layer
│   ├── routes/          # API route handlers
│   │   ├── prompts.ts
│   │   ├── templates.ts
│   │   ├── chains.ts
│   │   └── metadata.ts
│   ├── middleware/      # Express middleware
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   └── server.ts        # Express server
├── types/               # TypeScript type definitions
│   ├── prompt.ts
│   ├── template.ts
│   ├── chain.ts
│   └── common.ts
├── utils/               # Utility functions
│   ├── validation.ts
│   ├── versioning.ts
│   └── template-engine.ts
├── config/              # Configuration
│   └── langfuse.ts
└── index.ts             # Main entry point
```

## 🔧 API Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /info` - API information
- `GET /` - Welcome message

### Prompts (`/api/v1/prompts`)
- `POST /` - Create prompt
- `GET /` - List prompts
- `GET /:id` - Get prompt
- `PUT /:id` - Update prompt
- `DELETE /:id` - Delete prompt
- `GET /:id/versions` - Get versions
- `GET /:id/versions/:version` - Get specific version
- `POST /:id/rollback` - Rollback to version
- `GET /:id/compare/:v1/:v2` - Compare versions
- `POST /search` - Search prompts
- `GET /:id/validate` - Validate prompt
- `GET /:id/stats` - Get statistics

### Templates (`/api/v1/templates`)
- `POST /` - Create template
- `GET /` - List templates
- `GET /:id` - Get template
- `PUT /:id` - Update template
- `DELETE /:id` - Delete template
- `POST /:id/render` - Render template
- `POST /:id/render-advanced` - Advanced rendering
- `POST /:id/preview` - Preview template
- `GET /:id/variables` - Get variables
- `POST /search` - Search templates
- `GET /:id/validate` - Validate template
- `POST /:id/clone` - Clone template
- `GET /:id/stats` - Get statistics

### Chains (`/api/v1/chains`)
- `POST /` - Create chain
- `GET /` - List chains
- `GET /:id` - Get chain
- `PUT /:id` - Update chain
- `DELETE /:id` - Delete chain
- `POST /:id/execute` - Execute chain
- `GET /:id/validate` - Validate chain
- `GET /:id/dependencies` - Get dependencies
- `GET /:id/execution-plan` - Get execution plan
- `POST /search` - Search chains
- `POST /:id/clone` - Clone chain

### Metadata (`/api/v1/metadata`)
- `GET /stats` - Overall statistics
- `GET /resources` - All resource metadata
- `POST /resources/search` - Search resources
- `GET /tags/:tag/resources` - Resources by tag
- `GET /authors/:author/resources` - Resources by author
- `GET /tags/analysis` - Tag analysis
- `GET /authors/analysis` - Author analysis
- `GET /activity/recent` - Recent activity
- `GET /duplicates` - Find duplicates
- `GET /resources/orphaned` - Orphaned resources
- `GET /export` - Export metadata
- `GET /export/all` - Export everything
- `POST /search` - Global search

## 🎯 Core Features

### Prompt Management
- **CRUD Operations**: Create, read, update, delete prompts
- **Versioning**: Semantic versioning with rollback capabilities
- **Validation**: Syntax and structure validation
- **Search**: Content and metadata-based search
- **Statistics**: Usage and performance metrics

### Template System
- **Multiple Syntaxes**: Simple, Handlebars, Mustache
- **Variable Substitution**: Dynamic content replacement
- **Default Values**: Fallback values for variables
- **Validation**: Template syntax validation
- **Preview**: Safe template preview

### Chain Composition
- **Sequential/Parallel**: Flexible execution models
- **Data Mapping**: Inter-step data flow
- **Validation**: Chain integrity checks
- **Dependencies**: Resource dependency tracking
- **Execution Plans**: Visual execution flow

### Metadata & Analytics
- **Resource Organization**: Tags, authors, timestamps
- **Usage Analytics**: Statistics and trends
- **Duplicate Detection**: Find similar resources
- **Orphan Detection**: Unused resources
- **Export/Import**: Data portability

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Request validation
- **Error Handling**: Secure error responses
- **Request Size Limits**: Prevent abuse

## 🧪 Validation

The system includes comprehensive validation:

- **Schema Validation**: Joi-based request validation
- **Type Safety**: TypeScript type checking
- **Business Logic**: Domain-specific validation
- **Template Syntax**: Template engine validation
- **Chain Integrity**: Dependency validation

## 📊 Monitoring

- **Health Checks**: System health monitoring
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Response time tracking
- **Resource Usage**: Memory and CPU monitoring

## 🔄 Versioning

- **Semantic Versioning**: Standard version format (x.y.z)
- **Immutable Versions**: Version immutability
- **Rollback Support**: Easy version rollback
- **Version Comparison**: Side-by-side comparison
- **History Tracking**: Complete version history

## 🚀 Deployment

### Environment Variables

```env
LANGFUSE_BASE_URL=http://localhost:3000
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_SECRET_KEY=your_secret_key
PORT=8080
NODE_ENV=production
CORS_ORIGIN=*
```

### Production Build

```bash
npm run build
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/api/server.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with details

## 🔗 Related Projects

- [Langfuse](https://langfuse.com/) - LLM Engineering Platform
- [Langfuse SDK](https://github.com/langfuse/langfuse-js) - Official JavaScript SDK
