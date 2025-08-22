import { LangfuseConfig } from '../config/langfuse';
import { PromptManager, PromptManagerOptions } from './prompt-manager';
import { TemplateManager, TemplateManagerOptions } from './template-manager';
import { ChainManager, ChainManagerOptions } from './chain-manager';
import { MetadataManager, MetadataManagerOptions } from './metadata-manager';

/**
 * Langfuse Prompt Management SDK
 * 
 * This SDK provides direct access to managers for prompt, template, chain, and metadata operations.
 * It follows the new controller-based architecture where managers are used both by:
 * 1. Controllers (for REST API)
 * 2. Direct SDK usage (for Node.js applications)
 */

// Factory functions for easy manager initialization
export const createPromptManager = (options?: PromptManagerOptions): PromptManager => {
  return new PromptManager(options);
};

export const createTemplateManager = (options?: TemplateManagerOptions): TemplateManager => {
  return new TemplateManager(options);
};

export const createChainManager = (options?: ChainManagerOptions): ChainManager => {
  return new ChainManager(options);
};

export const createMetadataManager = (options?: MetadataManagerOptions): MetadataManager => {
  return new MetadataManager(options);
};

// Convenience function to create all managers with shared config
export const createManagers = (options?: {
  langfuseConfig?: LangfuseConfig;
  autoConnect?: boolean;
}) => {
  const sharedOptions = {
    langfuseConfig: options?.langfuseConfig,
    autoConnect: options?.autoConnect,
  };

  return {
    prompts: new PromptManager(sharedOptions),
    templates: new TemplateManager(sharedOptions),
    chains: new ChainManager(sharedOptions),
    metadata: new MetadataManager(sharedOptions),
  };
};

/**
 * Unified SDK class for backward compatibility and convenience
 * This provides a single entry point that creates all managers
 */
export class LangfuseSDK {
  public readonly prompts: PromptManager;
  public readonly templates: TemplateManager;
  public readonly chains: ChainManager;
  public readonly metadata: MetadataManager;

  constructor(options?: {
    langfuseConfig?: LangfuseConfig;
    autoConnect?: boolean;
  }) {
    const managers = createManagers(options);
    this.prompts = managers.prompts;
    this.templates = managers.templates;
    this.chains = managers.chains;
    this.metadata = managers.metadata;
  }

  /**
   * Connect all managers
   */
  async connect(): Promise<void> {
    await Promise.all([
      this.prompts.connect(),
      this.templates.connect(),
      this.chains.connect(),
      this.metadata.connect()
    ]);
  }

  /**
   * Disconnect all managers
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.prompts.disconnect(),
      this.templates.disconnect(),
      this.chains.disconnect(),
      this.metadata.disconnect()
    ]);
  }

  /**
   * Health check for all managers
   */
  async healthCheck(): Promise<Record<string, { status: 'healthy' | 'unhealthy'; details?: string }>> {
    const [promptHealth, templateHealth, chainHealth, metadataHealth] = await Promise.all([
      this.prompts.healthCheck(),
      this.templates.healthCheck(),
      this.chains.healthCheck(),
      this.metadata.healthCheck()
    ]);

    return {
      prompts: promptHealth,
      templates: templateHealth,
      chains: chainHealth,
      metadata: metadataHealth
    };
  }
}

// Re-export types and utilities
export * from '../types/prompt';
export * from '../types/template';
export * from '../types/chain';
export * from '../types/common';
export * from '../config/langfuse';
export * from '../utils/validation';
export * from '../utils/template-engine';
export * from '../utils/versioning';

// Re-export managers for direct use
export { PromptManager } from './prompt-manager';
export { TemplateManager } from './template-manager';
export { ChainManager } from './chain-manager';
export { MetadataManager } from './metadata-manager';

// Re-export adapters
export { IAdapter } from '../adapters/base-adapter';
export { LangfuseAdapter } from '../adapters/langfuse/langfuse-adapter';
