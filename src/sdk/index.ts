import { IAdapter } from '../adapters/base-adapter';
import { LangfuseAdapter } from '../adapters/langfuse/langfuse-adapter';
import { createLangfuseConfig, validateLangfuseConfig, LangfuseConfig } from '../config/langfuse';
import { PromptManager } from './prompt-manager';
import { TemplateManager } from './template-manager';
import { ChainManager } from './chain-manager';
import { MetadataManager } from './metadata-manager';

export interface SDKOptions {
  adapter?: IAdapter;
  langfuseConfig?: LangfuseConfig;
  autoConnect?: boolean;
}

export class LangfusePromptSDK {
  private adapter: IAdapter;
  private _promptManager: PromptManager;
  private _templateManager: TemplateManager;
  private _chainManager: ChainManager;
  private _metadataManager: MetadataManager;

  constructor(options: SDKOptions = {}) {
    // Initialize adapter
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      const config = options.langfuseConfig || createLangfuseConfig();
      validateLangfuseConfig(config);
      this.adapter = new LangfuseAdapter(config);
    }

    // Initialize managers
    this._promptManager = new PromptManager(this.adapter);
    this._templateManager = new TemplateManager(this.adapter);
    this._chainManager = new ChainManager(this.adapter);
    this._metadataManager = new MetadataManager(this.adapter);

    // Auto-connect if requested
    if (options.autoConnect !== false) {
      this.connect().catch(error => {
        console.error('Failed to auto-connect SDK:', error);
      });
    }
  }

  // Connection management
  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return await this.adapter.healthCheck();
  }

  // Manager getters
  get prompts(): PromptManager {
    return this._promptManager;
  }

  get templates(): TemplateManager {
    return this._templateManager;
  }

  get chains(): ChainManager {
    return this._chainManager;
  }

  get metadata(): MetadataManager {
    return this._metadataManager;
  }

  // Convenience methods for common operations
  async createPrompt(name: string, content: string, options?: {
    description?: string;
    tags?: string[];
    variables?: Record<string, any>;
  }) {
    return await this._promptManager.createPrompt({
      name,
      content,
      description: options?.description,
      tags: options?.tags,
      variables: options?.variables,
    });
  }

  async getPrompt(id: string, version?: string) {
    return await this._promptManager.getPrompt(id, version);
  }

  async createTemplate(name: string, content: string, options?: {
    description?: string;
    tags?: string[];
    syntax?: 'handlebars' | 'mustache' | 'simple';
    defaultValues?: Record<string, any>;
  }) {
    return await this._templateManager.createTemplate({
      name,
      content,
      description: options?.description,
      tags: options?.tags,
      syntax: options?.syntax,
      defaultValues: options?.defaultValues,
    });
  }

  async renderTemplate(templateId: string, variables: Record<string, any>, version?: string) {
    return await this._templateManager.renderTemplate({
      templateId,
      variables,
      version,
    });
  }

  async createChain(name: string, steps: Array<{
    name: string;
    type: 'prompt' | 'template';
    resourceId: string;
    resourceVersion?: string;
  }>, options?: {
    description?: string;
    tags?: string[];
    executionOrder?: 'sequential' | 'parallel';
  }) {
    return await this._chainManager.createChain({
      name,
      description: options?.description,
      tags: options?.tags,
      steps: steps.map((step, index) => ({
        ...step,
        order: index,
      })),
      executionOrder: options?.executionOrder || 'sequential',
    });
  }

  async executeChain(chainId: string, initialData?: Record<string, any>, version?: string) {
    return await this._chainManager.executeChain({
      chainId,
      version,
      initialData,
    });
  }

  // Batch operations
  async batchCreatePrompts(prompts: Array<{
    name: string;
    content: string;
    description?: string;
    tags?: string[];
    variables?: Record<string, any>;
  }>) {
    const results = await Promise.allSettled(
      prompts.map(prompt => this._promptManager.createPrompt(prompt))
    );

    return results.map((result, index) => ({
      name: prompts[index].name,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason.message : undefined,
    }));
  }

  async batchCreateTemplates(templates: Array<{
    name: string;
    content: string;
    description?: string;
    tags?: string[];
    syntax?: 'handlebars' | 'mustache' | 'simple';
    defaultValues?: Record<string, any>;
  }>) {
    const results = await Promise.allSettled(
      templates.map(template => this._templateManager.createTemplate(template))
    );

    return results.map((result, index) => ({
      name: templates[index].name,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason.message : undefined,
    }));
  }

  // Search across all resource types
  async globalSearch(query: string) {
    const [prompts, templates, chains] = await Promise.all([
      this._promptManager.searchPrompts({ name: query, content: query }),
      this._templateManager.searchTemplates({ name: query, content: query }),
      this._chainManager.searchChains({ name: query }),
    ]);

    return {
      prompts,
      templates,
      chains,
      totalResults: prompts.length + templates.length + chains.length,
    };
  }

  // Utility methods
  async validateAllResources() {
    const [prompts, templates, chains] = await Promise.all([
      this._promptManager.listPrompts(),
      this._templateManager.listTemplates(),
      this._chainManager.listChains(),
    ]);

    const validationResults = await Promise.all([
      ...prompts.map(async p => ({
        type: 'prompt' as const,
        id: p.id,
        name: p.name,
        validation: await this._promptManager.validatePrompt(p.id),
      })),
      ...templates.map(async t => ({
        type: 'template' as const,
        id: t.id,
        name: t.name,
        validation: await this._templateManager.validateTemplate(t.id),
      })),
      ...chains.map(async c => ({
        type: 'chain' as const,
        id: c.id,
        name: c.name,
        validation: await this._chainManager.validateChain(c.id),
      })),
    ]);

    const invalid = validationResults.filter(r => !r.validation.valid);
    const warnings = validationResults.filter(r => r.validation.warnings && r.validation.warnings.length > 0);

    return {
      totalResources: validationResults.length,
      validResources: validationResults.length - invalid.length,
      invalidResources: invalid.length,
      resourcesWithWarnings: warnings.length,
      invalid,
      warnings,
    };
  }

  // Export/Import functionality
  async exportAll() {
    const [prompts, templates, chains, metadata] = await Promise.all([
      this._promptManager.listPrompts(),
      this._templateManager.listTemplates(),
      this._chainManager.listChains(),
      this._metadataManager.exportMetadata(),
    ]);

    return {
      exportDate: new Date(),
      version: '1.0.0',
      prompts,
      templates,
      chains,
      metadata,
    };
  }

  // Statistics and analytics
  async getSystemStats() {
    const [overallStats, recentActivity, duplicates, orphaned] = await Promise.all([
      this._metadataManager.getOverallStats(),
      this._metadataManager.getRecentActivity(20),
      this._metadataManager.getResourceDuplicates(),
      this._metadataManager.getOrphanedResources(),
    ]);

    return {
      overview: overallStats,
      recentActivity,
      duplicates,
      orphanedResources: orphaned,
      systemHealth: await this.healthCheck(),
    };
  }
}

// Factory function for easy initialization
export const createLangfusePromptSDK = (options?: SDKOptions): LangfusePromptSDK => {
  return new LangfusePromptSDK(options);
};

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
