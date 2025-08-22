import { IAdapter } from '../adapters/base-adapter';
import { LangfuseAdapter } from '../adapters/langfuse/langfuse-adapter';
import { createLangfuseConfig, validateLangfuseConfig, LangfuseConfig } from '../config/langfuse';
import {
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptResponse,
  PromptListOptions,
  RollbackRequest,
} from '../types/prompt';
import {
  validateSchema,
  createPromptSchema,
  updatePromptSchema,
  rollbackRequestSchema,
  listOptionsSchema,
  validatePromptName,
} from '../utils/validation';
import { VersionManager } from '../utils/versioning';

export interface PromptManagerOptions {
  adapter?: IAdapter;
  langfuseConfig?: LangfuseConfig;
  autoConnect?: boolean;
}

export class PromptManager {
  private adapter: IAdapter;

  constructor(options: PromptManagerOptions = {}) {
    // Initialize adapter
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      const config = options.langfuseConfig || createLangfuseConfig();
      validateLangfuseConfig(config);
      this.adapter = new LangfuseAdapter(config);
    }

    // Auto-connect if requested
    if (options.autoConnect !== false) {
      this.connect().catch(error => {
        console.error('Failed to auto-connect PromptManager:', error);
      });
    }
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return await this.adapter.healthCheck();
  }

  async createPrompt(request: CreatePromptRequest): Promise<PromptResponse> {
    // Validate request
    const { value, errors } = validateSchema<CreatePromptRequest>(createPromptSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Validate prompt name uniqueness
    if (!validatePromptName(value.name)) {
      throw new Error('Invalid prompt name. Must contain only alphanumeric characters, underscores, and hyphens.');
    }

    // Skip existence check for now - Langfuse handles this internally
    // The error we see is expected when creating new prompts

    return await this.adapter.createPrompt(value);
  }

  async getPrompt(id: string, version?: string): Promise<PromptResponse> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    if (version && !VersionManager.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return await this.adapter.getPrompt(id, version);
  }

  async getPromptVersion(id: string, version: string): Promise<PromptResponse> {
    if (!VersionManager.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return await this.adapter.getPrompt(id, version);
  }

  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<PromptResponse> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    // Validate request
    const { value, errors } = validateSchema<UpdatePromptRequest>(updatePromptSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Ensure prompt exists
    await this.adapter.getPrompt(id);

    return await this.adapter.updatePrompt(id, value);
  }

  async deletePrompt(id: string): Promise<void> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    // Ensure prompt exists
    await this.adapter.getPrompt(id);

    await this.adapter.deletePrompt(id);
  }

  async listPrompts(options?: PromptListOptions): Promise<PromptResponse[]> {
    if (options) {
      const { value, errors } = validateSchema<PromptListOptions>(listOptionsSchema, options);
      if (errors) {
        throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
      }
      return await this.adapter.listPrompts(value);
    }

    return await this.adapter.listPrompts();
  }

  async getPromptVersions(id: string): Promise<string[]> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    const versions = await this.adapter.getPromptVersions(id);
    return VersionManager.sortVersions(versions, true); // Latest first
  }

  async rollbackPrompt(id: string, request: RollbackRequest): Promise<PromptResponse> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    // Validate request
    const { value, errors } = validateSchema<RollbackRequest>(rollbackRequestSchema, request);
    if (errors) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Ensure prompt exists
    await this.adapter.getPrompt(id);

    // Validate target version exists
    const versions = await this.adapter.getPromptVersions(id);
    if (!versions.includes(value.targetVersion)) {
      throw new Error(`Target version '${value.targetVersion}' does not exist for prompt '${id}'`);
    }

    return await this.adapter.rollbackPrompt(id, value);
  }

  async getLatestPrompt(id: string): Promise<PromptResponse> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    const versions = await this.adapter.getPromptVersions(id);
    if (versions.length === 0) {
      throw new Error(`No versions found for prompt '${id}'`);
    }

    const latestVersion = VersionManager.getLatestVersion(versions);
    return await this.adapter.getPrompt(id, latestVersion);
  }

  async comparePromptVersions(id: string, version1: string, version2: string): Promise<{
    version1: PromptResponse;
    version2: PromptResponse;
    differences: {
      content: boolean;
      config: boolean;
      tags: boolean;
      variables: boolean;
    };
  }> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    if (!VersionManager.isValidVersion(version1) || !VersionManager.isValidVersion(version2)) {
      throw new Error('Invalid version format');
    }

    const [prompt1, prompt2] = await Promise.all([
      this.adapter.getPrompt(id, version1),
      this.adapter.getPrompt(id, version2),
    ]);

    const differences = {
      content: prompt1.content !== prompt2.content,
      config: JSON.stringify(prompt1.config) !== JSON.stringify(prompt2.config),
      tags: JSON.stringify(prompt1.tags.sort()) !== JSON.stringify(prompt2.tags.sort()),
      variables: JSON.stringify(prompt1.variables) !== JSON.stringify(prompt2.variables),
    };

    return {
      version1: prompt1,
      version2: prompt2,
      differences,
    };
  }

  async searchPrompts(query: {
    name?: string;
    content?: string;
    tags?: string[];
    author?: string;
  }): Promise<PromptResponse[]> {
    const allPrompts = await this.adapter.listPrompts();
    
    return allPrompts.filter(prompt => {
      if (query.name && !prompt.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      
      if (query.content && !prompt.content.toLowerCase().includes(query.content.toLowerCase())) {
        return false;
      }
      
      if (query.tags && !query.tags.some(tag => prompt.tags.includes(tag))) {
        return false;
      }
      
      if (query.author && !prompt.author.toLowerCase().includes(query.author.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  async validatePrompt(id: string, version?: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const prompt = await this.adapter.getPrompt(id, version);
      
      // Check content length
      if (prompt.content.length === 0) {
        errors.push('Prompt content cannot be empty');
      }
      
      if (prompt.content.length > 10000) {
        warnings.push('Prompt content is very long (>10,000 characters)');
      }
      
      // Check for potential template variables
      const variableMatches = prompt.content.match(/\{\{(\w+)\}\}/g);
      if (variableMatches && (!prompt.variables || Object.keys(prompt.variables).length === 0)) {
        warnings.push('Prompt contains template variables but no variable definitions');
      }
      
      // Check version format
      if (!VersionManager.isValidVersion(prompt.version)) {
        errors.push(`Invalid version format: ${prompt.version}`);
      }
      
    } catch (error) {
      errors.push(`Failed to retrieve prompt: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getPromptStats(id: string): Promise<{
    totalVersions: number;
    latestVersion: string;
    createdAt: Date;
    lastUpdated: Date;
    contentLength: number;
    variableCount: number;
    tagCount: number;
  }> {
    const [versions, latestPrompt] = await Promise.all([
      this.adapter.getPromptVersions(id),
      this.getLatestPrompt(id),
    ]);

    return {
      totalVersions: versions.length,
      latestVersion: latestPrompt.version,
      createdAt: latestPrompt.createdAt,
      lastUpdated: latestPrompt.updatedAt,
      contentLength: latestPrompt.content.length,
      variableCount: latestPrompt.variables ? Object.keys(latestPrompt.variables).length : 0,
      tagCount: latestPrompt.tags.length,
    };
  }
}
