import { IAdapter } from '../../adapters/base-adapter';
import { LangfuseAdapter } from '../../adapters/langfuse/langfuse-adapter';
import { createLangfuseConfig, validateLangfuseConfig, LangfuseConfig } from '../../config/langfuse';

/**
 * Strategy interface for determining which adapter to use
 */
export interface IRoutingStrategy {
  /**
   * Get the appropriate adapter based on configuration or request context
   */
  getAdapter(context?: RoutingContext): IAdapter;
  
  /**
   * Get adapter for prompts specifically
   */
  getPromptAdapter(context?: RoutingContext): IAdapter;
  
  /**
   * Get adapter for templates specifically
   */
  getTemplateAdapter(context?: RoutingContext): IAdapter;
  
  /**
   * Get adapter for chains specifically
   */
  getChainAdapter(context?: RoutingContext): IAdapter;
  
  /**
   * Get adapter for metadata specifically
   */
  getMetadataAdapter(context?: RoutingContext): IAdapter;
}

/**
 * Context information for routing decisions
 */
export interface RoutingContext {
  userId?: string;
  organizationId?: string;
  environment?: 'development' | 'staging' | 'production';
  region?: string;
  requestId?: string;
  headers?: Record<string, string>;
}

/**
 * Configuration for routing strategy
 */
export interface RoutingStrategyConfig {
  defaultAdapter: 'langfuse';
  langfuseConfig?: LangfuseConfig;
  // Future: Add other adapter configs here
  // openaiConfig?: OpenAIConfig;
  // anthropicConfig?: AnthropicConfig;
}

/**
 * Production-ready routing strategy implementation
 * Currently supports Langfuse only, but designed for easy extension
 */
export class ProductionRoutingStrategy implements IRoutingStrategy {
  private adapters: Map<string, IAdapter> = new Map();
  private config: RoutingStrategyConfig;

  constructor(config?: Partial<RoutingStrategyConfig>) {
    this.config = {
      defaultAdapter: 'langfuse',
      ...config
    };
    
    this.initializeAdapters();
  }

  /**
   * Initialize all configured adapters
   */
  private initializeAdapters(): void {
    // Initialize Langfuse adapter
    const langfuseConfig = this.config.langfuseConfig || createLangfuseConfig();
    validateLangfuseConfig(langfuseConfig);
    
    const langfuseAdapter = new LangfuseAdapter(langfuseConfig);
    this.adapters.set('langfuse', langfuseAdapter);
    
    // Future: Initialize other adapters
    // const openaiAdapter = new OpenAIAdapter(this.config.openaiConfig);
    // this.adapters.set('openai', openaiAdapter);
  }

  /**
   * Get the appropriate adapter based on context
   * Currently returns Langfuse, but can be extended for intelligent routing
   */
  getAdapter(context?: RoutingContext): IAdapter {
    // Future routing logic can be implemented here:
    // - Route based on user preferences
    // - Route based on organization settings
    // - Route based on feature flags
    // - Route based on load balancing
    
    const adapterType = this.determineAdapterType(context);
    const adapter = this.adapters.get(adapterType);
    
    if (!adapter) {
      throw new Error(`Adapter '${adapterType}' not found or not initialized`);
    }
    
    return adapter;
  }

  /**
   * Get adapter specifically for prompt operations
   */
  getPromptAdapter(context?: RoutingContext): IAdapter {
    // Can implement prompt-specific routing logic here
    return this.getAdapter(context);
  }

  /**
   * Get adapter specifically for template operations
   */
  getTemplateAdapter(context?: RoutingContext): IAdapter {
    // Can implement template-specific routing logic here
    return this.getAdapter(context);
  }

  /**
   * Get adapter specifically for chain operations
   */
  getChainAdapter(context?: RoutingContext): IAdapter {
    // Can implement chain-specific routing logic here
    return this.getAdapter(context);
  }

  /**
   * Get adapter specifically for metadata operations
   */
  getMetadataAdapter(context?: RoutingContext): IAdapter {
    // Can implement metadata-specific routing logic here
    return this.getAdapter(context);
  }

  /**
   * Determine which adapter type to use based on context
   */
  private determineAdapterType(context?: RoutingContext): string {
    // Current implementation: Always use Langfuse
    // Future: Implement intelligent routing based on:
    // - User preferences stored in context.userId
    // - Organization settings from context.organizationId
    // - Environment-specific routing (dev/staging/prod)
    // - Feature flags
    // - Load balancing
    // - Geographic routing based on context.region
    
    if (context?.environment === 'development') {
      // Could route to a development-specific adapter
      return this.config.defaultAdapter;
    }
    
    if (context?.organizationId) {
      // Could implement org-specific routing
      return this.config.defaultAdapter;
    }
    
    return this.config.defaultAdapter;
  }

  /**
   * Connect all adapters
   */
  async connectAll(): Promise<void> {
    const connectionPromises = Array.from(this.adapters.values()).map(adapter => 
      adapter.connect()
    );
    
    await Promise.all(connectionPromises);
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    const disconnectionPromises = Array.from(this.adapters.values()).map(adapter => 
      adapter.disconnect()
    );
    
    await Promise.all(disconnectionPromises);
  }

  /**
   * Health check for all adapters
   */
  async healthCheckAll(): Promise<Record<string, { status: 'healthy' | 'unhealthy'; details?: string }>> {
    const healthChecks: Record<string, { status: 'healthy' | 'unhealthy'; details?: string }> = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        healthChecks[name] = await adapter.healthCheck();
      } catch (error) {
        healthChecks[name] = {
          status: 'unhealthy',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return healthChecks;
  }

  /**
   * Get statistics about adapter usage
   */
  getAdapterStats(): { totalAdapters: number; availableAdapters: string[] } {
    return {
      totalAdapters: this.adapters.size,
      availableAdapters: Array.from(this.adapters.keys())
    };
  }
}
