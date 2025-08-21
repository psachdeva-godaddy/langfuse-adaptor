import { v4 as uuidv4 } from 'uuid';
import * as semver from 'semver';
import { BaseAdapter } from '../base-adapter';
import { LangfuseClient } from './langfuse-client';
import { LangfuseConfig } from '../../config/langfuse';
import { transformToLangfusePrompt, transformFromLangfusePrompt } from './types';
import {
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptResponse,
  PromptListOptions,
  RollbackRequest,
} from '../../types/prompt';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateResponse,
  TemplateListOptions,
  TemplateRenderRequest,
  TemplateRenderResponse,
} from '../../types/template';
import {
  CreateChainRequest,
  UpdateChainRequest,
  ChainResponse,
  ChainListOptions,
  ChainExecutionRequest,
  ChainExecutionResult,
} from '../../types/chain';

export class LangfuseAdapter extends BaseAdapter {
  private client: LangfuseClient;
  private config: LangfuseConfig;
  
  // In-memory storage for templates and chains (since Langfuse only supports prompts)
  private templates: Map<string, TemplateResponse> = new Map();
  private chains: Map<string, ChainResponse> = new Map();

  constructor(config: LangfuseConfig) {
    super();
    this.config = config;
    this.client = new LangfuseClient(config);
  }

  async connect(): Promise<void> {
    const health = await this.client.healthCheck();
    if (health.status === 'unhealthy') {
      throw new Error(`Failed to connect to Langfuse: ${health.details}`);
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.shutdown();
    this.connected = false;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return await this.client.healthCheck();
  }

  // Prompt operations
  async createPrompt(request: CreatePromptRequest): Promise<PromptResponse> {
    this.ensureConnected();
    
    // Skip existence check for now - Langfuse will handle duplicates
    // In production, you might want to implement a more sophisticated check
    
    const langfuseData = transformToLangfusePrompt({
      ...request,
      version: '1.0.0',
    });

    const result = await this.client.createPrompt(langfuseData);
    return transformFromLangfusePrompt(result);
  }

  async getPrompt(id: string, version?: string): Promise<PromptResponse> {
    this.ensureConnected();
    
    // Support both version numbers and labels
    if (version) {
      // Check if it's a semantic version (e.g., "1.0.0") or a label (e.g., "production")
      if (version.match(/^\d+\.\d+\.\d+$/)) {
        const versionNumber = parseInt(version.split('.')[0]);
        const result = await this.client.getPrompt(id, versionNumber);
        return transformFromLangfusePrompt(result);
      } else {
        // It's a label
        const result = await this.client.getPrompt(id, undefined, { label: version });
        return transformFromLangfusePrompt(result);
      }
    } else {
      // No version specified, get the production version or latest
      try {
        const result = await this.client.getPrompt(id, undefined, { label: 'production' });
        return transformFromLangfusePrompt(result);
      } catch (error) {
        // Fallback to latest if no production version
        const result = await this.client.getPrompt(id, undefined, { label: 'latest' });
        return transformFromLangfusePrompt(result);
      }
    }
  }

  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<PromptResponse> {
    this.ensureConnected();
    
    // In Langfuse, the 'id' is actually the prompt name
    const promptName = id;
    
    try {
      // Get current prompt to merge with updates
      const currentPrompt = await this.getPrompt(promptName);
      
      const langfuseData = transformToLangfusePrompt({
        name: promptName,
        content: request.content || currentPrompt.content,
        description: request.description || currentPrompt.description,
        label: request.label || currentPrompt.label,
        labels: request.labels || currentPrompt.labels,
        tags: request.tags || currentPrompt.tags,
        config: request.config || currentPrompt.config,
        type: currentPrompt.type,
      });

      const result = await this.client.updatePrompt(promptName, langfuseData);
      return transformFromLangfusePrompt(result);
    } catch (error) {
      throw new Error(`Failed to update prompt '${promptName}': ${(error as Error).message}`);
    }
  }

  async deletePrompt(id: string): Promise<void> {
    this.ensureConnected();
    await this.client.deletePrompt(id);
  }

  async listPrompts(options?: PromptListOptions): Promise<PromptResponse[]> {
    this.ensureConnected();
    
    const result = await this.client.getPrompts({
      page: options?.page || 1,
      limit: options?.limit || 50,
      name: options?.filters?.name,
      tag: options?.filters?.tags?.[0],
    });

    return result.data.map(transformFromLangfusePrompt);
  }

  async getPromptVersions(id: string): Promise<string[]> {
    this.ensureConnected();
    
    const versions = await this.client.getPromptVersions(id);
    return versions.map(v => `${v.version || 1}.0.0`);
  }

  async rollbackPrompt(id: string, request: RollbackRequest): Promise<PromptResponse> {
    this.ensureConnected();
    
    // According to Langfuse docs, rollback is done by changing the 'production' label
    // to point to the target version
    const targetVersionNumber = parseInt(request.targetVersion.split('.')[0]);
    
    try {
      // Update the production label to point to the target version
      const result = await this.client.updatePromptLabels(id, targetVersionNumber, ['production']);
      return transformFromLangfusePrompt(result);
    } catch (error) {
      // Fallback: create a new version with the target content
      const targetPrompt = await this.client.getPrompt(id, targetVersionNumber);
      
      const langfuseData = transformToLangfusePrompt({
        name: id,
        content: targetPrompt.prompt,
        config: targetPrompt.config,
        tags: targetPrompt.tags,
        labels: ['production', 'latest'],
      });

      const result = await this.client.createPrompt(langfuseData);
      return transformFromLangfusePrompt(result);
    }
  }

  async deployPrompt(id: string, version: string, environment: string = 'production'): Promise<PromptResponse> {
    this.ensureConnected();
    
    const versionNumber = parseInt(version.split('.')[0]);
    const result = await this.client.updatePromptLabels(id, versionNumber, [environment]);
    return transformFromLangfusePrompt(result);
  }

  // Template operations (in-memory implementation)
  async createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    this.ensureConnected();
    
    const id = uuidv4();
    const template: TemplateResponse = {
      id,
      name: request.name,
      content: request.content,
      description: request.description,
      label: request.label,
      tags: request.tags || [],
      variables: request.variables || this.extractVariables(request.content),
      syntax: request.syntax || 'simple',
      defaultValues: request.defaultValues,
      author: 'system', // Since we don't have user context
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };

    this.templates.set(id, template);
    return template;
  }

