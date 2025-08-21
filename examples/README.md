# Examples

This directory contains practical examples for using the Langfuse Prompt Management System.

## Files

### `production-demo.ts`
**Node SDK Example** - Comprehensive demonstration of the SDK features including:
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
