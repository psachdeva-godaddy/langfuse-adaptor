// Main entry point for the Langfuse Prompt Management System
// Implements Controller Pattern with Routing Strategy Architecture

// Export the main SDK class and factory functions
export * from './sdk';

// Export types for TypeScript users
export * from './types/prompt';
export * from './types/template';
export * from './types/chain';
export * from './types/common';

// Export configuration utilities
export * from './config/langfuse';
export * from './config/production';

// Export utilities
export * from './utils/validation';
export * from './utils/template-engine';
export * from './utils/versioning';
export * from './utils/logger';

// Export adapters and strategies
export * from './adapters/base-adapter';
export * from './adapters/langfuse/langfuse-adapter';
export * from './api/strategies/routing-strategy';

// Export controllers for advanced usage
export * from './api/controllers/base-controller';
export * from './api/controllers/prompt-controller';
export * from './api/controllers/template-controller';
export * from './api/controllers/chain-controller';
export * from './api/controllers/metadata-controller';

// Default export - the unified SDK for convenience
export { LangfuseSDK as default } from './sdk';