  async getTemplate(id: string, version?: string): Promise<TemplateResponse> {
    this.ensureConnected();
    
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template with id '${id}' not found`);
    }
    return template;
  }

  async updateTemplate(id: string, request: UpdateTemplateRequest): Promise<TemplateResponse> {
    this.ensureConnected();
    
    const existing = await this.getTemplate(id);
    const currentVersion = semver.parse(existing.version);
    const newVersion = semver.inc(currentVersion!, 'minor')!;

    const updated: TemplateResponse = {
      ...existing,
      content: request.content || existing.content,
      description: request.description || existing.description,
      label: request.label || existing.label,
      tags: request.tags || existing.tags,
      variables: request.variables || (request.content ? this.extractVariables(request.content) : existing.variables),
      defaultValues: request.defaultValues || existing.defaultValues,
      updatedAt: new Date(),
      version: newVersion,
    };

    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.ensureConnected();
    
    if (!this.templates.has(id)) {
      throw new Error(`Template with id '${id}' not found`);
    }
    this.templates.delete(id);
  }

  async listTemplates(options?: TemplateListOptions): Promise<TemplateResponse[]> {
    this.ensureConnected();
    
    let templates = Array.from(this.templates.values());
    
    // Apply filters
    if (options?.filters) {
      const filters = options.filters;
      templates = templates.filter(template => {
        if (filters.name && !template.name.includes(filters.name)) return false;
        if (filters.tags && !filters.tags.some(tag => template.tags.includes(tag))) return false;
        if (filters.syntax && template.syntax !== filters.syntax) return false;
        return true;
      });
    }

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return templates.slice(start, end);
  }

  async renderTemplate(request: TemplateRenderRequest): Promise<TemplateRenderResponse> {
    this.ensureConnected();
    
    const template = await this.getTemplate(request.templateId, request.version);
    
    // Merge variables with default values
    const allVariables = { ...template.defaultValues, ...request.variables };
    const rendered = this.performVariableSubstitution(template.content, allVariables);
    
    const usedVariables = Object.keys(allVariables).filter(key => 
      template.content.includes(`{{${key}}}`)
    );
    
    const missingVariables = template.variables.filter(variable => 
      !(variable in allVariables)
    );

    return {
      rendered,
      usedVariables,
      missingVariables,
    };
  }

  // Chain operations (in-memory implementation)
  async createChain(request: CreateChainRequest): Promise<ChainResponse> {
    this.ensureConnected();
    
    const id = uuidv4();
    const steps = request.steps.map((step, index) => ({
      ...step,
      id: uuidv4(),
      order: index,
    }));

    const chain: ChainResponse = {
      id,
      name: request.name,
      description: request.description,
      label: request.label,
      tags: request.tags || [],
      steps,
      executionOrder: request.executionOrder,
      dataMapping: request.dataMapping || [],
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };

    this.chains.set(id, chain);
    return chain;
  }

  async getChain(id: string, version?: string): Promise<ChainResponse> {
    this.ensureConnected();
    
    const chain = this.chains.get(id);
    if (!chain) {
      throw new Error(`Chain with id '${id}' not found`);
    }
    return chain;
  }

  async updateChain(id: string, request: UpdateChainRequest): Promise<ChainResponse> {
    this.ensureConnected();
    
    const existing = await this.getChain(id);
    const currentVersion = semver.parse(existing.version);
    const newVersion = semver.inc(currentVersion!, 'minor')!;

    const steps = request.steps ? request.steps.map((step, index) => ({
      ...step,
      id: uuidv4(),
      order: index,
    })) : existing.steps;

    const updated: ChainResponse = {
      ...existing,
      description: request.description || existing.description,
      label: request.label || existing.label,
      tags: request.tags || existing.tags,
      steps,
      executionOrder: request.executionOrder || existing.executionOrder,
      dataMapping: request.dataMapping || existing.dataMapping,
      updatedAt: new Date(),
      version: newVersion,
    };

    this.chains.set(id, updated);
    return updated;
  }

  async deleteChain(id: string): Promise<void> {
    this.ensureConnected();
    
    if (!this.chains.has(id)) {
      throw new Error(`Chain with id '${id}' not found`);
    }
    this.chains.delete(id);
  }

  async listChains(options?: ChainListOptions): Promise<ChainResponse[]> {
    this.ensureConnected();
    
    let chains = Array.from(this.chains.values());
    
    // Apply filters
    if (options?.filters) {
      const filters = options.filters;
      chains = chains.filter(chain => {
        if (filters.name && !chain.name.includes(filters.name)) return false;
        if (filters.tags && !filters.tags.some(tag => chain.tags.includes(tag))) return false;
        if (filters.executionOrder && chain.executionOrder !== filters.executionOrder) return false;
        return true;
      });
    }

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return chains.slice(start, end);
  }

  async executeChain(request: ChainExecutionRequest): Promise<ChainExecutionResult> {
    this.ensureConnected();
    
    const chain = await this.getChain(request.chainId, request.version);
    const executionId = uuidv4();
    const startTime = Date.now();
    
    // This is a simplified implementation - in a real system, you'd execute the actual prompts/templates
    const stepResults = chain.steps.map(step => ({
      stepId: step.id,
      status: 'success' as const,
      result: `Executed step: ${step.name}`,
      executionTime: Math.random() * 100, // Simulated execution time
    }));

    const totalExecutionTime = Date.now() - startTime;

    return {
      chainId: request.chainId,
      executionId,
      status: 'success',
      results: { output: 'Chain executed successfully' },
      stepResults,
      totalExecutionTime,
    };
  }

  async validateChain(chainId: string, version?: string): Promise<{ valid: boolean; errors: string[] }> {
    this.ensureConnected();
    
    try {
      const chain = await this.getChain(chainId, version);
      const errors: string[] = [];

      // Validate that all referenced resources exist
      for (const step of chain.steps) {
        try {
          if (step.type === 'prompt') {
            await this.getPrompt(step.resourceId, step.resourceVersion);
          } else if (step.type === 'template') {
            await this.getTemplate(step.resourceId, step.resourceVersion);
          }
        } catch (error) {
          errors.push(`Step '${step.name}' references non-existent ${step.type}: ${step.resourceId}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { valid: false, errors: [(error as Error).message] };
    }
  }

  // Helper methods
  private extractVariables(content: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  private performVariableSubstitution(content: string, variables: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }
}
