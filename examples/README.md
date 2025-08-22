# Examples

This directory contains practical examples for using the Langfuse Prompt Management System.

## New Simplified Approach

The library has been refactored to remove the unnecessary SDK wrapper layer. Now you can use managers directly:

### Before (Old SDK Approach)
```typescript
import { LangfusePromptSDK } from '../src/sdk';

const sdk = new LangfusePromptSDK({ autoConnect: false });
await sdk.connect();
await sdk.createPrompt('test', 'Hello {{name}}');
```

### After (Direct Manager Approach)
```typescript
import { createPromptManager } from '../src/sdk';

const promptManager = createPromptManager({ autoConnect: false });
await promptManager.connect();
await promptManager.createPrompt({
  name: 'test',
  content: 'Hello {{name}}'
});
```

### Even Simpler (Direct Class Usage)
```typescript
import { PromptManager } from '../src/sdk';

const promptManager = new PromptManager({ autoConnect: false });
await promptManager.connect();
await promptManager.createPrompt({
  name: 'test',
  content: 'Hello {{name}}'
});
```

## Benefits of the New Approach

- **Cleaner**: No unnecessary SDK wrapper layer
- **Focused**: Import only what you need
- **Simpler**: Fewer abstractions to understand
- **Flexible**: Each manager works independently
- **Direct**: No method forwarding or proxy calls

## Files

### `simple-usage.ts`
**Simple Examples** - Clean, focused examples showing the new manager-based approach:
- Direct manager creation and usage
- Basic prompt operations
- Minimal boilerplate

**Usage:**
```bash
npx tsx examples/simple-usage.ts
```

### `production-demo.ts`
**Comprehensive Example** - Full demonstration of all features including:
- Template creation with default values
- Template rendering with variable substitution  
- Prompt creation with Langfuse integration
- Chain creation and execution
- System analytics and search

**Usage:**
```bash
npm run demo
```

### `api-usage.sh`
**REST API Example** - Shell script demonstrating HTTP API usage including:
- Creating prompts, templates, and chains via REST API
- Rendering templates through HTTP endpoints
- Retrieving system statistics
- Performing searches

**Usage:**
```bash
# Make sure the server is running first
npm run dev

# Then in another terminal:
./examples/api-usage.sh
```

## Prerequisites

- Langfuse server running on localhost:3000
- Environment variables configured in `.env`
- Dependencies installed (`npm install`)

## Getting Started

1. Start with `production-demo.ts` to see the Node SDK in action
2. Use `api-usage.sh` to explore the REST API capabilities
3. Both examples work with your real Langfuse server
